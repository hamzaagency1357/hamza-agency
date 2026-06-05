"use client";

import Link from "next/link";
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

type DashboardCounts = {
  applications: number;
  programs: number;
  pages: number;
  media: number;
  announcements: number;
  notifications: number;
};

const statusLabel: Record<string, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

const navItems = [
  { title: "لوحة التحكم", href: "/admin", icon: "◆" },
  { title: "طلبات الانضمام", href: "/admin#applications", icon: "◎" },
  { title: "إدارة البرامج", href: "/admin/programs", icon: "▣" },
  { title: "إدارة الصفحات", href: "/admin/pages", icon: "▤" },
  { title: "مكتبة الوسائط", href: "/admin/media", icon: "◈" },
  { title: "الإعلانات", href: "/admin/announcements", icon: "✦" },
  { title: "الإعدادات", href: "/admin/settings", icon: "⚙" },
];

const coreModules = [
  {
    title: "Pages CMS",
    description: "إدارة الصفحات، المحتوى، SEO، وحالة النشر.",
    href: "/admin/pages",
    status: "المرحلة القادمة",
  },
  {
    title: "Settings CMS",
    description: "إدارة اسم الوكالة، الألوان، الواتساب، الروابط، والهوية.",
    href: "/admin/settings",
    status: "جاهز للبناء",
  },
  {
    title: "Media Library",
    description: "إدارة الصور، الفيديوهات، الشعارات، وملفات الموقع.",
    href: "/admin/media",
    status: "جاهز للبناء",
  },
  {
    title: "Announcements",
    description: "إدارة الشريط الإعلاني والتنبيهات المجدولة.",
    href: "/admin/announcements",
    status: "جاهز للبناء",
  },
];

