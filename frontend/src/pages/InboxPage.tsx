import { useState } from "react"
import {
  Inbox,
  AlertCircle,
  Clock,
  AlarmClock,
  CheckCircle2,
  Archive,
  SlidersHorizontal,
  Settings2,
  Plus,
  Filter,
  ArrowDownUp,
  RefreshCw,
  Paperclip,
  Sparkles,
  Reply,
  Forward,
  Check,
  Calendar,
  Link2,
  ExternalLink,
  ChevronDown,
  MoreHorizontal,
  Send,
  Image,
  Smile,
} from "lucide-react"

// ─── Mock data ────────────────────────────────────────────

type Message = {
  id: string
  unread: boolean
  priority: "high" | "med" | "low"
  status: "open" | "waiting" | "done" | "snoozed"
  from: string
  fromEmail: string
  subject: string
  preview: string
  topic: string
  topicColor: string
  time: string
  attachments?: number
  hasAi?: boolean
}

const MESSAGES: Message[] = [
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
]

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: Inbox, count: 24 },
  { id: "triage", label: "To triage", icon: AlertCircle, count: 8, accent: true },
  { id: "waiting", label: "Waiting on reply", icon: Clock, count: 5 },
  { id: "snoozed", label: "Snoozed", icon: AlarmClock, count: 3 },
  { id: "done", label: "Done", icon: CheckCircle2, count: 142 },
  { id: "archive", label: "Archive", icon: Archive },
]

const QUICK_FILTERS = [
  { id: "all", label: "All", count: 24 },
  { id: "open", label: "Open", count: 13 },
  { id: "waiting", label: "Waiting", count: 5 },
  { id: "high", label: "High priority", count: 4 },
]

// ─── Sub-components ───────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("")
}

function PrioPill({ p }: { p: "high" | "med" | "low" }) {
  const map = {
    high: { label: "High", fg: "var(--danger)", bg: "rgb(251 113 133 / 0.12)" },
    med: { label: "Med", fg: "var(--warn)", bg: "rgb(251 191 36 / 0.12)" },
    low: { label: "Low", fg: "var(--fg3)", bg: "var(--bg-elev2)" },
  }
  const { label, fg, bg } = map[p]
  return (
    <span style={{ height: 18, padding: "0 6px", borderRadius: 4, fontSize: 11, fontWeight: 500, color: fg, background: bg, display: "inline-flex", alignItems: "center" }}>
      {label}
    </span>
  )
}

function StatusBadge({ s }: { s: "open" | "waiting" | "done" | "snoozed" }) {
  const map = {
    open: { label: "Open", fg: "var(--indigo-300)", bg: "var(--accent-soft)" },
    waiting: { label: "Waiting", fg: "var(--warn)", bg: "rgb(251 191 36 / 0.12)" },
    done: { label: "Done", fg: "var(--success)", bg: "rgb(52 211 153 / 0.12)" },
    snoozed: { label: "Snoozed", fg: "var(--fg3)", bg: "var(--bg-elev2)" },
  }
  const { label, fg, bg } = map[s]
  return (
    <span style={{ height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, color: fg, background: bg, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg }} />
      {label}
    </span>
  )
}

