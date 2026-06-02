import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { site } from "../site";
import { getPublishedPosts, postUrl } from "../utils/posts";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? "https://ckai-clean-blog.pages.dev",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: postUrl(post),
    })),
  });
}
