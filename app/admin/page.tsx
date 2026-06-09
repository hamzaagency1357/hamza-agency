"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

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
  serviceRequests: number;
  programs: number;
  pages: number;
  media: number;
  announcements: number;
  notifications: number;
  jobs: number;
  reviews: number;
  successStories: number;
  partners: number;
  gallery: number;
};

type Tone = "purple" | "gold" | "green" | "blue" | "cyan" | "pink" | "amber" | "red" | "slate";

type AdminLink = {
  title: string;
  description: string;
  href: string;
  tone: Tone;
  badge?: string;
};

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

const dailyLinks: AdminLink[] = [
  {
    title: "طلبات الانضمام",
    description: "مراجعة المتقدمين وتغيير الحالة ونسخ بيانات التواصل.",
    href: "#applications",
    tone: "blue",
    badge: "يومي",
  },
  {
    title: "طلبات الخدمات",
    description: "إدارة طلبات الشحن والسحب والخدمات الرقمية.",
    href: "/admin/service-requests",
    tone: "green",
    badge: "مهم",
  },
  {
    title: "البرامج",
    description: "إدارة TikTok وBIGO LIVE وYaahlan وXena وCatchii.",
    href: "/admin/programs",
    tone: "purple",
  },
  {
    title: "فحص الإطلاق",
    description: "تشغيل فحص الروابط والتشخيص قبل الإطلاق.",
    href: "/admin/launch-checklist",
    tone: "gold",
  },
];

const contentLinks: AdminLink[] = [
  {
    title: "الصفحات",
    description: "إدارة صفحات الموقع ومحتواها الأساسي.",
    href: "/admin/pages",
    tone: "cyan",
  },
  {
    title: "الوسائط",
    description: "تنظيم الصور والخلفيات والملفات المرئية.",
    href: "/admin/media",
    tone: "pink",
  },
  {
    title: "الإعلانات",
    description: "إدارة الشريط الإعلاني والتنبيهات العامة.",
    href: "/admin/announcements",
    tone: "amber",
  },
  {
    title: "الإعدادات",
    description: "هوية الموقع، الواتساب، SEO، ومعلومات التواصل.",
    href: "/admin/settings",
    tone: "green",
  },
];

const growthLinks: AdminLink[] = [
  {
    title: "الوظائف",
    description: "إدارة الفرص وطلبات التقديم.",
    href: "/admin/jobs",
    tone: "blue",
  },
  {
    title: "التقييمات",
    description: "إدارة آراء العملاء وصناع المحتوى.",
    href: "/admin/reviews",
    tone: "gold",
  },
  {
    title: "قصص النجاح",
    description: "إدارة قصص النجاح المنشورة.",
    href: "/admin/success-stories",
    tone: "purple",
  },
  {
    title: "الشركاء",
    description: "إدارة شركاء وبرامج الوكالة.",
    href: "/admin/partners",
    tone: "green",
  },
  {
    title: "المعرض",
    description: "إدارة عناصر المعرض المرئي.",
    href: "/admin/gallery",
    tone: "pink",
  },
  {
    title: "التنبيهات",
    description: "متابعة تنبيهات النظام والإشعارات الإدارية.",
    href: "/admin/notifications",
    tone: "cyan",
  },
  {
    title: "التحليلات",
    description: "مراجعة مؤشرات الأداء والبيانات العامة للوكالة.",
    href: "/admin/analytics",
    tone: "amber",
  },
  {
    title: "سجل النشاطات",
    description: "مراجعة سجل العمليات الإدارية والتغييرات المهمة.",
    href: "/admin/activity-logs",
    tone: "slate",
  },
  {
    title: "سلة المحذوفات",
    description: "عرض العناصر المحذوفة ومتابعة سلة النظام.",
    href: "/admin/trash",
    tone: "red",
  },
  {
    title: "النسخ الاحتياطي",
    description: "عرض سجلات النسخ الاحتياطي ومتابعة حالة النسخ.",
    href: "/admin/backups",
    tone: "green",
  },
];

