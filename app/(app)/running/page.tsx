import { BarChart, Notice, StatCards, Toggle } from "@/components/Bits";
import { runView, type Range, type Units } from "@/lib/aggregate";
import { loadRuns } from "@/lib/health";
import { loadForUser } from "@/lib/load";

export const metadata = { title: "Running — Trace" };

export default async function Running({ searchParams }: PageProps<"/running">) {
  const sp = await searchParams;
  const range: Range = sp.range === "month" ? "month" : "week";
  const units: Units = sp.units === "mi" ? "mi" : "km";
  const href = (r: Range, u: Units) => `/running?range=${r}&units=${u}`;

  const res = await loadForUser(loadRuns);
  const header = (title: string) => (
    <>
      <div className="head">
        <div>
          <h6>RUNNING</h6>
          <h1>{title}</h1>
        </div>
        <div className="head-actions">
          <Toggle options={[
            { label: "MI", href: href(range, "mi"), on: units === "mi" },
            { label: "KM", href: href(range, "km"), on: units === "km" },
          ]} />
          <Toggle options={[
            { label: "This week", href: href("week", units), on: range === "week" },
            { label: "Last 30 days", href: href("month", units), on: range === "month" },
          ]} />
        </div>
      </div>
      <hr className="hr" />
    </>
  );

  if ("error" in res)
    return <section className="section">{header("Running")}<Notice err>{res.error}</Notice></section>;
  if (!res.data.length)
    return <section className="section">{header("No runs yet")}<Notice>No runs found in the last 30 days of your Google Health data.</Notice></section>;

  const v = runView(res.data, range, units);
  const last = v.last!;
  return (
    <section className="section">
      {header(last.when)}
      <div className="card elev-sm hero-run">
        <div className="full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          <span className="card-kicker">LAST RUN · {last.ago}</span>
        </div>
        <div><div className="big">{last.dist}<small> {units}</small></div><div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Distance</div></div>
        <div><div className="big">{last.dur}</div><div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Duration</div></div>
        <div><div className="big">{last.pace}</div><div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Pace / {units}</div></div>
        <div><div className="big">{last.hr}<small> bpm</small></div><div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Avg heart rate</div></div>
      </div>

      <StatCards stats={v.stats} />
      <BarChart title={v.chartTitle} bars={v.chart} />

      <div>
        <h4 style={{ marginBottom: 12 }}>{v.tableTitle}</h4>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Distance</th><th>Duration</th><th>Pace</th><th>Avg HR</th><th>Calories</th></tr></thead>
            <tbody>
              {v.entries.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td><td>{r.dist} {units}</td><td>{r.dur}</td><td>{r.pace}/{units}</td>
                  <td>{r.hr ? `${r.hr} bpm` : "—"}</td><td>{r.cal ? `${r.cal} cal` : "—"}</td>
                </tr>
              ))}
              {!v.entries.length && <tr><td colSpan={6} className="text-muted">No runs in this range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
