import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/google";
import { SESSION_COOKIE } from "@/lib/session";

async function handle(req: Request) {
  const reason = new URL(req.url).searchParams.get("reason");
  const res = NextResponse.redirect(
    `${appOrigin(req)}/${reason ? `?error=${encodeURIComponent(reason)}` : ""}`,
    303,
  );
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const GET = handle;
export const POST = handle;
