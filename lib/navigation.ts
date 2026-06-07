export type NavigationLink = {
  label: string;
  href: string;
};

export const publicNavigationLinks: NavigationLink[] = [
  { label: "الرئيسية", href: "/" },
  { label: "البرامج", href: "/programs" },
  { label: "من نحن", href: "/about" },
  { label: "الخدمات", href: "/services" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "طلب خدمة", href: "/service-request" },
  { label: "الوظائف", href: "/jobs" },
  { label: "التقييمات", href: "/reviews" },
  { label: "قصص النجاح", href: "/success-stories" },
  { label: "شركاؤنا وبرامجنا", href: "/partners" },
  { label: "المعرض", href: "/gallery" },
  { label: "مركز المعرفة", href: "/knowledge-center" },
  { label: "FAQ", href: "/faq" },
  { label: "اتصل بنا", href: "/contact" },
];

export const publicFooterLegalLinks: NavigationLink[] = [
  { label: "سياسة الخصوصية", href: "/privacy-policy" },
  { label: "الشروط والأحكام", href: "/terms-and-conditions" },
  { label: "AI Policy", href: "/ai-policy" },
];

export const publicFooterFeatureLinks: NavigationLink[] = [
  { label: "البرامج", href: "/programs" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "طلب خدمة", href: "/service-request" },
  { label: "الوظائف", href: "/jobs" },
  { label: "التقييمات", href: "/reviews" },
  { label: "قصص النجاح", href: "/success-stories" },
  { label: "شركاؤنا وبرامجنا", href: "/partners" },
  { label: "المعرض", href: "/gallery" },
];

export const adminNavigationLinks: NavigationLink[] = [
  { label: "لوحة التحكم", href: "/admin" },
  { label: "طلبات الانضمام", href: "/admin#applications" },
  { label: "طلبات الخدمات", href: "/admin/service-requests" },
  { label: "إدارة البرامج", href: "/admin/programs" },
  { label: "إدارة الصفحات", href: "/admin/pages" },
  { label: "مكتبة الوسائط", href: "/admin/media" },
  { label: "الإعلانات", href: "/admin/announcements" },
  { label: "الإعدادات", href: "/admin/settings" },
  { label: "الوظائف", href: "/admin/jobs" },
  { label: "التقييمات", href: "/admin/reviews" },
  { label: "قصص النجاح", href: "/admin/success-stories" },
  { label: "الشركاء", href: "/admin/partners" },
  { label: "المعرض", href: "/admin/gallery" },
];
