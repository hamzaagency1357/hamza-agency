import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeArticleHtml } from "../lib/blog/sanitizeHtml.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("article HTML allowlist preserves only supported editorial markup", () => {
  const input = '<p><strong>Bold</strong> <em>text</em><br><a href="/services" title="Services">link</a></p><h2>Heading</h2><pre><code>const safe = true;</code></pre>';
  assert.equal(sanitizeArticleHtml(input), input);
});

test("article HTML sanitizer removes active content, handlers, styles, namespaces, and unsafe protocols", () => {
  const input = [
    '<p onclick="globalThis.pwned=1" style="color:red">Visible</p>',
    '<a href="jav&#x61;script:alert(1)" onmouseover="alert(1)">encoded</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD4=">data</a>',
    '<a href="//evil.example/path">protocol-relative</a>',
    '<iframe srcdoc="<script>alert(1)</script>">hidden</iframe>',
    '<form action="/steal"><input name="secret"><p>hidden form</p></form>',
    '<svg><a xlink:href="javascript:alert(1)">svg</a></svg>',
    '<math><mtext>math</mtext></math>',
    '<style>body{display:none}</style>',
    '<script>globalThis.pwned=1</script>',
  ].join("");
  const output = sanitizeArticleHtml(input);
  assert.equal(output, '<p>Visible</p><a>encoded</a><a>data</a><a>protocol-relative</a>');
  for (const token of ["onclick", "onmouseover", "style=", "javascript:", "data:", "//evil", "iframe", "srcdoc", "form", "input", "svg", "xlink", "math", "script"]) assert.ok(!output.toLowerCase().includes(token), token);
});

test("article HTML sanitizer allows safe URL classes and hardens external links", () => {
  assert.equal(sanitizeArticleHtml('<a href="https://example.com/path">external</a>'), '<a href="https://example.com/path" rel="noopener noreferrer">external</a>');
  assert.equal(sanitizeArticleHtml('<a href="https://hamza-agency.com/about">same origin</a>'), '<a href="https://hamza-agency.com/about">same origin</a>');
  assert.equal(sanitizeArticleHtml('<a href="mailto:support@hamza-agency.com">mail</a>'), '<a href="mailto:support@hamza-agency.com">mail</a>');
  assert.equal(sanitizeArticleHtml('<a href="../services">relative</a><a href="#section">fragment</a>'), '<a href="../services">relative</a><a href="#section">fragment</a>');
});

test("encoded and ambiguous protocols remain fail-closed", () => {
  for (const href of ["java%73cript:alert(1)","java&#115;cript:alert(1)","java&#x0a;script:alert(1)","\\\\evil.example/path","vbscript:alert(1)","file:///etc/passwd"]) assert.equal(sanitizeArticleHtml(`<a href="${href}">unsafe</a>`), "<a>unsafe</a>", href);
});

test("public article and admin preview both use the shared sanitizer", async () => {
  const [article, admin] = await Promise.all([read("app/blog/[slug]/page.tsx"), read("components/AdminBlogManager.tsx")]);
  for (const source of [article, admin]) {
    assert.ok(source.includes('sanitizeArticleHtml'));
    assert.ok(source.includes('@/lib/blog/sanitizeHtml.mjs'));
    assert.ok(!source.includes("sanitizeRenderableHtml"));
    assert.ok(!source.includes("const cleanHtml"));
  }
  assert.match(article, /__html\s*:\s*safeHtml/);
  assert.match(admin, /__html\s*:\s*preview/);
});
