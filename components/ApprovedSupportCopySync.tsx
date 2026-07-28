"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const approvedCopy = {
  ar: "نستقبل رسائلكم وطلباتكم على مدار الساعة، وسيتم الرد عليكم في أقرب وقت ممكن.",
  en: "We receive your messages and requests around the clock and will respond as soon as possible.",
  tr: "Mesajlarınızı ve taleplerinizi günün her saati alıyor ve en kısa sürede yanıtlıyoruz.",
};

const knownSupportMechanismCopy = [
  "تتم المتابعة حسب توفر فريق الوكالة وضغط الطلبات",
  "فريقنا متواجد لمتابعة طلباتكم ورسائلكم، وسيتم الرد عليكم في أقرب فرصة ممكنة.",
  "Follow-up depends on team availability and current request volume.",
  "Takip, ekibin uygunluğuna ve mevcut talep yoğunluğuna göre yapılır.",
  ...Object.values(approvedCopy),
];

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const normalizedKnownCopy = new Set(knownSupportMechanismCopy.map(normalize));

function synchronizeSupportCopy(root: Node, replacement: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const text = current as Text;
    const value = normalize(text.nodeValue || "");
    if (value && normalizedKnownCopy.has(value)) {
      text.nodeValue = replacement;
    }
    current = walker.nextNode();
  }
}

export default function ApprovedSupportCopySync() {
  const pathname = usePathname();
  const language = useSiteLanguage();

  useLayoutEffect(() => {
    if (pathname.startsWith("/admin") || pathname === "/maintenance") return;

    const replacement = approvedCopy[language];
    synchronizeSupportCopy(document.body, replacement);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => synchronizeSupportCopy(node, replacement));
        if (mutation.type === "characterData") {
          synchronizeSupportCopy(mutation.target, replacement);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language, pathname]);

  return null;
}
