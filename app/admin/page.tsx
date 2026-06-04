"use client";

import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Application = {
  id: number;
  full_name: string;
  country: string;
  whatsapp: string;
  platform: string;
  status: string;
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
        .select("id, full_name, country, whatsapp, platform, status, created_at")
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
        `${app.full_name} ${app.country} ${app.whatsapp} ${app.platform}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [applications, search]);

  const total = applications.length;
  const newCount = applications.filter((a) => a.status === "new").length;
  const reviewCount = applications.filter((a) => a.status === "under_review").length;
  const acceptedCount = applications.filter((a) => a.status === "accepted").length;
  const rejectedCount = applications.filter((a) => a.status === "rejected").length;

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
              placeholder="بحث..."
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
                  <th className="text-right p-3">واتساب</th>
                  <th className="text-right p-3">البرنامج</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">تاريخ الطلب</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td className="p-3" colSpan={7}>
                      لا توجد طلبات حالياً
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id} className="border-b border-white/5">
                      <td className="p-3">{app.full_name}</td>
                      <td className="p-3">{app.country}</td>
                      <td className="p-3">{app.whatsapp}</td>
                      <td className="p-3">{app.platform}</td>
                      <td className="p-3">
                        {statusLabel[app.status] || app.status}
                      </td>
                      <td className="p-3">
                        {new Date(app.created_at).toLocaleDateString("ar")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(app.id, "under_review")}
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
