"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";
import { supabase } from "@/lib/supabase";

type FaqItem = {
  id: number;
  question: string | null;
  answer: string | null;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
};

type FaqForm = {
  question: string;
  answer: string;
  category: string;
  sort_order: string;
  is_published: boolean;
};

const emptyForm: FaqForm = {
  question: "",
  answer: "",
  category: "عام",
  sort_order: "1",
  is_published: true,
};

function toForm(item: FaqItem): FaqForm {
  return {
    question: item.question || "",
    answer: item.answer || "",
    category: item.category || "عام",
    sort_order: String(item.sort_order || 1),
    is_published: item.is_published !== false,
  };
}

function toPayload(form: FaqForm) {
  return {
    question: form.question.trim(),
    answer: form.answer.trim(),
    category: form.category.trim() || "عام",
    sort_order: Number(form.sort_order) || 1,
    is_published: form.is_published,
  };
}

function snapshot(item: FaqItem | null | undefined) {
  if (!item) return null;
  return {
    id: item.id,
    question: item.question,
    answer: item.answer,
    category: item.category,
    sort_order: item.sort_order,
    is_published: item.is_published,
  };
}

export default function AdminFaqsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [items, setItems] = useState<FaqItem[]>([]);
  const [form, setForm] = useState<FaqForm>(emptyForm);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("pages");

      if (!access.isAuthorized || !access.profile) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadFaqs();
  }, [isAuthorized]);

  async function loadFaqs() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("faqs")
      .select("id, question, answer, category, sort_order, is_published")
      .order("sort_order", { ascending: true });

    setIsLoading(false);

    if (loadError) {
      setError("تعذر تحميل الأسئلة الشائعة.");
      return;
    }

    setItems((data || []) as FaqItem[]);
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.question, item.answer, item.category]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [items, search]);

  function resetForm() {
    setEditingItem(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function startEdit(item: FaqItem) {
    setEditingItem(item);
    setForm(toForm(item));
    setMessage("");
    setError("");
  }

  async function saveFaq(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) return;
    if (!form.question.trim() || !form.answer.trim()) {
      setError("السؤال والإجابة مطلوبان.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    const payload = toPayload(form);

    if (editingItem) {
      const { data, error: updateError } = await supabase
        .from("faqs")
        .update(payload as never)
        .eq("id", editingItem.id)
        .select("id, question, answer, category, sort_order, is_published")
        .single();

      setIsSaving(false);

      if (updateError || !data) {
        setError("فشل تحديث السؤال الشائع.");
        return;
      }

      const updatedItem = data as FaqItem;

      await logAdminActivity({
        action: "update_faq",
        module: "faqs",
        adminEmail,
        recordId: editingItem.id,
        oldData: snapshot(editingItem),
        newData: snapshot(updatedItem),
      });

      setItems((current) => current.map((item) => (item.id === editingItem.id ? updatedItem : item)));
      setEditingItem(updatedItem);
      setForm(toForm(updatedItem));
      setMessage("تم تحديث السؤال الشائع بنجاح.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("faqs")
      .insert(payload as never)
      .select("id, question, answer, category, sort_order, is_published")
      .single();

    setIsSaving(false);

    if (insertError || !data) {
      setError("فشل إضافة السؤال الشائع.");
      return;
    }

    const createdItem = data as FaqItem;

    await logAdminActivity({
      action: "create_faq",
      module: "faqs",
      adminEmail,
      recordId: createdItem.id,
      newData: snapshot(createdItem),
    });

    setItems((current) => [...current, createdItem].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    setForm(emptyForm);
    setMessage("تمت إضافة السؤال الشائع بنجاح.");
  }

  async function togglePublished(item: FaqItem) {
    if (!supabase) return;

    setMessage("");
    setError("");

    const nextValue = item.is_published === false;
    const { data, error: updateError } = await supabase
      .from("faqs")
      .update({ is_published: nextValue } as never)
      .eq("id", item.id)
      .select("id, question, answer, category, sort_order, is_published")
      .single();

    if (updateError || !data) {
      setError("فشل تغيير حالة ظهور السؤال.");
      return;
    }

    const updatedItem = data as FaqItem;

    await logAdminActivity({
      action: nextValue ? "publish_faq" : "hide_faq",
      module: "faqs",
      adminEmail,
      recordId: item.id,
      oldData: snapshot(item),
      newData: snapshot(updatedItem),
    });

    setItems((current) => current.map((faq) => (faq.id === item.id ? updatedItem : faq)));
    if (editingItem?.id === item.id) {
      setEditingItem(updatedItem);
      setForm(toForm(updatedItem));
    }
    setMessage(nextValue ? "تم إظهار السؤال الشائع." : "تم إخفاء السؤال الشائع.");
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-36 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-black text-yellow-100">
              إدارة المحتوى
            </div>
            <h1 className="text-4xl font-black md:text-5xl">الأسئلة الشائعة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              إضافة وتعديل الأسئلة التي تظهر في صفحة الأسئلة الشائعة العامة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/faq" target="_blank" className="rounded-full border border-purple-300/25 bg-purple-500/10 px-6 py-3 font-black text-purple-100">
              معاينة الصفحة
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={saveFaq} className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-5 shadow-[0_0_60px_rgba(168,85,247,0.12)]">
            <h2 className="text-2xl font-black">{editingItem ? "تعديل سؤال" : "إضافة سؤال جديد"}</h2>

            <label className="mt-5 block text-sm font-bold text-white/65">السؤال</label>
            <input
              value={form.question}
              onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white outline-none focus:border-purple-300/60"
              placeholder="اكتب السؤال"
            />

            <label className="mt-4 block text-sm font-bold text-white/65">الإجابة</label>
            <textarea
              value={form.answer}
              onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
              className="mt-2 min-h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white outline-none focus:border-purple-300/60"
              placeholder="اكتب الإجابة"
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-white/65">التصنيف</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white outline-none focus:border-purple-300/60"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/65">الترتيب</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white outline-none focus:border-purple-300/60"
                />
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold text-white/75">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))}
              />
              منشور على الموقع
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={isSaving} className="rounded-2xl bg-purple-600 px-6 py-3 font-black text-white hover:bg-purple-500 disabled:opacity-60">
                {isSaving ? "جاري الحفظ..." : editingItem ? "حفظ التعديل" : "إضافة السؤال"}
              </button>
              {editingItem && (
                <button type="button" onClick={resetForm} className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/70">
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">قائمة الأسئلة</h2>
                <p className="mt-1 text-sm text-white/45">الإجمالي: {items.length}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="بحث..."
                  className="rounded-full border border-white/10 bg-black/25 px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-yellow-300/50"
                />
                <button type="button" onClick={loadFaqs} className="rounded-full border border-yellow-300/25 bg-yellow-500/10 px-5 py-3 font-bold text-yellow-100">
                  {isLoading ? "تحديث..." : "تحديث"}
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredItems.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/55">
                  لا توجد أسئلة مطابقة حالياً.
                </div>
              )}

              {filteredItems.map((item) => (
                <article key={item.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-100">
                      {item.category || "عام"}
                    </span>
                    <span className={item.is_published === false ? "rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-black text-red-100" : "rounded-full border border-green-400/20 bg-green-500/10 px-3 py-1 text-xs font-black text-green-100"}>
                      {item.is_published === false ? "مخفي" : "منشور"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45" dir="ltr">
                      #{item.sort_order || 0}
                    </span>
                  </div>

                  <h3 className="text-xl font-black leading-8">{item.question || "سؤال بدون عنوان"}</h3>
                  <p className="mt-3 whitespace-pre-wrap leading-8 text-white/65">{item.answer || "لا توجد إجابة."}</p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => startEdit(item)} className="rounded-full border border-purple-300/25 bg-purple-500/10 px-5 py-2 font-bold text-purple-100">
                      تعديل
                    </button>
                    <button type="button" onClick={() => togglePublished(item)} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-bold text-white/70">
                      {item.is_published === false ? "إظهار" : "إخفاء"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
