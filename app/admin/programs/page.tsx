"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";
import { moveRecordToTrash } from "@/lib/adminTrash";

type Program = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  is_active: boolean | null;
  requirements: string | null;
  benefits: string | null;
  faq: string | null;
  updates: string | null;
};

type ProgramForm = {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  status: string;
  sort_order: string;
  is_visible: boolean;
  is_active: boolean;
  requirements: string;
  benefits: string;
  faq: string;
  updates: string;
};

type ProgramPayload = {
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: string;
  sort_order: number;
  is_visible: boolean;
  is_active: boolean;
  requirements: string | null;
  benefits: string | null;
  faq: string | null;
  updates: string | null;
  updated_at: string;
};

const emptyForm: ProgramForm = {
  name: "",
  slug: "",
  description: "",
  short_description: "",
  status: "active",
  sort_order: "1",
  is_visible: true,
  is_active: true,
  requirements: "",
  benefits: "",
  faq: "",
  updates: "",
};

function getProgramSnapshot(program: Program) {
  return {
    id: program.id,
    name: program.name,
    slug: program.slug,
    description: program.description,
    short_description: program.short_description,
    status: program.status,
    sort_order: program.sort_order,
    is_visible: program.is_visible,
    is_active: program.is_active,
    requirements: program.requirements,
    benefits: program.benefits,
    faq: program.faq,
    updates: program.updates,
  };
}

function getProgramPayloadSnapshot(payload: ProgramPayload) {
  return {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    short_description: payload.short_description,
    status: payload.status,
    sort_order: payload.sort_order,
    is_visible: payload.is_visible,
    is_active: payload.is_active,
    requirements: payload.requirements,
    benefits: payload.benefits,
    faq: payload.faq,
    updates: payload.updates,
  };
}

