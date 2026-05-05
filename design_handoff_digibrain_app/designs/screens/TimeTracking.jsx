/* Time tracking screen */

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// hours per day per topic
const WEEK_DATA = [
  { day: "Mon", segs: [["Microeconomics", 2.0, "#a78bfa"], ["Project Atlas", 1.5, "#f472b6"], ["Statistics", 0.8, "#34d399"]] },
  { day: "Tue", segs: [["Microeconomics", 1.5, "#a78bfa"], ["Macroeconomics", 2.0, "#60a5fa"], ["Project Atlas", 0.8, "#f472b6"]] },
  { day: "Wed", segs: [["Project Atlas", 3.0, "#f472b6"], ["Microeconomics", 1.0, "#a78bfa"]] },
  { day: "Thu", segs: [["Statistics", 2.5, "#34d399"], ["Microeconomics", 1.2, "#a78bfa"], ["Thesis research", 1.0, "#fb7185"]] },
  { day: "Fri", segs: [["Project Atlas", 1.9, "#f472b6"], ["Macroeconomics", 1.8, "#60a5fa"], ["Microeconomics", 1.0, "#a78bfa"], ["Thesis research", 0.8, "#fb7185"]] },
  { day: "Sat", segs: [["Microeconomics", 1.8, "#a78bfa"], ["Statistics", 1.0, "#34d399"], ["Thesis research", 1.0, "#fb7185"]] },
  { day: "Sun", segs: [["Microeconomics", 1.0, "#a78bfa"], ["Macroeconomics", 1.2, "#60a5fa"], ["Statistics", 0.5, "#34d399"]] },
];

function WeekChart() {
  const max = 8;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 280, padding: "8px 4px 0" }}>
      {WEEK_DATA.map((d, i) => {
        const total = d.segs.reduce((s, [, h]) => s + h, 0);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative" }}>
              <div style={{ position: "absolute", top: -22, left: 0, right: 0, textAlign: "center", fontSize: 12, fontWeight: 500, color: "var(--fg2)", fontVariantNumeric: "tabular-nums" }}>{total.toFixed(1)}h</div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", borderRadius: 6, overflow: "hidden", height: `${(total / max) * 100}%` }}>
                {d.segs.map(([t, h, c], j) => (
                  <div key={j} style={{ flex: h, background: c, minHeight: 2 }} title={`${t}: ${h}h`}></div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg3)" }}>{d.day}</div>
          </div>
        );
      })}
    </div>
  );
}

const TOP_TOPICS_TIME = [
  { topic: "Microeconomics", color: "#a78bfa", hours: 9.5, pct: 31 },
  { topic: "Project Atlas", color: "#f472b6", hours: 7.2, pct: 24 },
  { topic: "Macroeconomics", color: "#60a5fa", hours: 5.0, pct: 17 },
  { topic: "Statistics", color: "#34d399", hours: 4.8, pct: 16 },
  { topic: "Thesis research", color: "#fb7185", hours: 2.8, pct: 9 },
  { topic: "Other", color: "#52525b", hours: 0.9, pct: 3 },
];

const RECENT_SESSIONS = [
  { topic: "Microeconomics", color: "#a78bfa", duration: "1h 24m", time: "Today, 14:32", note: "Problem set 4 — supply & demand" },
  { topic: "Project Atlas", color: "#f472b6", duration: "0h 45m", time: "Today, 11:00", note: "Q2 roadmap draft" },
  { topic: "Macroeconomics", color: "#60a5fa", duration: "2h 02m", time: "Yesterday, 19:00", note: "Lecture 8 review" },
  { topic: "Statistics", color: "#34d399", duration: "1h 10m", time: "Yesterday, 14:15" },
  { topic: "Microeconomics", color: "#a78bfa", duration: "1h 30m", time: "Apr 27, 20:00", note: "Lecture 7 notes" },
  { topic: "Thesis research", color: "#fb7185", duration: "0h 50m", time: "Apr 27, 16:30" },
];

function TimeTracking() {
  return (
    <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-head">
        <div>
          <h1>Time tracking</h1>
          <div className="sub">Apr 28 – May 4 · 30.2 hours</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="filter" size={14} /> All topics</button>
          <button className="btn btn-primary"><Icon name="plus" size={14} /> New entry</button>
        </div>
      </div>

      <div className="tabs" style={{ alignSelf: "flex-start" }}>
        <button className="tab">Today</button>
        <button className="tab" data-active="true">This week</button>
        <button className="tab">This month</button>
        <button className="tab">This year</button>
        <button className="tab">Custom range</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Total hours" value="30.2" suffix="h"
          delta="+12%" deltaDir="up" foot="vs last week" />
        <StatCard label="Most active topic" value="Microecon."
          foot="9.5h · 31% of week" />
        <StatCard label="Daily average" value="4.3" suffix="h"
          foot="Goal: 4.0h" />
        <StatCard label="Longest session" value="2.0" suffix="h"
          foot="Macroeconomics · Tue" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg1)" }}>Hours by day</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>Stacked by topic · this week</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" data-active="true"><Icon name="bar-chart-3" size={12} /></button>
              <button className="btn btn-ghost btn-sm"><Icon name="line-chart" size={12} /></button>
            </div>
          </div>
          <WeekChart />
          <div className="divider-h" style={{ margin: "16px 0" }}></div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {TOP_TOPICS_TIME.slice(0, 5).map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg2)" }}>
                <span className="tag-dot" style={{ background: t.color, width: 8, height: 8 }}></span>
                {t.topic}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg1)" }}>Top topics</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>Ranked by hours</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TOP_TOPICS_TIME.map((t, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg1)", fontWeight: 500 }}>
                    <span className="tag-dot" style={{ background: t.color, width: 8, height: 8 }}></span>
                    {t.topic}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{t.hours}h · {t.pct}%</div>
                </div>
                <div className="progress" style={{ height: 4 }}>
                  <div className="progress-bar" style={{ width: `${t.pct * 3}%`, background: t.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Recent sessions</div>
          <button className="btn btn-ghost btn-sm">View all</button>
        </div>
        <div>
          {RECENT_SESSIONS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", borderBottom: i < RECENT_SESSIONS.length - 1 ? "1px solid var(--border)" : 0 }}>
              <span className="tag" style={{ height: 22 }}>
                <span className="tag-dot" style={{ background: s.color }}></span>
                {s.topic}
              </span>
              <div style={{ flex: 1, fontSize: 13, color: "var(--fg2)" }}>{s.note || <span style={{ color: "var(--fg3)", fontStyle: "italic" }}>No note</span>}</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{s.time}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: "var(--fg1)", fontVariantNumeric: "tabular-nums", minWidth: 70, textAlign: "right" }}>{s.duration}</div>
              <button className="sb-icon-btn"><Icon name="more-horizontal" size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TimeTracking });
