import type { Night, Run } from "./health";
import { dateLabel } from "./health";

export type Range = "week" | "month";
export type Units = "mi" | "km";

export const KM_PER_MI = 1.60934;
const DAY = 86400_000;
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const fmtClock = (sec: number) => {
  sec = Math.round(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
export const fmtHM = (min: number) => `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
export const dist = (mi: number, u: Units) => (u === "km" ? mi * KM_PER_MI : mi);
export const pace = (secPerMi: number, u: Units) => (u === "km" ? secPerMi / KM_PER_MI : secPerMi);

const keyToDays = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** "Today" in the user's own local calendar, taken from the offset of their newest record. */
export function localToday(offsetSec: number | undefined) {
  return Math.floor((Date.now() + (offsetSec ?? 0) * 1000) / DAY);
}

type Bar = { label: string; val: number };

/** Week → Mon..Sun of the current week. Month → 4 consecutive blocks over the last 28 days. */
function bars<T extends { day: string }>(
  items: T[],
  today: number,
  range: Range,
  value: (xs: T[]) => number,
): Bar[] {
  if (range === "week") {
    const dow = (today + 3) % 7; // 1970-01-01 was a Thursday → Mon=0
    const monday = today - dow;
    return DOW.map((label, i) => ({
      label,
      val: value(items.filter((x) => keyToDays(x.day) === monday + i)),
    }));
  }
  return [0, 1, 2, 3].map((i) => {
    const from = today - 27 + i * 7;
    return {
      label: `Wk ${i + 1}`,
      val: value(items.filter((x) => { const d = keyToDays(x.day); return d >= from && d < from + 7; })),
    };
  });
}

function inRange<T extends { day: string }>(items: T[], today: number, range: Range) {
  const from = range === "week" ? today - ((today + 3) % 7) : today - 29;
  return items.filter((x) => keyToDays(x.day) >= from && keyToDays(x.day) <= today);
}

export function runView(runs: Run[], range: Range, u: Units) {
  const today = localToday(runs[0]?.offsetSec);
  const inR = inRange(runs, today, range);
  const totalMi = inR.reduce((a, r) => a + r.distMi, 0);
  const totalSec = inR.reduce((a, r) => a + r.durSec, 0);
  const hrs = inR.flatMap((r) => (r.hr ? [r.hr] : []));
  const cal = inR.reduce((a, r) => a + (r.cal ?? 0), 0);
  const last = runs[0];
  const chart = bars(inR, today, range, (xs) => xs.reduce((a, r) => a + r.distMi, 0));
  const max = Math.max(...chart.map((c) => c.val), 0.0001);
  const daysAgo = last ? today - keyToDays(last.day) : 0;
  return {
    last: last && {
      when: daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : dateLabel(last.day),
      ago: daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`,
      dist: dist(last.distMi, u).toFixed(1),
      dur: fmtClock(last.durSec),
      pace: fmtClock(pace(last.paceSecPerMi, u)),
      hr: last.hr ? String(Math.round(last.hr)) : "—",
    },
    stats: [
      { label: "Total distance", value: dist(totalMi, u).toFixed(1), unit: u },
      { label: "Avg pace", value: totalMi ? fmtClock(pace(totalSec / totalMi, u)) : "—", unit: `/${u}` },
      { label: "Avg heart rate", value: hrs.length ? String(Math.round(avg(hrs))) : "—", unit: "bpm" },
      { label: "Calories burned", value: cal ? Math.round(cal).toLocaleString("en-US") : "—", unit: "cal" },
    ],
    chart: chart.map((c) => ({
      label: c.label,
      valLabel: c.val > 0 ? dist(c.val, u).toFixed(1) : "",
      heightPx: Math.max(Math.round((c.val / max) * 140), c.val > 0 ? 6 : 3),
      active: c.val > 0,
    })),
    chartTitle: range === "week" ? "Distance this week" : "Distance by week",
    tableTitle: range === "week" ? "This week’s runs" : `Last 30 days (${Math.min(inR.length, 8)} most recent of ${inR.length})`,
    entries: (range === "week" ? inR : inR.slice(0, 8)).map((r) => ({
      id: r.id,
      date: dateLabel(r.day),
      dist: dist(r.distMi, u).toFixed(1),
      dur: fmtClock(r.durSec),
      pace: fmtClock(pace(r.paceSecPerMi, u)),
      hr: r.hr ? Math.round(r.hr) : null,
      cal: r.cal ? Math.round(r.cal) : null,
    })),
  };
}

