import { BarChart, Notice, StatCards, Toggle } from "@/components/Bits";
import { sleepView, type Range } from "@/lib/aggregate";
import { loadNights } from "@/lib/health";
import { loadForUser } from "@/lib/load";

export const metadata = { title: "Sleep — Trace" };

export default async function Sleep({ searchParams }: PageProps<"/sleep">) {
  const sp = await searchParams;
  const range: Range = sp.range === "month" ? "month" : "week";

  const res = await loadForUser(loadNights);
  const header = (title: string) => (
    <>
      <div className="head">
        <div>
          <h6>SLEEP</h6>
          <h1>{title}</h1>
        </div>
        <Toggle options={[
          { label: "This week", href: "/sleep?range=week", on: range === "week" },
          { label: "Last 30 days", href: "/sleep?range=month", on: range === "month" },
        ]} />
      </div>
      <hr className="hr" />
    </>
  );

  if ("error" in res)
    return <section className="section">{header("Sleep")}<Notice err>{res.error}</Notice></section>;
  if (!res.data.length)
    return <section className="section">{header("No sleep yet")}<Notice>No sleep sessions found in the last 30 days.</Notice></section>;

  const v = sleepView(res.data, range);
  const l = v.last!;
  return (
    <section className="section">
      {header("Last night")}
      <div className="card elev-sm sleep-hero">
        <div className="ring" style={{ background: `conic-gradient(var(--color-accent) ${l.scoreDeg}deg, var(--color-neutral-200) 0deg)` }}>
          <div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{l.score}</div>
            <div className="text-muted" style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase" }} title="Estimated from duration, deep/REM share and efficiency">score*</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="sleep-facts">
            <div><div className="card-kicker" style={{ marginBottom: 4 }}>Duration</div><div className="fact-val">{l.duration}</div></div>
            <div><div className="card-kicker" style={{ marginBottom: 4 }}>Bedtime – wake</div><div className="fact-val">{l.bedtime} – {l.wake}</div></div>
            <div><div className="card-kicker" style={{ marginBottom: 4 }}>Resting heart rate</div><div className="fact-val">{l.restingHr} <span className="stat-unit">bpm</span></div></div>
          </div>
          <div>
            <div className="stagebar">
              <div style={{ background: "var(--color-accent-200)", width: `${l.lightPct}%` }} />
              <div style={{ background: "var(--color-accent-500)", width: `${l.deepPct}%` }} />
              <div style={{ background: "var(--color-accent-800)", width: `${l.remPct}%` }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              <span className="tag" style={{ background: "var(--color-accent-200)", color: "var(--color-accent-800)" }}>Light {l.light}m</span>
              <span className="tag" style={{ background: "var(--color-accent-500)", color: "var(--color-bg)" }}>Deep {l.deep}m</span>
              <span className="tag" style={{ background: "var(--color-accent-800)", color: "var(--color-bg)" }}>REM {l.rem}m</span>
            </div>
          </div>
        </div>
      </div>
      <div className="text-muted" style={{ fontSize: 12, marginTop: -12 }}>
        * Google Health doesn’t expose Fitbit’s sleep score, so this is an estimate: duration vs 8h (50), deep/REM share (25), efficiency (25).
      </div>

      <StatCards stats={v.stats} />
      <BarChart title={v.chartTitle} bars={v.chart} />

      <div>
        <h4 style={{ marginBottom: 12 }}>{v.tableTitle}</h4>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Night</th><th>Bedtime</th><th>Wake</th><th>Duration</th><th>Score</th><th>Resting HR</th></tr></thead>
            <tbody>
              {v.entries.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td><td>{r.bedtime}</td><td>{r.wake}</td><td>{r.duration}</td><td>{r.score}</td>
                  <td>{r.restingHr ? `${r.restingHr} bpm` : "—"}</td>
                </tr>
              ))}
              {!v.entries.length && <tr><td colSpan={6} className="text-muted">No nights in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
