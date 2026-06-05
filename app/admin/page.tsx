"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Application = {
  id: number;
  full_name: string;
  country: string;
  whatsapp: string;
  platform: string;
  previous_experience: string | null;
  notes: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

export default function AdminPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    async function checkAdminAccess() {
      if (!isSupabaseConfigured || !supabase) {
        router.replace("/admin/login");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "current_user_is_admin"
      );

      if (adminError || !isAdmin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAdminAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;

    async function loadApplications() {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase غير متصل.");
        return;
      }

      const { data, error } = await supabase
        .from("agency_applications")
        .select(
          "id, full_name, country, whatsapp, platform, previous_experience, notes, status, internal_notes, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError("لا يمكن قراءة الطلبات حالياً. سنراجع صلاحيات RLS.");
        return;
      }

      setApplications(data || []);
    }

    loadApplications();
  }, [isAuthorized]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const text = `${app.full_name} ${app.country} ${app.whatsapp} ${app.platform}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [applications, search]);

  const total = applications.length;
  const newCount = applications.filter((a) => a.status === "new").length;
  const underReviewCount = applications.filter(
    (a) => a.status === "under_review"
  ).length;
  const acceptedCount = applications.filter(
    (a) => a.status === "accepted"
  ).length;
  const rejectedCount = applications.filter(
    (a) => a.status === "rejected"
  ).length;

  async function updateStatus(id: number, status: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("agency_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("فشل تحديث حالة الطلب");
      return;
    }

    setApplications((current) =>
      current.map((app) => (app.id === id ? { ...app, status } : app))
    );

    setSelectedApplication((current) =>
      current && current.id === id ? { ...current, status } : current
    );
  }

  async function saveInternalNotes() {
    if (!supabase || !selectedApplication) return;

    const { error } = await supabase
      .from("agency_applications")
      .update({ internal_notes: internalNotes })
      .eq("id", selectedApplication.id);

    if (error) {
      alert("فشل حفظ ملاحظات الأدمن");
      return;
    }

    setApplications((current) =>
      current.map((app) =>
        app.id === selectedApplication.id
          ? { ...app, internal_notes: internalNotes }
          : app
      )
    );

    setSelectedApplication({
      ...selectedApplication,
      internal_notes: internalNotes,
    });

    alert("تم حفظ ملاحظات الأدمن بنجاح");
  }

  function openDetails(app: Application) {
    setSelectedApplication(app);
    setInternalNotes(app.internal_notes || "");
  }

  function copyWhatsAppNumber(number: string) {
    navigator.clipboard.writeText(number);
    alert("تم نسخ رقم الواتساب");
  }

  function copyApplicationInfo(app: Application) {
    const info = `
