/* Topic detail — Kanban board */

const KANBAN_COLUMNS = [
  {
    id: "todo", name: "To do", color: "#71717a",
    tasks: [
      { id: "t1", title: "Read chapter 5 — consumer choice theory", desc: "Walras and Marshall framings; come back to indifference curves.", priority: "med", due: "Apr 12", tags: ["reading"] },
      { id: "t2", title: "Find practice problems for elasticity", priority: "low", tags: ["prep"] },
      { id: "t3", title: "Email TA about office hours", priority: "low" },
      { id: "t4", title: "Compile formula sheet for midterm", desc: "Pull from lecture slides 1–8.", priority: "med", due: "Apr 18", tags: ["midterm"] },
    ],
  },
  {
    id: "doing", name: "In progress", color: "#818cf8",
    tasks: [
      { id: "t5", title: "Problem set 4 — supply & demand", desc: "Stuck on 3b. Try graphical approach next.", priority: "high", due: "Today", tags: ["pset"] },
      { id: "t6", title: "Lecture 7 notes — market equilibrium", priority: "med", tags: ["notes"] },
      { id: "t7", title: "Build flashcards for key terms", priority: "low" },
    ],
  },
  {
    id: "review", name: "Review", color: "#fbbf24",
    tasks: [
      { id: "t8", title: "Problem set 3 — utility maximization", desc: "Awaiting feedback from study group.", priority: "med", tags: ["pset"] },
      { id: "t9", title: "Mid-term study plan draft", priority: "high", due: "Apr 14", tags: ["midterm", "plan"] },
    ],
  },
  {
    id: "done", name: "Done", color: "#34d399",
    tasks: [
      { id: "t10", title: "Problem set 2 — opportunity cost", priority: "med" },
      { id: "t11", title: "Read syllabus & set up notebook", priority: "low" },
      { id: "t12", title: "Schedule weekly study block", priority: "low" },
      { id: "t13", title: "Problem set 1 — intro graphs", priority: "low" },
    ],
  },
];

function PrioDot({ p }) {
  const cls = p === "high" ? "dot-high" : p === "med" ? "dot-med" : "dot-low";
  return <span className={`dot ${cls}`} style={{ width: 7, height: 7 }}></span>;
}

function TaskCard({ task }) {
  return (
    <div className="kb-card"
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
    >
      <div className="kb-card-handle"><Icon name="grip-vertical" size={12} /></div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg1)", lineHeight: 1.4 }}>{task.title}</div>
      {task.desc && <div style={{ fontSize: 12, color: "var(--fg3)", lineHeight: 1.4, marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.desc}</div>}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {task.tags.map(t => <span key={t} className="tag" style={{ height: 18, fontSize: 11, padding: "0 6px" }}>{t}</span>)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <PrioDot p={task.priority} />
        {task.due && (
          <span className="tag" style={{ height: 18, fontSize: 11, padding: "0 6px", background: task.due === "Today" ? "var(--accent-soft)" : "var(--bg-elev2)", color: task.due === "Today" ? "var(--indigo-300)" : "var(--fg2)", borderColor: "transparent" }}>
            <Icon name="calendar" size={10} /> {task.due}
          </span>
        )}
        <div style={{ marginLeft: "auto" }} className="sb-avatar" data-mini>M</div>
      </div>
    </div>
  );
}

function KanbanColumn({ col }) {
  return (
    <div className="kb-col">
      <div className="kb-col-stripe" style={{ background: col.color }}></div>
      <div className="kb-col-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: col.color }}></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg1)" }}>{col.name}</span>
          <span style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{col.tasks.length}</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="sb-icon-btn" aria-label="Add task"><Icon name="plus" size={14} /></button>
          <button className="sb-icon-btn" aria-label="Column menu"><Icon name="more-horizontal" size={14} /></button>
        </div>
      </div>
      <div className="kb-col-body">
        {col.tasks.map(t => <TaskCard key={t.id} task={t} />)}
        <button className="kb-add-task"><Icon name="plus" size={12} /> Add task</button>
      </div>
    </div>
  );
}

const TOPIC_NOTES = [
  { title: "Marshallian vs Hicksian demand", date: "2h ago", snippet: "Marshall fixes income; Hicks fixes utility. Slutsky bridges them via substitution + income effects." },
  { title: "Elasticity quick reference", date: "Apr 8", snippet: "Price elasticity = (%ΔQ) / (%ΔP). Elastic > 1, inelastic < 1, unit at 1. Cross-price for substitutes is positive." },
  { title: "Producer surplus geometry", date: "Apr 6", snippet: "Triangle above the supply curve up to the market price. Equals the sum of (P − MC) across all units sold." },
];

function TopicDetail() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div className="page-inner" style={{ width: "100%" }}>
        <div className="page-head" style={{ alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-ghost btn-icon" style={{ width: 36, height: 36, fontSize: 22, padding: 0 }} title="Change icon">📄</button>
            <div>
              <h1 style={{ fontSize: 24 }}>Microeconomics</h1>
              <div className="sub" style={{ fontSize: 13 }}>8 tasks · 12.5 hours tracked · midterm in 9 days</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="tabs">
              <button className="tab" data-active="true"><Icon name="columns-3" size={14} /> Kanban</button>
              <button className="tab"><Icon name="git-branch" size={14} /> Pipeline</button>
              <button className="tab"><Icon name="network" size={14} /> Tree</button>
              <button className="tab"><Icon name="list" size={14} /> List</button>
            </div>
            <button className="btn btn-primary"><Icon name="plus" size={14} /> Add task</button>
            <button className="btn btn-ghost btn-icon" aria-label="More"><Icon name="more-horizontal" size={16} /></button>
          </div>
        </div>
      </div>

      {/* board scroll */}
      <div className="kb-board-wrap">
        <div className="kb-board">
          {KANBAN_COLUMNS.map(c => <KanbanColumn key={c.id} col={c} />)}
          <button className="kb-add-col">
            <Icon name="plus" size={16} />
            <span>Add column</span>
          </button>
        </div>
      </div>

      <div className="page-inner" style={{ width: "100%", marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Notes for this topic</h2>
          <button className="btn btn-ghost btn-sm"><Icon name="plus" size={12} /> New note</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {TOPIC_NOTES.map((n, i) => (
            <div key={i} className="card" style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg1)" }}>{n.title}</span>
                <span style={{ fontSize: 11, color: "var(--fg3)" }}>{n.date}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.5 }}>{n.snippet}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TopicDetail });
