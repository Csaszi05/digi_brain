import { useState } from "react"
import { Plus, Play, Pencil, MoreHorizontal, ArrowRight, X, Info } from "lucide-react"

type Rule = {
  name: string
  when: string
  then: string[]
  active: boolean
  runs: number
}

const MOCK_RULES: Rule[] = [
  { name: "From Anna → Project Atlas", when: "From contains anna@atlas.io", then: ["Assign topic: Project Atlas", "Set priority: High"], active: true, runs: 47 },
  { name: "GitHub notifications", when: "From = noreply@github.com", then: ["Assign topic: Project Atlas", "Set priority: Low", "Auto-archive after 7 days"], active: true, runs: 312 },
  { name: "Telekom invoices", when: "From contains @telekom.hu AND subject contains 'számla'", then: ["Assign topic: Finance", "Set priority: High", "Create task: Pay invoice"], active: true, runs: 12 },
  { name: "University newsletters", when: "From ends with @uni-corvinus.hu AND subject contains 'hírlevél'", then: ["Auto-archive"], active: false, runs: 8 },
  { name: "Calendar invites → AI summary", when: "Has .ics attachment", then: ["Generate AI summary", "Create task with due date"], active: true, runs: 23 },
]

type Condition = { field: string; op: string; value: string }
type Action = { action: string }

const FIELD_OPTIONS = ["From", "To", "Subject", "Body", "Has attachment"]
const OP_OPTIONS = ["contains", "equals", "starts with", "ends with", "does not contain"]
const ACTION_OPTIONS = ["Assign topic", "Set priority: High", "Set priority: Med", "Set priority: Low", "Generate AI summary", "Create task", "Auto-archive", "Mark as done"]

function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={active ? "Disable" : "Enable"}
      onClick={() => onChange(!active)}
      style={{
        width: 32, height: 18, borderRadius: 9,
        background: active ? "var(--accent)" : "var(--bg-elev2)",
        border: "none", cursor: "pointer", position: "relative", transition: "background 0.15s",
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: active ? 16 : 2, width: 14, height: 14,
        borderRadius: "50%", background: "white", transition: "left 0.15s",
      }} />
    </button>
  )
}

