import type { APIContext } from "astro";

export function GET(context: APIContext) {
  const site = context.site ?? "https://ckai-clean-blog.pages.dev";

  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/rss.xml", site).toString()}\n`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}
