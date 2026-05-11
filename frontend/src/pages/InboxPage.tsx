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
  Loader2,
} from "lucide-react"
import { useTicketsQuery, useTicketMessagesQuery, useUpdateTicketMutation, type Ticket } from "@/api/inbox"
import { useEmailAccountsQuery, useSyncEmailAccountMutation } from "@/api/emailAccounts"
import { AddEmailAccountModal } from "@/components/inbox/AddEmailAccountModal"
import { useNavigate } from "react-router-dom"

// ─── Static folder config ─────────────────────────────────

const FOLDERS = [
  { id: "all",      label: "All",              icon: Inbox,        status: undefined },
  { id: "open",     label: "Open",             icon: AlertCircle,  status: "open" },
  { id: "waiting",  label: "Waiting on reply", icon: Clock,        status: "waiting" },
  { id: "snoozed",  label: "Snoozed",          icon: AlarmClock,   status: "snoozed" },
  { id: "done",     label: "Done",             icon: CheckCircle2, status: "done" },
  { id: "archived", label: "Archive",          icon: Archive,      status: "archived" },
]

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map(w => w[0]).slice(0, 2).join("")
  return email.slice(0, 2).toUpperCase()
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ─── Sub-components ───────────────────────────────────────

function PrioPill({ p }: { p: string }) {
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    high: { label: "High", fg: "var(--danger)", bg: "rgb(251 113 133 / 0.12)" },
    med:  { label: "Med",  fg: "var(--warn)",   bg: "rgb(251 191 36 / 0.12)" },
    low:  { label: "Low",  fg: "var(--fg3)",    bg: "var(--bg-elev2)" },
  }
  const { label, fg, bg } = map[p] ?? map.med
  return (
    <span style={{ height: 18, padding: "0 6px", borderRadius: 4, fontSize: 11, fontWeight: 500, color: fg, background: bg, display: "inline-flex", alignItems: "center" }}>
      {label}
    </span>
  )
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { label: string; fg: string; bg: string }> = {
    open:     { label: "Open",     fg: "var(--indigo-300)", bg: "var(--accent-soft)" },
    waiting:  { label: "Waiting",  fg: "var(--warn)",       bg: "rgb(251 191 36 / 0.12)" },
    done:     { label: "Done",     fg: "var(--success)",    bg: "rgb(52 211 153 / 0.12)" },
    snoozed:  { label: "Snoozed",  fg: "var(--fg3)",        bg: "var(--bg-elev2)" },
    archived: { label: "Archived", fg: "var(--fg3)",        bg: "var(--bg-elev2)" },
  }
  const { label, fg, bg } = map[s] ?? map.open
  return (
    <span style={{ height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, color: fg, background: bg, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg }} />
      {label}
    </span>
  )
}

