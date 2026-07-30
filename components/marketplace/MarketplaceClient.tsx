"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Locale = "ar" | "en" | "tr";
type Translation = { locale: Locale; title: string; summary: string | null; description: string | null };
type Listing = {
  id: string;
  tenant_id: string;
  slug: string;
  listing_type: "product" | "service";
  status: string;
  price_amount: number | null;
  currency: string | null;
  availability: Record<string, unknown> | null;
  marketplace_listing_translations: Translation[] | null;
};
type Category = { id: string; slug: string; translations: Record<string, { title?: string } | string> };

const copy = {
  ar: { title: "سوق HAMZA AGENCY", subtitle: "منتجات وخدمات منشورة من الوكالة والشركاء المعتمدين.", search: "ابحث في السوق", all: "كل التصنيفات", order: "اطلب الآن", login: "سجّل الدخول لإتمام الطلب", empty: "لا توجد عناصر مطابقة.", success: "تم إنشاء الطلب", unavailable: "تعذر إتمام الطلب حالياً.", product: "منتج", service: "خدمة" },
  en: { title: "HAMZA AGENCY Marketplace", subtitle: "Published products and services from the agency and approved partners.", search: "Search marketplace", all: "All categories", order: "Order now", login: "Sign in to place an order", empty: "No matching listings.", success: "Order created", unavailable: "The order could not be completed.", product: "Product", service: "Service" },
  tr: { title: "HAMZA AGENCY Pazaryeri", subtitle: "Ajans ve onaylı ortakların yayımlanmış ürün ve hizmetleri.", search: "Pazaryerinde ara", all: "Tüm kategoriler", order: "Şimdi sipariş ver", login: "Sipariş için giriş yapın", empty: "Eşleşen ilan yok.", success: "Sipariş oluşturuldu", unavailable: "Sipariş tamamlanamadı.", product: "Ürün", service: "Hizmet" },
} as const;

function localeFromDocument(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" || document.documentElement.lang === "tr" ? document.documentElement.lang : "ar";
}

function isListing(value: unknown): value is Listing {
  return Boolean(value) && typeof value === "object" && typeof (value as Listing).id === "string";
}

function isCategory(value: unknown): value is Category {
  return Boolean(value) && typeof value === "object" && typeof (value as Category).id === "string";
}

export default function MarketplaceClient({ tenantId }: { tenantId: string | null }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ar");
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const strings = copy[locale];

  const load = useCallback(async () => {
    if (!supabase || !tenantId) { setLoading(false); return; }
    setLoading(true);
    const [listingResult, categoryResult] = await Promise.all([
      supabase
        .from("marketplace_listings")
        .select("id,tenant_id,slug,listing_type,status,price_amount,currency,availability,category_id,marketplace_listing_translations(locale,title,summary,description)")
        .eq("tenant_id", tenantId)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("marketplace_categories")
        .select("id,slug,translations")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("slug")
        .limit(100),
    ]);
    setListings(Array.isArray(listingResult.data) ? listingResult.data.filter(isListing) : []);
    setCategories(Array.isArray(categoryResult.data) ? categoryResult.data.filter(isCategory) : []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { setLocale(localeFromDocument()); void load(); }, [load]);

  const visible = useMemo(() => listings.filter((listing) => {
    const translation = listing.marketplace_listing_translations?.find((item) => item.locale === locale) ?? listing.marketplace_listing_translations?.find((item) => item.locale === "ar");
    const haystack = `${translation?.title ?? listing.slug} ${translation?.summary ?? ""}`.toLocaleLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLocaleLowerCase());
    const matchesCategory = !category || (listing as Listing & { category_id?: string }).category_id === category;
    return matchesQuery && matchesCategory;
  }), [category, listings, locale, query]);

  async function order(listing: Listing) {
    if (!supabase || !tenantId) return;
    setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push(`/portal/login?next=/marketplace`);
      return;
    }
    const result = await supabase.rpc("create_marketplace_order", { p_tenant: tenantId, p_listing: listing.id, p_quantity: 1 });
    if (result.error) { setMessage(strings.unavailable); return; }
    const payload = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
    setMessage(`${strings.success}: ${String(payload.order_code ?? "")}`);
  }

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-28 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-7 shadow-2xl">
          <p className="text-sm text-violet-200">HAMZA AGENCY</p>
          <h1 className="mt-2 text-4xl font-black">{strings.title}</h1>
          <p className="mt-3 max-w-3xl text-white/70">{strings.subtitle}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_260px]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={strings.search} className="min-h-12 rounded-xl border border-white/10 bg-black/40 px-4" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 rounded-xl border border-white/10 bg-black/70 px-4">
              <option value="">{strings.all}</option>
              {categories.map((item) => {
                const value = item.translations?.[locale];
                const label = typeof value === "string" ? value : value?.title ?? item.slug;
                return <option key={item.id} value={item.id}>{label}</option>;
              })}
            </select>
          </div>
          {message && <p role="status" className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}
        </header>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => {
            const translation = listing.marketplace_listing_translations?.find((item) => item.locale === locale) ?? listing.marketplace_listing_translations?.find((item) => item.locale === "ar");
            return (
              <article key={listing.id} className="flex min-h-72 flex-col rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-xs uppercase tracking-wider text-violet-200">{strings[listing.listing_type]}</div>
                <h2 className="mt-3 text-2xl font-black">{translation?.title ?? listing.slug}</h2>
                <p className="mt-3 flex-1 leading-7 text-white/65">{translation?.summary ?? translation?.description ?? ""}</p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <strong className="text-xl">{listing.price_amount == null ? "—" : `${listing.price_amount} ${listing.currency ?? ""}`}</strong>
                  <button type="button" onClick={() => void order(listing)} className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold">{strings.order}</button>
                </div>
              </article>
            );
          })}
        </div>
        {!loading && !visible.length && <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/55">{strings.empty}</div>}
      </section>
    </main>
  );
}
