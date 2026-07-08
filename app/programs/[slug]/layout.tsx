import type { Metadata } from "next";

const siteUrl = "https://hamza-agency.com";
const defaultOgImage = "/Logo%20hamza%20agency.jpg";

const programSeo: Record<string, { title: string; description: string }> = {
  tiktok: {
    title: "برنامج TikTok | وكالة حمزة لصناع المحتوى",
    description:
      "انضم إلى برنامج TikTok عبر وكالة حمزة لإدارة وتطوير صناع المحتوى، مع متابعة احترافية ودعم في تحسين الحساب والمحتوى.",
  },
  "bigo-live": {
    title: "برنامج BIGO LIVE | وكالة حمزة للبث المباشر",
    description:
      "تعرف على برنامج BIGO LIVE مع وكالة حمزة لصناع المحتوى والبث المباشر، وشروط الانضمام وطريقة المتابعة عبر واتساب.",
  },
  yaahlan: {
    title: "برنامج Yaahlan | وكالة حمزة لصناع المحتوى",
    description:
      "برنامج Yaahlan ضمن برامج وكالة حمزة لدعم صناع المحتوى والمتقدمين الجادين، مع شرح الشروط وخطوات الانضمام.",
  },
  xena: {
    title: "برنامج Xena | وكالة حمزة",
    description:
      "برنامج Xena لصناع المحتوى ضمن وكالة حمزة، مع متابعة إدارية ودعم يساعد المتقدمين على فهم نظام البرنامج وخطوات الانضمام.",
  },
  catchii: {
    title: "برنامج Catchii | وكالة حمزة",
    description:
      "برنامج Catchii لصناع المحتوى المهتمين بالتواصل والترفيه، مع دعم ومتابعة من وكالة حمزة وخطوات تقديم واضحة.",
  },
};

type ProgramLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProgramLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const seo = programSeo[slug] || {
    title: "برنامج صناع المحتوى | وكالة حمزة",
    description:
      "صفحة برنامج من برامج وكالة حمزة لدعم وإدارة صناع المحتوى على منصات البث والتواصل الاجتماعي.",
  };

  const canonical = `${siteUrl}/programs/${slug}`;
  const imageAlt = `${seo.title} - HAMZA AGENCY`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      siteName: "Hamza Agency",
      locale: "ar_TR",
      type: "website",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [defaultOgImage],
    },
  };
}

export default function ProgramDetailsLayout({ children }: ProgramLayoutProps) {
  return children;
}
