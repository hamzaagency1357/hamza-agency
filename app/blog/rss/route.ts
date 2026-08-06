import { NextResponse } from "next/server";
import { getBlogFeed } from "@/lib/blog/posts.mjs";

export function GET() {
  const posts = getBlogFeed("ar");
  const items = posts
    .map((post) => {
      const title = post.copy?.title || "";
      const excerpt = post.copy?.excerpt || "";
      const url = `https://hamza-agency.com/blog/${post.slug}`;
      return `<item><title>${title}</title><description>${excerpt}</description><link>${url}</link></item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>HAMZA AGENCY Blog</title><link>https://hamza-agency.com/blog</link><description>HAMZA AGENCY articles and updates</description>${items}</channel></rss>`;

  return new NextResponse(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
