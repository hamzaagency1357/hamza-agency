"use client";

import { usePathname } from "next/navigation";

const siteUrl = "https://hamza-agency.com";
const logoUrl = `${siteUrl}/Logo%20hamza%20agency.jpg`;
const organizationId = `${siteUrl}/#organization`;
const websiteId = `${siteUrl}/#website`;

const siteName = "Hamza Agency | وكالة حمزة";
const siteDescription =
  "وكالة حمزة — وكالة رقمية فاخرة لإدارة وتوظيف ودعم صناع المحتوى على TikTok وBIGO LIVE ومنصات البث المباشر والخدمات الرقمية.";

type PageMeta = {
  name: string;
  description: string;
  type?: string;
};

const pageMetaByPath: Record<string, PageMeta> = {
  "/": {
    name: siteName,
    description: siteDescription,
    type: "WebPage",
  },
  "/programs": {
    name: "برامج وكالة حمزة",
    description:
      "استعراض برامج وكالة حمزة المتاحة لصناع المحتوى على منصات البث المباشر والتواصل الاجتماعي.",
    type: "CollectionPage",
  },
  "/apply": {
    name: "طلب الانضمام إلى وكالة حمزة",
    description:
      "إرسال طلب انضمام رسمي إلى وكالة حمزة مع اختيار البرنامج المناسب وبيانات التواصل.",
    type: "WebPage",
  },
  "/application-status": {
    name: "تتبع طلب الانضمام",
    description: "متابعة حالة طلب الانضمام إلى وكالة حمزة باستخدام رقم التتبع أو رقم واتساب.",
    type: "WebPage",
  },
  "/services": {
    name: "خدمات وكالة حمزة",
    description: "خدمات رقمية وإدارية تساعد صناع المحتوى على النمو والعمل باحتراف.",
    type: "CollectionPage",
  },
  "/digital-services": {
    name: "الخدمات الرقمية",
    description: "خدمات رقمية مقدمة عبر وكالة حمزة لدعم الحضور الرقمي وصناع المحتوى.",
    type: "CollectionPage",
  },
  "/service-request": {
    name: "طلب خدمة رقمية",
    description: "إرسال طلب خدمة رقمية إلى فريق وكالة حمزة ومتابعته عبر القنوات الرسمية.",
    type: "WebPage",
  },
  "/service-status": {
    name: "تتبع طلب الخدمة",
    description: "متابعة حالة طلب الخدمة الرقمية عبر كود الطلب أو بيانات التواصل.",
    type: "WebPage",
  },
  "/ai-support": {
    name: "الدعم الذكي",
    description: "دعم ذكي يساعد زوار وكالة حمزة في الوصول إلى المعلومات الأساسية الموثوقة.",
    type: "WebPage",
  },
  "/jobs": {
    name: "فرص العمل",
    description: "فرص العمل والتعاون المتاحة ضمن وكالة حمزة.",
    type: "CollectionPage",
  },
  "/knowledge-center": {
    name: "مركز المعرفة",
    description: "مقالات وإرشادات معرفية لصناع المحتوى والمهتمين بالانضمام إلى وكالة حمزة.",
    type: "CollectionPage",
  },
  "/gallery": {
    name: "معرض وكالة حمزة",
    description: "معرض مرئي يعرض هوية وكالة حمزة وموادها العامة دون كشف أسماء الملفات.",
    type: "ImageGallery",
  },
  "/partners": {
    name: "شركاء وكالة حمزة",
    description: "صفحة الشركاء والعلاقات الرسمية المرتبطة بوكالة حمزة.",
    type: "CollectionPage",
  },
  "/faq": {
    name: "الأسئلة الشائعة",
    description: "إجابات على الأسئلة الشائعة حول وكالة حمزة والبرامج وطلبات الانضمام.",
    type: "FAQPage",
  },
  "/contact": {
    name: "تواصل مع وكالة حمزة",
    description: "قنوات التواصل الرسمية مع وكالة حمزة عبر واتساب ومعلومات الاتصال المعتمدة.",
    type: "ContactPage",
  },
  "/about": {
    name: "عن وكالة حمزة",
    description: "تعريف بوكالة حمزة ودورها في إدارة وتطوير صناع المحتوى.",
    type: "AboutPage",
  },
  "/reviews": {
    name: "تقييمات وكالة حمزة",
    description: "تقييمات وتجارب مرتبطة بخدمات وبرامج وكالة حمزة.",
    type: "CollectionPage",
  },
  "/success-stories": {
    name: "قصص النجاح",
    description: "قصص وتجارب نجاح من منظومة وكالة حمزة لصناع المحتوى.",
    type: "CollectionPage",
  },
  "/privacy-policy": {
    name: "سياسة الخصوصية",
    description: "سياسة الخصوصية الخاصة بموقع وكالة حمزة.",
    type: "WebPage",
  },
  "/terms-and-conditions": {
    name: "الشروط والأحكام",
    description: "الشروط والأحكام الخاصة باستخدام موقع وخدمات وكالة حمزة.",
    type: "WebPage",
  },
  "/ai-policy": {
    name: "سياسة الذكاء الاصطناعي",
    description: "سياسة استخدام الدعم الذكي والذكاء الاصطناعي داخل موقع وكالة حمزة.",
    type: "WebPage",
  },
};

