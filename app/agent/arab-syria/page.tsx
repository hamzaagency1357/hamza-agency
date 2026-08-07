import Link from "next/link";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import {
  AGENT_PUBLIC_PATH,
  localizePublicHref,
} from "@/lib/i18n/publicLocales";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  ar: {
    readableName: "عراب سوريا",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    roleLine: "الوكيل والمدير في",
    lead: "يشرف عراب سوريا على دعم وتطوير صناع المحتوى وبرامج البث المباشر، مستندًا إلى خبرة واسعة ونهج قائم على الأمان والخصوصية والمتابعة المهنية.",
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
    readableName: "Arab Syria",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    roleLine: "Agent and Manager at",
    lead: "Arab Syria oversees the support and development of content creators and live-streaming programs, drawing on broad experience and an approach centered on safety, privacy, and professional follow-up.",
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
    readableName: "Arab Syria",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    roleLine: "Temsilci ve Yönetici",
    lead: "Arab Syria, geniş deneyime ve güvenlik, gizlilik ve profesyonel takibi merkeze alan bir yaklaşıma dayanarak içerik üreticilerinin ve canlı yayın programlarının desteklenmesini ve geliştirilmesini yönetir.",
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
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#070009]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10 md:py-16">
        <section
          className="overflow-hidden rounded-[2rem] border border-purple-400/20 bg-black/40 p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.16)] backdrop-blur md:p-12"
          data-testid="agent-profile-page"
        >
          <h1
            className="mx-auto max-w-full"
            aria-label={t.readableName}
            data-testid="agent-primary-identity"
          >
            <span className="sr-only">{t.readableName}</span>
            <bdi
              aria-hidden="true"
              dir="ltr"
              className="block max-w-full whitespace-nowrap [unicode-bidi:isolate] bg-gradient-to-r from-yellow-200 via-fuchsia-300 to-yellow-300 bg-clip-text text-[clamp(1.5rem,7.2vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-transparent drop-shadow-[0_0_20px_rgba(250,204,21,0.22)]"
            >
              {t.visualName}
            </bdi>
          </h1>

          <p className="mt-5 text-[clamp(1.25rem,5vw,2.25rem)] font-extrabold leading-tight text-white">
            {t.roleLine}
          </p>
          <p
            dir="ltr"
            className="mt-2 text-[clamp(2rem,8vw,4.25rem)] font-black leading-none tracking-tight text-yellow-200"
          >
            HAMZA AGENCY
          </p>

          <div
            aria-hidden="true"
            className="mx-auto mt-7 h-px w-full max-w-xl bg-gradient-to-r from-transparent via-yellow-300/75 to-transparent"
          />

          <p className="mx-auto mt-7 max-w-4xl text-lg leading-9 text-white/76 md:text-xl md:leading-10">
            {t.lead}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={localizePublicHref("/contact", language)}
              className="inline-flex min-h-12 items-center rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-3 font-black"
            >
              {t.contact}
            </Link>
            <Link
              href={localizePublicHref("/about", language)}
              className="inline-flex min-h-12 items-center rounded-full border border-white/15 bg-white/[0.05] px-7 py-3 font-black"
            >
              {t.about}
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          {[
            [t.roleTitle, t.roleBody],
            [t.trustTitle, t.trustBody],
            [t.experienceTitle, t.experienceBody],
          ].map(([title, body]) => (
            <article
              key={title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur"
            >
              <h2 className="text-2xl font-black text-purple-100">{title}</h2>
              <p className="mt-4 leading-8 text-white/70">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">{t.faqTitle}</h2>
          <p className="mt-4 max-w-4xl leading-9 text-white/75">{t.faqBody}</p>
        </section>

        <span className="sr-only">{AGENT_PUBLIC_PATH}</span>
      </main>
    </PublicLanguageMain>
  );
}
