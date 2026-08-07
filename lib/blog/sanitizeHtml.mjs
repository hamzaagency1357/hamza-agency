const ALLOWED_TAGS = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "blockquote",
  "br",
  "code",
  "pre",
  "a",
]);

const VOID_TAGS = new Set(["br"]);
const DROP_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "svg",
  "math",
  "template",
  "noscript",
  "textarea",
  "button",
  "select",
]);
const DROP_TAGS = new Set([
  "input",
  "option",
  "link",
  "meta",
  "base",
  "source",
  "track",
  "area",
  "img",
  "audio",
  "video",
  "canvas",
]);
const DEFAULT_SITE_ORIGIN = "https://hamza-agency.com";
const NAMED_ENTITIES = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["colon", ":"],
  ["gt", ">"],
  ["lt", "<"],
  ["newline", "\n"],
  ["quot", '"'],
  ["tab", "\t"],
]);

export const ARTICLE_HTML_ALLOWED_TAGS = Object.freeze([...ALLOWED_TAGS]);

function isWhitespace(character) {
  return character === " " || character === "\n" || character === "\r" || character === "\t" || character === "\f";
}

function isTagNameCharacter(character) {
  return Boolean(character) && /[A-Za-z0-9:-]/.test(character);
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z]+);?/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
    }
    if (lower.startsWith("#")) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : "";
    }
    return NAMED_ENTITIES.get(lower) ?? match;
  });
}

function repeatedlyDecodeUrl(value) {
  let decoded = decodeHtmlEntities(value.trim());
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = decodeHtmlEntities(next);
    } catch {
      break;
    }
  }
  return decoded;
}

function normalizeUrlForValidation(value) {
  return repeatedlyDecodeUrl(value)
    .replaceAll("\\", "/")
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "")
    .toLowerCase();
}

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeHref(rawValue, siteOrigin) {
  const decoded = repeatedlyDecodeUrl(rawValue);
  const normalized = normalizeUrlForValidation(rawValue);
  if (!normalized || normalized.startsWith("//")) return null;

  if (
    normalized.startsWith("#")
    || normalized.startsWith("?")
    || normalized.startsWith("/")
    || normalized.startsWith("./")
    || normalized.startsWith("../")
  ) {
    return { href: decoded, external: false };
  }

  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/i)?.[1] ?? null;
  if (scheme && !["http", "https", "mailto"].includes(scheme)) return null;
  if (!scheme && normalized.includes(":")) return null;

  if (scheme === "mailto") return { href: decoded, external: false };
  if (!scheme) return { href: decoded, external: false };

  try {
    const base = new URL(siteOrigin);
    const target = new URL(decoded);
    return { href: target.href, external: target.origin !== base.origin };
  } catch {
    return null;
  }
}

function readTag(html, startIndex) {
  let cursor = startIndex + 1;
  if (html.startsWith("!--", cursor)) {
    const end = html.indexOf("-->", cursor + 3);
    return { kind: "comment", end: end === -1 ? html.length : end + 3 };
  }
  if (html[cursor] === "!" || html[cursor] === "?") {
    const end = html.indexOf(">", cursor + 1);
    return { kind: "declaration", end: end === -1 ? html.length : end + 1 };
  }

  let closing = false;
  if (html[cursor] === "/") {
    closing = true;
    cursor += 1;
  }
  while (isWhitespace(html[cursor])) cursor += 1;

  const nameStart = cursor;
  while (isTagNameCharacter(html[cursor])) cursor += 1;
  if (cursor === nameStart) return null;
  const name = html.slice(nameStart, cursor).toLowerCase();
  const attributes = [];
  let selfClosing = false;

  while (cursor < html.length) {
    while (isWhitespace(html[cursor])) cursor += 1;
    if (html[cursor] === ">") return { kind: "tag", end: cursor + 1, closing, name, attributes, selfClosing };
    if (html[cursor] === "/" && html[cursor + 1] === ">") {
      selfClosing = true;
      return { kind: "tag", end: cursor + 2, closing, name, attributes, selfClosing };
    }
    if (closing) {
      const end = html.indexOf(">", cursor);
      return { kind: "tag", end: end === -1 ? html.length : end + 1, closing, name, attributes, selfClosing };
    }

    const attributeStart = cursor;
    while (
      cursor < html.length
      && !isWhitespace(html[cursor])
      && html[cursor] !== "="
      && html[cursor] !== ">"
      && !(html[cursor] === "/" && html[cursor + 1] === ">")
    ) cursor += 1;
    if (cursor === attributeStart) {
      cursor += 1;
      continue;
    }
    const attributeName = html.slice(attributeStart, cursor).toLowerCase();
    while (isWhitespace(html[cursor])) cursor += 1;

    let attributeValue = "";
    if (html[cursor] === "=") {
      cursor += 1;
      while (isWhitespace(html[cursor])) cursor += 1;
      const quote = html[cursor] === '"' || html[cursor] === "'" ? html[cursor] : null;
      if (quote) {
        cursor += 1;
        const valueStart = cursor;
        while (cursor < html.length && html[cursor] !== quote) cursor += 1;
        attributeValue = html.slice(valueStart, cursor);
        if (html[cursor] === quote) cursor += 1;
      } else {
        const valueStart = cursor;
        while (cursor < html.length && !isWhitespace(html[cursor]) && html[cursor] !== ">") cursor += 1;
        attributeValue = html.slice(valueStart, cursor);
      }
    }
    attributes.push({ name: attributeName, value: attributeValue });
  }

  return { kind: "tag", end: html.length, closing, name, attributes, selfClosing };
}