const programMetaBySlug: Record<string, PageMeta> = {
  tiktok: {
    name: "برنامج TikTok في وكالة حمزة",
    description: "برنامج مخصص لصناع المحتوى الراغبين بالنمو على TikTok ضمن وكالة منظمة.",
  },
  "bigo-live": {
    name: "برنامج BIGO LIVE في وكالة حمزة",
    description: "برنامج لصناع البث المباشر على BIGO LIVE مع متابعة ودعم من وكالة حمزة.",
  },
  yaahlan: {
    name: "برنامج Yaahlan في وكالة حمزة",
    description: "برنامج تواصل وبث مباشر مناسب لصناع المحتوى الجادين ضمن وكالة حمزة.",
  },
  xena: {
    name: "برنامج Xena في وكالة حمزة",
    description: "برنامج صناع محتوى بإدارة ومتابعة من وكالة حمزة.",
  },
  catchii: {
    name: "برنامج Catchii في وكالة حمزة",
    description: "برنامج اجتماعي وترفيهي لصناع المحتوى ضمن منظومة وكالة حمزة.",
  },
};

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";

  return pathname.replace(/\/+$/, "") || "/";
}

function getAbsoluteUrl(pathname: string) {
  return pathname === "/" ? siteUrl : `${siteUrl}${pathname}`;
}

function getProgramSlug(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "programs" || !parts[1]) return null;

  return parts[1];
}

function getPageMeta(pathname: string): PageMeta {
  const programSlug = getProgramSlug(pathname);

  if (programSlug) {
    return (
      programMetaBySlug[programSlug] || {
        name: "برنامج وكالة حمزة",
        description: "صفحة برنامج من برامج وكالة حمزة لصناع المحتوى.",
      }
    );
  }

  return (
    pageMetaByPath[pathname] || {
      name: "وكالة حمزة",
      description: siteDescription,
      type: "WebPage",
    }
  );
}

function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: "HAMZA AGENCY",
    alternateName: ["وكالة حمزة", "Hamza Agency"],
    url: siteUrl,
    logo: logoUrl,
    image: logoUrl,
    description: siteDescription,
    areaServed: ["TR", "SA", "AE", "KW", "QA", "BH", "OM", "IQ", "SY", "JO", "LB", "EG"],
    availableLanguage: ["ar", "en", "tr"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: ["Arabic", "English", "Turkish"],
      },
    ],
    knowsAbout: [
      "Live streaming creator management",
      "TikTok creator agency",
      "BIGO LIVE creator agency",
      "Digital services",
      "Content creator growth",
    ],
  };
}

function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: "Hamza Agency",
    alternateName: "وكالة حمزة",
    url: siteUrl,
    description: siteDescription,
    inLanguage: "ar",
    publisher: {
      "@id": organizationId,
    },
  };
}

function buildWebPageJsonLd(pathname: string, meta: PageMeta) {
  const url = getAbsoluteUrl(pathname);

  return {
    "@context": "https://schema.org",
    "@type": meta.type || "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: meta.name,
    description: meta.description,
    inLanguage: "ar",
    isPartOf: {
      "@id": websiteId,
    },
    publisher: {
      "@id": organizationId,
    },
  };
}

function buildBreadcrumbJsonLd(pathname: string, meta: PageMeta) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "الرئيسية",
      item: siteUrl,
    },
  ];

  const programSlug = getProgramSlug(pathname);

  if (programSlug) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "البرامج",
      item: `${siteUrl}/programs`,
    });

    items.push({
      "@type": "ListItem",
      position: 3,
      name: meta.name,
      item: getAbsoluteUrl(pathname),
    });
  } else if (pathname !== "/") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: meta.name,
      item: getAbsoluteUrl(pathname),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildProgramsItemListJsonLd() {
  const itemListElement = Object.entries(programMetaBySlug).map(([slug, meta], index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${siteUrl}/programs/${slug}`,
    name: meta.name,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "برامج وكالة حمزة",
    itemListElement,
  };
}

function buildProgramServiceJsonLd(pathname: string, meta: PageMeta) {
  const url = getAbsoluteUrl(pathname);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: meta.name,
    description: meta.description,
    url,
    provider: {
      "@id": organizationId,
    },
    serviceType: "Creator management program",
    areaServed: ["TR", "SA", "AE", "KW", "QA", "BH", "OM", "IQ", "SY", "JO", "LB", "EG"],
  };
}

function buildServiceRequestJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteUrl}/service-request#service`,
    name: "خدمات وكالة حمزة الرقمية",
    description: "خدمات رقمية وإدارية لصناع المحتوى والجهات الراغبة بالتعاون مع وكالة حمزة.",
    url: `${siteUrl}/service-request`,
    provider: {
      "@id": organizationId,
    },
    serviceType: "Digital services request",
  };
}

function buildExtraJsonLd(pathname: string, meta: PageMeta) {
  const extras = [];

  if (pathname === "/programs") {
    extras.push(buildProgramsItemListJsonLd());
  }

  if (getProgramSlug(pathname)) {
    extras.push(buildProgramServiceJsonLd(pathname, meta));
  }

  if (pathname === "/service-request") {
    extras.push(buildServiceRequestJsonLd());
  }

  return extras;
}

export default function StructuredData() {
  const pathname = normalizePath(usePathname() || "/");
  const meta = getPageMeta(pathname);
  const jsonLdItems = [
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(),
    buildWebPageJsonLd(pathname, meta),
    buildBreadcrumbJsonLd(pathname, meta),
    ...buildExtraJsonLd(pathname, meta),
  ];

  return (
    <>
      {jsonLdItems.map((item, index) => (
        <script
          key={`${pathname}-structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
