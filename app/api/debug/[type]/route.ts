import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/google";
import { listDataPoints } from "@/lib/health";
import { getSession } from "@/lib/session";

// Dev-only: dumps the raw Google Health payload so field names can be verified.
// e.g. /api/debug/exercise  /api/debug/sleep  /api/debug/daily-resting-heart-rate
export async function GET(_req: Request, ctx: RouteContext<"/api/debug/[type]">) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { type } = await ctx.params;
  try {
    const token = await refreshAccessToken(session.refreshToken);
    return NextResponse.json((await listDataPoints(token, type, undefined, 1)).slice(0, 5));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
