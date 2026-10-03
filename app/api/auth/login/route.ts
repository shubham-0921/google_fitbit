import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { appOrigin, buildAuthUrl } from "@/lib/google";

export async function GET(req: Request) {
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(buildAuthUrl(appOrigin(req), state));
  res.cookies.set("trace_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
