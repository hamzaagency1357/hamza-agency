import { NextResponse } from "next/server";
import { getServerBlogFeed } from "@/lib/blog/serverPosts";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";
import {
  getLocalizedAbsoluteUrl,
  SITE_URL,
} from "@/lib/i18n/publicLocales";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const context = await getRequestSiteContext();
  const language = context.language;
  const posts = await getServerBlogFeed(language);
  const channelTitle = language === "ar" ? "مدونة HAMZA AGENCY" : language === "tr" ? "HAMZA AGENCY Blogu" : "HAMZA AGENCY Blog";
  const channelDescription = language === "ar" ? "مقالات مهنية حول صناعة المحتوى والهوية الرقمية والبرامج." : language === "tr" ? "İçerik üretimi, dijital kimlik ve programlar hakkında profesyonel makaleler." : "Professional articles about content creation, digital identity, and programs.";
  const channelUrl = getLocalizedAbsoluteUrl("/blog", language);

  const items = posts.map((post) => {
    const url = getLocalizedAbsoluteUrl(`/blog/${post.slug}`, language);
    const dateValue = post.publishedAt || post.scheduledAt || post.updatedAt;
    const publicationDate = dateValue ? `<pubDate>${new Date(dateValue).toUTCString()}</pubDate>` : "";
    return [
      "<item>",
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<title>${escapeXml(post.copy.title)}</title>`,
      `<description>${escapeXml(post.copy.excerpt)}</description>`,
      `<link>${escapeXml(url)}</link>`,
      publicationDate,
      "</item>",
    ].join("");
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelUrl)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${language}</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(`${SITE_URL}${language === "ar" ? "" : `/${language}`}/blog/rss`)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300",
      "x-content-type-options": "nosniff",
    },
  });
}
