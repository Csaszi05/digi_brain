/* Inbox — email → ticket triage view
   3-panel layout: folder rail | message list | ticket detail */
const { useState: useStateIB } = React;

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: "inbox", count: 24 },
  { id: "triage", label: "To triage", icon: "alert-circle", count: 8, accent: true },
  { id: "waiting", label: "Waiting on reply", icon: "clock", count: 5 },
  { id: "snoozed", label: "Snoozed", icon: "alarm-clock", count: 3 },
  { id: "done", label: "Done", icon: "check-circle-2", count: 142 },
  { id: "archive", label: "Archive", icon: "archive" },
];

const QUICK_FILTERS = [
  { id: "all", label: "All", count: 24, active: true },
  { id: "open", label: "Open", count: 13 },
  { id: "waiting", label: "Waiting", count: 5 },
  { id: "high", label: "High priority", count: 4 },
];

const MESSAGES = [
  {
    id: "m1", unread: true, priority: "high", status: "open",
    from: "Anna Kovács", fromEmail: "anna@atlas.io", subject: "Re: Q2 roadmap — analytics rewrite scope",
    preview: "Quick reply — yes, the analytics rewrite is the blocker for the customer-portal launch. I think we should move…",
    topic: "Project Atlas", topicColor: "#f472b6",
    time: "12 min ago", attachments: 1, hasAi: true,
  },
  {
    id: "m2", unread: true, priority: "med", status: "open",
    from: "Dr. Szabó László", fromEmail: "szabo.l@uni-corvinus.hu", subject: "Midterm — sample exam attached",
    preview: "Kedves Marcell, csatoltam egy mintát a jövő heti dolgozathoz. A 3. feladat tipusa biztosan szerepelni fog…",
    topic: "Microeconomics", topicColor: "#a78bfa",
    time: "1 hr ago", attachments: 2, hasAi: true,
  },
  {
    id: "m3", unread: false, priority: "low", status: "open",
    from: "GitHub", fromEmail: "noreply@github.com", subject: "[Csaszi05/digi_brain] PR #42 approved — ready to merge",
    preview: "Eszter Nagy approved your pull request. 3 reviewers · 8 files changed · +482 / −156.",
    topic: "Project Atlas", topicColor: "#f472b6",
    time: "2 hr ago", hasAi: false,
  },
  {
    id: "m4", unread: true, priority: "med", status: "waiting",
    from: "Lili Vass", fromEmail: "lili.vass@gmail.com", subject: "Konyhabútor — méretek és ár",
    preview: "Szia! Beszéltem a céggel, küldték az ajánlatot — 480 000 Ft a beépített rész. Mit gondolsz?",
    topic: "Personal", topicColor: "#fbbf24",
    time: "Yesterday", attachments: 1, hasAi: true,
  },
  {
    id: "m5", unread: false, priority: "low", status: "open",
    from: "BKK Online", fromEmail: "info@bkk.hu", subject: "Bérletvásárlás visszaigazolás — május",
    preview: "Köszönjük a vásárlást. Bérlet azonosító: BKK-2026-05-49281. Érvényesség: 2026.05.01 — 2026.05.31.",
    topic: "Finance", topicColor: "#34d399",
    time: "Yesterday", hasAi: false,
  },
  {
    id: "m6", unread: false, priority: "high", status: "waiting",
    from: "Magyar Telekom", fromEmail: "ugyfel@telekom.hu", subject: "Sürgős: számla 30 napos felszólítás",
    preview: "Tisztelt Ügyfelünk! A 2026.04.15-én kelt 24 580 Ft összegű számla még nem került rendezésre. Kérjük…",
    topic: "Finance", topicColor: "#34d399",
    time: "2 days ago", hasAi: true,
  },
  {
    id: "m7", unread: false, priority: "med", status: "open",
    from: "Notion", fromEmail: "team@notion.so", subject: "Your weekly recap — 14 pages updated",
    preview: "Here's what you and your collaborators worked on this week. Most active page: Atlas Q2 planning.",
    topic: "Project Atlas", topicColor: "#f472b6",
    time: "Apr 28", hasAi: false,
  },
  {
    id: "m8", unread: false, priority: "low", status: "done",
    from: "Eszter Nagy", fromEmail: "eszter@atlas.io", subject: "Re: Vendég wifi az irodában",
    preview: "Tökéletes, köszi! A jelszó: atlas-guest-2026. A vendég hálózat csak a 2. emeleten elérhető.",
    topic: "Project Atlas", topicColor: "#f472b6",
    time: "Apr 27", hasAi: false,
  },
];