export function sleepView(nights: Night[], range: Range) {
  const today = localToday(nights[0]?.offsetSec);
  const inR = inRange(nights, today, range);
  const last = nights[0];
  const chart = bars(inR, today, range, (xs) => Math.round(avg(xs.map((n) => n.score))));
  const rhr = inR.flatMap((n) => (n.restingHr ? [n.restingHr] : []));
  const bedMins = inR.map((n) => {
    const [t, ap] = n.bedtime.split(" ");
    const [h, m] = t.split(":").map(Number);
    let mins = ((h % 12) + (ap === "PM" ? 12 : 0)) * 60 + m;
    if (mins < 12 * 60) mins += 24 * 60; // after-midnight bedtimes sort after evening ones
    return mins;
  });
  const avgBed = bedMins.length ? Math.round(avg(bedMins)) % (24 * 60) : null;
  const total = last ? last.lightMin + last.deepMin + last.remMin || 1 : 1;
  return {
    last: last && {
      score: last.score,
      scoreDeg: Math.round((last.score / 100) * 360),
      duration: fmtHM(last.asleepMin),
      bedtime: last.bedtime,
      wake: last.wake,
      restingHr: last.restingHr ? String(last.restingHr) : "—",
      light: last.lightMin,
      deep: last.deepMin,
      rem: last.remMin,
      lightPct: (last.lightMin / total) * 100,
      deepPct: (last.deepMin / total) * 100,
      remPct: (last.remMin / total) * 100,
    },
    stats: [
      { label: "Avg score", value: inR.length ? String(Math.round(avg(inR.map((n) => n.score)))) : "—", unit: "" },
      { label: "Avg duration", value: inR.length ? fmtHM(avg(inR.map((n) => n.asleepMin))) : "—", unit: "" },
      { label: "Resting HR", value: rhr.length ? String(Math.round(avg(rhr))) : "—", unit: rhr.length ? "bpm" : "" },
      {
        label: "Avg bedtime",
        value: avgBed === null ? "—" : `${Math.floor(avgBed / 60) % 12 || 12}:${String(avgBed % 60).padStart(2, "0")}`,
        unit: avgBed === null ? "" : Math.floor(avgBed / 60) % 24 >= 12 ? "PM" : "AM",
      },
    ],
    chart: chart.map((c) => ({
      label: c.label,
      valLabel: c.val > 0 ? String(c.val) : "",
      heightPx: Math.max(Math.round((c.val / 100) * 140), c.val > 0 ? 6 : 3),
      active: c.val > 0,
    })),
    chartTitle: range === "week" ? "Sleep score this week" : "Avg sleep score by week",
    tableTitle: range === "week" ? "This week’s nights" : `Last 30 days (${Math.min(inR.length, 8)} most recent)`,
    entries: (range === "week" ? inR : inR.slice(0, 8)).map((n) => ({
      id: n.id,
      date: dateLabel(n.day),
      bedtime: n.bedtime,
      wake: n.wake,
      duration: fmtHM(n.asleepMin),
      score: n.score,
      restingHr: n.restingHr ?? null,
    })),
  };
}

// ---------- "run every other day" goal ----------
export type GoalStatus = "done" | "rest" | "due" | "overdue";
/** Goal: a run at least every 2nd day, i.e. at most one rest day between runs. */
const GOAL_GAP_DAYS = 2;

const MOTIVATION: Record<GoalStatus, string[]> = {
  done: [
    "Run banked. Rest up — consistency beats intensity.",
    "That’s one in the books. Recover well, your legs earned it.",
    "Every other day is the whole plan, and today is checked off.",
  ],
  rest: [
    "Rest is part of the plan. Hydrate, stretch, and lay out your shoes tonight.",
    "Legs recover today, get stronger tomorrow. Early night = easy morning run.",
    "Tomorrow’s run starts with tonight’s early bedtime.",
  ],
  due: [
    "Today’s the day. The hardest part is the front door — go.",
    "You don’t have to be fast, just show up. Every other day is the deal.",
    "Future you is already glad you went. Shoes on.",
  ],
  overdue: [
    "Missed days happen — the habit doesn’t have to end. A short easy run counts. Go now.",
    "Don’t aim for perfect, aim for today. Even 15 minutes beats zero.",
    "What matters is the next run, and the next run is today.",
  ],
};

const HEADLINE: Record<GoalStatus, string> = {
  done: "Nice work!",
  rest: "Rest day",
  due: "Run day!",
  overdue: "Time to lace up",
};

export function goalView(runs: Run[]) {
  const today = localToday(runs[0]?.offsetSec);
  const days = [...new Set(runs.map((r) => keyToDays(r.day)))].sort((a, b) => b - a);
  const daysAgo = days.length ? today - days[0] : null;

  const status: GoalStatus =
    daysAgo === null || daysAgo > GOAL_GAP_DAYS
      ? "overdue"
      : daysAgo === GOAL_GAP_DAYS
        ? "due"
        : daysAgo === 0
          ? "done"
          : "rest";

  // Consecutive runs, each within the goal gap of the previous one; broken if currently overdue.
  let streak = 0;
  if (days.length && status !== "overdue") {
    streak = 1;
    for (let i = 1; i < days.length && days[i - 1] - days[i] <= GOAL_GAP_DAYS; i++) streak++;
  }

  const nextIn = daysAgo === null ? 0 : GOAL_GAP_DAYS - daysAgo;
  const dots = Array.from({ length: 14 }, (_, i) => {
    const d = today - 13 + i;
    return { on: days.includes(d), today: d === today };
  });
  const messages = MOTIVATION[status];

  return {
    status,
    headline: HEADLINE[status],
    lastRun:
      daysAgo === null ? "No run in the last 30 days" : daysAgo === 0 ? "Your last run was today" : `Your last run was ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`,
    message: messages[today % messages.length],
    next: nextIn <= 0 ? "Today" : nextIn === 1 ? "Tomorrow" : `In ${nextIn} days`,
    streak,
    runsLast14: dots.filter((d) => d.on).length,
    dots,
  };
}