function MessageRow({ t, active, onClick }: { t: Ticket; active: boolean; onClick: () => void }) {
  return (
    <div
      className="ib-row"
      data-active={active ? "true" : "false"}
      data-unread={t.unread ? "true" : "false"}
      onClick={onClick}
    >
      <div className="ib-row-lead">
        <span className="ib-unread-dot" style={{ opacity: t.unread ? 1 : 0 }} />
        <div className="ib-avatar">{initials(t.from_name, t.from_email)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ib-row-from" style={{ fontWeight: t.unread ? 600 : 500 }}>
            {t.from_name || t.from_email}
          </span>
          <PrioPill p={t.priority} />
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>
            {relativeTime(t.last_message_at)}
          </span>
        </div>
        <div className="ib-row-subject" style={{ fontWeight: t.unread ? 600 : 500 }}>{t.subject}</div>
        {t.ai_summary && (
          <div style={{ fontSize: 12, color: "var(--fg3)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {t.ai_summary}
          </div>
        )}
      </div>
    </div>
  )
}

function FolderRail({
  onSelect, folder,
}: {
  onSelect: (id: string) => void
  folder: string
}) {
  const accountsQuery = useEmailAccountsQuery()
  const syncMutation = useSyncEmailAccountMutation()
  const [showAddModal, setShowAddModal] = useState(false)
  const navigate = useNavigate()

  const accounts = accountsQuery.data ?? []

  return (
    <>
      <aside className="ib-rail">
        <div className="ib-rail-head">
          <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>Mailboxes</div>
          <button className="sb-icon-btn" aria-label="Settings" onClick={() => navigate("/inbox/settings")}>
            <Settings2 size={14} strokeWidth={1.5} />
          </button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {FOLDERS.map(f => (
            <button
              key={f.id}
              className="ib-rail-item"
              data-active={folder === f.id ? "true" : "false"}
              onClick={() => onSelect(f.id)}
            >
              <f.icon size={15} strokeWidth={1.5} />
              <span style={{ flex: 1, textAlign: "left" }}>{f.label}</span>
            </button>
          ))}
        </nav>

        <div className="ib-rail-section">
          <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500, padding: "0 8px 6px" }}>
            Rules
          </div>
          <button className="ib-rail-link" onClick={() => navigate("/inbox/rules")}>
            <SlidersHorizontal size={12} strokeWidth={1.5} /> Manage rules…
          </button>
        </div>

        <div className="ib-rail-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 6px" }}>
            <div style={{ fontSize: 12, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500 }}>
              Accounts
            </div>
            <button className="sb-icon-btn" aria-label="Add account" onClick={() => setShowAddModal(true)}>
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>

          {accounts.length === 0 ? (
            <button
              className="ib-rail-link"
              onClick={() => setShowAddModal(true)}
              style={{ padding: "8px 10px", fontSize: 12, color: "var(--fg3)" }}
            >
              <Plus size={12} strokeWidth={1.5} /> Add an email account
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {accounts.map(acc => (
                <div key={acc.id} className="ib-acc-row">
                  <span className="ib-acc-dot" style={{ background: acc.active ? "var(--success)" : "var(--fg3)" }} />
                  <span style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {acc.display_name || acc.email}
                  </span>
                  <button
                    className="sb-icon-btn"
                    aria-label="Sync now"
                    title="Sync now"
                    onClick={() => syncMutation.mutate(acc.id)}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending
                      ? <Loader2 size={11} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
                      : <RefreshCw size={11} strokeWidth={1.5} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {showAddModal && <AddEmailAccountModal onClose={() => setShowAddModal(false)} />}
    </>
  )
}

function ListPanel({
  tickets,
  selected,
  onSelect,
  filter,
  onFilter,
  isLoading,
}: {
  tickets: Ticket[]
  selected: string | null
  onSelect: (id: string) => void
  filter: string
  onFilter: (f: string) => void
  isLoading: boolean
}) {
  const QUICK_FILTERS = [
    { id: "all",     label: "All" },
    { id: "open",    label: "Open" },
    { id: "waiting", label: "Waiting" },
    { id: "high",    label: "High priority" },
  ]

  const filtered = tickets.filter(t => {
    if (filter === "high") return t.priority === "high"
    return true
  })

  return (
    <section className="ib-list">
      <div className="ib-list-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Inbox</h2>
          <span style={{ fontSize: 12, color: "var(--fg3)" }}>
            {tickets.length} message{tickets.length === 1 ? "" : "s"}
            {tickets.filter(t => t.unread).length > 0 && (
              <> · {tickets.filter(t => t.unread).length} unread</>
            )}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm"><ArrowDownUp size={12} strokeWidth={1.5} /> Newest</button>
          <button className="btn btn-ghost btn-icon" aria-label="Filters"><Filter size={14} strokeWidth={1.5} /></button>
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
            {f.label}
          </button>
        ))}
      </div>
      <div className="ib-list-body">
        {isLoading && (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fg3)" }}>
            <Loader2 size={16} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> Loading…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--fg3)" }}>
            No messages here yet.
          </div>
        )}
        {filtered.map(t => (
          <MessageRow key={t.id} t={t} active={selected === t.id} onClick={() => onSelect(t.id)} />
        ))}
      </div>
    </section>
  )
}

