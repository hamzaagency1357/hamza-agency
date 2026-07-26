"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import PartnerDetailsLink from "@/components/PartnerDetailsLink";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export type PartnerTranslationItem = {
  id: string | number;
  name: string;
  category: string;
  description: string;
  agreementLabel: string;
  logoUrl: string | null;
  programUrl: string;
  isFeatured: boolean;
};

type PartnerFields = "title" | "summary" | "content";

const cardCopy = {
  ar: { agreement: "اتفاق تعاون" },
  en: { agreement: "Partnership agreement" },
  tr: { agreement: "İş birliği anlaşması" },
};

export default function PartnersGridWithTranslations({
  featuredPartners,
  otherPartners,
}: {
  featuredPartners: PartnerTranslationItem[];
  otherPartners: PartnerTranslationItem[];
}) {
  const language = useSiteLanguage();
  const [translationMap, setTranslationMap] = useState<PublishedTranslationMap<PartnerFields>>({});
  const allPartners = useMemo(
    () => [...featuredPartners, ...otherPartners],
    [featuredPartners, otherPartners]
  );

  useEffect(() => {
    let active = true;
    setTranslationMap({});

    if (language === "ar" || allPartners.length === 0) {
      return () => {
        active = false;
      };
    }

    async function loadTranslations() {
      const translations = await readPublishedTranslations<PartnerFields>({
        sourceType: "partners",
        language,
        sourceIds: allPartners.map((partner) => partner.id),
        fields: ["title", "summary", "content"],
      });

      if (active) setTranslationMap(translations);
    }

    void loadTranslations();

    return () => {
      active = false;
    };
  }, [allPartners, language]);

  return (
    <div dir={getLanguageDirection(language)}>
      {featuredPartners.length > 0 ? (
        <section className="mt-14">
          <div className="grid gap-6 lg:grid-cols-3">
            {featuredPartners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                translations={translationMap[String(partner.id)]}
                featured
              />
            ))}
          </div>
        </section>
      ) : null}

      {otherPartners.length > 0 ? (
        <section className="mt-14">
          <div className="grid gap-6 md:grid-cols-2">
            {otherPartners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                translations={translationMap[String(partner.id)]}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );

  function PartnerCard({
    partner,
    translations,
    featured = false,
  }: {
    partner: PartnerTranslationItem;
    translations: Partial<Record<PartnerFields, string>> | undefined;
    featured?: boolean;
  }) {
    const hasPublishedTranslation =
      language !== "ar" &&
      hasCompletePublishedTranslation(translations, ["title", "summary", "content"]);
    const name = hasPublishedTranslation ? translations?.title || partner.name : partner.name;
    const category = hasPublishedTranslation
      ? translations?.summary || partner.category
      : partner.category;
    const description = hasPublishedTranslation
      ? translations?.content || partner.description
      : partner.description;
    const agreement = language === "ar" ? partner.agreementLabel || cardCopy.ar.agreement : cardCopy[language].agreement;

    return (
      <article
        className={`rounded-[2rem] border p-6 backdrop-blur transition hover:-translate-y-1 md:p-7 ${
          featured
            ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]"
            : "border-white/10 bg-white/[0.045]"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-purple-400/20 bg-gradient-to-br from-purple-500/20 via-black/20 to-yellow-500/10 p-3">
            {partner.logoUrl ? (
              <Image
                src={partner.logoUrl}
                alt={`${name} logo`}
                width={96}
                height={96}
                unoptimized
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-center text-lg font-black leading-tight text-yellow-100">{name}</span>
            )}
          </div>
          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-100">
            {agreement}
          </span>
        </div>
        <h3 className="text-3xl font-black">{name}</h3>
        <p className="mt-2 text-sm font-bold text-purple-100/80">{category}</p>
        <p className="mt-5 leading-8 text-white/70">{description}</p>
        <PartnerDetailsLink href={partner.programUrl || "/programs"} />
      </article>
    );
  }
}