export default function AdminProgramsPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [trashingProgramId, setTrashingProgramId] = useState<number | null>(null);
  const [form, setForm] = useState<ProgramForm>(emptyForm);

  useEffect(() => {
    async function checkAdminAccess() {
      const access = await requireAdminModuleAccess("programs");

      if (!access.isAuthorized || !access.profile) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAdminAccess();
  }, [router]);

  async function loadPrograms() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("programs")
      .select(
        "id, name, slug, description, short_description, status, sort_order, is_visible, is_active, requirements, benefits, faq, updates"
      )
      .order("sort_order", { ascending: true });

    if (error) {
      setMessage("فشل تحميل البرامج.");
      return;
    }

    setPrograms((data || []) as Program[]);
  }

  useEffect(() => {
    if (isAuthorized) loadPrograms();
  }, [isAuthorized]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const text = `${program.name} ${program.slug} ${program.status}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [programs, search]);

  function updateField(key: keyof ProgramForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(program: Program) {
    setEditingProgram(program);
    setForm({
      name: program.name || "",
      slug: program.slug || "",
      description: program.description || "",
      short_description: program.short_description || "",
      status: program.status || "active",
      sort_order: String(program.sort_order || 1),
      is_visible: Boolean(program.is_visible),
      is_active: Boolean(program.is_active),
      requirements: program.requirements || "",
      benefits: program.benefits || "",
      faq: program.faq || "",
      updates: program.updates || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingProgram(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function saveProgram(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) return;

    if (!form.name || !form.slug) {
      setMessage("اسم البرنامج والرابط المختصر مطلوبان.");
      return;
    }

    const payload: ProgramPayload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      short_description: form.short_description.trim() || null,
      status: form.status.trim() || "active",
      sort_order: Number(form.sort_order) || 1,
      is_visible: form.is_visible,
      is_active: form.is_active,
      requirements: form.requirements.trim() || null,
      benefits: form.benefits.trim() || null,
      faq: form.faq.trim() || null,
      updates: form.updates.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingProgram
      ? await supabase.from("programs").update(payload).eq("id", editingProgram.id)
      : await supabase.from("programs").insert(payload);

    if (result.error) {
      setMessage("فشل حفظ البرنامج. تأكد من عدم تكرار slug.");
      return;
    }

    await logAdminActivity({
      action: editingProgram ? "update_program" : "create_program",
      module: "programs",
      adminEmail,
      recordId: editingProgram ? editingProgram.id : payload.slug,
      details: editingProgram ? "تعديل برنامج من لوحة الإدارة" : "إضافة برنامج من لوحة الإدارة",
      oldData: editingProgram ? getProgramSnapshot(editingProgram) : null,
      newData: getProgramPayloadSnapshot(payload),
    });

    setMessage(editingProgram ? "تم تعديل البرنامج بنجاح." : "تم إضافة البرنامج بنجاح.");
    resetForm();
    await loadPrograms();
  }

  async function toggleProgram(program: Program, key: "is_visible" | "is_active") {
    if (!supabase) return;

    const nextValue = !program[key];
    const { error } = await supabase
      .from("programs")
      .update({ [key]: nextValue, updated_at: new Date().toISOString() })
      .eq("id", program.id);

    if (error) {
      alert("فشل تحديث حالة البرنامج");
      return;
    }

    await logAdminActivity({
      action: key === "is_visible" ? "toggle_program_visibility" : "toggle_program_active_status",
      module: "programs",
      adminEmail,
      recordId: program.id,
      details: key === "is_visible" ? "تغيير ظهور البرنامج" : "تغيير تفعيل البرنامج",
      oldData: getProgramSnapshot(program),
      newData: {
        id: program.id,
        name: program.name,
        slug: program.slug,
        [key]: nextValue,
      },
    });

    await loadPrograms();
  }

  async function moveProgramToTrash(program: Program) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `سيتم نقل برنامج "${program.name}" إلى سلة المحذوفات. سيتم حفظ نسخة كاملة منه أولاً، ثم إخفاؤه وتعطيله من الموقع. يمكن استرجاعه لاحقاً من سلة المحذوفات. هل تريد المتابعة؟`
    );

    if (!confirmed) return;

    const snapshot = getProgramSnapshot(program);
    setMessage("");
    setTrashingProgramId(program.id);

    try {
      const trashResult = await moveRecordToTrash({
        supabase,
        tableName: "programs",
        recordId: program.id,
        title: program.name,
        record: snapshot,
        adminEmail,
        reason: "نقل برنامج إلى السلة من لوحة الإدارة",
      });

      if (!trashResult.success) {
        setMessage(`تعذر نقل البرنامج إلى السلة: ${trashResult.error || "خطأ غير معروف"}`);
        return;
      }

      const { error } = await supabase
        .from("programs")
        .update({
          is_visible: false,
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", program.id);

      if (error) {
        setMessage(
          "تم حفظ نسخة البرنامج داخل السلة، لكن تعذر إخفاؤه وتعطيله. البرنامج ما زال موجوداً؛ لا تعاود النقل قبل مراجعة السلة."
        );
        return;
      }

      await logAdminActivity({
        action: "archive_program_to_trash",
        module: "programs",
        adminEmail,
        recordId: program.id,
        details: "نقل برنامج إلى السلة ثم إخفاؤه وتعطيله",
        oldData: snapshot,
        newData: {
          ...snapshot,
          is_visible: false,
          is_active: false,
        },
      });

      if (editingProgram?.id === program.id) {
        setEditingProgram(null);
        setForm(emptyForm);
      }

      await loadPrograms();
      setMessage("تم نقل البرنامج إلى سلة المحذوفات وإخفاؤه وتعطيله. يمكنك استرجاعه من صفحة السلة.");
    } finally {
      setTrashingProgramId(null);
    }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] text-white flex items-center justify-center">
        جاري التحقق من صلاحية الدخول...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">إدارة البرامج</h1>
            <p className="mt-2 text-zinc-400">إضافة وتعديل وإخفاء برامج وكالة حمزة</p>
          </div>

          <div className="flex gap-3">
            <Link href="/admin" className="rounded-xl border border-purple-500/30 px-4 py-2">
              العودة للوحة الطلبات
            </Link>
            <button onClick={logout} className="rounded-xl border border-red-500/30 px-4 py-2 text-red-200">
              تسجيل الخروج
            </button>
          </div>
        </div>

        <form onSubmit={saveProgram} className="mb-8 rounded-3xl border border-purple-500/20 bg-black/30 p-6">
          <h2 className="mb-6 text-2xl font-bold">
            {editingProgram ? "تعديل برنامج" : "إضافة برنامج جديد"}
          </h2>

          {message && (
            <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
              {message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="اسم البرنامج" className="rounded-xl border border-purple-500/20 bg-black/40 p-4" />
            <input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="slug مثل tiktok" className="rounded-xl border border-purple-500/20 bg-black/40 p-4" />
            <input value={form.status} onChange={(e) => updateField("status", e.target.value)} placeholder="status مثل active" className="rounded-xl border border-purple-500/20 bg-black/40 p-4" />
            <input value={form.sort_order} onChange={(e) => updateField("sort_order", e.target.value)} placeholder="الترتيب" className="rounded-xl border border-purple-500/20 bg-black/40 p-4" />
          </div>

          <textarea value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} placeholder="وصف قصير" className="mt-4 min-h-24 w-full rounded-xl border border-purple-500/20 bg-black/40 p-4" />
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="وصف البرنامج" className="mt-4 min-h-28 w-full rounded-xl border border-purple-500/20 bg-black/40 p-4" />
          <textarea value={form.requirements} onChange={(e) => updateField("requirements", e.target.value)} placeholder="شروط القبول" className="mt-4 min-h-28 w-full rounded-xl border border-purple-500/20 bg-black/40 p-4" />
          <textarea value={form.benefits} onChange={(e) => updateField("benefits", e.target.value)} placeholder="المميزات / ماذا تقدم الوكالة" className="mt-4 min-h-28 w-full rounded-xl border border-purple-500/20 bg-black/40 p-4" />
          <textarea value={form.updates} onChange={(e) => updateField("updates", e.target.value)} placeholder="التحديثات" className="mt-4 min-h-24 w-full rounded-xl border border-purple-500/20 bg-black/40 p-4" />
          <textarea value={form.faq} onChange={(e) => updateField("faq", e.target.value)} placeholder="FAQ" className="mt-4 min-h-24 w-full rounded-xl border border-purple-500/20 bg-black/40 p-4" />

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_visible} onChange={(e) => updateField("is_visible", e.target.checked)} />
              ظاهر بالموقع
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} />
              فعال
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" className="rounded-xl bg-purple-600 px-6 py-3 font-bold">
              {editingProgram ? "حفظ التعديل" : "إضافة البرنامج"}
            </button>

            {editingProgram && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-white/20 px-6 py-3">
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>

        <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">قائمة البرامج</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="rounded-xl border border-purple-500/20 bg-black/40 px-4 py-2" />
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-purple-500/20 text-zinc-400">
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">Slug</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الترتيب</th>
                  <th className="p-3 text-right">ظاهر</th>
                  <th className="p-3 text-right">فعال</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrograms.map((program) => (
                  <tr key={program.id} className="border-b border-white/5">
                    <td className="p-3">{program.name}</td>
                    <td className="p-3">{program.slug}</td>
                    <td className="p-3">{program.status}</td>
                    <td className="p-3">{program.sort_order}</td>
                    <td className="p-3">{program.is_visible ? "نعم" : "لا"}</td>
                    <td className="p-3">{program.is_active ? "نعم" : "لا"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => startEdit(program)} disabled={Boolean(trashingProgramId)} className="rounded-lg border border-purple-500/30 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-45">
                          تعديل
                        </button>
                        <button onClick={() => toggleProgram(program, "is_visible")} disabled={Boolean(trashingProgramId)} className="rounded-lg border border-yellow-500/30 px-3 py-1 text-yellow-200 disabled:cursor-not-allowed disabled:opacity-45">
                          {program.is_visible ? "إخفاء" : "إظهار"}
                        </button>
                        <button onClick={() => toggleProgram(program, "is_active")} disabled={Boolean(trashingProgramId)} className="rounded-lg border border-green-500/30 px-3 py-1 text-green-200 disabled:cursor-not-allowed disabled:opacity-45">
                          {program.is_active ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProgramToTrash(program)}
                          disabled={Boolean(trashingProgramId)}
                          className="rounded-lg border border-red-500/35 px-3 py-1 text-red-200 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {trashingProgramId === program.id ? "جاري النقل..." : "نقل إلى السلة"}
                        </button>
                        <Link href={`/programs/${program.slug}`} className="rounded-lg border border-white/20 px-3 py-1">
                          عرض
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredPrograms.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-zinc-400">
                      لا توجد برامج حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
