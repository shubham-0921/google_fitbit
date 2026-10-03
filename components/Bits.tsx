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
