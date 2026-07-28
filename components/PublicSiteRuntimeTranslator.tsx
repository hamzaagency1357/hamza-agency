"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import {
  getSiteRuntimeMetadata,
  translateSiteRuntimeText,
} from "@/lib/i18n/siteRuntimeTranslations";

const TRANSLATABLE_ATTRIBUTES = [
  "placeholder",
  "aria-label",
  "title",
  "alt",
  "dir",
] as const;
const METADATA_SELECTORS = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
] as const;
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

type OriginalMetadata = {
  title: string;
  values: Record<string, string>;
};

const originalText = new WeakMap<Text, string>();
const lastAppliedText = new WeakMap<Text, string>();
const attributeState = new WeakMap<Element, Map<AttributeName, AttributeState>>();
const originalMetadataByPath = new Map<string, OriginalMetadata>();

function normalizePathname(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function isPublicRoute(pathname: string) {
  return !pathname.startsWith("/admin") && pathname !== "/maintenance";
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  if (SKIPPED_TAGS.has(element.tagName)) return true;
  if (element.closest("[data-no-runtime-translate='true']")) return true;
  return false;
}

function translateCompositeText(value: string, language: SiteLanguage) {
  if (language === "ar") return value;

  const directTranslation = translateSiteRuntimeText(value, language);
  if (directTranslation !== value) return directTranslation;

  return value
    .split(/(\n+)/)
    .map((segment) => {
      if (!segment || /^\n+$/.test(segment)) return segment;

      const match = segment.match(/^(\s*)(.*?)(\s*)$/s);
      if (!match) return segment;

      const [, leading, core, trailing] = match;
      if (!core.trim()) return segment;

      return `${leading}${translateSiteRuntimeText(core, language)}${trailing}`;
    })
    .join("");
}

function translateTextNode(node: Text, language: SiteLanguage) {
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;

  const currentValue = node.nodeValue || "";
  if (!currentValue.trim()) return;

  const previousApplied = lastAppliedText.get(node);
  if (!originalText.has(node) || currentValue !== previousApplied) {
    originalText.set(node, currentValue);
  }

  const source = originalText.get(node) || currentValue;
  const translated = translateCompositeText(source, language);

  if (currentValue !== translated) {
    node.nodeValue = translated;
  }

  lastAppliedText.set(node, translated);
}

function getTranslatedAttributeValue(
  element: Element,
  attributeName: AttributeName,
  original: string,
  language: SiteLanguage
) {
  if (attributeName === "dir") {
    if (language === "ar") return original;

    if (
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.hasAttribute("data-preserve-direction")
    ) {
      return original;
    }

    return "ltr";
  }

  return translateCompositeText(original, language);
}

function translateElementAttributes(element: Element, language: SiteLanguage) {
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

    const translated = getTranslatedAttributeValue(
      element,
      attributeName,
      state.original,
      language
    );

    if (currentValue !== translated) {
      element.setAttribute(attributeName, translated);
    }
    state.lastApplied = translated;
  }
}

function translateSubtree(root: Node, language: SiteLanguage) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, language);
    return;
  }

  if (
    root.nodeType !== Node.ELEMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
  ) {
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

function captureOriginalMetadata(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  if (originalMetadataByPath.has(normalizedPath)) return;

  const values: Record<string, string> = {};
  for (const selector of METADATA_SELECTORS) {
    values[selector] =
      document.querySelector(selector)?.getAttribute("content") || "";
  }

  originalMetadataByPath.set(normalizedPath, {
    title: document.title,
    values,
  });
}

function updateLocalizedMetadata(pathname: string, language: SiteLanguage) {
  const normalizedPath = normalizePathname(pathname);
  captureOriginalMetadata(normalizedPath);
  const original = originalMetadataByPath.get(normalizedPath);

  if (language === "ar") {
    if (!original) return;
    document.title = original.title;
    for (const selector of METADATA_SELECTORS) {
      const value = original.values[selector];
      if (value) document.querySelector(selector)?.setAttribute("content", value);
    }
    return;
  }

  const metadata = getSiteRuntimeMetadata(normalizedPath, language);
  if (!metadata) return;

  document.title = metadata.title;

  const values: Record<string, string> = {
    'meta[name="description"]': metadata.description,
    'meta[property="og:title"]': metadata.title,
    'meta[property="og:description"]': metadata.description,
    'meta[name="twitter:title"]': metadata.title,
    'meta[name="twitter:description"]': metadata.description,
  };

  for (const selector of METADATA_SELECTORS) {
    document.querySelector(selector)?.setAttribute("content", values[selector]);
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
    const pendingNodes = new Set<Node>();

    const scheduleTranslation = (nodes: Node[]) => {
      nodes.forEach((node) => pendingNodes.add(node));
      if (scheduled) return;

      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        const nodesToTranslate = Array.from(pendingNodes);
        pendingNodes.clear();

        for (const node of nodesToTranslate) {
          translateSubtree(node, language);
        }
        updateLocalizedMetadata(pathname, language);
      });
    };

    const observer = new MutationObserver((mutations) => {
      const changedNodes: Node[] = [];

      for (const mutation of mutations) {
        if (mutation.type === "characterData" || mutation.type === "attributes") {
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