function PrioPill({ p }) {
  const map = { high: ["High", "var(--danger)", "rgb(251 113 133 / 0.12)"], med: ["Med", "var(--warn)", "rgb(251 191 36 / 0.12)"], low: ["Low", "var(--fg3)", "var(--bg-elev2)"] };
  const [label, fg, bg] = map[p] || map.low;
  return <span style={{ height: 18, padding: "0 6px", borderRadius: 4, fontSize: 11, fontWeight: 500, color: fg, background: bg, display: "inline-flex", alignItems: "center", gap: 4 }}>{label}</span>;
}

function StatusBadge({ s }) {
  const map = {
    open: ["Open", "var(--indigo-300)", "var(--accent-soft)"],
    waiting: ["Waiting", "var(--warn)", "rgb(251 191 36 / 0.12)"],
    done: ["Done", "var(--success)", "rgb(52 211 153 / 0.12)"],
  };
  const [label, fg, bg] = map[s];
  return <span style={{ height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, color: fg, background: bg, display: "inline-flex", alignItems: "center", gap: 5 }}>
    <span style={{ width: 5, height: 5, borderRadius: 5, background: fg }}></span>{label}
  </span>;
}

function FolderRail({ active, onSelect }) {
  return (
    <aside className="ib-rail">
      <div className="ib-rail-head">
        <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>Mailboxes</div>
        <button className="sb-icon-btn"><Icon name="settings-2" size={14} /></button>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {FOLDERS.map(f => (
          <button key={f.id}
            className="ib-rail-item"
            data-active={active === f.id ? "true" : "false"}
            onClick={() => onSelect && onSelect(f.id)}>
            <Icon name={f.icon} size={15} />
            <span style={{ flex: 1, textAlign: "left" }}>{f.label}</span>
            {f.count !== undefined && (
              <span style={{ fontSize: 11, color: f.accent ? "var(--indigo-300)" : "var(--fg3)", fontVariantNumeric: "tabular-nums", fontWeight: f.accent ? 600 : 400 }}>{f.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="ib-rail-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 6px" }}>
          <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>Rules</div>
          <button className="sb-icon-btn"><Icon name="plus" size={14} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {["From Anna → Project Atlas", "GitHub → Atlas, low prio", "Telekom → Finance, high prio"].map((r, i) => (
            <div key={i} className="ib-rule-row">
              <Icon name="filter" size={11} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r}</span>
            </div>
          ))}
        </div>
        <button className="ib-rail-link"><Icon name="sliders-horizontal" size={12} /> Edit rules…</button>
      </div>

      <div className="ib-rail-section">
        <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500, padding: "0 8px 6px" }}>Accounts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="ib-acc-row">
            <span className="ib-acc-dot" style={{ background: "#34d399" }}></span>
            <span style={{ flex: 1 }}>marcell@digibrain.local</span>
            <span style={{ fontSize: 11, color: "var(--fg3)" }}>IMAP</span>
          </div>
          <div className="ib-acc-row">
            <span className="ib-acc-dot" style={{ background: "#34d399" }}></span>
            <span style={{ flex: 1 }}>m.cs@uni-corvinus.hu</span>
            <span style={{ fontSize: 11, color: "var(--fg3)" }}>IMAP</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MessageRow({ m, active, dense, onClick }) {
  if (dense) {
    return (
      <div className="ib-row ib-row-dense" data-active={active ? "true" : "false"} data-unread={m.unread ? "true" : "false"} onClick={onClick}>
        <span className="ib-unread-dot" style={{ opacity: m.unread ? 1 : 0 }}></span>
        <PrioPill p={m.priority} />
        <span className="ib-row-from">{m.from}</span>
        <span className="ib-row-subject">{m.subject} <span style={{ color: "var(--fg3)", fontWeight: 400 }}>— {m.preview}</span></span>
        <span className="tag" style={{ height: 18, fontSize: 10, padding: "0 6px" }}>
          <span className="tag-dot" style={{ background: m.topicColor }}></span>{m.topic}
        </span>
        {m.attachments && <Icon name="paperclip" size={12} />}
        <span className="ib-row-time">{m.time}</span>
      </div>
    );
  }
  return (
    <div className="ib-row" data-active={active ? "true" : "false"} data-unread={m.unread ? "true" : "false"} onClick={onClick}>
      <div className="ib-row-lead">
        <span className="ib-unread-dot" style={{ opacity: m.unread ? 1 : 0 }}></span>
        <div className="ib-avatar">{m.from.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ib-row-from" style={{ fontWeight: m.unread ? 600 : 500 }}>{m.from}</span>
          <PrioPill p={m.priority} />
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{m.time}</span>
        </div>
        <div className="ib-row-subject" style={{ fontWeight: m.unread ? 600 : 500 }}>{m.subject}</div>
        <div style={{ fontSize: 12, color: "var(--fg3)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.preview}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span className="tag" style={{ height: 18, fontSize: 10, padding: "0 6px" }}>
            <span className="tag-dot" style={{ background: m.topicColor }}></span>{m.topic}
          </span>
          {m.attachments && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--fg3)" }}>
              <Icon name="paperclip" size={11} /> {m.attachments}
            </span>
          )}
          {m.hasAi && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--indigo-300)" }}>
              <Icon name="sparkles" size={11} /> AI summary
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ListPanel({ selected, onSelect, density }) {
  return (
    <section className="ib-list">
      <div className="ib-list-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" className="ib-check" />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Inbox</h2>
          <span style={{ fontSize: 12, color: "var(--fg3)" }}>24 messages · 13 unread</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="arrow-down-up" size={12} /> Newest</button>
          <button className="btn btn-ghost btn-icon" aria-label="Filters"><Icon name="filter" size={14} /></button>
          <button className="btn btn-ghost btn-icon" aria-label="Refresh"><Icon name="refresh-cw" size={14} /></button>
        </div>
      </div>
      <div className="ib-filters">
        {QUICK_FILTERS.map(f => (
          <button key={f.id} className="ib-chip" data-active={f.active ? "true" : "false"}>
            {f.label} <span style={{ color: "var(--fg3)", fontVariantNumeric: "tabular-nums", fontWeight: 400 }}>{f.count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }}></div>
        <button className="ib-chip"><Icon name="sparkles" size={12} /> AI triage</button>
      </div>
      <div className="ib-list-body">
        {MESSAGES.map(m => (
          <MessageRow key={m.id} m={m} dense={density === "dense"} active={selected === m.id} onClick={() => onSelect(m.id)} />
        ))}
      </div>
    </section>
  );
}

function TicketDetail() {
  return (
    <section className="ib-detail">
      <header className="ib-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge s="open" />
          <PrioPill p="high" />
          <span className="tag" style={{ height: 22 }}>
            <span className="tag-dot" style={{ background: "#f472b6" }}></span>Project Atlas
          </span>
          <span style={{ fontSize: 12, color: "var(--fg3)" }}>· Ticket #DB-218 · opened 12 min ago</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm"><Icon name="reply" size={12} /> Reply</button>
          <button className="btn btn-ghost btn-sm"><Icon name="check" size={12} /> Done</button>
          <button className="btn btn-ghost btn-sm"><Icon name="alarm-clock" size={12} /> Snooze</button>
          <button className="btn btn-ghost btn-icon"><Icon name="more-horizontal" size={14} /></button>
        </div>
      </header>

      <div className="ib-detail-scroll">
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25, marginBottom: 14 }}>Re: Q2 roadmap — analytics rewrite scope</h1>

        {/* AI summary */}
        <div className="ib-ai">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="sparkles" size={14} />
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--indigo-300)" }}>AI summary</span>
            <span style={{ fontSize: 11, color: "var(--fg3)" }}>generated 11 min ago</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", height: 22 }}><Icon name="refresh-cw" size={10} /> Regenerate</button>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg2)", lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>Anna confirms the analytics rewrite is the blocking dependency for the customer-portal launch.</li>
            <li>Proposed move: bring rewrite forward 2 weeks, slip portal launch to mid-June.</li>
            <li>Wants your sign-off by Friday before she commits the timeline to the team.</li>
          </ul>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button className="ib-ai-action"><Icon name="plus" size={11} /> Create task</button>
            <button className="ib-ai-action"><Icon name="calendar" size={11} /> Set due date</button>
            <button className="ib-ai-action"><Icon name="link" size={11} /> Link to topic</button>
          </div>
        </div>

        {/* From header */}
        <div className="ib-from">
          <div className="ib-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>AK</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Anna Kovács <span style={{ color: "var(--fg3)", fontWeight: 400 }}>&lt;anna@atlas.io&gt;</span></div>
            <div style={{ fontSize: 12, color: "var(--fg3)" }}>to Marcell · May 11, 10:42</div>
          </div>
          <button className="btn btn-ghost btn-icon"><Icon name="external-link" size={14} /></button>
        </div>

        {/* Body */}
        <div className="ib-body">
          <p>Hey Marcell,</p>
          <p>Quick reply — yes, the analytics rewrite is the blocker for the customer-portal launch. I've been chewing on this and I think we should move it forward by ~2 weeks. That pushes the portal to mid-June, which is annoying but honest.</p>
          <p>The alternative is shipping the portal with the old analytics layer and rewriting in place, which historically goes badly for us. Last time we did that with the billing module it took 3 sprints longer than we'd estimated.</p>
          <p>Could you sign off on the slip by Friday? I want to commit the new timeline to the team before the all-hands.</p>
          <p>Thanks,<br/>Anna</p>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: "var(--bg-elev2)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="paperclip" size={14} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Q2-roadmap-draft.pdf</div>
            <div style={{ fontSize: 11, color: "var(--fg3)" }}>248 KB · PDF</div>
          </div>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={12} /> Download</button>
        </div>

        {/* Composer */}
        <div className="ib-composer">
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <button className="ib-comp-tab" data-active="true"><Icon name="reply" size={12} /> Reply</button>
            <button className="ib-comp-tab"><Icon name="forward" size={12} /> Forward</button>
            <button className="ib-comp-tab" style={{ marginLeft: "auto" }}><Icon name="sparkles" size={12} /> Draft with AI</button>
          </div>
          <textarea className="ib-textarea" placeholder="Write a reply…" rows={4}></textarea>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
            <button className="sb-icon-btn"><Icon name="paperclip" size={14} /></button>
            <button className="sb-icon-btn"><Icon name="image" size={14} /></button>
            <button className="sb-icon-btn"><Icon name="smile" size={14} /></button>
            <div style={{ flex: 1 }}></div>
            <button className="btn btn-ghost btn-sm">Save draft</button>
            <button className="btn btn-primary btn-sm">Send <Icon name="send" size={12} /></button>
          </div>
        </div>
      </div>

      {/* Right metadata column */}
      <aside className="ib-meta">
        <div className="ib-meta-section">
          <div className="ib-meta-label">Status</div>
          <div className="ib-meta-row"><StatusBadge s="open" /><button className="ib-meta-edit"><Icon name="chevron-down" size={12} /></button></div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Priority</div>
          <div className="ib-meta-row"><PrioPill p="high" /><button className="ib-meta-edit"><Icon name="chevron-down" size={12} /></button></div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Topic</div>
          <div className="ib-meta-row">
            <span className="tag" style={{ height: 22 }}>
              <span className="tag-dot" style={{ background: "#f472b6" }}></span>Project Atlas
            </span>
            <button className="ib-meta-edit"><Icon name="chevron-down" size={12} /></button>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Due</div>
          <div className="ib-meta-row" style={{ fontSize: 13, color: "var(--fg2)" }}>
            <Icon name="calendar" size={12} /> Friday, May 15
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Linked task</div>
          <button className="ib-meta-link">
            <Icon name="check-square" size={12} />
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Atlas — sign off Q2 timeline</span>
            <Icon name="external-link" size={11} />
          </button>
        </div>

        <div className="ib-meta-section">
          <div className="ib-meta-label">Activity</div>
          <div className="ib-activity">
            <div className="ib-act"><Icon name="inbox" size={11} /><span>Received from anna@atlas.io</span><span className="ib-act-time">11 min ago</span></div>
            <div className="ib-act"><Icon name="sparkles" size={11} /><span>AI summary generated</span><span className="ib-act-time">11 min ago</span></div>
            <div className="ib-act"><Icon name="filter" size={11} /><span>Rule "From Anna" → topic Project Atlas</span><span className="ib-act-time">11 min ago</span></div>
            <div className="ib-act"><Icon name="flag" size={11} /><span>Priority set to High by rule</span><span className="ib-act-time">11 min ago</span></div>
          </div>
        </div>
      </aside>
    </section>
  );
}

function Inbox({ density = "card" }) {
  const [selected, setSelected] = useStateIB("m1");
  const [folder, setFolder] = useStateIB("inbox");
  return (
    <div className="ib-shell">
      <FolderRail active={folder} onSelect={setFolder} />
      <ListPanel selected={selected} onSelect={setSelected} density={density} />
      <TicketDetail />
    </div>
  );
}

function RulesEditor() {
  const RULES = [
    { name: "From Anna → Project Atlas", when: "From contains anna@atlas.io", then: ["Assign topic: Project Atlas", "Set priority: High"], active: true, runs: 47 },
    { name: "GitHub notifications", when: "From = noreply@github.com", then: ["Assign topic: Project Atlas", "Set priority: Low", "Auto-archive after 7 days"], active: true, runs: 312 },
    { name: "Telekom invoices", when: "From contains @telekom.hu AND subject contains 'számla'", then: ["Assign topic: Finance", "Set priority: High", "Create task: Pay invoice"], active: true, runs: 12 },
    { name: "University newsletters", when: "From ends with @uni-corvinus.hu AND subject contains 'hírlevél'", then: ["Auto-archive"], active: false, runs: 8 },
    { name: "Calendar invites → AI summary", when: "Has .ics attachment", then: ["Generate AI summary", "Create task with due date"], active: true, runs: 23 },
  ];
  return (
    <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-head">
        <div>
          <h1>Inbox rules</h1>
          <div className="sub">5 rules · 402 emails processed this month</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="play" size={14} /> Run on existing</button>
          <button className="btn btn-primary"><Icon name="plus" size={14} /> New rule</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "36px 1.5fr 2fr 80px 100px 60px", gap: 16, fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--fg3)", borderBottom: "1px solid var(--border)" }}>
          <div></div>
          <div>Rule</div>
          <div>When → then</div>
          <div style={{ textAlign: "right" }}>Runs</div>
          <div>Status</div>
          <div></div>
        </div>
        {RULES.map((r, i) => (
          <div key={i} style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "36px 1.5fr 2fr 80px 100px 60px", gap: 16, alignItems: "center", borderBottom: i < RULES.length - 1 ? "1px solid var(--border)" : 0 }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <span style={{ width: 30, height: 18, borderRadius: 9, background: r.active ? "var(--accent)" : "var(--bg-elev2)", position: "relative", display: "inline-block" }}>
                <span style={{ position: "absolute", top: 2, left: r.active ? 14 : 2, width: 14, height: 14, borderRadius: 7, background: "white" }}></span>
              </span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg1)" }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{r.when}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {r.then.map((t, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg2)" }}>
                  <Icon name="arrow-right" size={11} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg1)", fontVariantNumeric: "tabular-nums" }}>{r.runs}</div>
            <div>
              <span style={{ height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, color: r.active ? "var(--success)" : "var(--fg3)", background: r.active ? "rgb(52 211 153 / 0.12)" : "var(--bg-elev2)" }}>
                <span style={{ width: 5, height: 5, borderRadius: 5, background: r.active ? "var(--success)" : "var(--fg3)" }}></span>{r.active ? "Active" : "Paused"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <button className="sb-icon-btn"><Icon name="pencil" size={13} /></button>
              <button className="sb-icon-btn"><Icon name="more-horizontal" size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline rule builder example */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>New rule</div>
            <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>Build a condition → action chain. Runs on every incoming email.</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm">Cancel</button>
            <button className="btn btn-primary btn-sm">Save rule</button>
          </div>
        </div>

        <div className="rb-block">
          <div className="rb-block-label">When</div>
          <div className="rb-line">
            <button className="rb-pill">From</button>
            <button className="rb-pill">contains</button>
            <input className="rb-input" defaultValue="anna@atlas.io" />
            <button className="sb-icon-btn"><Icon name="x" size={12} /></button>
          </div>
          <div className="rb-line">
            <button className="rb-conjunction">AND</button>
            <button className="rb-pill">Subject</button>
            <button className="rb-pill">contains</button>
            <input className="rb-input" defaultValue="Atlas" />
            <button className="sb-icon-btn"><Icon name="x" size={12} /></button>
          </div>
          <button className="rb-add"><Icon name="plus" size={11} /> Add condition</button>
        </div>

        <div className="rb-block">
          <div className="rb-block-label">Then</div>
          <div className="rb-line">
            <button className="rb-pill">Assign topic</button>
            <span className="tag" style={{ height: 22 }}>
              <span className="tag-dot" style={{ background: "#f472b6" }}></span>Project Atlas
            </span>
            <button className="sb-icon-btn"><Icon name="x" size={12} /></button>
          </div>
          <div className="rb-line">
            <button className="rb-pill">Set priority</button>
            <PrioPill p="high" />
            <button className="sb-icon-btn"><Icon name="x" size={12} /></button>
          </div>
          <div className="rb-line">
            <button className="rb-pill">Generate AI summary</button>
            <button className="sb-icon-btn"><Icon name="x" size={12} /></button>
          </div>
          <button className="rb-add"><Icon name="plus" size={11} /> Add action</button>
        </div>

        <div style={{ padding: 12, background: "var(--accent-soft)", border: "1px solid transparent", borderRadius: 8, fontSize: 12, color: "var(--fg2)", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="info" size={13} />
          <span>This rule would have matched <strong style={{ color: "var(--fg1)" }}>47 emails</strong> in the last 90 days. Preview matches before saving.</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Inbox, RulesEditor });