الاسم الكامل: ${app.full_name}
الدولة: ${app.country}
رقم الواتساب: ${app.whatsapp}
البرنامج: ${app.platform}
الحالة: ${statusLabel[app.status] || app.status}
تاريخ الطلب: ${new Date(app.created_at).toLocaleDateString("ar")}
الخبرات السابقة: ${app.previous_experience || "لا يوجد"}
الملاحظات الإضافية: ${app.notes || "لا يوجد"}
ملاحظات الأدمن: ${app.internal_notes || "لا يوجد"}
    `.trim();

    navigator.clipboard.writeText(info);
    alert("تم نسخ جميع معلومات الطلب");
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (isCheckingAuth) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#070009] text-white flex items-center justify-center"
      >
        جاري التحقق من صلاحية الدخول...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              لوحة إدارة وكالة حمزة
            </h1>
            <p className="text-zinc-400">
              إدارة طلبات الانضمام والبرامج والمحتوى
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-red-500/30 px-4 py-2 text-red-200"
          >
            تسجيل الخروج
          </button>
        </div>

        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <StatCard title="إجمالي الطلبات" value={total} />
          <StatCard title="طلبات جديدة" value={newCount} />
          <StatCard title="طلبات قيد المراجعة" value={underReviewCount} />
          <StatCard title="طلبات مقبولة" value={acceptedCount} />
          <StatCard title="طلبات مرفوضة" value={rejectedCount} />
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center mb-6">
            <h2 className="text-2xl font-bold">طلبات الانضمام</h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، الدولة، الواتساب، البرنامج..."
              className="bg-black/40 border border-purple-500/20 rounded-xl px-4 py-2"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
              {error}
            </div>
          )}

          <div className="overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-purple-500/20 text-zinc-400">
                  <th className="text-right p-3">الاسم</th>
                  <th className="text-right p-3">الدولة</th>
                  <th className="text-right p-3">البرنامج</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">تاريخ الطلب</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td className="p-3" colSpan={6}>
                      لا توجد طلبات حالياً
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="border-b border-white/5">
                      <td className="p-3">{app.full_name}</td>
                      <td className="p-3">{app.country}</td>
                      <td className="p-3">{app.platform}</td>
                      <td className="p-3">
                        {statusLabel[app.status] || app.status}
                      </td>
                      <td className="p-3">
                        {new Date(app.created_at).toLocaleDateString("ar")}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openDetails(app)}
                            className="rounded-lg border border-purple-500/30 px-3 py-1"
                          >
                            عرض التفاصيل
                          </button>
                          <button
                            onClick={() =>
                              updateStatus(app.id, "under_review")
                            }
                            className="rounded-lg border border-yellow-500/30 px-3 py-1 text-yellow-200"
                          >
                            مراجعة
                          </button>
                          <button
                            onClick={() => updateStatus(app.id, "accepted")}
                            className="rounded-lg border border-green-500/30 px-3 py-1 text-green-200"
                          >
                            قبول
                          </button>
                          <button
                            onClick={() => updateStatus(app.id, "rejected")}
                            className="rounded-lg border border-red-500/30 px-3 py-1 text-red-200"
                          >
                            رفض
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedApplication && (
          <div className="fixed inset-0 z-50 bg-black/80 p-4 overflow-auto">
            <div className="max-w-3xl mx-auto rounded-3xl border border-purple-500/30 bg-[#09000d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-bold">تفاصيل الطلب</h3>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="rounded-lg border border-white/20 px-4 py-2"
                >
                  إغلاق
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <InfoCard title="الاسم الكامل" value={selectedApplication.full_name} />
                <InfoCard title="الدولة" value={selectedApplication.country} />
                <InfoCard title="البرنامج" value={selectedApplication.platform} />
                <InfoCard
                  title="الحالة"
                  value={
                    statusLabel[selectedApplication.status] ||
                    selectedApplication.status
                  }
                />
                <InfoCard
                  title="تاريخ الطلب"
                  value={new Date(
                    selectedApplication.created_at
                  ).toLocaleDateString("ar")}
                />

                <div className="rounded-2xl border border-purple-500/20 p-4">
                  <div className="text-zinc-400 mb-2">رقم الواتساب</div>
                  <div className="text-xl mb-3">
                    {selectedApplication.whatsapp}
                  </div>
                  <button
                    onClick={() =>
                      copyWhatsAppNumber(selectedApplication.whatsapp)
                    }
                    className="rounded-lg border border-green-500/30 px-4 py-2 text-green-200"
                  >
                    نسخ الرقم
                  </button>
                </div>
              </div>

              <InfoCard
                title="الخبرات السابقة"
                value={selectedApplication.previous_experience || "لا يوجد"}
              />

              <InfoCard
                title="الملاحظات الإضافية"
                value={selectedApplication.notes || "لا يوجد"}
              />

              <div className="rounded-2xl border border-purple-500/20 p-4 mt-4">
                <div className="text-zinc-400 mb-2">
                  ملاحظات الأدمن الداخلية
                </div>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full min-h-[140px] rounded-xl border border-purple-500/20 bg-black/40 p-4"
                />
                <button
                  onClick={saveInternalNotes}
                  className="mt-4 rounded-xl bg-purple-600 px-6 py-3 font-bold"
                >
                  حفظ ملاحظات الأدمن
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() => copyApplicationInfo(selectedApplication)}
                  className="rounded-xl border border-purple-500/30 px-4 py-2"
                >
                  نسخ جميع معلومات الطلب
                </button>

                <button
                  onClick={() =>
                    updateStatus(selectedApplication.id, "under_review")
                  }
                  className="rounded-xl border border-yellow-500/30 px-4 py-2 text-yellow-200"
                >
                  وضع قيد المراجعة
                </button>

                <button
                  onClick={() =>
                    updateStatus(selectedApplication.id, "accepted")
                  }
                  className="rounded-xl border border-green-500/30 px-4 py-2 text-green-200"
                >
                  قبول الطلب
                </button>

                <button
                  onClick={() =>
                    updateStatus(selectedApplication.id, "rejected")
                  }
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-red-200"
                >
                  رفض الطلب
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
      <div className="text-zinc-400">{title}</div>
      <div className="text-4xl font-bold mt-2">{value}</div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-purple-500/20 p-4 mt-4">
      <div className="text-zinc-400 mb-2">{title}</div>
      <div className="text-xl whitespace-pre-wrap">{value}</div>
    </div>
  );
}
