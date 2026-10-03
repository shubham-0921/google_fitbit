# Trace

Running + Sleep dashboards from your Fitbit data, behind Google sign-in.
Next.js 16 (App Router). Data comes from the **Google Health API** (`health.googleapis.com/v4`),
the successor to the Fitbit Web API (shut down Oct 30, 2026).

## Setup

1. [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. Enable the **Google Health API** (<https://console.developers.google.com/apis/library/health.googleapis.com>).
3. Google Auth Platform → **Audience**: user type *External*, status *Testing*, add your Google account under **Test users**.
4. Google Auth Platform → **Data access**: add scopes
   - `…/auth/googlehealth.activity_and_fitness.readonly`
   - `…/auth/googlehealth.sleep.readonly`
   - `…/auth/googlehealth.health_metrics_and_measurements.readonly`
5. **Clients** → create *Web application*; authorised redirect URI: `http://localhost:3000/api/auth/callback`.
6. `cp .env.example .env.local` and fill in the client id/secret and `SESSION_SECRET` (`openssl rand -base64 32`).
7. `npm run dev` → <http://localhost:3000>

> In *Testing* mode Google expires refresh tokens after 7 days — you'll just be asked to sign in again.
> These scopes are *restricted*; going public needs OAuth verification.

## Notes
- Sessions are an encrypted httpOnly cookie holding the refresh token; no database.
- `/api/debug/exercise|sleep|daily-resting-heart-rate` (dev only) dumps raw API payloads.
- Google Health has no sleep score, so the score shown is an estimate (see `estimateSleepScore` in `lib/health.ts`).
