import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type PostEntry = CollectionEntry<"posts">;

export const postSlug = (post: PostEntry): string =>
  post.id.replace(/\.(md|mdx)$/i, "").replace(/\/index$/i, "");

export const postUrl = (post: PostEntry): string => `/posts/${postSlug(post)}/`;

export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const sortPosts = (posts: PostEntry[]): PostEntry[] =>
  [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

export const getPublishedPosts = async (): Promise<PostEntry[]> => {
  const posts = await getCollection("posts", (post) => !post.data.draft);
  return sortPosts(posts);
};

export const getAllTags = (posts: PostEntry[]): string[] =>
  [...new Set(posts.flatMap((post) => post.data.tags))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
