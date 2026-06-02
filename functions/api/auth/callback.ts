type Env = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

type GitHubTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

const githubTokenUrl = "https://github.com/login/oauth/access_token";

const requiredValue = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const htmlResponse = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex",
    },
  });

const escapeScriptJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

const errorPage = (message: string, status = 500): Response =>
  htmlResponse(
    `<!doctype html><html lang="zh-CN"><body><h1>GitHub 登录失败</h1><p>${message}</p></body></html>`,
    status,
  );

const tokenPage = (accessToken: string): Response => {
  const content = escapeScriptJson({
    provider: "github",
    token: accessToken,
  });

  return htmlResponse(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>GitHub 登录完成</title>
  </head>
  <body>
    <p>GitHub 登录完成，正在返回后台。</p>
    <script>
      (function () {
        const content = ${content};

        function receiveMessage(message) {
          window.opener.postMessage(
            "authorization:github:success:" + JSON.stringify(content),
            message.origin
          );
          window.removeEventListener("message", receiveMessage, false);
          window.setTimeout(function () {
            window.close();
          }, 500);
        }

        if (!window.opener) {
          document.body.textContent = "登录窗口没有找到后台页面，请从 /admin/ 重新登录。";
          return;
        }

        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`);
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = requiredValue(context.env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID");
  const clientSecret = requiredValue(
    context.env.GITHUB_CLIENT_SECRET,
    "GITHUB_CLIENT_SECRET",
  );
  const requestUrl = new URL(context.request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return errorPage("GitHub callback 缺少 code 参数。", 400);
  }

  const response = await fetch(githubTokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${requestUrl.origin}/api/auth/callback`,
    }),
  });
  const payload = (await response.json()) as GitHubTokenResponse;

  if (!response.ok || payload.error || !payload.access_token) {
    return errorPage(
      `GitHub token exchange failed. status=${response.status}, response=${JSON.stringify(payload)}`,
      502,
    );
  }

  return tokenPage(payload.access_token);
};