function MessageRow({ m, active, onClick }: { m: Message; active: boolean; onClick: () => void }) {
  return (
    <div
      className="ib-row"
      data-active={active ? "true" : "false"}
      data-unread={m.unread ? "true" : "false"}
      onClick={onClick}
    >
      <div className="ib-row-lead">
        <span className="ib-unread-dot" style={{ opacity: m.unread ? 1 : 0 }} />
        <div className="ib-avatar">{initials(m.from)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ib-row-from" style={{ fontWeight: m.unread ? 600 : 500 }}>{m.from}</span>
          <PrioPill p={m.priority} />
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{m.time}</span>
        </div>
        <div className="ib-row-subject" style={{ fontWeight: m.unread ? 600 : 500 }}>{m.subject}</div>
        <div style={{ fontSize: 12, color: "var(--fg3)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {m.preview}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span className="tag" style={{ height: 18, fontSize: 10, padding: "0 6px" }}>
            <span className="tag-dot" style={{ background: m.topicColor }} />{m.topic}
          </span>
          {m.attachments && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--fg3)" }}>
              <Paperclip size={11} /> {m.attachments}
            </span>
          )}
          {m.hasAi && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--indigo-300)" }}>
              <Sparkles size={11} /> AI summary
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function FolderRail({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <aside className="ib-rail">
      <div className="ib-rail-head">
        <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>Mailboxes</div>
        <button className="sb-icon-btn" aria-label="Settings"><Settings2 size={14} strokeWidth={1.5} /></button>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {FOLDERS.map(f => (
          <button
            key={f.id}
            className="ib-rail-item"
            data-active={active === f.id ? "true" : "false"}
            onClick={() => onSelect(f.id)}
          >
            <f.icon size={15} strokeWidth={1.5} />
            <span style={{ flex: 1, textAlign: "left" }}>{f.label}</span>
            {f.count !== undefined && (
              <span style={{ fontSize: 11, color: f.accent ? "var(--indigo-300)" : "var(--fg3)", fontVariantNumeric: "tabular-nums", fontWeight: f.accent ? 600 : 400 }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="ib-rail-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 6px" }}>
          <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>Rules</div>
          <button className="sb-icon-btn" aria-label="Add rule"><Plus size={14} strokeWidth={1.5} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {["From Anna → Project Atlas", "GitHub → Atlas, low prio", "Telekom → Finance, high prio"].map((r, i) => (
            <div key={i} className="ib-rule-row">
              <Filter size={11} strokeWidth={1.5} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r}</span>
            </div>
          ))}
        </div>
        <a href="/inbox/rules" className="ib-rail-link">
          <SlidersHorizontal size={12} strokeWidth={1.5} /> Edit rules…
        </a>
      </div>

      <div className="ib-rail-section">
        <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500, padding: "0 8px 6px" }}>Accounts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="ib-acc-row">
            <span className="ib-acc-dot" style={{ background: "#34d399" }} />
            <span style={{ flex: 1 }}>marcell@digibrain.local</span>
            <span style={{ fontSize: 11, color: "var(--fg3)" }}>IMAP</span>
          </div>
          <div className="ib-acc-row">
            <span className="ib-acc-dot" style={{ background: "#34d399" }} />
            <span style={{ flex: 1 }}>m.cs@uni-corvinus.hu</span>
            <span style={{ fontSize: 11, color: "var(--fg3)" }}>IMAP</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function ListPanel({ selected, onSelect, filter, onFilter }: { selected: string; onSelect: (id: string) => void; filter: string; onFilter: (f: string) => void }) {
  const filtered = MESSAGES.filter(m => {
    if (filter === "all") return true
    if (filter === "open") return m.status === "open"
    if (filter === "waiting") return m.status === "waiting"
    if (filter === "high") return m.priority === "high"
    return true
  })

  return (
    <section className="ib-list">
      <div className="ib-list-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Inbox</h2>
          <span style={{ fontSize: 12, color: "var(--fg3)" }}>24 messages · 13 unread</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm"><ArrowDownUp size={12} strokeWidth={1.5} /> Newest</button>
          <button className="btn btn-ghost btn-icon" aria-label="Filters"><Filter size={14} strokeWidth={1.5} /></button>
          <button className="btn btn-ghost btn-icon" aria-label="Refresh"><RefreshCw size={14} strokeWidth={1.5} /></button>
        </div>
      </div>
      <div className="ib-filters">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.id}
            className="ib-chip"
            data-active={filter === f.id ? "true" : "false"}
            onClick={() => onFilter(f.id)}
          >
            {f.label} <span style={{ color: "var(--fg3)", fontVariantNumeric: "tabular-nums", fontWeight: 400 }}>{f.count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="ib-chip"><Sparkles size={12} strokeWidth={1.5} /> AI triage</button>
      </div>
      <div className="ib-list-body">
        {filtered.map(m => (
          <MessageRow key={m.id} m={m} active={selected === m.id} onClick={() => onSelect(m.id)} />
        ))}
      </div>
    </section>
  )
}

function TicketDetailPane({ m }: { m: Message }) {
  const [replyText, setReplyText] = useState("")
  const [compTab, setCompTab] = useState<"reply" | "forward">("reply")

  return (
    <section className="ib-detail">
      <header className="ib-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge s={m.status} />
          <PrioPill p={m.priority} />
          <span className="tag" style={{ height: 22 }}>
            <span className="tag-dot" style={{ background: m.topicColor }} />{m.topic}
          </span>
          <span style={{ fontSize: 12, color: "var(--fg3)" }}>· {m.time}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm"><Reply size={12} strokeWidth={1.5} /> Reply</button>
          <button className="btn btn-ghost btn-sm"><Check size={12} strokeWidth={1.5} /> Done</button>
          <button className="btn btn-ghost btn-sm"><AlarmClock size={12} strokeWidth={1.5} /> Snooze</button>
          <button className="btn btn-ghost btn-icon" aria-label="More"><MoreHorizontal size={14} strokeWidth={1.5} /></button>
        </div>
      </header>

      <div className="ib-detail-scroll">
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25, marginBottom: 14 }}>
          {m.subject}
        </h1>

        {m.hasAi && (
          <div className="ib-ai">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Sparkles size={14} strokeWidth={1.5} />
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--indigo-300)" }}>AI summary</span>
              <span style={{ fontSize: 11, color: "var(--fg3)" }}>generated just now</span>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", height: 22 }}><RefreshCw size={10} strokeWidth={1.5} /> Regenerate</button>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--fg2)", lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>Sender is following up on an earlier thread and expects a response.</li>
              <li>Contains time-sensitive information relevant to <strong>{m.topic}</strong>.</li>
              <li>No action has been taken on this ticket yet.</li>
            </ul>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="ib-ai-action"><Plus size={11} strokeWidth={1.5} /> Create task</button>
              <button className="ib-ai-action"><Calendar size={11} strokeWidth={1.5} /> Set due date</button>
              <button className="ib-ai-action"><Link2 size={11} strokeWidth={1.5} /> Link to topic</button>
            </div>
          </div>
        )}

        <div className="ib-from">
          <div className="ib-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{initials(m.from)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {m.from} <span style={{ color: "var(--fg3)", fontWeight: 400 }}>&lt;{m.fromEmail}&gt;</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg3)" }}>to me · {m.time}</div>
          </div>
          <button className="btn btn-ghost btn-icon" aria-label="Open original"><ExternalLink size={14} strokeWidth={1.5} /></button>
        </div>

        <div className="ib-body">
          <p>{m.preview}</p>
          <p>This is a preview of the email content. Connect an IMAP or OAuth account to sync real messages.</p>
        </div>

        {m.attachments && (
          <div style={{ marginTop: 16, padding: 12, background: "var(--bg-elev2)", border: "1px solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <Paperclip size={14} strokeWidth={1.5} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>attachment.pdf</div>
              <div style={{ fontSize: 11, color: "var(--fg3)" }}>248 KB · PDF</div>
            </div>
            <button className="btn btn-ghost btn-sm">Download</button>
          </div>
        )}

        <div className="ib-composer">
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <button className="ib-comp-tab" data-active={compTab === "reply" ? "true" : "false"} onClick={() => setCompTab("reply")}>
              <Reply size={12} strokeWidth={1.5} /> Reply
            </button>
            <button className="ib-comp-tab" data-active={compTab === "forward" ? "true" : "false"} onClick={() => setCompTab("forward")}>
              <Forward size={12} strokeWidth={1.5} /> Forward
            </button>
            <button className="ib-comp-tab" style={{ marginLeft: "auto" }}>
              <Sparkles size={12} strokeWidth={1.5} /> Draft with AI
            </button>
          </div>
          <textarea
            className="ib-textarea"
            placeholder="Write a reply…"
            rows={4}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
            <button className="sb-icon-btn" aria-label="Attach file"><Paperclip size={14} strokeWidth={1.5} /></button>
            <button className="sb-icon-btn" aria-label="Insert image"><Image size={14} strokeWidth={1.5} /></button>
            <button className="sb-icon-btn" aria-label="Emoji"><Smile size={14} strokeWidth={1.5} /></button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm">Save draft</button>
            <button className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Send <Send size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <aside className="ib-meta">
        <div className="ib-meta-section">
          <div className="ib-meta-label">Status</div>
          <div className="ib-meta-row">
            <StatusBadge s={m.status} />
            <button className="ib-meta-edit" aria-label="Change status"><ChevronDown size={12} strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Priority</div>
          <div className="ib-meta-row">
            <PrioPill p={m.priority} />
            <button className="ib-meta-edit" aria-label="Change priority"><ChevronDown size={12} strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Topic</div>
          <div className="ib-meta-row">
            <span className="tag" style={{ height: 22 }}>
              <span className="tag-dot" style={{ background: m.topicColor }} />{m.topic}
            </span>
            <button className="ib-meta-edit" aria-label="Change topic"><ChevronDown size={12} strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Due</div>
          <div className="ib-meta-row" style={{ fontSize: 13, color: "var(--fg2)", display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={12} strokeWidth={1.5} /> Not set
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Linked task</div>
          <button className="ib-meta-link">
            <Plus size={12} strokeWidth={1.5} />
            <span style={{ flex: 1, textAlign: "left" }}>Link a task…</span>
          </button>
        </div>

        <div className="ib-meta-section">
          <div className="ib-meta-label">Activity</div>
          <div className="ib-activity">
            <div className="ib-act">
              <Inbox size={11} strokeWidth={1.5} />
              <span>Received from {m.fromEmail}</span>
              <span className="ib-act-time">{m.time}</span>
            </div>
            {m.hasAi && (
              <div className="ib-act">
                <Sparkles size={11} strokeWidth={1.5} />
                <span>AI summary generated</span>
                <span className="ib-act-time">just now</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function InboxPage() {
  const [selected, setSelected] = useState("m1")
  const [folder, setFolder] = useState("inbox")
  const [filter, setFilter] = useState("all")

  const selectedMsg = MESSAGES.find(m => m.id === selected) ?? MESSAGES[0]

  return (
    <div className="ib-shell">
      <FolderRail active={folder} onSelect={setFolder} />
      <ListPanel selected={selected} onSelect={setSelected} filter={filter} onFilter={setFilter} />
      {selectedMsg && <TicketDetailPane m={selectedMsg} />}
    </div>
  )
}
