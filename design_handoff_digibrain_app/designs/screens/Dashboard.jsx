/* Dashboard screen */
const { useState: useStateD } = React;

function MiniSpark({ data, color = "var(--accent)" }) {
  // simple inline SVG sparkline
  const w = 120, h = 36;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActiveTimer() {
  return (
    <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-soft)", display: "grid", placeItems: "center", color: "var(--indigo-300)" }}>
        <Icon name="play" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--text-12)", color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>Currently tracking</div>
        <div style={{ fontSize: "var(--text-16)", fontWeight: 600, color: "var(--fg1)", marginTop: 2 }}>
          Microeconomics <span style={{ color: "var(--fg3)", fontWeight: 400 }}>· Problem set 4</span>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 500, color: "var(--fg1)", fontVariantNumeric: "tabular-nums" }}>01:24:08</div>
      <button className="btn">
        <Icon name="square" size={14} /> Stop
      </button>
    </div>
  );
}

function StatCard({ label, value, suffix, delta, deltaDir, foot, spark, sparkColor, progress, progressLabel, progressClass }) {
  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-value">{value}{suffix && <sup>{suffix}</sup>}</div>
      <div className="stat-foot">
        {delta && (
          <span className={`delta ${deltaDir === "up" ? "delta-up" : "delta-down"}`}>
            <Icon name={deltaDir === "up" ? "trending-up" : "trending-down"} size={12} />
            {delta}
          </span>
        )}
        {foot && <span>{foot}</span>}
        {progress !== undefined && (
          <div style={{ flex: 1, marginLeft: "auto", maxWidth: 140 }}>
            <div className="progress"><div className={`progress-bar ${progressClass || ""}`} style={{ width: `${progress}%` }}></div></div>
          </div>
        )}
        {progressLabel && <span style={{ marginLeft: "auto" }}>{progressLabel}</span>}
        {spark && <span style={{ marginLeft: "auto" }}><MiniSpark data={spark} color={sparkColor} /></span>}
      </div>
    </div>
  );
}

const RECENT_TASKS = [
  { title: "Finish problem set 4 — supply & demand", topic: "Microeconomics", color: "#a78bfa", priority: "high", due: "Today" },
  { title: "Review macroeconomic policy lecture notes", topic: "Macroeconomics", color: "#60a5fa", priority: "med", due: "Tomorrow" },
  { title: "Project Atlas: Q2 roadmap draft", topic: "Project Atlas", color: "#f472b6", priority: "high", due: "Apr 14" },
  { title: "Statistics — chapter 3 exercises", topic: "Statistics", color: "#34d399", priority: "low", due: "Apr 16" },
  { title: "Annual health check-up booking", topic: "Health", color: "#fbbf24", priority: "med", due: "Apr 22" },
  { title: "Thesis: outline literature review", topic: "Thesis research", color: "#fb7185", priority: "med", due: "Apr 28" },
];

