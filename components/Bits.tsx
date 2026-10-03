import Link from "next/link";
import type { ReactNode } from "react";

export function Toggle({ options }: { options: { label: string; href: string; on: boolean }[] }) {
  return (
    <div className="toggle">
      {options.map((o) => (
        <Link key={o.label} href={o.href} className={`pill${o.on ? " on" : ""}`} replace>
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function StatCards({ stats }: { stats: { label: string; value: string; unit: string }[] }) {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div className="card" key={s.label}>
          <div className="card-kicker">{s.label}</div>
          <div className="stat-val">
            {s.value} <span className="stat-unit">{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; valLabel: string; heightPx: number; active: boolean }[];
}) {
  return (
    <div className="card pad">
      <h4 style={{ marginBottom: 16 }}>{title}</h4>
      <div className="bars">
        {bars.map((b) => (
          <div className="bar-col" key={b.label}>
            <div className="bar-val">{b.valLabel}</div>
            <div
              className="bar"
              style={{
                height: b.heightPx,
                background: b.active ? "var(--color-accent)" : "var(--color-neutral-200)",
              }}
            />
            <div className="bar-label">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Notice({ children, err }: { children: ReactNode; err?: boolean }) {
  return <div className={`notice${err ? " err" : ""}`}>{children}</div>;
}

export function GoalBanner({ goal }: { goal: ReturnType<typeof import("@/lib/aggregate").goalView> }) {
  return (
    <div className={`card elev-sm goal goal-${goal.status}`}>
      <div className="goal-main">
        <div className="card-kicker goal-kicker">GOAL · RUN EVERY OTHER DAY</div>
        <h4 className="goal-headline">{goal.headline}</h4>
        <div className="goal-last">{goal.lastRun}</div>
        <p className="goal-msg">{goal.message}</p>
      </div>
      <div className="goal-side">
        <div className="goal-chips">
          <div><div className="goal-chip-val mono">{goal.next}</div><div className="goal-chip-label">Next run</div></div>
          <div><div className="goal-chip-val mono">{goal.streak}</div><div className="goal-chip-label">On-goal streak</div></div>
          <div><div className="goal-chip-val mono">{goal.runsLast14}<small>/7</small></div><div className="goal-chip-label">Runs, last 14 days</div></div>
        </div>
        <div className="goal-dots" aria-label="Runs over the last 14 days">
          {goal.dots.map((d, i) => (
            <span key={i} className={`goal-dot${d.on ? " on" : ""}${d.today ? " today" : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
