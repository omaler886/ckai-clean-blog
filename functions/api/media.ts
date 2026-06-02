type Env = {
  MEDIA_BUCKET?: R2Bucket;
  MEDIA_BASE_URL?: string;
  UPLOAD_TOKEN?: string;
};

const allowedPrefixes = ["image/", "video/"];

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const requiredValue = <T>(value: T | undefined, name: string): T => {
  if (!value) {
    throw new Error(`Missing required environment variable or binding: ${name}`);
  }

  return value;
};

const getBearerToken = (request: Request): string => {
  const header = request.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new Error("Missing Authorization bearer token.");
  }

  return match[1];
};

const safeFileName = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const mediaKey = (file: File): string => {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const random = crypto.randomUUID().slice(0, 8);
  const name = safeFileName(file.name) || `upload-${random}`;

  return `uploads/${year}/${month}/${random}-${name}`;
};

const isAllowedFile = (file: File): boolean =>
  allowedPrefixes.some((prefix) => file.type.startsWith(prefix));

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const bucket = requiredValue(context.env.MEDIA_BUCKET, "MEDIA_BUCKET");
  const uploadToken = requiredValue(context.env.UPLOAD_TOKEN, "UPLOAD_TOKEN");
  const mediaBaseUrl = requiredValue(context.env.MEDIA_BASE_URL, "MEDIA_BASE_URL");
  const token = getBearerToken(context.request);

  if (token !== uploadToken) {
    return jsonResponse({ error: "Invalid upload token." }, 401);
  }

  const formData = await context.request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonResponse({ error: "Missing form field: file." }, 400);
  }

  if (!isAllowedFile(file)) {
    return jsonResponse(
      { error: `Unsupported media type: ${file.type || "unknown"}.` },
      415,
    );
  }

  const key = mediaKey(file);
  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return jsonResponse({
    key,
    url: `${mediaBaseUrl.replace(/\/+$/g, "")}/${key}`,
    contentType: file.type,
    size: file.size,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const bucket = requiredValue(context.env.MEDIA_BUCKET, "MEDIA_BUCKET");
  const requestUrl = new URL(context.request.url);
  const key = requestUrl.pathname.replace(/^\/api\/media\/?/, "");

  if (!key) {
    return jsonResponse({ error: "Missing media key in URL." }, 400);
  }

  const object = await bucket.get(key);

  if (!object) {
    return jsonResponse({ error: `Media object not found: ${key}.` }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
};