function RecentTasks() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <div className="card-title" style={{ color: "var(--fg1)", fontSize: 16, fontWeight: 600 }}>Recent tasks</div>
        <button className="btn btn-ghost btn-sm">View all</button>
      </div>
      <div>
        {RECENT_TASKS.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < RECENT_TASKS.length - 1 ? "1px solid var(--border)" : "0", cursor: "pointer" }}
               onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
               onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span className={`dot dot-${t.priority === "high" ? "high" : t.priority === "med" ? "med" : "low"}`} style={{ width: 8, height: 8 }}></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)" }}>{t.title}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                <span className="tag" style={{ height: 18, fontSize: 11, padding: "0 6px" }}>
                  <span className="tag-dot" style={{ background: t.color }}></span>
                  {t.topic}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{t.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TIME_DIST = [
  { topic: "Microeconomics", color: "#a78bfa", hours: 8.5, pct: 28 },
  { topic: "Project Atlas", color: "#f472b6", hours: 7.2, pct: 24 },
  { topic: "Macroeconomics", color: "#60a5fa", hours: 5.0, pct: 17 },
  { topic: "Statistics", color: "#34d399", hours: 4.3, pct: 14 },
  { topic: "Thesis research", color: "#fb7185", hours: 2.8, pct: 9 },
  { topic: "Other", color: "#52525b", hours: 2.4, pct: 8 },
];

function TimeDistribution() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg1)" }}>This week's time</div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>30.2 hours total</div>
        </div>
        <button className="btn btn-ghost btn-sm">This week <Icon name="chevron-down" size={12} /></button>
      </div>
      {/* stacked bar */}
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 16, background: "var(--bg-elev2)" }}>
        {TIME_DIST.map((d, i) => (
          <div key={i} style={{ width: `${d.pct}%`, background: d.color }} title={`${d.topic} · ${d.hours}h`}></div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {TIME_DIST.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="tag-dot" style={{ background: d.color, width: 8, height: 8 }}></span>
            <span style={{ flex: 1, fontSize: 13, color: "var(--fg2)" }}>{d.topic}</span>
            <span style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{d.pct}%</span>
            <span style={{ fontSize: 13, color: "var(--fg1)", fontVariantNumeric: "tabular-nums", fontWeight: 500, minWidth: 40, textAlign: "right" }}>{d.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RECENT_NOTES = [
  { title: "Marshallian vs Hicksian demand", snippet: "Two ways to slice the demand curve. Marshall fixes income; Hicks fixes utility. Slutsky equation links the two via substitution + income effects…", topic: "Microeconomics", color: "#a78bfa", date: "2h ago" },
  { title: "Atlas Q2 roadmap — open questions", snippet: "Unclear whether the analytics rewrite blocks the customer-portal launch. Need confirmation from Anna by Friday before committing to the timeline…", topic: "Project Atlas", color: "#f472b6", date: "Yesterday" },
  { title: "Standard error vs standard deviation", snippet: "SD describes variability of the data; SE describes variability of the estimate. SE = SD / sqrt(n). Interview answer: SE shrinks with bigger samples; SD doesn't.", topic: "Statistics", color: "#34d399", date: "2 days ago" },
];

function RecentNotes() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent notes</h2>
        </div>
        <button className="btn btn-ghost btn-sm">All notes <Icon name="arrow-right" size={12} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {RECENT_NOTES.map((n, i) => (
          <div key={i} className="card" style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="tag" style={{ height: 20, fontSize: 11 }}>
                <span className="tag-dot" style={{ background: n.color }}></span>
                {n.topic}
              </span>
              <span style={{ fontSize: 11, color: "var(--fg3)" }}>{n.date}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg1)", lineHeight: 1.3 }}>{n.title}</div>
            <div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.snippet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-head">
        <div>
          <h1>Good evening, Marcell</h1>
          <div className="sub">Sunday, May 5 — 8 tasks scheduled this week</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="plus" size={14} /> Quick capture</button>
          <button className="btn btn-primary"><Icon name="plus" size={14} /> Add task</button>
        </div>
      </div>

      <ActiveTimer />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Hours this week" value="30.2" suffix="h"
          spark={[18, 22, 19, 26, 28, 24, 30]} sparkColor="var(--indigo-400)"
          delta="+12%" deltaDir="up" foot="vs last week" />
        <StatCard label="Tasks completed" value="12"
          delta="+3" deltaDir="up" foot="vs last week"
          spark={[5, 7, 4, 9, 8, 11, 12]} sparkColor="var(--emerald-400)" />
        <StatCard label="Spent this month" value="184 230" suffix="HUF"
          progress={62} progressLabel="62% of 300k"
          progressClass="ok" />
        <StatCard label="Active topics" value="14" foot="3 archived this month" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <RecentTasks />
        <TimeDistribution />
      </div>

      <RecentNotes />
    </div>
  );
}

Object.assign(window, { Dashboard });
