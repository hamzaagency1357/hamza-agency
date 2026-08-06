"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Language = "ar" | "en" | "tr";
type Status = "draft" | "scheduled" | "published" | "unpublished";
type Translation = { title: string; excerpt: string; content: string; seoTitle: string; seoDescription: string };
type Row = { id: number; slug: string; status: Status; category: string; tags: string[]; featured_image_url: string | null; scheduled_at: string | null; blog_post_translations: Array<{ language: Language; title: string | null; excerpt: string | null; content_html: string | null; seo_title: string | null; seo_description: string | null }> | null };

const languages: Language[] = ["ar", "en", "tr"];
const labels = { ar: "العربية", en: "English", tr: "Türkçe" } as const;
const blank = (): Translation => ({ title: "", excerpt: "", content: "", seoTitle: "", seoDescription: "" });
const cleanHtml = (value: string) => value.replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "").replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript:/gi, "");
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export default function AdminBlogManager() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>("ar");
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [translations, setTranslations] = useState<Record<Language, Translation>>({ ar: blank(), en: blank(), tr: blank() });
  const active = translations[language];
  const preview = useMemo(() => cleanHtml(active.content), [active.content]);

  const loadRows = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("blog_posts").select("id,slug,status,category,tags,featured_image_url,scheduled_at,blog_post_translations(language,title,excerpt,content_html,seo_title,seo_description)").order("updated_at", { ascending: false });
    if (error) { setMessage("إدارة المدونة جاهزة، وتحتاج Migration الخاصة بـ PR 3 بعد الموافقة المنفصلة."); setRows([]); return; }
    setRows((data || []) as Row[]);
  }, []);

  useEffect(() => {
    let activeMount = true;
    void (async () => {
      const access = await requireAdminModuleAccess("pages");
      if (!activeMount) return;
      setAuthorized(access.isAuthorized);
      if (access.isAuthorized) await loadRows();
      else setMessage(access.reason === "not_signed_in" ? "سجّل الدخول بحساب إداري." : "لا تملك صلاحية إدارة المدونة.");
      if (activeMount) setLoading(false);
    })();
    return () => { activeMount = false; };
  }, [loadRows]);

  function reset() {
    setActiveId(null); setSlug(""); setStatus("draft"); setCategory("general"); setTags(""); setFeaturedImage(""); setScheduledAt(""); setTranslations({ ar: blank(), en: blank(), tr: blank() }); setLanguage("ar"); setMessage("");
  }

  function selectRow(row: Row) {
    const next = { ar: blank(), en: blank(), tr: blank() };
    for (const item of row.blog_post_translations || []) next[item.language] = { title: item.title || "", excerpt: item.excerpt || "", content: item.content_html || "", seoTitle: item.seo_title || "", seoDescription: item.seo_description || "" };
    setActiveId(row.id); setSlug(row.slug); setStatus(row.status); setCategory(row.category || "general"); setTags((row.tags || []).join(", ")); setFeaturedImage(row.featured_image_url || ""); setScheduledAt(localDate(row.scheduled_at)); setTranslations(next); setLanguage("ar"); setMessage("");
  }

  function update(field: keyof Translation, value: string) {
    setTranslations((current) => ({ ...current, [language]: { ...current[language], [field]: value } }));
  }

  async function save() {
    if (!supabase || saving) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return setMessage("الرابط المختصر غير صالح.");
    if (!translations.ar.title.trim() || !translations.ar.excerpt.trim() || !translations.ar.content.trim()) return setMessage("العنوان والملخص والمحتوى بالعربية مطلوبة.");
    if (status === "scheduled" && !scheduledAt) return setMessage("حدد موعد النشر.");
    setSaving(true); setMessage("");
    const payload = languages.map((item) => ({ language: item, title: translations[item].title.trim(), excerpt: translations[item].excerpt.trim(), content_html: translations[item].content.trim(), seo_title: translations[item].seoTitle.trim(), seo_description: translations[item].seoDescription.trim() }));
    const { data, error } = await supabase.rpc("pr3_save_blog_post", { p_post_id: activeId, p_slug: slug, p_status: status, p_category: category || "general", p_tags: tags.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean), p_featured_image_url: featuredImage || null, p_scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, p_translations: payload });
    setSaving(false);
    if (error) return setMessage(error.message || "تعذر حفظ المقال.");
    const result = data as { post_id?: number } | null;
    if (result?.post_id) setActiveId(result.post_id);
    setMessage("تم حفظ المقال بنجاح."); await loadRows();
  }

  async function publish(action: "publish" | "unpublish") {
    if (!supabase || !activeId || saving) return;
    setSaving(true);
    const { error } = await supabase.rpc(action === "publish" ? "pr3_publish_blog_post" : "pr3_unpublish_blog_post", { p_post_id: activeId });
    setSaving(false);
    if (error) return setMessage(error.message || "تعذر تحديث النشر.");
    setStatus(action === "publish" ? "published" : "unpublished"); setMessage(action === "publish" ? "تم نشر المقال." : "تم إلغاء نشر المقال."); await loadRows();
  }

  if (loading) return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">جاري تحميل إدارة المدونة...</div>;
  if (!authorized) return <div className="rounded-3xl border border-red-300/20 bg-red-500/10 p-8 text-red-100">{message}</div>;

  return <div className="grid gap-7 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">المقالات</h2><button type="button" onClick={reset} className="min-h-11 rounded-xl bg-purple-600 px-4 font-black">مقال جديد</button></div>
      <div className="mt-5 space-y-3">{rows.length ? rows.map((row) => <button key={row.id} type="button" onClick={() => selectRow(row)} className={`w-full rounded-2xl border p-4 text-right ${activeId === row.id ? "border-purple-300/50 bg-purple-500/15" : "border-white/10 bg-black/20"}`}><strong className="block truncate">{row.blog_post_translations?.find((item) => item.language === "ar")?.title || row.slug}</strong><span className="mt-2 block text-xs text-white/50">{row.status} · {row.slug}</span></button>) : <p className="rounded-2xl border border-white/10 p-4 text-sm text-white/55">لا توجد مقالات محفوظة.</p>}</div>
    </aside>

    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">{activeId ? "تعديل المقال" : "إنشاء مقال"}</h2><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-purple-600 px-5 font-black">{saving ? "جاري الحفظ..." : "حفظ"}</button>{activeId ? <button type="button" disabled={saving} onClick={() => void publish(status === "published" ? "unpublish" : "publish")} className="min-h-11 rounded-xl border border-green-300/25 bg-green-500/10 px-4 font-black text-green-100">{status === "published" ? "إلغاء النشر" : "نشر الآن"}</button> : null}</div></div>
        {message ? <p role="status" className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{message}</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">الرابط المختصر<input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""))} dir="ltr" className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label>
          <label className="text-sm font-bold">الحالة<select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#12051c] px-3"><option value="draft">مسودة</option><option value="scheduled">مجدول</option><option value="unpublished">غير منشور</option>{status === "published" ? <option value="published">منشور</option> : null}</select></label>
          <label className="text-sm font-bold">التصنيف<input value={category} onChange={(e) => setCategory(e.target.value)} dir="ltr" className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label>
          <label className="text-sm font-bold">الوسوم<input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label>
          <label className="text-sm font-bold md:col-span-2">الصورة البارزة<input value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} dir="ltr" className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label>
          {status === "scheduled" ? <label className="text-sm font-bold md:col-span-2">موعد النشر<input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div role="tablist" aria-label="لغات المقال" className="grid grid-cols-3 gap-2">{languages.map((item) => <button key={item} type="button" role="tab" aria-selected={language === item} onClick={() => setLanguage(item)} className={`min-h-11 rounded-xl font-black ${language === item ? "bg-purple-600" : "border border-white/10 bg-black/20 text-white/65"}`}>{labels[item]}</button>)}</div>
        <div className="mt-6 grid gap-4">
          <label className="text-sm font-bold">العنوان<input value={active.title} onChange={(e) => update("title", e.target.value)} dir={language === "ar" ? "rtl" : "ltr"} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label>
          <label className="text-sm font-bold">الملخص<textarea value={active.excerpt} onChange={(e) => update("excerpt", e.target.value)} dir={language === "ar" ? "rtl" : "ltr"} rows={3} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3" /></label>
          <label className="text-sm font-bold">المحتوى<textarea value={active.content} onChange={(e) => update("content", e.target.value)} dir={language === "ar" ? "rtl" : "ltr"} rows={12} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3 leading-8" /></label>
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">عنوان SEO<input value={active.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3" /></label><label className="text-sm font-bold">وصف SEO<textarea value={active.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3" /></label></div>
        </div>
      </div>

      <article dir={language === "ar" ? "rtl" : "ltr"} className="rounded-3xl border border-purple-300/20 bg-black/35 p-6"><p className="text-sm font-black text-purple-200">معاينة {labels[language]}</p><h3 className="mt-3 text-3xl font-black">{active.title || "عنوان المقال"}</h3><p className="mt-4 leading-8 text-white/65">{active.excerpt || "ملخص المقال"}</p><div className="prose prose-invert mt-7 max-w-none" dangerouslySetInnerHTML={{ __html: preview || "<p>ستظهر معاينة المحتوى هنا.</p>" }} /></article>
    </section>
  </div>;
}