function TicketDetailPane({ ticket }: { ticket: Ticket }) {
  const [replyText, setReplyText] = useState("")
  const [compTab, setCompTab] = useState<"reply" | "forward">("reply")
  const messagesQuery = useTicketMessagesQuery(ticket.id)
  const updateTicket = useUpdateTicketMutation()

  const messages = messagesQuery.data ?? []

  function markDone() {
    updateTicket.mutate({ id: ticket.id, status: "done", unread: false })
  }
  function markArchived() {
    updateTicket.mutate({ id: ticket.id, status: "archived", unread: false })
  }

  return (
    <section className="ib-detail">
      <header className="ib-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge s={ticket.status} />
          <PrioPill p={ticket.priority} />
          <span style={{ fontSize: 12, color: "var(--fg3)" }}>· {relativeTime(ticket.last_message_at)}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-ghost btn-sm"><Reply size={12} strokeWidth={1.5} /> Reply</button>
          <button className="btn btn-ghost btn-sm" onClick={markDone}><Check size={12} strokeWidth={1.5} /> Done</button>
          <button className="btn btn-ghost btn-sm" onClick={markArchived}><Archive size={12} strokeWidth={1.5} /> Archive</button>
          <button className="btn btn-ghost btn-sm"><AlarmClock size={12} strokeWidth={1.5} /> Snooze</button>
          <button className="btn btn-ghost btn-icon" aria-label="More"><MoreHorizontal size={14} strokeWidth={1.5} /></button>
        </div>
      </header>

      <div className="ib-detail-scroll">
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.25, marginBottom: 14 }}>
          {ticket.subject}
        </h1>

        {ticket.ai_summary && (
          <div className="ib-ai">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Sparkles size={14} strokeWidth={1.5} />
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--indigo-300)" }}>AI summary</span>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", height: 22 }}>
                <RefreshCw size={10} strokeWidth={1.5} /> Regenerate
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg2)", lineHeight: 1.55 }}>{ticket.ai_summary}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="ib-ai-action"><Plus size={11} strokeWidth={1.5} /> Create task</button>
              <button className="ib-ai-action"><Calendar size={11} strokeWidth={1.5} /> Set due date</button>
              <button className="ib-ai-action"><Link2 size={11} strokeWidth={1.5} /> Link to topic</button>
            </div>
          </div>
        )}

        {/* Messages */}
        {messagesQuery.isLoading && (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--fg3)" }}>Loading messages…</div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id}>
            <div className="ib-from">
              <div className="ib-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                {initials(msg.from_name, msg.from_email || "")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {msg.from_name || msg.from_email}{" "}
                  {msg.from_email && msg.from_name && (
                    <span style={{ color: "var(--fg3)", fontWeight: 400 }}>&lt;{msg.from_email}&gt;</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg3)" }}>{relativeTime(msg.sent_at)}</div>
              </div>
              <button className="btn btn-ghost btn-icon" aria-label="Open"><ExternalLink size={14} strokeWidth={1.5} /></button>
            </div>
            <div className="ib-body">
              {msg.body_text
                ? msg.body_text.split("\n").map((line, j) => <p key={j}>{line || <br />}</p>)
                : <em style={{ color: "var(--fg3)" }}>No text content</em>}
            </div>
            {i < messages.length - 1 && (
              <div style={{ borderBottom: "1px solid var(--border)", margin: "16px 0" }} />
            )}
          </div>
        ))}

        {/* Composer */}
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
            <button className="sb-icon-btn" aria-label="Attach"><Paperclip size={14} strokeWidth={1.5} /></button>
            <button className="sb-icon-btn" aria-label="Image"><Image size={14} strokeWidth={1.5} /></button>
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
            <StatusBadge s={ticket.status} />
            <button className="ib-meta-edit"><ChevronDown size={12} strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Priority</div>
          <div className="ib-meta-row">
            <PrioPill p={ticket.priority} />
            <button className="ib-meta-edit"><ChevronDown size={12} strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">From</div>
          <div style={{ fontSize: 13, color: "var(--fg2)" }}>
            <div style={{ fontWeight: 500 }}>{ticket.from_name || "—"}</div>
            <div style={{ fontSize: 11, color: "var(--fg3)" }}>{ticket.from_email}</div>
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Due</div>
          <div className="ib-meta-row" style={{ fontSize: 13, color: "var(--fg2)", display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={12} strokeWidth={1.5} />
            {ticket.due_at ? relativeTime(ticket.due_at) : "Not set"}
          </div>
        </div>
        <div className="ib-meta-section">
          <div className="ib-meta-label">Linked task</div>
          <button className="ib-meta-link">
            <Plus size={12} strokeWidth={1.5} />
            <span style={{ flex: 1, textAlign: "left" }}>Link a task…</span>
          </button>
        </div>
      </aside>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function InboxPage() {
  const [folder, setFolder] = useState("all")
  const [filter, setFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const status = FOLDERS.find(f => f.id === folder)?.status
  const ticketsQuery = useTicketsQuery(status ? { status } : undefined)
  const tickets = ticketsQuery.data ?? []

  const selectedTicket = tickets.find(t => t.id === selectedId) ?? tickets[0] ?? null

  return (
    <div className="ib-shell">
      <FolderRail onSelect={setFolder} folder={folder} />
      <ListPanel
        tickets={tickets}
        selected={selectedId ?? selectedTicket?.id ?? null}
        onSelect={setSelectedId}
        filter={filter}
        onFilter={setFilter}
        isLoading={ticketsQuery.isLoading}
      />
      {selectedTicket
        ? <TicketDetailPane ticket={selectedTicket} />
        : (
          <section className="ib-detail" style={{ display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center", color: "var(--fg3)", fontSize: 13 }}>
              <Inbox size={32} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div>Select a message to read</div>
            </div>
          </section>
        )}
    </div>
  )
}
