const posts = [
  {
    id: 1,
    slug: "seo-identity-arab-syria",
    status: "draft",
    publishedAt: null,
    scheduledAt: null,
    category: "seo",
    tags: ["seo", "branding", "digital"],
    featuredImage:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    contentByLanguage: {
      ar: {
        title: "قالب: بناء هوية رقمية احترافية",
        excerpt:
          "قالب داخلي لإعداد مقال موثق حول الهوية الرقمية قبل مراجعته ونشره.",
        content:
          "<p>هذا قالب تحريري داخلي لا يظهر للزوار. يجب مراجعته واستبدال محتواه بمعلومات موثقة قبل النشر.</p>",
      },
      en: {
        title: "Template: building a professional digital identity",
        excerpt:
          "An internal editorial template for a reviewed digital-identity article.",
        content:
          "<p>This internal editorial template is not public. Review it and replace it with verified content before publishing.</p>",
      },
      tr: {
        title: "Şablon: profesyonel dijital kimlik oluşturma",
        excerpt:
          "İncelenmiş bir dijital kimlik makalesi hazırlamak için dahili editoryal şablon.",
        content:
          "<p>Bu dahili editoryal şablon ziyaretçilere gösterilmez. Yayınlamadan önce doğrulanmış içerikle güncelleyin.</p>",
      },
    },
  },
  {
    id: 2,
    slug: "content-operations-blueprint",
    status: "draft",
    publishedAt: null,
    scheduledAt: null,
    category: "operations",
    tags: ["operations", "workflow", "content"],
    featuredImage:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    contentByLanguage: {
      ar: {
        title: "قالب: تشغيل المحتوى من الطلب إلى المتابعة",
        excerpt:
          "قالب داخلي لتنظيم مقال عملي حول سير العمل والمتابعة.",
        content:
          "<p>مسودة داخلية مخصصة لفريق التحرير. لا تُعد شهادة عميل أو نتيجة منشورة.</p>",
      },
      en: {
        title: "Template: content operations from request to follow-up",
        excerpt:
          "An internal template for an operational workflow article.",
        content:
          "<p>An internal editorial draft. It is not a client testimonial or a published result.</p>",
      },
      tr: {
        title: "Şablon: talepten takibe içerik operasyonları",
        excerpt:
          "Operasyonel iş akışı makalesi için dahili şablon.",
        content:
          "<p>Dahili editoryal taslak. Müşteri yorumu veya yayınlanmış sonuç değildir.</p>",
      },
    },
  },
  {
    id: 3,
    slug: "editorial-plan",
    status: "draft",
    publishedAt: null,
    scheduledAt: "2026-09-01T10:00:00.000Z",
    category: "planning",
    tags: ["planning", "editorial", "quality"],
    featuredImage:
      "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&w=1200&q=80",
    contentByLanguage: {
      ar: {
        title: "قالب: خطة تحريرية متعددة اللغات",
        excerpt:
          "مسودة داخلية لتجهيز خطة مقالات عربية وإنجليزية وتركية.",
        content:
          "<p>يستخدم هذا القالب داخل لوحة الإدارة للتدريب على المسودة والجدولة والمعاينة.</p>",
      },
      en: {
        title: "Template: multilingual editorial plan",
        excerpt:
          "An internal draft for Arabic, English, and Turkish editorial planning.",
        content:
          "<p>This template is used inside the administration experience to validate drafting, scheduling, and preview.</p>",
      },
      tr: {
        title: "Şablon: çok dilli yayın planı",
        excerpt:
          "Arapça, İngilizce ve Türkçe yayın planlaması için dahili taslak.",
        content:
          "<p>Bu şablon taslak, zamanlama ve önizleme akışlarını doğrulamak için yönetim alanında kullanılır.</p>",
      },
    },
  },
];

const categoryNames = {
  ar: {
    seo: "تحسين الظهور",
    operations: "العمليات",
    planning: "التخطيط",
    "client-success": "نجاح العميل",
  },
  en: {
    seo: "SEO",
    operations: "Operations",
    planning: "Planning",
    "client-success": "Client success",
  },
  tr: {
    seo: "SEO",
    operations: "Operasyonlar",
    planning: "Planlama",
    "client-success": "Müşteri başarısı",
  },
};

