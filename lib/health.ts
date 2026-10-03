// Google Health API (v4) client + normalisation of exercise and sleep records.
// Field names follow https://developers.google.com/health/data-types; parsing is
// deliberately tolerant (values may arrive as strings, nested under the type key, etc.)
import { refreshAccessToken } from "./google";

const BASE = "https://health.googleapis.com/v4/users/me/dataTypes";
export const HISTORY_DAYS = 31;

export class HealthApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`Google Health API ${status}: ${body.slice(0, 300)}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

export async function listDataPoints(
  accessToken: string,
  type: string,
  filter?: string,
  maxPages = 8,
): Promise<Json[]> {
  const out: Json[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const p = new URLSearchParams();
    if (filter) p.set("filter", filter);
    if (pageToken) p.set("pageToken", pageToken);
    const res = await fetch(`${BASE}/${type}/dataPoints?${p}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) throw new HealthApiError(res.status, text);
    const json = JSON.parse(text);
    out.push(...(json.dataPoints ?? []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

// ---------- parsing helpers ----------
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
const secs = (v: unknown) => num(typeof v === "string" ? v.replace(/s$/, "") : v) ?? 0;
const body = (dp: Json, key: string): Json => dp[key] ?? dp;

export type Local = { ms: number; offsetSec: number };
const toLocal = (iso: string, offset: unknown): Local => ({
  ms: Date.parse(iso),
  offsetSec: secs(offset),
});
const shifted = (l: Local) => new Date(l.ms + l.offsetSec * 1000);
const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (l: Local) => {
  const d = shifted(l);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export function clock(l: Local) {
  const d = shifted(l);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${pad(d.getUTCMinutes())} ${h < 12 ? "AM" : "PM"}`;
}
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dateLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

// ---------- running ----------
export type Run = {
  id: string;
  day: string;
  startMs: number;
  offsetSec: number;
  distMi: number;
  durSec: number;
  paceSecPerMi: number;
  hr?: number;
  cal?: number;
};

const MM_PER_MILE = 1_609_344;

export function parseRuns(points: Json[]): Run[] {
  const runs: Run[] = [];
  for (const dp of points) {
    const ex = body(dp, "exercise");
    if (!/RUN/i.test(String(ex.exerciseType ?? ""))) continue;
    const iv = ex.interval;
    if (!iv?.startTime) continue;
    const start = toLocal(iv.startTime, iv.startUtcOffset);
    const m = ex.metricsSummary ?? {};
    const distMi = (num(m.distanceMillimeters) ?? 0) / MM_PER_MILE;
    const durSec = ex.activeDuration
      ? secs(ex.activeDuration)
      : iv.endTime
        ? Math.round((Date.parse(iv.endTime) - start.ms) / 1000)
        : 0;
    if (distMi <= 0 || durSec <= 0) continue;
    runs.push({
      id: String(dp.name ?? iv.startTime),
      day: dayKey(start),
      startMs: start.ms,
      offsetSec: start.offsetSec,
      distMi,
      durSec,
      paceSecPerMi: durSec / distMi,
      hr: num(m.averageHeartRateBeatsPerMinute),
      cal: num(m.caloriesKcal),
    });
  }
  return runs.sort((a, b) => b.startMs - a.startMs);
}

// ---------- sleep ----------
export type Night = {
  id: string;
  day: string; // local date of waking up
  bedtime: string;
  wake: string;
  wakeMs: number;
  offsetSec: number;
  asleepMin: number;
  lightMin: number;
  deepMin: number;
  remMin: number;
  awakeMin: number;
  score: number;
  restingHr?: number;
};

// Google Health exposes no sleep score, so this is a transparent estimate:
// 50 pts duration (vs 8h), 25 pts deep/REM share, 25 pts efficiency.
export function estimateSleepScore(n: Pick<Night, "asleepMin" | "deepMin" | "remMin" | "awakeMin">) {
  if (n.asleepMin <= 0) return 0;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const duration = 50 * clamp(n.asleepMin / 480);
  const stages =
    25 * (0.5 * clamp(n.deepMin / n.asleepMin / 0.17) + 0.5 * clamp(n.remMin / n.asleepMin / 0.22));
  const eff = n.asleepMin / (n.asleepMin + n.awakeMin);
  const efficiency = 25 * clamp((eff - 0.8) / 0.15);
  return Math.round(duration + stages + efficiency);
}

export function parseNights(points: Json[]): Night[] {
  const byDay = new Map<string, Night>();
  for (const dp of points) {
    const s = body(dp, "sleep");
    const iv = s.interval;
    if (!iv?.startTime || !iv?.endTime) continue;
    const start = toLocal(iv.startTime, iv.startUtcOffset);
    const end = toLocal(iv.endTime, iv.endUtcOffset ?? iv.startUtcOffset);
    const mins = { LIGHT: 0, DEEP: 0, REM: 0, AWAKE: 0 } as Record<string, number>;
    for (const st of s.stages ?? []) {
      const t = String(st.type ?? "");
      if (t in mins) mins[t] += (Date.parse(st.endTime) - Date.parse(st.startTime)) / 60000;
    }
    const staged = mins.LIGHT + mins.DEEP + mins.REM;
    const asleepMin = Math.round(staged || (end.ms - start.ms) / 60000);
    if (asleepMin < 180) continue; // naps
    const night: Night = {
      id: String(dp.name ?? iv.startTime),
      day: dayKey(end),
      bedtime: clock(start),
      wake: clock(end),
      wakeMs: end.ms,
      offsetSec: end.offsetSec,
      asleepMin,
      lightMin: Math.round(mins.LIGHT),
      deepMin: Math.round(mins.DEEP),
      remMin: Math.round(mins.REM),
      awakeMin: Math.round(mins.AWAKE),
      score: 0,
    };
    night.score = estimateSleepScore(night);
    const prev = byDay.get(night.day);
    if (!prev || prev.asleepMin < night.asleepMin) byDay.set(night.day, night);
  }
  return [...byDay.values()].sort((a, b) => b.wakeMs - a.wakeMs);
}

export function parseRestingHr(points: Json[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const dp of points) {
    const r = body(dp, "dailyRestingHeartRate");
    const d = r.date;
    const key =
      typeof d === "string"
        ? d.slice(0, 10)
        : d?.year
          ? `${d.year}-${pad(d.month)}-${pad(d.day)}`
          : undefined;
    const bpm = Object.entries(r)
      .filter(([k]) => /beatsPerMinute/i.test(k))
      .map(([, v]) => num(v))
      .find((v) => v !== undefined);
    if (key && bpm) out.set(key, Math.round(bpm));
  }
  return out;
}

// ---------- loaders ----------
const sinceIso = () => new Date(Date.now() - HISTORY_DAYS * 86400_000).toISOString();

export async function loadRuns(refreshToken: string): Promise<Run[]> {
  const token = await refreshAccessToken(refreshToken);
  const pts = await listDataPoints(
    token,
    "exercise",
    // exercise only supports civil-time filtering (plain YYYY-MM-DD)
    `exercise.interval.civil_start_time >= "${sinceIso().slice(0, 10)}"`,
  );
  return parseRuns(pts);
}

export async function loadNights(refreshToken: string): Promise<Night[]> {
  const token = await refreshAccessToken(refreshToken);
  const [sleep, rhr] = await Promise.all([
    listDataPoints(token, "sleep", `sleep.interval.end_time >= "${sinceIso()}"`),
    listDataPoints(token, "daily-resting-heart-rate", undefined, 2).catch((e) => {
      console.warn("[health] resting HR unavailable", e instanceof Error ? e.message : e);
      return [] as Json[];
    }),
  ]);
  const resting = parseRestingHr(rhr);
  return parseNights(sleep).map((n) => ({ ...n, restingHr: resting.get(n.day) }));
}