export default function AdminPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [counts, setCounts] = useState<DashboardCounts>({
    applications: 0,
    serviceRequests: 0,
    programs: 0,
    pages: 0,
    media: 0,
    announcements: 0,
    notifications: 0,
    jobs: 0,
    reviews: 0,
    successStories: 0,
    partners: 0,
    gallery: 0,
  });

  useEffect(() => {
    async function checkAdminAccess() {
      const access = await requireAdminModuleAccess("dashboard");

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

  useEffect(() => {
    if (!isAuthorized) return;

    async function loadDashboard() {
      if (!supabase) {
        setError("Supabase غير متصل.");
        return;
      }

      const { data, error: applicationsError } = await supabase
        .from("agency_applications")
        .select(
          "id, full_name, country, whatsapp, platform, previous_experience, notes, status, internal_notes, created_at"
        )
        .order("created_at", { ascending: false });

      if (applicationsError) {
        setError("لا يمكن قراءة طلبات الانضمام حالياً.");
      } else {
        setApplications(data || []);
      }

      const [
        applicationsCount,
        serviceRequestsCount,
        programsCount,
        pagesCount,
        mediaCount,
        announcementsCount,
        notificationsCount,
        jobsCount,
        reviewsCount,
        successStoriesCount,
        partnersCount,
        galleryCount,
      ] = await Promise.all([
        getCount("agency_applications"),
        getCount("service_requests"),
        getCount("programs"),
        getCount("pages"),
        getCount("media"),
        getCount("announcements"),
        getCount("notifications"),
        getCount("jobs"),
        getCount("reviews"),
        getCount("success_stories"),
        getCount("partners"),
        getCount("gallery_items"),
      ]);

      setCounts({
        applications: applicationsCount,
        serviceRequests: serviceRequestsCount,
        programs: programsCount,
        pages: pagesCount,
        media: mediaCount,
        announcements: announcementsCount,
        notifications: notificationsCount,
        jobs: jobsCount,
        reviews: reviewsCount,
        successStories: successStoriesCount,
        partners: partnersCount,
        gallery: galleryCount,
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
    const query = search.trim().toLowerCase();
    if (!query) return applications.slice(0, 12);

    return applications.filter((app) => {
      const text = `${app.full_name} ${app.country} ${app.whatsapp} ${app.platform}`.toLowerCase();
      return text.includes(query);
    });
  }, [applications, search]);

  const newCount = applications.filter((app) => app.status === "new").length;
  const underReviewCount = applications.filter((app) => app.status === "under_review").length;
  const acceptedCount = applications.filter((app) => app.status === "accepted").length;
  const rejectedCount = applications.filter((app) => app.status === "rejected").length;

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
      alert("فشل حفظ الملاحظات الداخلية");
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

    alert("تم حفظ الملاحظات الداخلية");
  }

  function openDetails(app: Application) {
    setSelectedApplication(app);
    setInternalNotes(app.internal_notes || "");
  }

  function copyWhatsAppNumber(number: string) {
    navigator.clipboard.writeText(number);
    alert("تم نسخ رقم واتساب");
  }

  function copyApplicationInfo(app: Application) {
    const info = `
الاسم الكامل: ${app.full_name}
الدولة: ${app.country}
رقم واتساب: ${app.whatsapp}
البرنامج: ${app.platform}
الحالة: ${statusLabel[app.status] || app.status}
تاريخ الطلب: ${new Date(app.created_at).toLocaleDateString("ar")}
الخبرات السابقة: ${app.previous_experience || "لا يوجد"}
الملاحظات الإضافية: ${app.notes || "لا يوجد"}
الملاحظات الداخلية: ${app.internal_notes || "لا يوجد"}
    `.trim();

    navigator.clipboard.writeText(info);
    alert("تم نسخ معلومات الطلب");
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
        className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white"
      >
        <div className="rounded-3xl border border-purple-500/25 bg-black/45 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.24)]">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-yellow-200">
            HAMZA AGENCY
          </div>
          <div className="text-2xl font-black">جاري التحقق من صلاحية الدخول...</div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#3b0764_0%,#070009_46%,#000_100%)]" />

      <section className="mx-auto max-w-[1380px] px-5 py-6 lg:px-8">
        <header className="sticky top-0 z-30 mb-6 rounded-[1.75rem] border border-white/10 bg-[#08000d]/90 p-4 shadow-[0_0_70px_rgba(124,58,237,0.14)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.3em] text-yellow-200">
                HAMZA AGENCY
              </p>
              <h1 className="mt-2 text-3xl font-black lg:text-4xl">لوحة الإدارة</h1>
              <p className="mt-1 break-all text-xs text-white/45">{adminEmail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/launch-checklist"
                className="rounded-2xl border border-yellow-300/25 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-100 transition hover:bg-yellow-400/15"
              >
                فحص الإطلاق
              </Link>
              <Link
                href="/"
                target="_blank"
                className="rounded-2xl border border-purple-300/25 bg-purple-500/10 px-4 py-3 text-sm font-black text-purple-100 transition hover:bg-purple-500/15"
              >
                عرض الموقع
              </Link>
              <button
                onClick={logout}
                className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-500/20"
              >
                خروج
              </button>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-4 lg:grid-cols-4">
          <FocusStat label="طلبات جديدة" value={newCount} tone="blue" />
          <FocusStat label="قيد المراجعة" value={underReviewCount} tone="amber" />
          <FocusStat label="طلبات خدمات" value={counts.serviceRequests} tone="green" />
          <FocusStat label="تنبيهات" value={counts.notifications} tone="purple" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-6">
            <DashboardPanel
              eyebrow="الاستخدام اليومي"
              title="المهام الأساسية"
              description="أهم العمليات التي يحتاجها فريق الوكالة يومياً بدون ازدحام."
              tone="gold"
            >
              <div className="grid gap-4 md:grid-cols-2">
                {dailyLinks.map((link) => (
                  <AdminActionCard key={link.href} item={link} />
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel
              eyebrow="المحتوى والإعدادات"
              title="إدارة الموقع"
              description="روابط المحتوى، الوسائط، الإعلانات، والإعدادات في مكان واحد."
              tone="purple"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {contentLinks.map((link) => (
                  <CompactLinkCard key={link.href} item={link} />
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel
              eyebrow="النمو والثقة"
              title="الأقسام المنشورة"
              description="إدارة الأقسام التي تدعم ثقة الزائر وانتشار الوكالة."
              tone="green"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {growthLinks.map((link) => (
                  <CompactLinkCard key={link.href} item={link} />
                ))}
              </div>
            </DashboardPanel>
          </div>

          <aside className="grid gap-6">
            <DashboardPanel
              eyebrow="نظرة سريعة"
              title="أرقام النظام"
              description="ملخص بسيط بدون تفاصيل مزعجة."
              tone="cyan"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MiniCount label="طلبات الانضمام" value={counts.applications} tone="blue" />
                <MiniCount label="البرامج" value={counts.programs} tone="purple" />
                <MiniCount label="الصفحات" value={counts.pages} tone="cyan" />
                <MiniCount label="الوسائط" value={counts.media} tone="pink" />
                <MiniCount label="الإعلانات" value={counts.announcements} tone="amber" />
                <MiniCount label="الوظائف" value={counts.jobs} tone="green" />
                <MiniCount label="التقييمات" value={counts.reviews} tone="gold" />
                <MiniCount label="قصص النجاح" value={counts.successStories} tone="purple" />
                <MiniCount label="الشركاء" value={counts.partners} tone="green" />
                <MiniCount label="المعرض" value={counts.gallery} tone="pink" />
              </div>
            </DashboardPanel>
          </aside>
        </div>

        <section
          id="applications"
          className="mt-6 rounded-[2rem] border border-blue-400/20 bg-black/45 p-5 shadow-[0_0_70px_rgba(59,130,246,0.08)] backdrop-blur"
        >
          <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="text-xs font-black tracking-[0.25em] text-blue-200">المتقدمون</p>
              <h2 className="mt-2 text-3xl font-black">طلبات الانضمام</h2>
              <p className="mt-2 text-sm leading-7 text-white/55">
                عرض مختصر للطلبات. التفاصيل الكاملة داخل زر عرض التفاصيل.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم، الدولة، واتساب، البرنامج..."
              className="w-full rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-blue-300/60"
            />
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
              {error}
            </div>
          )}

          {filteredApplications.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/55">
              لا توجد طلبات مطابقة حالياً.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-white/[0.06] text-white/70">
                    <tr>
                      <th className="px-4 py-4 text-right">الاسم</th>
                      <th className="px-4 py-4 text-right">الدولة</th>
                      <th className="px-4 py-4 text-right">البرنامج</th>
                      <th className="px-4 py-4 text-right">الحالة</th>
                      <th className="px-4 py-4 text-right">التاريخ</th>
                      <th className="px-4 py-4 text-right">إجراء</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="border-t border-white/10 bg-black/20">
                        <td className="px-4 py-4 font-bold">{app.full_name}</td>
                        <td className="px-4 py-4 text-white/65">{app.country}</td>
                        <td className="px-4 py-4 text-white/65">{app.platform}</td>
                        <td className="px-4 py-4">
                          <Badge tone={statusTone[app.status] || "slate"}>
                            {statusLabel[app.status] || app.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-white/50">
                          {new Date(app.created_at).toLocaleDateString("ar")}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => openDetails(app)}
                            className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-4 py-2 font-bold text-purple-100 hover:bg-purple-500/20"
                          >
                            عرض التفاصيل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </section>

      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          internalNotes={internalNotes}
          setInternalNotes={setInternalNotes}
          onClose={() => setSelectedApplication(null)}
          onUpdateStatus={updateStatus}
          onSaveNotes={saveInternalNotes}
          onCopyWhatsApp={copyWhatsAppNumber}
          onCopyInfo={copyApplicationInfo}
        />
      )}
    </main>
  );
}

function DashboardPanel({
  eyebrow,
  title,
  description,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-[2rem] border bg-black/45 p-5 backdrop-blur ${toneBorderClasses(tone)}`}>
      <div className="mb-5">
        <p className={`text-xs font-black tracking-[0.25em] ${toneTextClasses(tone)}`}>{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-white/55">{description}</p>
      </div>
      {children}
    </section>
  );
}

function AdminActionCard({ item }: { item: AdminLink }) {
  return (
    <Link
      href={item.href}
      className={`group block rounded-3xl border p-5 transition hover:scale-[1.01] ${toneSoftClasses(item.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.badge && <Badge tone={item.tone}>{item.badge}</Badge>}
          <h3 className="mt-3 text-2xl font-black">{item.title}</h3>
        </div>
        <span className={`rounded-2xl border px-3 py-2 text-lg ${toneIconClasses(item.tone)}`}>↗</span>
      </div>
      <p className="mt-3 leading-7 text-white/60">{item.description}</p>
    </Link>
  );
}

function CompactLinkCard({ item }: { item: AdminLink }) {
  return (
    <Link
      href={item.href}
      className={`block rounded-2xl border p-4 transition hover:scale-[1.01] ${toneSoftClasses(item.tone)}`}
    >
      <div className="font-black text-white">{item.title}</div>
      <div className="mt-2 text-xs leading-6 text-white/52">{item.description}</div>
    </Link>
  );
}

function FocusStat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneSoftClasses(tone)}`}>
      <div className="text-sm text-white/55">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function MiniCount({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${toneSoftClasses(tone)}`}>
      <span className="text-sm font-bold text-white/75">{label}</span>
      <span className="text-xl font-black" dir="ltr">{value}</span>
    </div>
  );
}

function ApplicationDetailsModal({
  application,
  internalNotes,
  setInternalNotes,
  onClose,
  onUpdateStatus,
  onSaveNotes,
  onCopyWhatsApp,
  onCopyInfo,
}: {
  application: Application;
  internalNotes: string;
  setInternalNotes: (value: string) => void;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  onSaveNotes: () => void;
  onCopyWhatsApp: (number: string) => void;
  onCopyInfo: (application: Application) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur">
      <div className="mx-auto my-8 max-w-4xl rounded-[2rem] border border-purple-400/25 bg-[#0d0014] p-6 shadow-[0_0_90px_rgba(168,85,247,0.25)]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge tone={statusTone[application.status] || "slate"}>
              {statusLabel[application.status] || application.status}
            </Badge>
            <h2 className="mt-3 text-3xl font-black">{application.full_name}</h2>
            <p className="mt-1 text-white/50">{application.platform}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/15 px-5 py-3 font-bold text-white/70 hover:bg-white/10"
          >
            إغلاق
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailBox label="الدولة" value={application.country} />
          <DetailBox label="رقم واتساب" value={application.whatsapp} />
          <DetailBox
            label="تاريخ الطلب"
            value={new Date(application.created_at).toLocaleString("ar")}
          />
          <DetailBox label="البرنامج" value={application.platform} />
        </div>

        <div className="mt-4 grid gap-4">
          <DetailBox
            label="الخبرات السابقة"
            value={application.previous_experience || "لا يوجد"}
          />
          <DetailBox label="ملاحظات إضافية" value={application.notes || "لا يوجد"} />
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-5">
          <h3 className="text-xl font-black">تغيير الحالة</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(statusLabel).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onUpdateStatus(application.id, value)}
                className={`rounded-full border px-5 py-3 font-bold ${
                  application.status === value
                    ? toneSoftClasses(statusTone[value] || "slate")
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-5">
          <h3 className="text-xl font-black">ملاحظات داخلية</h3>
          <textarea
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            className="mt-4 min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/35 p-4 text-white outline-none focus:border-purple-400"
            placeholder="اكتب ملاحظات داخلية لفريق الإدارة"
          />
          <button
            onClick={onSaveNotes}
            className="mt-4 rounded-2xl bg-purple-600 px-5 py-3 font-black text-white hover:bg-purple-500"
          >
            حفظ الملاحظات
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <button
            onClick={() => onCopyWhatsApp(application.whatsapp)}
            className="rounded-2xl border border-green-400/25 bg-green-500/10 px-5 py-3 font-black text-green-100 hover:bg-green-500/20"
          >
            نسخ رقم واتساب
          </button>
          <button
            onClick={() => onCopyInfo(application)}
            className="rounded-2xl border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 font-black text-yellow-100 hover:bg-yellow-500/20"
          >
            نسخ معلومات الطلب كاملة
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-bold text-white/40">{label}</div>
      <div className="mt-2 break-words text-lg font-bold text-white/82">{value}</div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${badgeClasses(tone)}`}>
      {children}
    </span>
  );
}

function toneSoftClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    gold: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    pink: "border-pink-400/20 bg-pink-500/10 text-pink-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    slate: "border-slate-400/20 bg-slate-500/10 text-slate-100",
  };

  return classes[tone];
}

function toneBorderClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 shadow-[0_0_70px_rgba(168,85,247,0.08)]",
    gold: "border-yellow-400/20 shadow-[0_0_70px_rgba(234,179,8,0.08)]",
    green: "border-green-400/20 shadow-[0_0_70px_rgba(34,197,94,0.08)]",
    blue: "border-blue-400/20 shadow-[0_0_70px_rgba(59,130,246,0.08)]",
    cyan: "border-cyan-400/20 shadow-[0_0_70px_rgba(34,211,238,0.08)]",
    pink: "border-pink-400/20 shadow-[0_0_70px_rgba(236,72,153,0.08)]",
    amber: "border-amber-400/20 shadow-[0_0_70px_rgba(245,158,11,0.08)]",
    red: "border-red-400/20 shadow-[0_0_70px_rgba(239,68,68,0.08)]",
    slate: "border-slate-400/20 shadow-[0_0_70px_rgba(148,163,184,0.08)]",
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
    slate: "text-slate-200",
  };

  return classes[tone];
}

function toneIconClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-300/25 bg-purple-500/15 text-purple-100",
    gold: "border-yellow-300/25 bg-yellow-500/15 text-yellow-100",
    green: "border-green-300/25 bg-green-500/15 text-green-100",
    blue: "border-blue-300/25 bg-blue-500/15 text-blue-100",
    cyan: "border-cyan-300/25 bg-cyan-500/15 text-cyan-100",
    pink: "border-pink-300/25 bg-pink-500/15 text-pink-100",
    amber: "border-amber-300/25 bg-amber-500/15 text-amber-100",
    red: "border-red-300/25 bg-red-500/15 text-red-100",
    slate: "border-slate-300/25 bg-slate-500/15 text-slate-100",
  };

  return classes[tone];
}

function badgeClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-300/30 bg-purple-500/15 text-purple-100",
    gold: "border-yellow-300/30 bg-yellow-500/15 text-yellow-100",
    green: "border-green-300/30 bg-green-500/15 text-green-100",
    blue: "border-blue-300/30 bg-blue-500/15 text-blue-100",
    cyan: "border-cyan-300/30 bg-cyan-500/15 text-cyan-100",
    pink: "border-pink-300/30 bg-pink-500/15 text-pink-100",
    amber: "border-amber-300/30 bg-amber-500/15 text-amber-100",
    red: "border-red-300/30 bg-red-500/15 text-red-100",
    slate: "border-slate-300/30 bg-slate-500/15 text-slate-100",
  };

  return classes[tone];
}