function RuleBuilder({ onCancel }: { onCancel: () => void }) {
  const [name, setName] = useState("")
  const [conditions, setConditions] = useState<Condition[]>([{ field: "From", op: "contains", value: "" }])
  const [actions, setActions] = useState<Action[]>([{ action: "Assign topic" }])

  function addCondition() {
    setConditions(c => [...c, { field: "From", op: "contains", value: "" }])
  }
  function removeCondition(i: number) {
    setConditions(c => c.filter((_, j) => j !== i))
  }
  function updateCondition(i: number, key: keyof Condition, val: string) {
    setConditions(c => c.map((item, j) => j === i ? { ...item, [key]: val } : item))
  }
  function addAction() {
    setActions(a => [...a, { action: "Generate AI summary" }])
  }
  function removeAction(i: number) {
    setActions(a => a.filter((_, j) => j !== i))
  }
  function updateAction(i: number, val: string) {
    setActions(a => a.map((item, j) => j === i ? { action: val } : item))
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>New rule</div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>Build a condition → action chain. Runs on every incoming email.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm">Save rule</button>
        </div>
      </div>

      <input
        className="rb-input"
        placeholder="Rule name…"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: "100%", maxWidth: 360 }}
      />

      <div className="rb-block">
        <div className="rb-block-label">When</div>
        {conditions.map((c, i) => (
          <div key={i} className="rb-line">
            {i > 0 && <button className="rb-conjunction">AND</button>}
            <select className="rb-pill" value={c.field} onChange={e => updateCondition(i, "field", e.target.value)}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              {FIELD_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <select className="rb-pill" value={c.op} onChange={e => updateCondition(i, "op", e.target.value)}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              {OP_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <input className="rb-input" value={c.value} onChange={e => updateCondition(i, "value", e.target.value)} placeholder="value…" />
            {conditions.length > 1 && (
              <button className="sb-icon-btn" onClick={() => removeCondition(i)}><X size={12} strokeWidth={1.5} /></button>
            )}
          </div>
        ))}
        <button className="rb-add" onClick={addCondition}><Plus size={11} strokeWidth={1.5} /> Add condition</button>
      </div>

      <div className="rb-block">
        <div className="rb-block-label">Then</div>
        {actions.map((a, i) => (
          <div key={i} className="rb-line">
            <select className="rb-pill" value={a.action} onChange={e => updateAction(i, e.target.value)}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              {ACTION_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            {actions.length > 1 && (
              <button className="sb-icon-btn" onClick={() => removeAction(i)}><X size={12} strokeWidth={1.5} /></button>
            )}
          </div>
        ))}
        <button className="rb-add" onClick={addAction}><Plus size={11} strokeWidth={1.5} /> Add action</button>
      </div>

      <div style={{ padding: 12, background: "var(--accent-soft)", borderRadius: 8, fontSize: 12, color: "var(--fg2)", display: "flex", alignItems: "center", gap: 10 }}>
        <Info size={13} strokeWidth={1.5} />
        <span>Fill in conditions and values to see how many past emails this rule would match.</span>
      </div>
    </div>
  )
}

export default function InboxRulesPage() {
  const [rules, setRules] = useState<Rule[]>(MOCK_RULES)
  const [showBuilder, setShowBuilder] = useState(false)

  function toggleRule(i: number, val: boolean) {
    setRules(r => r.map((item, j) => j === i ? { ...item, active: val } : item))
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="page-head">
        <div>
          <h1>Inbox rules</h1>
          <div className="sub">{rules.length} rules · {rules.reduce((s, r) => s + r.runs, 0)} emails processed</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Play size={14} strokeWidth={1.5} /> Run on existing
          </button>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowBuilder(true)}>
            <Plus size={14} strokeWidth={1.5} /> New rule
          </button>
        </div>
      </div>

      <div className="card p-0">
        <div style={{
          padding: "12px 20px",
          display: "grid",
          gridTemplateColumns: "36px 1.5fr 2fr 80px 100px 60px",
          gap: 16,
          fontSize: 11,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--fg3)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div />
          <div>Rule</div>
          <div>When → then</div>
          <div style={{ textAlign: "right" }}>Runs</div>
          <div>Status</div>
          <div />
        </div>

        {rules.map((r, i) => (
          <div
            key={i}
            style={{
              padding: "16px 20px",
              display: "grid",
              gridTemplateColumns: "36px 1.5fr 2fr 80px 100px 60px",
              gap: 16,
              alignItems: "center",
              borderBottom: i < rules.length - 1 ? "1px solid var(--border)" : undefined,
            }}
          >
            <div style={{ display: "grid", placeItems: "center" }}>
              <Toggle active={r.active} onChange={v => toggleRule(i, v)} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg1)" }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{r.when}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {r.then.map((t, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg2)" }}>
                  <ArrowRight size={11} strokeWidth={1.5} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg1)", fontVariantNumeric: "tabular-nums" }}>
              {r.runs}
            </div>
            <div>
              <span style={{
                height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 5,
                color: r.active ? "var(--success)" : "var(--fg3)",
                background: r.active ? "rgb(52 211 153 / 0.12)" : "var(--bg-elev2)",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: r.active ? "var(--success)" : "var(--fg3)" }} />
                {r.active ? "Active" : "Paused"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <button className="sb-icon-btn" aria-label="Edit rule"><Pencil size={13} strokeWidth={1.5} /></button>
              <button className="sb-icon-btn" aria-label="More options"><MoreHorizontal size={13} strokeWidth={1.5} /></button>
            </div>
          </div>
        ))}
      </div>

      {showBuilder && (
        <RuleBuilder onCancel={() => setShowBuilder(false)} />
      )}
    </div>
  )
}
