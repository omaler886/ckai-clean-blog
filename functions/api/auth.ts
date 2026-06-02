type Env = {
  GITHUB_CLIENT_ID?: string;
};

const githubAuthorizeUrl = "https://github.com/login/oauth/authorize";

const requiredValue = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = requiredValue(context.env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID");
  const requestUrl = new URL(context.request.url);
  const redirectUri = `${requestUrl.origin}/api/auth/callback`;
  const scope = requestUrl.searchParams.get("scope") ?? "repo";

  const authUrl = new URL(githubAuthorizeUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);

  const state = requestUrl.searchParams.get("state");
  if (state) {
    authUrl.searchParams.set("state", state);
  }

  return Response.redirect(authUrl.toString(), 302);
};