export default function AdminPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const [counts, setCounts] = useState<DashboardCounts>({
    applications: 0,
    programs: 0,
    pages: 0,
    media: 0,
    announcements: 0,
    notifications: 0,
  });

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

      setAdminEmail(session.user.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAdminAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;

    async function loadDashboard() {
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
      } else {
        setApplications(data || []);
      }

      const [
        applicationsCount,
        programsCount,
        pagesCount,
        mediaCount,
        announcementsCount,
        notificationsCount,
      ] = await Promise.all([
        getCount("agency_applications"),
        getCount("programs"),
        getCount("pages"),
        getCount("media"),
        getCount("announcements"),
        getCount("notifications"),
      ]);

      setCounts({
        applications: applicationsCount,
        programs: programsCount,
        pages: pagesCount,
        media: mediaCount,
        announcements: announcementsCount,
        notifications: notificationsCount,
      });
    }

    loadDashboard();
  }, [isAuthorized]);

  async function getCount(table: string) {
    if (!supabase) return 0;

    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error || count === null) return 0;
    return count;
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const text =
        `${app.full_name} ${app.country} ${app.whatsapp} ${app.platform}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [applications, search]);

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
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        <aside className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:w-72">
          <div className="mb-8 rounded-3xl border border-purple-500/20 bg-white/[0.04] p-5">
            <div className="text-sm text-purple-200">HAMZA AGENCY</div>
            <h2 className="mt-2 text-2xl font-black">لوحة التحكم</h2>
            <p className="mt-2 break-all text-xs text-white/45">
              {adminEmail}
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 transition hover:border-purple-400/40 hover:bg-purple-500/10"
              >
                <span>{item.title}</span>
                <span className="text-purple-200">{item.icon}</span>
              </Link>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-8 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200"
          >
            تسجيل الخروج
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="mb-2 text-sm text-purple-200">
                  Core CMS Foundation
                </p>
                <h1 className="text-4xl font-black md:text-5xl">
                  لوحة إدارة وكالة حمزة
                </h1>
                <p className="mt-3 max-w-3xl leading-8 text-white/60">
                  مركز إدارة الطلبات، البرامج، الصفحات، الوسائط، الإعلانات،
                  الإعدادات، والتنبيهات. هذه اللوحة هي الأساس الذي سيتم بناء
                  كامل الموقع عليه وفق خطة HAMZA AGENCY الرسمية.
                </p>
              </div>

              <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-5 text-green-100">
                <div className="text-sm text-green-200">حالة النظام</div>
                <div className="mt-2 text-2xl font-black">متصل</div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard title="الطلبات" value={counts.applications} />
            <StatCard title="البرامج" value={counts.programs} />
            <StatCard title="الصفحات" value={counts.pages} />
            <StatCard title="الوسائط" value={counts.media} />
            <StatCard title="الإعلانات" value={counts.announcements} />
            <StatCard title="التنبيهات" value={counts.notifications} />
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <StatCard title="طلبات جديدة" value={newCount} />
            <StatCard title="قيد المراجعة" value={underReviewCount} />
            <StatCard title="مقبولة" value={acceptedCount} />
            <StatCard title="مرفوضة" value={rejectedCount} />
          </div>

          <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-3xl font-black">وحدات الإدارة</h2>
                <p className="mt-2 text-white/55">
                  هذه الوحدات سيتم بناؤها واحدة تلو الأخرى وربطها بالجداول التي
                  أنشأناها.
                </p>
              </div>
              <Link
                href="/admin/programs"
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-center font-bold"
              >
                فتح إدارة البرامج
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {coreModules.map((module) => (
                <Link
                  key={module.title}
                  href={module.href}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-purple-400/40 hover:bg-purple-500/10"
                >
                  <div className="mb-4 inline-flex rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs text-yellow-100">
                    {module.status}
                  </div>
                  <h3 className="text-2xl font-black">{module.title}</h3>
                  <p className="mt-3 leading-7 text-white/55">
                    {module.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div
            id="applications"
            className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-6"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-3xl font-black">طلبات الانضمام</h2>
                <p className="mt-2 text-white/55">
                  إدارة الطلبات، تغيير الحالة، نسخ الواتساب، وإضافة ملاحظات
                  داخلية.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم، الدولة، الواتساب، البرنامج..."
                className="rounded-2xl border border-purple-500/20 bg-black/40 px-4 py-3 outline-none focus:border-purple-400"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                {error}
              </div>
            )}

            <div className="overflow-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-purple-500/20 text-white/50">
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">الدولة</th>
                    <th className="p-3 text-right">البرنامج</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">تاريخ الطلب</th>
                    <th className="p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td className="p-4 text-white/50" colSpan={6}>
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
                              className="rounded-xl border border-purple-500/30 px-3 py-2 text-sm"
                            >
                              عرض التفاصيل
                            </button>
                            <button
                              onClick={() =>
                                updateStatus(app.id, "under_review")
                              }
                              className="rounded-xl border border-yellow-500/30 px-3 py-2 text-sm text-yellow-200"
                            >
                              مراجعة
                            </button>
                            <button
                              onClick={() => updateStatus(app.id, "accepted")}
                              className="rounded-xl border border-green-500/30 px-3 py-2 text-sm text-green-200"
                            >
                              قبول
                            </button>
                            <button
                              onClick={() => updateStatus(app.id, "rejected")}
                              className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-200"
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
            <div className="fixed inset-0 z-50 overflow-auto bg-black/80 p-4 backdrop-blur">
              <div className="mx-auto max-w-3xl rounded-[2rem] border border-purple-500/30 bg-[#09000d] p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-3xl font-black">تفاصيل الطلب</h3>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="rounded-xl border border-white/20 px-4 py-2"
                  >
                    إغلاق
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoCard
                    title="الاسم الكامل"
                    value={selectedApplication.full_name}
                  />
                  <InfoCard title="الدولة" value={selectedApplication.country} />
                  <InfoCard
                    title="البرنامج"
                    value={selectedApplication.platform}
                  />
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
                    <div className="mb-2 text-white/45">رقم الواتساب</div>
                    <div className="mb-3 text-xl">
                      {selectedApplication.whatsapp}
                    </div>
                    <button
                      onClick={() =>
                        copyWhatsAppNumber(selectedApplication.whatsapp)
                      }
                      className="rounded-xl border border-green-500/30 px-4 py-2 text-green-200"
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

                <div className="mt-4 rounded-2xl border border-purple-500/20 p-4">
                  <div className="mb-2 text-white/45">
                    ملاحظات الأدمن الداخلية
                  </div>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="min-h-[140px] w-full rounded-xl border border-purple-500/20 bg-black/40 p-4 outline-none"
                  />
                  <button
                    onClick={saveInternalNotes}
                    className="mt-4 rounded-xl bg-purple-600 px-6 py-3 font-bold"
                  >
                    حفظ ملاحظات الأدمن
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
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
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-purple-500/20 bg-black/35 p-5">
      <div className="text-sm text-white/45">{title}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-purple-500/20 p-4">
      <div className="mb-2 text-white/45">{title}</div>
      <div className="whitespace-pre-wrap text-xl">{value}</div>
    </div>
  );
}
