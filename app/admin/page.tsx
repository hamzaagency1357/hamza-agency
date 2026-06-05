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

type Tone =
  | "purple"
  | "gold"
  | "green"
  | "blue"
  | "cyan"
  | "pink"
  | "amber"
  | "red"
  | "slate";

const statusLabel: Record<string, string> = {
  new: "جديد",
  under_review: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

const statusTone: Record<string, Tone> = {
  new: "blue",
  under_review: "amber",
  accepted: "green",
  rejected: "red",
};

const navItems = [
  {
    title: "لوحة التحكم",
    href: "/admin",
    icon: "◆",
    tone: "gold" as Tone,
    description: "الرئيسية",
  },
  {
    title: "طلبات الانضمام",
    href: "/admin#applications",
    icon: "◎",
    tone: "blue" as Tone,
    description: "المتقدمون",
  },
  {
    title: "إدارة البرامج",
    href: "/admin/programs",
    icon: "▣",
    tone: "purple" as Tone,
    description: "TikTok / BIGO / Xena",
  },
  {
    title: "إدارة الصفحات",
    href: "/admin/pages",
    icon: "▤",
    tone: "cyan" as Tone,
    description: "Pages CMS",
  },
  {
    title: "مكتبة الوسائط",
    href: "/admin/media",
    icon: "◈",
    tone: "pink" as Tone,
    description: "صور وفيديوهات",
  },
  {
    title: "الإعلانات",
    href: "/admin/announcements",
    icon: "✦",
    tone: "amber" as Tone,
    description: "الشريط العلوي",
  },
  {
    title: "الإعدادات",
    href: "/admin/settings",
    icon: "⚙",
    tone: "green" as Tone,
    description: "هوية و SEO",
  },
];

const coreModules = [
  {
    title: "Programs",
    subtitle: "إدارة البرامج",
    description: "إضافة وتعديل وإظهار وإخفاء برامج الوكالة وربطها بالصفحات العامة.",
    href: "/admin/programs",
    status: "مكتمل",
    tone: "purple" as Tone,
  },
  {
    title: "Pages CMS",
    subtitle: "إدارة الصفحات",
    description: "إنشاء وتعديل صفحات الموقع وربطها بالمحتوى و SEO وحالة النشر.",
    href: "/admin/pages",
    status: "مكتمل",
    tone: "cyan" as Tone,
  },
  {
    title: "Settings CMS",
    subtitle: "إعدادات الموقع",
    description: "إدارة اسم الوكالة، الألوان، الواتساب، البريد، SEO، اللغات، والصيانة.",
    href: "/admin/settings",
    status: "مكتمل",
    tone: "green" as Tone,
  },
  {
    title: "Media Library",
    subtitle: "مكتبة الوسائط",
    description: "إدارة الصور، الفيديوهات، الشعارات، الخلفيات، والوسائط البرمجية.",
    href: "/admin/media",
    status: "مكتمل",
    tone: "pink" as Tone,
  },
  {
    title: "Announcements",
    subtitle: "الإعلانات",
    description: "إدارة الشريط الإعلاني والتنبيهات العامة وجدولة الظهور والإخفاء.",
    href: "/admin/announcements",
    status: "مكتمل",
    tone: "amber" as Tone,
  },
];

const upcomingModules = [
  {
    title: "الخدمات",
    description: "إدارة خدمات الوكالة والخدمات الرقمية ونماذج الطلب.",
    tone: "purple" as Tone,
  },
  {
    title: "الوظائف",
    description: "إدارة الوظائف والأسئلة المخصصة وطلبات التقديم.",
    tone: "blue" as Tone,
  },
  {
    title: "التقييمات وقصص النجاح",
    description: "إدارة آراء العملاء والشركاء والنجاحات والمعرض.",
    tone: "gold" as Tone,
  },
  {
    title: "Operations",
    description: "Activity Log، Trash، Version History، Backup، Export.",
    tone: "green" as Tone,
  },
  {
    title: "AI Support",
    description: "مركز الذكاء الصناعي وقاعدة المعرفة والتحويل إلى واتساب.",
    tone: "cyan" as Tone,
  },
  {
    title: "Page Builder",
    description: "منشئ صفحات احترافي White Label Ready.",
    tone: "pink" as Tone,
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
        className="flex min-h-screen items-center justify-center bg-[#070009] text-white"
      >
        <div className="rounded-3xl border border-purple-500/25 bg-black/40 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.25)]">
          <div className="mb-3 text-sm text-purple-200">HAMZA AGENCY</div>
          <div className="text-2xl font-black">جاري التحقق من صلاحية الدخول...</div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_42%,#000_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        <aside className="rounded-[2rem] border border-purple-500/20 bg-black/45 p-4 shadow-[0_0_80px_rgba(124,58,237,0.12)] backdrop-blur lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:w-80">
          <div className="mb-5 overflow-hidden rounded-3xl border border-yellow-400/25 bg-gradient-to-br from-yellow-400/10 via-purple-500/10 to-black p-5">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-200">
              HAMZA AGENCY
            </div>
            <h2 className="mt-3 text-3xl font-black text-white">
              لوحة التحكم
            </h2>
            <p className="mt-2 break-all text-xs leading-6 text-white/50">
              {adminEmail}
            </p>

            <div className="mt-4 rounded-2xl border border-green-500/25 bg-green-500/10 p-3">
              <div className="text-xs text-green-200">حالة النظام</div>
              <div className="mt-1 text-lg font-black text-green-100">
                متصل بقاعدة البيانات
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${toneSoftClasses(
                  item.tone
                )}`}
              >
                <div>
                  <div className="font-bold text-white">{item.title}</div>
                  <div className="mt-1 text-xs text-white/45">
                    {item.description}
                  </div>
                </div>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg ${toneIconClasses(
                    item.tone
                  )}`}
                >
                  {item.icon}
                </span>
              </Link>
            ))}
          </nav>

          <button
            onClick={logout}
            className="mt-6 w-full rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 font-bold text-red-200 transition hover:bg-red-500/20"
          >
            تسجيل الخروج
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-6 overflow-hidden rounded-[2rem] border border-yellow-400/25 bg-black/45 p-6 shadow-[0_0_100px_rgba(212,175,55,0.08)]">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge tone="gold">Core CMS Foundation</Badge>
                  <Badge tone="green">Production System</Badge>
                  <Badge tone="purple">Luxury Admin</Badge>
                </div>

                <p className="mb-2 text-sm font-bold tracking-[0.25em] text-yellow-200">
                  مركز الإدارة الرئيسي
                </p>

                <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                  لوحة إدارة{" "}
                  <span className="bg-gradient-to-l from-yellow-200 via-white to-purple-200 bg-clip-text text-transparent">
                    وكالة حمزة
                  </span>
                </h1>

                <p className="mt-4 max-w-4xl leading-8 text-white/65">
                  مركز إدارة الطلبات، البرامج، الصفحات، الوسائط، الإعلانات،
                  الإعدادات، والتنبيهات. تم تحسين الألوان والتمييز البصري حتى
                  تكون كل وحدة واضحة وسريعة القراءة.
                </p>
              </div>

              <div className="grid min-w-[240px] gap-3">
                <SystemCard
                  title="مرحلة التنفيذ"
                  value="المرحلة 1"
                  tone="purple"
                />
                <SystemCard
                  title="Core CMS"
                  value="مكتمل أساسياً"
                  tone="green"
                />
              </div>
            </div>
          </div>

          <SectionHeader
            eyebrow="نظرة عامة"
            title="إحصائيات النظام"
            description="كل كرت له لون مخصص حتى لا تختلط الأقسام والإحصائيات مع بعضها."
            tone="gold"
          />

          <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard title="الطلبات" value={counts.applications} tone="blue" />
            <StatCard title="البرامج" value={counts.programs} tone="purple" />
            <StatCard title="الصفحات" value={counts.pages} tone="cyan" />
            <StatCard title="الوسائط" value={counts.media} tone="pink" />
            <StatCard
              title="الإعلانات"
              value={counts.announcements}
              tone="amber"
            />
            <StatCard
              title="التنبيهات"
              value={counts.notifications}
              tone="green"
            />
          </div>

          <SectionHeader
            eyebrow="طلبات الانضمام"
            title="حالة الطلبات"
            description="ألوان الحالات تساعدك على معرفة وضع الطلبات بسرعة."
            tone="blue"
          />

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <StatCard title="طلبات جديدة" value={newCount} tone="blue" />
            <StatCard
              title="قيد المراجعة"
              value={underReviewCount}
              tone="amber"
            />
            <StatCard title="مقبولة" value={acceptedCount} tone="green" />
            <StatCard title="مرفوضة" value={rejectedCount} tone="red" />
          </div>

          <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/45 p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <SectionTitle
                eyebrow="وحدات الإدارة المكتملة"
                title="Core CMS Foundation"
                description="هذه الوحدات تم بناؤها وربطها مع Supabase ضمن المرحلة الأولى."
                tone="purple"
              />

              <Link
                href="/admin/programs"
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-center font-black shadow-[0_0_35px_rgba(168,85,247,0.25)] transition hover:scale-[1.02]"
              >
                فتح إدارة البرامج
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {coreModules.map((module) => (
                <ModuleCard
                  key={module.title}
                  title={module.title}
                  subtitle={module.subtitle}
                  description={module.description}
                  href={module.href}
                  status={module.status}
                  tone={module.tone}
                />
              ))}
            </div>
          </div>

          <div className="mb-8 rounded-[2rem] border border-yellow-400/20 bg-black/45 p-6">
            <SectionTitle
              eyebrow="المراحل القادمة"
              title="وحدات سيتم بناؤها لاحقاً"
              description="هذه الوحدات من الخطة الرسمية ولم تُلغَ. تظهر هنا حتى تبقى خارطة المشروع واضحة."
              tone="gold"
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {upcomingModules.map((module) => (
                <div
                  key={module.title}
                  className={`rounded-3xl border p-5 ${toneSoftClasses(
                    module.tone
                  )}`}
                >
                  <Badge tone={module.tone}>قادم لاحقاً</Badge>
                  <h3 className="mt-4 text-2xl font-black">{module.title}</h3>
                  <p className="mt-3 leading-7 text-white/55">
                    {module.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            id="applications"
            className="rounded-[2rem] border border-blue-500/20 bg-black/45 p-6"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <SectionTitle
                eyebrow="إدارة المتقدمين"
                title="طلبات الانضمام"
                description="إدارة الطلبات، تغيير الحالة، نسخ الواتساب، وإضافة ملاحظات داخلية."
                tone="blue"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم، الدولة، الواتساب، البرنامج..."
                className="rounded-2xl border border-blue-500/25 bg-black/50 px-4 py-3 outline-none transition focus:border-blue-400 focus:shadow-[0_0_35px_rgba(59,130,246,0.18)]"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
                {error}
              </div>
            )}

            <div className="overflow-auto rounded-3xl border border-white/10">
              <table className="w-full min-w-[900px]">
                <thead className="bg-blue-500/10">
                  <tr className="border-b border-blue-500/20 text-blue-100">
                    <th className="p-4 text-right">الاسم</th>
                    <th className="p-4 text-right">الدولة</th>
                    <th className="p-4 text-right">البرنامج</th>
                    <th className="p-4 text-right">الحالة</th>
                    <th className="p-4 text-right">تاريخ الطلب</th>
                    <th className="p-4 text-right">الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td className="p-5 text-white/50" colSpan={6}>
                        لا توجد طلبات حالياً
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-white/5 transition hover:bg-white/[0.03]"
                      >
                        <td className="p-4 font-bold">{app.full_name}</td>
                        <td className="p-4 text-white/70">{app.country}</td>
                        <td className="p-4 text-white/70">{app.platform}</td>
                        <td className="p-4">
                          <Badge tone={statusTone[app.status] || "slate"}>
                            {statusLabel[app.status] || app.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-white/55">
                          {new Date(app.created_at).toLocaleDateString("ar")}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openDetails(app)}
                              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-100"
                            >
                              عرض التفاصيل
                            </button>
                            <button
                              onClick={() =>
                                updateStatus(app.id, "under_review")
                              }
                              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100"
                            >
                              مراجعة
                            </button>
                            <button
                              onClick={() => updateStatus(app.id, "accepted")}
                              className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-100"
                            >
                              قبول
                            </button>
                            <button
                              onClick={() => updateStatus(app.id, "rejected")}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100"
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
            <div className="fixed inset-0 z-50 overflow-auto bg-black/85 p-4 backdrop-blur">
              <div className="mx-auto max-w-3xl rounded-[2rem] border border-purple-500/30 bg-[#09000d] p-6 shadow-[0_0_100px_rgba(124,58,237,0.25)]">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <Badge tone="purple">تفاصيل الطلب</Badge>
                    <h3 className="mt-3 text-3xl font-black">
                      {selectedApplication.full_name}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="rounded-xl border border-white/20 px-4 py-2 text-white/70"
                  >
                    إغلاق
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoCard
                    title="الاسم الكامل"
                    value={selectedApplication.full_name}
                    tone="blue"
                  />
                  <InfoCard
                    title="الدولة"
                    value={selectedApplication.country}
                    tone="gold"
                  />
                  <InfoCard
                    title="البرنامج"
                    value={selectedApplication.platform}
                    tone="purple"
                  />
                  <InfoCard
                    title="الحالة"
                    value={
                      statusLabel[selectedApplication.status] ||
                      selectedApplication.status
                    }
                    tone={statusTone[selectedApplication.status] || "slate"}
                  />
                  <InfoCard
                    title="تاريخ الطلب"
                    value={new Date(
                      selectedApplication.created_at
                    ).toLocaleDateString("ar")}
                    tone="cyan"
                  />

                  <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-4">
                    <div className="mb-2 text-sm text-green-200">
                      رقم الواتساب
                    </div>
                    <div className="mb-3 text-xl font-black">
                      {selectedApplication.whatsapp}
                    </div>
                    <button
                      onClick={() =>
                        copyWhatsAppNumber(selectedApplication.whatsapp)
                      }
                      className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-green-100"
                    >
                      نسخ الرقم
                    </button>
                  </div>
                </div>

                <InfoCard
                  title="الخبرات السابقة"
                  value={selectedApplication.previous_experience || "لا يوجد"}
                  tone="amber"
                />

                <InfoCard
                  title="الملاحظات الإضافية"
                  value={selectedApplication.notes || "لا يوجد"}
                  tone="purple"
                />

                <div className="mt-4 rounded-2xl border border-pink-500/25 bg-pink-500/10 p-4">
                  <div className="mb-2 text-sm text-pink-200">
                    ملاحظات الأدمن الداخلية
                  </div>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="min-h-[140px] w-full rounded-xl border border-pink-500/20 bg-black/40 p-4 outline-none focus:border-pink-400"
                  />
                  <button
                    onClick={saveInternalNotes}
                    className="mt-4 rounded-xl bg-pink-600 px-6 py-3 font-bold"
                  >
                    حفظ ملاحظات الأدمن
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => copyApplicationInfo(selectedApplication)}
                    className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-purple-100"
                  >
                    نسخ جميع معلومات الطلب
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(selectedApplication.id, "under_review")
                    }
                    className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-yellow-100"
                  >
                    وضع قيد المراجعة
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(selectedApplication.id, "accepted")
                    }
                    className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-green-100"
                  >
                    قبول الطلب
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(selectedApplication.id, "rejected")
                    }
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-100"
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

