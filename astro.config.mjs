import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://ckai-clean-blog.pages.dev",
  output: "static",
  integrations: [mdx()],
});
