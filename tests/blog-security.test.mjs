import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeArticleHtml } from "../lib/blog/sanitizeHtml.mjs";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("article HTML allowlist preserves only supported editorial markup", () => {
  const input = '<article><h2 class="hero">Title</h2><p><strong>Bold</strong> <em>Italic</em> <a href="/about" title="About">About</a></p><ul><li>One</li></ul><blockquote cite="https://example.com">Quote</blockquote><pre><code>const x = 1;</code></pre><img src="https://images.example/a.jpg" alt="A" width="1200" height="630"></article>';
  const safe = sanitizeArticleHtml(input);
  for (const token of ["<h2>Title</h2>","<strong>Bold</strong>","<em>Italic</em>",'href="/about"','title="About"',"<ul><li>One</li></ul>",'cite="https://example.com/"',"<pre><code>const x = 1;</code></pre>",'src="https://images.example/a.jpg"','alt="A"','width="1200"','height="630"']) assert.ok(safe.includes(token), token);
  assert.ok(!safe.includes("class="));
});

test("article HTML sanitizer removes active content, handlers, styles, namespaces, and unsafe protocols", () => {
  const unsafe = '<script>alert(1)</script><style>body{display:none}</style><iframe src="https://evil.example"></iframe><object></object><embed><form><input></form><svg><a href="javascript:alert(1)">x</a></svg><math></math><p onclick="alert(1)" style="color:red"><a href="javascript:alert(1)" target="_blank">unsafe</a><img src="data:text/html,bad" onerror="alert(1)"></p>';
  const safe = sanitizeArticleHtml(unsafe);
  for (const token of ["<script","<style","<iframe","<object","<embed","<form","<input","<svg","<math","onclick=","style=","javascript:","data:text/html","onerror="]) assert.ok(!safe.toLowerCase().includes(token), token);
});

test("article HTML sanitizer allows safe URL classes and hardens external links", () => {
  const safe = sanitizeArticleHtml('<p><a href="https://example.com/path" target="_blank">external</a> <a href="mailto:team@example.com">mail</a> <a href="tel:+905011730377">phone</a> <a href="#section">hash</a></p>', { siteOrigin: "https://hamza-agency.com" });
  assert.ok(safe.includes('href="https://example.com/path"'));
  assert.ok(safe.includes('target="_blank"'));
  assert.ok(safe.includes('rel="noopener noreferrer"'));
  assert.ok(safe.includes('href="mailto:team@example.com"'));
  assert.ok(safe.includes('href="tel:+905011730377"'));
  assert.ok(safe.includes('href="#section"'));
});

test("encoded and ambiguous protocols remain fail-closed", () => {
  for (const href of ["java&#x0a;script:alert(1)","\\\\evil.example/path","vbscript:alert(1)","file:///etc/passwd"]) {
    assert.equal(sanitizeArticleHtml(`<a href="${href}">unsafe</a>`), "<a>unsafe</a>", href);
  }
});

test("public article and admin preview both use the shared sanitizer", async () => {
  const [article, admin] = await Promise.all([read("app/blog/[slug]/page.tsx"), read("components/AdminBlogManager.tsx")]);
  for (const source of [article, admin]) {
    assert.ok(source.includes("sanitizeArticleHtml"));
    assert.ok(source.includes("@/lib/blog/sanitizeHtml.mjs"));
    assert.ok(!source.includes("sanitizeRenderableHtml"));
    assert.ok(!source.includes("const cleanHtml"));
  }
  assert.match(article, /__html\s*:\s*safeHtml/);
  assert.match(admin, /__html\s*:\s*preview/);
});
