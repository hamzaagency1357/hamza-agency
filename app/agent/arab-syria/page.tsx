import Link from "next/link";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import {
  AGENT_PUBLIC_PATH,
  localizePublicHref,
} from "@/lib/i18n/publicLocales";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WHATSAPP_URL = "https://wa.me/905011730377";

const copy = {
  ar: {
    readableName: "عراب سوريا",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    roleLine: "الوكيل والمدير في",
    lead: "يشرف عراب سوريا على دعم وتطوير صناع المحتوى وبرامج البث المباشر، مستندًا إلى خبرة واسعة ونهج قائم على الأمان والخصوصية والمتابعة المهنية.",
    managementTitle: "إدارة الوكالة",
    managementBody: "تُدار وكالة حمزة بإشراف الوكيل عراب سوريا، وفق معايير مهنية تركز على الثقة والخصوصية والمتابعة الدقيقة.",
    aboutTitle: "عن الوكيل",
    aboutBody: "يشرف عراب سوريا على دعم وتطوير صناع المحتوى وبرامج البث المباشر، مستندًا إلى خبرة واسعة ونهج قائم على الأمان والخصوصية والمتابعة المهنية.",
    menu: "فتح القائمة",
    about: "عن الوكيل",
    whatsapp: "واتساب الوكيل",
    ribbon: "يمكنك الآن الانضمام إلى برامجنا الحصرية:",
  },
  en: {
    readableName: "Godfather of Syria",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    roleLine: "Agent and Manager at",
    lead: "The Godfather of Syria oversees the support and development of content creators and live-streaming programs, drawing on broad experience and an approach centered on safety, privacy, and professional follow-up.",
    managementTitle: "Agency Management",
    managementBody: "HAMZA AGENCY is managed under the supervision of the Godfather of Syria, following professional standards focused on trust, privacy, and careful follow-up.",
    aboutTitle: "About the Agent",
    aboutBody: "The Godfather of Syria oversees creator support and live-streaming programs with broad experience and a professional approach centered on safety, privacy, and consistent follow-up.",
    menu: "Open menu",
    about: "About the agent",
    whatsapp: "Agent WhatsApp",
    ribbon: "You can now join our featured programs:",
  },
  tr: {
    readableName: "Suriye'nin Vaftiz Babası",
    visualName: "⚔عܓོراب✴سܓོوريا⚔",
    roleLine: "Temsilci ve Yönetici",
    lead: "Suriye'nin Vaftiz Babası, geniş deneyime ve güvenlik, gizlilik ve profesyonel takibi merkeze alan bir yaklaşıma dayanarak içerik üreticilerinin ve canlı yayın programlarının desteklenmesini ve geliştirilmesini yönetir.",
    managementTitle: "Ajans Yönetimi",
    managementBody: "HAMZA AGENCY, güven, gizlilik ve titiz takibe odaklanan profesyonel standartlar doğrultusunda Suriye'nin Vaftiz Babası'nın gözetiminde yönetilir.",
    aboutTitle: "Temsilci Hakkında",
    aboutBody: "Suriye'nin Vaftiz Babası, geniş deneyimiyle içerik üreticilerini ve canlı yayın programlarını güvenlik, gizlilik ve profesyonel takip odaklı bir yaklaşımla destekler.",
    menu: "Menüyü aç",
    about: "Temsilci hakkında",
    whatsapp: "Temsilci WhatsApp",
    ribbon: "Öne çıkan programlarımıza şimdi katılabilirsiniz:",
  },
} as const;

export default async function ArabSyriaAgentPage() {
  const { language } = await getRequestSiteContext();
  const t = copy[language];

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#070009]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.42)_0%,rgba(23,3,44,0.78)_34%,rgba(7,0,9,0.98)_72%)]" />
        <div className="absolute inset-x-0 top-1/3 h-72 -rotate-6 bg-[linear-gradient(90deg,transparent,rgba(126,34,206,0.16),transparent)] blur-2xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
        <section
          className="overflow-hidden rounded-[2rem] border border-purple-300/20 bg-[linear-gradient(145deg,rgba(18,5,38,.94),rgba(40,12,73,.78),rgba(12,3,24,.95))] px-5 py-9 text-center shadow-[0_0_70px_rgba(124,58,237,0.22)] backdrop-blur md:px-10 md:py-14"
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
              className="block max-w-full whitespace-nowrap [unicode-bidi:isolate] bg-gradient-to-b from-yellow-100 via-yellow-300 to-fuchsia-400 bg-clip-text text-[clamp(1.5rem,7.2vw,4.5rem)] font-black leading-tight tracking-[-0.04em] text-transparent drop-shadow-[0_4px_14px_rgba(250,204,21,0.36)]"
            >
              {t.visualName}
            </bdi>
          </h1>

          <p className="mt-5 text-[clamp(1.25rem,5vw,2.2rem)] font-extrabold leading-tight text-white/95">
            {t.roleLine}
          </p>
          <p dir="ltr" className="mt-2 text-[clamp(2rem,8vw,4.3rem)] font-black leading-none tracking-tight text-yellow-200">
            HAMZA AGENCY
          </p>

          <div aria-hidden="true" className="mx-auto mt-7 flex max-w-xl items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-300/70" />
            <span className="h-2 w-2 rotate-45 border border-yellow-300 bg-yellow-200/80" />
            <span className="h-1.5 w-1.5 rotate-45 bg-yellow-300" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-300/70" />
          </div>

          <p className="mx-auto mt-7 max-w-4xl text-base leading-8 text-white/82 sm:text-lg md:text-xl md:leading-10">
            {t.lead}
          </p>

          <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
            <a href="#agent-details" className="inline-flex min-h-12 items-center justify-center rounded-full border border-yellow-300/55 bg-yellow-300/[0.06] px-6 py-3 font-black text-yellow-200 transition hover:bg-yellow-300/10">
              {t.menu}
            </a>
            <Link href={localizePublicHref("/about", language)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-fuchsia-300/45 bg-fuchsia-500/[0.08] px-6 py-3 font-black text-fuchsia-100 transition hover:bg-fuchsia-500/15">
              {t.about}
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-green-300/45 bg-green-500/[0.10] px-6 py-3 font-black text-green-200 transition hover:bg-green-500/15">
              {t.whatsapp}
            </a>
          </div>
        </section>

        <section id="agent-details" className="mt-5 grid gap-5 md:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(43,15,73,.72),rgba(16,5,31,.88))] p-7 text-center shadow-[0_18px_45px_rgba(0,0,0,.22)] backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/45 text-2xl">◇</div>
            <h2 className="mt-5 text-2xl font-black text-white">{t.managementTitle}</h2>
            <p className="mt-4 leading-8 text-white/74">{t.managementBody}</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(43,15,73,.72),rgba(16,5,31,.88))] p-7 text-center shadow-[0_18px_45px_rgba(0,0,0,.22)] backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/45 text-2xl">✦</div>
            <h2 className="mt-5 text-2xl font-black text-white">{t.aboutTitle}</h2>
            <p className="mt-4 leading-8 text-white/74">{t.aboutBody}</p>
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-yellow-300/25 bg-yellow-300/[0.055] px-5 py-4 text-center text-sm font-bold text-white/85 sm:text-base">
          <span className="text-yellow-200">⚡ {t.ribbon}</span>{" "}
          <span dir="ltr">BIGO LIVE, Yaahlan, Xena, Catchii</span>
        </section>

        <span className="sr-only">{AGENT_PUBLIC_PATH}</span>
      </main>
    </PublicLanguageMain>
  );
}
