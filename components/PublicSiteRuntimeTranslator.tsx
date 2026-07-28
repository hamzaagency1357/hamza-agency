"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import {
  getSiteRuntimeMetadata,
  translateSiteRuntimeText,
} from "@/lib/i18n/siteRuntimeTranslations";

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "SVG",
  "PATH",
]);

type AttributeName = (typeof TRANSLATABLE_ATTRIBUTES)[number];

type AttributeState = {
  original: string;
  lastApplied: string;
};

const originalText = new WeakMap<Text, string>();
const lastAppliedText = new WeakMap<Text, string>();
const attributeState = new WeakMap<Element, Map<AttributeName, AttributeState>>();

function isPublicRoute(pathname: string) {
  return !pathname.startsWith("/admin") && pathname !== "/maintenance";
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  if (SKIPPED_TAGS.has(element.tagName)) return true;
  if (element.closest("[data-no-runtime-translate='true']")) return true;
  return false;
}

function translateTextNode(node: Text, language: ReturnType<typeof useSiteLanguage>) {
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;

  const currentValue = node.nodeValue || "";
  if (!currentValue.trim()) return;

  const previousApplied = lastAppliedText.get(node);
  if (!originalText.has(node) || currentValue !== previousApplied) {
    originalText.set(node, currentValue);
  }

  const source = originalText.get(node) || currentValue;
  const translated = translateSiteRuntimeText(source, language);

  if (currentValue !== translated) {
    node.nodeValue = translated;
  }

  lastAppliedText.set(node, translated);
}

function translateElementAttributes(
  element: Element,
  language: ReturnType<typeof useSiteLanguage>
) {
  if (shouldSkipElement(element)) return;

  let elementState = attributeState.get(element);
  if (!elementState) {
    elementState = new Map();
    attributeState.set(element, elementState);
  }

  for (const attributeName of TRANSLATABLE_ATTRIBUTES) {
    if (!element.hasAttribute(attributeName)) continue;

    const currentValue = element.getAttribute(attributeName) || "";
    if (!currentValue.trim()) continue;

    const saved = elementState.get(attributeName);
    if (!saved || currentValue !== saved.lastApplied) {
      elementState.set(attributeName, {
        original: currentValue,
        lastApplied: currentValue,
      });
    }

    const state = elementState.get(attributeName);
    if (!state) continue;

    const translated = translateSiteRuntimeText(state.original, language);
    if (currentValue !== translated) {
      element.setAttribute(attributeName, translated);
    }
    state.lastApplied = translated;
  }
}

function translateSubtree(
  root: Node,
  language: ReturnType<typeof useSiteLanguage>
) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttributes(root as Element, language);
    if (shouldSkipElement(root as Element)) return;
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );

  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text, language);
    } else {
      translateElementAttributes(current as Element, language);
    }
    current = walker.nextNode();
  }
}

function updateLocalizedMetadata(pathname: string, language: ReturnType<typeof useSiteLanguage>) {
  if (language === "ar") return;
  const metadata = getSiteRuntimeMetadata(pathname, language);
  if (!metadata) return;

  document.title = metadata.title;

  const selectors: Array<[string, string]> = [
    ['meta[name="description"]', metadata.description],
    ['meta[property="og:title"]', metadata.title],
    ['meta[property="og:description"]', metadata.description],
    ['meta[name="twitter:title"]', metadata.title],
    ['meta[name="twitter:description"]', metadata.description],
  ];

  for (const [selector, content] of selectors) {
    document.querySelector(selector)?.setAttribute("content", content);
  }
}

export default function PublicSiteRuntimeTranslator() {
  const pathname = usePathname();
  const language = useSiteLanguage();

  useEffect(() => {
    if (!isPublicRoute(pathname)) return;

    const root = document.body;
    translateSubtree(root, language);
    updateLocalizedMetadata(pathname, language);

    let scheduled = false;
    const scheduleTranslation = (nodes: Node[]) => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        for (const node of nodes) {
          translateSubtree(node, language);
        }
        updateLocalizedMetadata(pathname, language);
      });
    };

    const observer = new MutationObserver((mutations) => {
      const changedNodes: Node[] = [];

      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          changedNodes.push(mutation.target);
          continue;
        }

        if (mutation.type === "attributes") {
          changedNodes.push(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => changedNodes.push(node));
      }

      if (changedNodes.length) scheduleTranslation(changedNodes);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [language, pathname]);

  return null;
}
