import Link from "next/link";

const links = [
  ["/admin/translations/automation", "الأتمتة"],
  ["/admin/translations", "FAQ وKnowledge Base"],
  ["/admin/translations/cms", "صفحات CMS"],
  ["/admin/translations/sections", "أقسام CMS"],
  ["/admin/translations/programs", "البرامج"],
  ["/admin/translations/partners", "الشركاء"],
  ["/admin/translations/jobs", "الوظائف"],
  ["/admin/translations/reviews", "التقييمات"],
  ["/admin/translations/success-stories", "قصص النجاح"],
  ["/admin/translations/gallery", "المعرض"],
  ["/admin/translations/announcements", "الإعلانات"],
] as const;

export default function TranslationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070009]">
      <div dir="rtl" className="sticky top-0 z-40 border-b border-white/10 bg-[#070009]/95 px-4 py-3 text-white backdrop-blur">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 text-sm font-black text-yellow-100">مساحات مراجعة الترجمة</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/75 hover:border-fuchsia-300/50 hover:bg-fuchsia-500/10 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