const languageLabels = {
  ar: {
    title: "المدونة",
    empty: "لا توجد مقالات منشورة حالياً.",
    noResults: "لم نجد نتائج مطابقة لبحثك.",
  },
  en: {
    title: "Blog",
    empty: "There are no published articles yet.",
    noResults: "No articles matched your search.",
  },
  tr: {
    title: "Blog",
    empty: "Henüz yayınlanmış makale yok.",
    noResults: "Aramanızla eşleşen makale bulunamadı.",
  },
};

function isVisible(post, preview) {
  if (preview) return true;
  if (post.status === "published" && post.publishedAt) {
    return new Date(post.publishedAt).getTime() <= Date.now();
  }
  if (post.status === "scheduled" && post.scheduledAt) {
    return new Date(post.scheduledAt).getTime() <= Date.now();
  }
  return false;
}

function normalizeLanguage(language) {
  return language === "en" || language === "tr" ? language : "ar";
}

function getPostCopy(post, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const content =
    post.contentByLanguage[normalizedLanguage] ||
    post.contentByLanguage.ar;
  return {
    ...content,
    title: content.title || post.contentByLanguage.ar.title,
    excerpt: content.excerpt || post.contentByLanguage.ar.excerpt,
    content: content.content || post.contentByLanguage.ar.content,
  };
}

function getVisiblePosts(language, preview) {
  const normalizedLanguage = normalizeLanguage(language);
  return posts
    .filter((post) => isVisible(post, preview))
    .map((post) => ({
      ...post,
      copy: getPostCopy(post, normalizedLanguage),
    }))
    .sort((left, right) => {
      const leftDate =
        left.publishedAt || left.scheduledAt || "1970-01-01T00:00:00.000Z";
      const rightDate =
        right.publishedAt || right.scheduledAt || "1970-01-01T00:00:00.000Z";
      return new Date(rightDate) - new Date(leftDate);
    });
}

export function getBlogPosts({
  language = "ar",
  page = 1,
  perPage = 6,
  search = "",
  category = "",
  tag = "",
  preview = false,
} = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedSearch = search.trim().toLowerCase();
  const visiblePosts = getVisiblePosts(normalizedLanguage, preview).filter(
    (post) => {
      if (category && post.category !== category) return false;
      if (tag && !post.tags.includes(tag)) return false;
      if (!normalizedSearch) return true;
      const haystack =
        `${post.copy.title} ${post.copy.excerpt} ${post.copy.content} ${post.tags.join(" ")} ${post.category}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    }
  );

  const safePerPage = Math.min(Math.max(Number(perPage) || 6, 1), 24);
  const total = visiblePosts.length;
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * safePerPage;

  return {
    posts: visiblePosts.slice(start, start + safePerPage),
    page: safePage,
    perPage: safePerPage,
    total,
    totalPages,
    language: normalizedLanguage,
    labels: languageLabels[normalizedLanguage],
  };
}

export function getBlogPostBySlug(
  slug,
  { language = "ar", preview = false } = {}
) {
  const normalizedLanguage = normalizeLanguage(language);
  const post = posts.find((item) => item.slug === slug);
  if (!post || !isVisible(post, preview)) return null;
  return {
    ...post,
    copy: getPostCopy(post, normalizedLanguage),
  };
}

export function getBlogCategories(language = "ar") {
  const normalizedLanguage = normalizeLanguage(language);
  return posts.reduce((accumulator, post) => {
    if (!accumulator[post.category]) {
      accumulator[post.category] = {
        slug: post.category,
        label: categoryNames[normalizedLanguage][post.category] || post.category,
      };
    }
    return accumulator;
  }, {});
}

export function getBlogTags(language = "ar") {
  void language;
  return posts.reduce((accumulator, post) => {
    post.tags.forEach((tag) => {
      if (!accumulator[tag]) accumulator[tag] = { slug: tag, label: tag };
    });
    return accumulator;
  }, {});
}

export function getRelatedBlogPosts(
  post,
  { language = "ar", preview = false, limit = 3 } = {}
) {
  const normalizedLanguage = normalizeLanguage(language);
  return getVisiblePosts(normalizedLanguage, preview)
    .filter(
      (item) =>
        item.id !== post.id &&
        (item.category === post.category ||
          item.tags.some((tag) => post.tags.includes(tag)))
    )
    .slice(0, limit);
}

export function getBlogFeed(language = "ar") {
  return getVisiblePosts(normalizeLanguage(language), false).slice(0, 50);
}
