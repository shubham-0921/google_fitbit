import { redirect } from "next/navigation";
import { TokenError } from "./google";
import { HealthApiError } from "./health";
import { getSession } from "./session";

/** Runs a loader with the signed-in user's refresh token; bounces to login when there is none. */
export async function loadForUser<T>(
  fn: (refreshToken: string) => Promise<T>,
): Promise<{ data: T } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/");
  let expired = false;
  try {
    return { data: await fn(session.refreshToken) };
  } catch (e) {
    if (e instanceof TokenError && e.code === "invalid_grant") expired = true;
    else {
      console.error("[load]", e);
      if (e instanceof HealthApiError && (e.status === 401 || e.status === 403))
        return { error: `Google Health refused the request (${e.status}). Make sure the Google Health API is enabled and your account is a test user.` };
      return { error: e instanceof Error ? e.message : "Unknown error" };
    }
  }
  if (expired) redirect("/api/auth/logout?reason=expired");
  return { error: "Session expired" };
}
