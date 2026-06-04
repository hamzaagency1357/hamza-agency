"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const text =
        `${app.full_name} ${app.country} ${app.whatsapp} ${app.platform} ${app.status}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [applications, search]);

  const total = applications.length;
  const newCount = applications.filter((a) => a.status === "new").length;
  const reviewCount = applications.filter(
    (a) => a.status === "under_review"
  ).length;
  const acceptedCount = applications.filter(
    (a) => a.status === "accepted"
  ).length;
  const rejectedCount = applications.filter(
    (a) => a.status === "rejected"
  ).length;

  function openDetails(app: Application) {
    setSelectedApplication(app);
    setInternalNotes(app.internal_notes || "");
  }

  function closeDetails() {
    setSelectedApplication(null);
    setInternalNotes("");
  }

  async function updateStatus(id: number, status: string) {
    if (!supabase) {
      alert("Supabase غير متصل");
      return;
    }

    const { error } = await supabase
      .from("agency_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("فشل تحديث الطلب");
      return;
    }

    setApplications((current) =>
      current.map((app) =>
        app.id === id ? { ...app, status } : app
      )
    );

    setSelectedApplication((current) =>
      current && current.id === id ? { ...current, status } : current
    );
  }

  async function saveInternalNotes() {
    if (!selectedApplication || !supabase) {
      alert("لا يوجد طلب محدد");
      return;
    }

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

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
    } catch {
      alert("لم يتم النسخ. حاول مرة أخرى.");
    }
  }

  function copyWhatsapp(app: Application) {
    copyText(app.whatsapp || "", "تم نسخ رقم الواتساب");
  }

  function copyAllApplicationInfo(app: Application) {
    const info = `
طلب انضمام جديد - وكالة حمزة

الاسم: ${app.full_name || "-"}
الدولة: ${app.country || "-"}
رقم الواتساب: ${app.whatsapp || "-"}
البرنامج: ${app.platform || "-"}
الحالة: ${statusLabel[app.status] || app.status || "-"}
تاريخ الطلب: ${formatDate(app.created_at)}

الخبرات السابقة:
${app.previous_experience || "-"}

الملاحظات الإضافية:
${app.notes || "-"}

ملاحظات الأدمن:
${app.internal_notes || "-"}
`.trim();

    copyText(info, "تم نسخ جميع معلومات الطلب");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">لوحة إدارة وكالة حمزة</h1>

        <p className="text-zinc-400 mb-10">
          إدارة طلبات الانضمام والبرامج والمحتوى
        </p>

        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <StatCard title="إجمالي الطلبات" value={total} />
          <StatCard title="طلبات جديدة" value={newCount} />
          <StatCard title="طلبات قيد المراجعة" value={reviewCount} />
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
              className="bg-black/40 border border-purple-500/20 rounded-xl px-4 py-2 w-full md:w-96"
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
                      <td className="p-3">{formatDate(app.created_at)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openDetails(app)}
                            className="rounded-lg border border-purple-500/30 px-3 py-1 text-purple-200"
                          >
                            عرض التفاصيل
                          </button>

                          <button
                            onClick={() =>
                              updateStatus(app.id, "under_review")
                            }
                            className="rounded-lg border border-yellow-500/30 px-3 py-1 text-yellow-300"
                          >
                            مراجعة
                          </button>

                          <button
                            onClick={() => updateStatus(app.id, "accepted")}
                            className="rounded-lg border border-green-500/30 px-3 py-1 text-green-300"
                          >
                            قبول
                          </button>

                          <button
                            onClick={() => updateStatus(app.id, "rejected")}
                            className="rounded-lg border border-red-500/30 px-3 py-1 text-red-300"
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
      </div>

      {selectedApplication && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-3xl border border-purple-500/30 bg-[#0b0010] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">تفاصيل الطلب</h2>
                <p className="text-zinc-400">
                  عرض كامل معلومات مقدم الطلب وإدارة حالته.
                </p>
              </div>

              <button
                onClick={closeDetails}
                className="rounded-xl border border-white/10 px-4 py-2 text-zinc-300"
              >
                إغلاق
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <DetailCard label="الاسم الكامل" value={selectedApplication.full_name} />
              <DetailCard label="الدولة" value={selectedApplication.country} />
              <DetailCard label="البرنامج" value={selectedApplication.platform} />
              <DetailCard
                label="الحالة"
                value={
                  statusLabel[selectedApplication.status] ||
                  selectedApplication.status
                }
              />
              <DetailCard
                label="تاريخ الطلب"
                value={formatDate(selectedApplication.created_at)}
              />

              <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-4">
                <div className="text-zinc-400 mb-2">رقم الواتساب</div>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold break-all">
                    {selectedApplication.whatsapp || "-"}
                  </div>

                  <button
                    onClick={() => copyWhatsapp(selectedApplication)}
                    className="shrink-0 rounded-lg border border-green-500/30 px-3 py-1 text-green-300"
                  >
                    نسخ الرقم
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <LongDetail
                label="الخبرات السابقة"
                value={selectedApplication.previous_experience}
              />

              <LongDetail
                label="الملاحظات الإضافية"
                value={selectedApplication.notes}
              />
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-4 mb-6">
              <div className="text-zinc-400 mb-3">ملاحظات الأدمن الداخلية</div>

              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="اكتب ملاحظات داخلية لا تظهر للمتقدم..."
                className="w-full min-h-32 rounded-xl border border-purple-500/20 bg-black/40 p-4 text-white outline-none"
              />

              <button
                onClick={saveInternalNotes}
                className="mt-3 rounded-xl bg-purple-600 px-5 py-2 font-bold"
              >
                حفظ ملاحظات الأدمن
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyAllApplicationInfo(selectedApplication)}
                className="rounded-xl border border-purple-500/30 px-4 py-2 text-purple-200"
              >
                نسخ جميع معلومات الطلب
              </button>

              <button
                onClick={() =>
                  updateStatus(selectedApplication.id, "under_review")
                }
                className="rounded-xl border border-yellow-500/30 px-4 py-2 text-yellow-300"
              >
                وضع قيد المراجعة
              </button>

              <button
                onClick={() =>
                  updateStatus(selectedApplication.id, "accepted")
                }
                className="rounded-xl border border-green-500/30 px-4 py-2 text-green-300"
              >
                قبول الطلب
              </button>

              <button
                onClick={() =>
                  updateStatus(selectedApplication.id, "rejected")
                }
                className="rounded-xl border border-red-500/30 px-4 py-2 text-red-300"
              >
                رفض الطلب
              </button>
            </div>
          </div>
        </div>
      )}
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

function DetailCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-4">
      <div className="text-zinc-400 mb-2">{label}</div>
      <div className="font-bold break-words">{value || "-"}</div>
    </div>
  );
}

function LongDetail({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-4">
      <div className="text-zinc-400 mb-2">{label}</div>
      <div className="whitespace-pre-wrap leading-8">{value || "-"}</div>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ar");
}
