import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

const ERRORS: Record<string, string> = {
  access_denied: "Sign-in was cancelled.",
  bad_state: "Sign-in session expired. Please try again.",
  no_refresh_token: "Google didn't return offline access. Remove Trace from your Google account's connected apps and try again.",
  missing_scopes: "Trace needs access to your activity, sleep and heart-rate data. Tick every box on Google's consent screen.",
  token_exchange_failed: "Couldn't complete sign-in with Google. Check the server logs.",
  expired: "Your Google session expired — sign in again.",
};

export default async function Home({ searchParams }: PageProps<"/">) {
  if (await getSession()) redirect("/running");
  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;

  return (
    <div className="login">
      <div className="card elev-sm">
        <div className="nav-brand" style={{ fontSize: 28 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          TRACE
        </div>
        <p style={{ margin: 0 }}>
          Your running and sleep, pulled straight from your Fitbit via Google Health.
        </p>
        {code && <div className="notice err">{ERRORS[code] ?? `Sign-in failed (${code}).`}</div>}
        <a className="btn-google" href="/api/auth/login">
          <svg viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
            <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </a>
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
          Read-only access to activity, sleep and heart-rate data. Nothing is stored on our side except an encrypted sign-in cookie.
        </p>
      </div>
    </div>
  );
}
