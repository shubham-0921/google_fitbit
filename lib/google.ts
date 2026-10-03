import { decodeJwt } from "jose";

export const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
];

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function appOrigin(req: Request) {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
}

export const redirectUri = (origin: string) => `${origin}/api/auth/callback`;

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export function buildAuthUrl(origin: string, state: string) {
  const p = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      ...body,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new TokenError(json.error ?? "token_error", json.error_description);
  }
  return json as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
  };
}

export class TokenError extends Error {
  constructor(public code: string, description?: string) {
    super(description ? `${code}: ${description}` : code);
  }
}

export async function exchangeCode(code: string, origin: string) {
  const t = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(origin),
  });
  const claims = t.id_token ? decodeJwt(t.id_token) : {};
  return {
    refreshToken: t.refresh_token,
    scope: t.scope ?? "",
    email: claims.email as string | undefined,
    name: claims.name as string | undefined,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const t = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return t.access_token;
}
