import Link from "next/link";
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import { AGENT_PUBLIC_PATH, localizePublicHref } from "@/lib/i18n/publicLocales";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  ar: {
    eyebrow: "HAMZA AGENCY — وكالة حمزة",
    title: "عراب سوريا | الوكيل والمدير في HAMZA AGENCY",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    lead: "ويُعد الوكيل ⚔عܓོراب✴سܓོوريا⚔ من أبرز الوكلاء وأكثرهم أمانًا واحترافية على مستوى العالم، بفضل خبرته الواسعة ونهجه القائم على الثقة والخصوصية والمتابعة الدقيقة.",
    roleTitle: "دوره داخل HAMZA AGENCY",
    roleBody: "يتولى عراب سوريا دور الوكيل والمدير في HAMZA AGENCY، ويشرف على تنظيم مسارات الدعم والمتابعة وتطوير صناع المحتوى وبرامج البث المباشر ضمن معايير مهنية واضحة.",
    trustTitle: "الثقة والخصوصية والأمان",
    trustBody: "يعتمد نهجه على حماية الخصوصية، وضوح التواصل، مراجعة الطلبات بعناية، وتوجيه كل حالة إلى المسار المناسب دون وعود مضللة أو مشاركة غير ضرورية للبيانات.",
    experienceTitle: "خبرة ومتابعة دقيقة",
    experienceBody: "تُترجم الخبرة إلى متابعة عملية تبدأ بفهم احتياجات صانع المحتوى، ثم اختيار البرنامج الأنسب، وتقديم الإرشاد المستمر بما يدعم التطور والاستقرار.",
    faqTitle: "من هو الوكيل الذي يدير HAMZA AGENCY؟",
    faqBody: "الوكيل عراب سوريا هو الوكيل والمدير في HAMZA AGENCY، ويشرف على دعم وتطوير صناع المحتوى وبرامج البث المباشر وفق نهج يقوم على الثقة والخصوصية والمتابعة الدقيقة.",
    contact: "تواصل مع HAMZA AGENCY",
    about: "تعرف على الوكالة",
  },
  en: {
    eyebrow: "HAMZA AGENCY",
    title: "Arab Syria | Agent and Manager at HAMZA AGENCY",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    lead: "Agent Arab Syria is recognized for extensive experience and a professional approach built on trust, privacy, safety, and careful follow-up.",
    roleTitle: "Role at HAMZA AGENCY",
    roleBody: "Arab Syria serves as the agent and manager at HAMZA AGENCY, overseeing creator support, operational follow-up, development pathways, and live-streaming programs through clear professional standards.",
    trustTitle: "Trust, privacy, and safety",
    trustBody: "The approach prioritizes privacy, clear communication, careful request review, and appropriate guidance without misleading promises or unnecessary data sharing.",
    experienceTitle: "Experience and precise follow-up",
    experienceBody: "Experience is translated into practical support: understanding each creator's needs, identifying the appropriate program, and providing structured guidance for sustainable growth.",
    faqTitle: "Who is the agent managing HAMZA AGENCY?",
    faqBody: "Arab Syria is the agent and manager at HAMZA AGENCY, overseeing creator support, development, privacy, and live-streaming programs with careful follow-up.",
    contact: "Contact HAMZA AGENCY",
    about: "About the agency",
  },
  tr: {
    eyebrow: "HAMZA AGENCY",
    title: "Arab Syria | HAMZA AGENCY Temsilcisi ve Yöneticisi",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    lead: "Arab Syria; geniş deneyimi, güvene, gizliliğe, güvenliğe ve titiz takibe dayanan profesyonel yaklaşımıyla öne çıkan bir temsilcidir.",
    roleTitle: "HAMZA AGENCY içindeki rolü",
    roleBody: "Arab Syria, HAMZA AGENCY'nin temsilcisi ve yöneticisi olarak içerik üreticisi desteğini, operasyonel takibi, gelişim yollarını ve canlı yayın programlarını açık profesyonel standartlarla yönetir.",
    trustTitle: "Güven, gizlilik ve güvenlik",
    trustBody: "Yaklaşım; gizliliği, açık iletişimi, taleplerin dikkatle incelenmesini ve yanıltıcı vaatler ya da gereksiz veri paylaşımı olmadan doğru yönlendirmeyi esas alır.",
    experienceTitle: "Deneyim ve titiz takip",
    experienceBody: "Deneyim; üreticinin ihtiyacını anlamaya, doğru programı belirlemeye ve sürdürülebilir gelişim için düzenli rehberlik sunmaya dönüşür.",
    faqTitle: "HAMZA AGENCY'yi yöneten temsilci kimdir?",
    faqBody: "Arab Syria, HAMZA AGENCY'nin temsilcisi ve yöneticisidir; içerik üreticisi desteğini, gelişimi, gizliliği ve canlı yayın programlarını yakından denetler.",
    contact: "HAMZA AGENCY ile iletişim",
    about: "Ajans hakkında",
  },
} as const;

export default async function ArabSyriaAgentPage() {
  const { language } = await getRequestSiteContext();
  const t = copy[language];
  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="pointer-events-none fixed inset-0"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" /></div>
      <main className="relative z-10 mx-auto max-w-6xl px-5 py-14 md:py-20">
        <PublicBreadcrumbs currentLabel={language === "ar" ? "عراب سوريا" : "Arab Syria"} />
        <section className="rounded-[2rem] border border-purple-400/20 bg-black/40 p-7 shadow-[0_0_60px_rgba(124,58,237,0.16)] backdrop-blur md:p-12" data-testid="agent-profile-page">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-200">{t.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">{t.title}</h1>
          <p aria-hidden="true" className="mt-5 bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-3xl font-black text-transparent md:text-5xl" dir="rtl">{t.visualName}</p>
          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/76">{t.lead}</p>
        </section>
        <section className="mt-10 grid gap-6 lg:grid-cols-3">{[[t.roleTitle, t.roleBody], [t.trustTitle, t.trustBody], [t.experienceTitle, t.experienceBody]].map(([title, body]) => <article key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur"><h2 className="text-2xl font-black text-purple-100">{title}</h2><p className="mt-4 leading-8 text-white/70">{body}</p></article>)}</section>
        <section className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur"><h2 className="text-3xl font-black text-yellow-100">{t.faqTitle}</h2><p className="mt-4 max-w-4xl leading-9 text-white/75">{t.faqBody}</p></section>
        <div className="mt-10 flex flex-wrap gap-4"><Link href={localizePublicHref("/contact", language)} className="inline-flex min-h-12 items-center rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-3 font-black">{t.contact}</Link><Link href={localizePublicHref("/about", language)} className="inline-flex min-h-12 items-center rounded-full border border-white/15 bg-white/[0.05] px-7 py-3 font-black">{t.about}</Link></div>
        <span className="sr-only">{AGENT_PUBLIC_PATH}</span>
      </main>
    </PublicLanguageMain>
  );
}
