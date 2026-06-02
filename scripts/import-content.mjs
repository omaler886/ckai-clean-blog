import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import mammoth from "mammoth";
import TurndownService from "turndown";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const incomingDir = path.join(rootDir, "incoming");
const postsDir = path.join(rootDir, "src", "content", "posts");
const mediaDir = path.join(rootDir, "public", "media", "uploads");

const markdownExtensions = new Set([".md", ".markdown", ".mdx"]);
const htmlExtensions = new Set([".html", ".htm"]);
const plainTextExtensions = new Set([
  ".txt",
  ".text",
  ".log",
  ".org",
  ".rst",
  ".adoc",
  ".asciidoc",
  ".textile",
]);
const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp",
]);
const videoExtensions = new Set([".m4v", ".mov", ".mp4", ".webm"]);

const turndown = new TurndownService({
  codeBlockStyle: "fenced",
  headingStyle: "atx",
});

const titleFromFileName = (fileName) => {
  const parsed = path.parse(fileName);
  return parsed.name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
};

const slugFromTitle = (title) => {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "post";
};

const dateStamp = (date) => date.toISOString().slice(0, 10);

const safeFileName = (fileName) => {
  const parsed = path.parse(fileName);
  const base = parsed.name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9._\-\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ext = parsed.ext.toLowerCase();

  return `${base || "media"}${ext}`;
};

const isMarkdownFile = (ext) => markdownExtensions.has(ext);
const isHtmlFile = (ext) => htmlExtensions.has(ext);
const isDocxFile = (ext) => ext === ".docx";
const isRtfFile = (ext) => ext === ".rtf";
const isPlainTextFile = (ext) => plainTextExtensions.has(ext);
const isImageFile = (ext) => imageExtensions.has(ext);
const isVideoFile = (ext) => videoExtensions.has(ext);
const isMediaFile = (ext) => isImageFile(ext) || isVideoFile(ext);

const uniquePath = async (directory, fileName) => {
  const parsed = path.parse(fileName);
  const candidates = [fileName];

  for (let index = 2; index < 1000; index += 1) {
    candidates.push(`${parsed.name}-${index}${parsed.ext}`);
  }

  for (const candidate of candidates) {
    const destination = path.join(directory, candidate);

    try {
      await fs.access(destination);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return destination;
      }

      throw new Error(
        `Failed to inspect destination path. path=${destination}, error=${error.message}`,
      );
    }
  }

  throw new Error(`Could not create a unique destination name for ${fileName}.`);
};

const normalizeMarkdownBody = (content) => content.replace(/\r\n/g, "\n").trim();

const readMarkdownInput = async (sourcePath) => {
  const content = await fs.readFile(sourcePath, "utf8");
  return normalizeMarkdownBody(content);
};

const readHtmlInput = async (sourcePath) => {
  const html = await fs.readFile(sourcePath, "utf8");
  return normalizeMarkdownBody(turndown.turndown(html));
};

const readDocxInput = async (sourcePath) => {
  const result = await mammoth.convertToHtml({ path: sourcePath });
  return normalizeMarkdownBody(turndown.turndown(result.value));
};

const readRtfInput = async (sourcePath) => {
  const rtf = await fs.readFile(sourcePath, "utf8");
  const text = rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalizeMarkdownBody(text);
};

const readPlainTextInput = async (sourcePath) => {
  const text = await fs.readFile(sourcePath, "utf8");
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.join("\n\n");
};

const readPostBody = async (sourcePath, ext) => {
  if (isMarkdownFile(ext)) {
    return readMarkdownInput(sourcePath);
  }

  if (isHtmlFile(ext)) {
    return readHtmlInput(sourcePath);
  }

  if (isDocxFile(ext)) {
    return readDocxInput(sourcePath);
  }

  if (isRtfFile(ext)) {
    return readRtfInput(sourcePath);
  }

  if (isPlainTextFile(ext)) {
    return readPlainTextInput(sourcePath);
  }

  throw new Error(`Unsupported text format. file=${sourcePath}, extension=${ext}`);
};

const buildPostContent = (fileName, fileDate, body) => {
  const parsed = matter(body);
  const title = parsed.data.title || titleFromFileName(fileName);
  const date = parsed.data.date || dateStamp(fileDate);
  const frontmatter = {
    title,
    description: parsed.data.description || "",
    date,
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
    draft: Boolean(parsed.data.draft),
    author: parsed.data.author || "CKai",
  };

  return {
    title,
    content: matter.stringify(parsed.content.trim(), frontmatter),
  };
};

const importPost = async (entry) => {
  const sourcePath = path.join(incomingDir, entry.name);
  const ext = path.extname(entry.name).toLowerCase();
  const stat = await fs.stat(sourcePath);
  const body = await readPostBody(sourcePath, ext);
  const post = buildPostContent(entry.name, stat.mtime, body);
  const targetExt = ext === ".mdx" ? ".mdx" : ".md";
  const targetName = `${dateStamp(stat.mtime)}-${slugFromTitle(post.title)}${targetExt}`;
  const destination = await uniquePath(postsDir, targetName);

  await fs.writeFile(destination, post.content, "utf8");

  return {
    type: "post",
    source: sourcePath,
    destination,
  };
};

const importMedia = async (entry) => {
  const sourcePath = path.join(incomingDir, entry.name);
  const ext = path.extname(entry.name).toLowerCase();
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const targetDir = path.join(mediaDir, year, month);
  const targetName = safeFileName(entry.name);
  const destination = await uniquePath(targetDir, targetName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(sourcePath, destination);

  const publicPath = destination
    .replace(path.join(rootDir, "public"), "")
    .split(path.sep)
    .join("/");
  const snippet = isVideoFile(ext)
    ? `<video controls src="${publicPath}"></video>`
    : `![${titleFromFileName(entry.name)}](${publicPath})`;

  return {
    type: "media",
    source: sourcePath,
    destination,
    snippet,
  };
};

const importEntry = async (entry) => {
  const ext = path.extname(entry.name).toLowerCase();

  if (entry.name === "README.md") {
    return {
      type: "skipped",
      source: path.join(incomingDir, entry.name),
      reason: "README is documentation for the import folder.",
    };
  }

  if (isMediaFile(ext)) {
    return importMedia(entry);
  }

  if (
    isMarkdownFile(ext) ||
    isHtmlFile(ext) ||
    isDocxFile(ext) ||
    isRtfFile(ext) ||
    isPlainTextFile(ext)
  ) {
    return importPost(entry);
  }

  throw new Error(`Unsupported incoming file. file=${entry.name}, extension=${ext}`);
};

const main = async () => {
  await fs.mkdir(postsDir, { recursive: true });
  await fs.mkdir(mediaDir, { recursive: true });
  await fs.mkdir(incomingDir, { recursive: true });

  const entries = (await fs.readdir(incomingDir, { withFileTypes: true })).filter((entry) =>
    entry.isFile(),
  );

  if (entries.length === 0) {
    throw new Error(`No files found in incoming directory. directory=${incomingDir}`);
  }

  const results = [];

  for (const entry of entries) {
    results.push(await importEntry(entry));
  }

  console.log(JSON.stringify(results, null, 2));
};

await main();
