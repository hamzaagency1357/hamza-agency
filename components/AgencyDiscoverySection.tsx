import Link from "next/link";
import { agencyDiscoveryCopy } from "@/lib/i18n/agencyDiscoveryCopy";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { localizePublicHref } from "@/lib/i18n/publicLocales";

export default function AgencyDiscoverySection({ language }: { language: SiteLanguage }) {
  const copy = agencyDiscoveryCopy[language];

  return (
    <section
      aria-labelledby="agency-discovery-heading"
      data-testid="agency-discovery"
      className="mx-auto max-w-7xl px-5 pb-20"
    >
      <h2 id="agency-discovery-heading" className="text-center text-[clamp(1.85rem,7vw,2.5rem)] font-black text-[#faf6fc]">
        {copy.heading}
      </h2>
      <p className="mx-auto mt-6 max-w-4xl text-center leading-8 text-[#c9bfd2]">
        {copy.intro}
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {copy.questions.map((item) => (
          <article key={item.href} className="rounded-[2rem] border border-purple-300/15 bg-black/45 p-6">
            <h3 className="text-xl font-bold leading-8 text-[#f8f3fb]">{item.question}</h3>
            <p className="mt-4 leading-8 text-[#c9bfd2]">{item.answer}</p>
            <Link
              href={localizePublicHref(item.href, language)}
              className="mt-5 inline-flex rounded-full border border-yellow-300/25 px-5 py-3 font-bold text-yellow-100 hover:bg-yellow-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-200"
            >
              {item.linkLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
