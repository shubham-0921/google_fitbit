import { NextResponse } from "next/server";
import { appOrigin, exchangeCode, SCOPES } from "@/lib/google";
import { sealSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function GET(req: Request) {
  const origin = appOrigin(req);
  const url = new URL(req.url);
  const fail = (code: string) =>
    NextResponse.redirect(`${origin}/?error=${encodeURIComponent(code)}`);

  const err = url.searchParams.get("error");
  if (err) return fail(err);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = req.headers.get("cookie") ?? "";
  const expected = /(?:^|;\s*)trace_oauth_state=([^;]+)/.exec(cookieHeader)?.[1];
  if (!code || !state || !expected || state !== expected) return fail("bad_state");

  try {
    const t = await exchangeCode(code, origin);
    if (!t.refreshToken) return fail("no_refresh_token");
    const granted = new Set(t.scope.split(" "));
    const missing = SCOPES.filter((s) => s.includes("googlehealth") && !granted.has(s));
    if (missing.length) return fail("missing_scopes");

    const res = NextResponse.redirect(`${origin}/running`);
    res.cookies.set(
      SESSION_COOKIE,
      await sealSession({ refreshToken: t.refreshToken, email: t.email, name: t.name }),
      sessionCookieOptions,
    );
    res.cookies.delete({ name: "trace_oauth_state", path: "/api/auth" });
    return res;
  } catch (e) {
    console.error("[auth] callback failed", e);
    return fail("token_exchange_failed");
  }
}