function closeThroughTag(stack, tagName, output) {
  const matchingIndex = stack.lastIndexOf(tagName);
  if (matchingIndex === -1) return output;
  for (let index = stack.length - 1; index >= matchingIndex; index -= 1) {
    output += `</${stack[index]}>`;
  }
  stack.length = matchingIndex;
  return output;
}

function serializeAllowedTag(tag, siteOrigin) {
  if (tag.name !== "a") return `<${tag.name}>`;

  const title = tag.attributes.find((attribute) => attribute.name === "title")?.value.trim() || null;
  const hrefAttribute = tag.attributes.find((attribute) => attribute.name === "href");
  const safeHref = hrefAttribute ? sanitizeHref(hrefAttribute.value, siteOrigin) : null;
  const attributes = [];
  if (safeHref) attributes.push(`href="${escapeAttribute(safeHref.href)}"`);
  if (title) attributes.push(`title="${escapeAttribute(title)}"`);
  if (safeHref?.external) attributes.push('rel="noopener noreferrer"');
  return attributes.length ? `<a ${attributes.join(" ")}>` : "<a>";
}

export function sanitizeArticleHtml(value, options = {}) {
  const html = typeof value === "string" ? value : "";
  const siteOrigin = options.siteOrigin || DEFAULT_SITE_ORIGIN;
  const stack = [];
  const blockedStack = [];
  let output = "";
  let cursor = 0;

  while (cursor < html.length) {
    const tagStart = html.indexOf("<", cursor);
    if (tagStart === -1) {
      if (blockedStack.length === 0) output += html.slice(cursor);
      break;
    }

    if (blockedStack.length === 0) output += html.slice(cursor, tagStart);
    const tag = readTag(html, tagStart);
    if (!tag) {
      if (blockedStack.length === 0) output += "&lt;";
      cursor = tagStart + 1;
      continue;
    }
    cursor = tag.end;
    if (tag.kind !== "tag") continue;

    if (blockedStack.length > 0) {
      if (!tag.closing && DROP_CONTENT_TAGS.has(tag.name) && !tag.selfClosing) blockedStack.push(tag.name);
      else if (tag.closing && blockedStack.at(-1) === tag.name) blockedStack.pop();
      continue;
    }

    if (!tag.closing && DROP_CONTENT_TAGS.has(tag.name)) {
      if (!tag.selfClosing) blockedStack.push(tag.name);
      continue;
    }
    if (DROP_TAGS.has(tag.name)) continue;
    if (!ALLOWED_TAGS.has(tag.name)) continue;

    if (tag.closing) {
      if (!VOID_TAGS.has(tag.name)) output = closeThroughTag(stack, tag.name, output);
      continue;
    }

    if (tag.name === "a" && stack.includes("a")) output = closeThroughTag(stack, "a", output);
    output += serializeAllowedTag(tag, siteOrigin);
    if (!VOID_TAGS.has(tag.name) && !tag.selfClosing) stack.push(tag.name);
  }

  for (let index = stack.length - 1; index >= 0; index -= 1) output += `</${stack[index]}>`;
  return output;
}