function SectionHeader({
  eyebrow,
  title,
  description,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div className="mb-4 rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
      <SectionTitle
        eyebrow={eyebrow}
        title={title}
        description={description}
        tone={tone}
      />
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  tone,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div>
      <div className={`mb-2 text-sm font-bold ${toneTextClasses(tone)}`}>
        {eyebrow}
      </div>
      <h2 className="text-3xl font-black text-white">{title}</h2>
      <p className="mt-2 max-w-3xl leading-7 text-white/55">{description}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: Tone;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_0_35px_rgba(255,255,255,0.03)] ${toneSoftClasses(
        tone
      )}`}
    >
      <div className={`text-sm font-bold ${toneTextClasses(tone)}`}>{title}</div>
      <div className="mt-3 text-4xl font-black text-white">{value}</div>
    </div>
  );
}

function SystemCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className={`rounded-3xl border p-4 ${toneSoftClasses(tone)}`}>
      <div className={`text-xs ${toneTextClasses(tone)}`}>{title}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function ModuleCard({
  title,
  subtitle,
  description,
  href,
  status,
  tone,
}: {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  status: string;
  tone: Tone;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-3xl border p-5 transition hover:scale-[1.02] ${toneSoftClasses(
        tone
      )}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge tone={tone}>{status}</Badge>
        <span className={`text-2xl ${toneTextClasses(tone)}`}>↗</span>
      </div>

      <div className={`mb-2 text-sm font-bold ${toneTextClasses(tone)}`}>
        {subtitle}
      </div>
      <h3 className="text-2xl font-black text-white">{title}</h3>
      <p className="mt-3 leading-7 text-white/55">{description}</p>
    </Link>
  );
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${toneBadgeClasses(
        tone
      )}`}
    >
      {children}
    </span>
  );
}

function InfoCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className={`mt-4 rounded-2xl border p-4 ${toneSoftClasses(tone)}`}>
      <div className={`mb-2 text-sm ${toneTextClasses(tone)}`}>{title}</div>
      <div className="whitespace-pre-wrap text-xl font-bold text-white">
        {value}
      </div>
    </div>
  );
}

function toneSoftClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple:
      "border-purple-500/25 bg-purple-500/10 hover:border-purple-400/45 hover:bg-purple-500/15",
    gold:
      "border-yellow-400/25 bg-yellow-400/10 hover:border-yellow-300/45 hover:bg-yellow-400/15",
    green:
      "border-green-500/25 bg-green-500/10 hover:border-green-400/45 hover:bg-green-500/15",
    blue:
      "border-blue-500/25 bg-blue-500/10 hover:border-blue-400/45 hover:bg-blue-500/15",
    cyan:
      "border-cyan-500/25 bg-cyan-500/10 hover:border-cyan-400/45 hover:bg-cyan-500/15",
    pink:
      "border-pink-500/25 bg-pink-500/10 hover:border-pink-400/45 hover:bg-pink-500/15",
    amber:
      "border-amber-500/25 bg-amber-500/10 hover:border-amber-400/45 hover:bg-amber-500/15",
    red:
      "border-red-500/25 bg-red-500/10 hover:border-red-400/45 hover:bg-red-500/15",
    slate:
      "border-white/15 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]",
  };

  return classes[tone];
}

function toneBadgeClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/30 bg-purple-500/15 text-purple-100",
    gold: "border-yellow-300/30 bg-yellow-400/15 text-yellow-100",
    green: "border-green-400/30 bg-green-500/15 text-green-100",
    blue: "border-blue-400/30 bg-blue-500/15 text-blue-100",
    cyan: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
    pink: "border-pink-400/30 bg-pink-500/15 text-pink-100",
    amber: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    red: "border-red-400/30 bg-red-500/15 text-red-100",
    slate: "border-white/15 bg-white/[0.06] text-white/70",
  };

  return classes[tone];
}

function toneIconClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/25 bg-purple-500/15 text-purple-100",
    gold: "border-yellow-300/25 bg-yellow-400/15 text-yellow-100",
    green: "border-green-400/25 bg-green-500/15 text-green-100",
    blue: "border-blue-400/25 bg-blue-500/15 text-blue-100",
    cyan: "border-cyan-400/25 bg-cyan-500/15 text-cyan-100",
    pink: "border-pink-400/25 bg-pink-500/15 text-pink-100",
    amber: "border-amber-400/25 bg-amber-500/15 text-amber-100",
    red: "border-red-400/25 bg-red-500/15 text-red-100",
    slate: "border-white/15 bg-white/[0.06] text-white/70",
  };

  return classes[tone];
}

function toneTextClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "text-purple-200",
    gold: "text-yellow-200",
    green: "text-green-200",
    blue: "text-blue-200",
    cyan: "text-cyan-200",
    pink: "text-pink-200",
    amber: "text-amber-200",
    red: "text-red-200",
    slate: "text-white/60",
  };

  return classes[tone];
}
