import { useState } from "react"
import { Plus, Play, Pencil, Trash2, ArrowRight, X, Info, Loader2, CheckCircle2 } from "lucide-react"
import {
  useInboxRulesQuery,
  useCreateInboxRuleMutation,
  useUpdateInboxRuleMutation,
  useDeleteInboxRuleMutation,
  useRunRulesOnExistingMutation,
  type InboxRule,
} from "@/api/inbox"

// ─── Types ────────────────────────────────────────────────

type ConditionRow = { field: string; op: string; value: string }
type ActionRow    = { type: string; value?: string; topic_id?: string }

const FIELDS  = ["from_email", "from_name", "subject", "body_text"]
const FIELD_LABELS: Record<string, string> = {
  from_email: "From (email)", from_name: "From (name)",
  subject: "Subject", body_text: "Body",
}
const OPS = ["contains", "not_contains", "equals", "not_equals", "starts_with", "ends_with", "regex"]
const OP_LABELS: Record<string, string> = {
  contains: "contains", not_contains: "does not contain",
  equals: "equals", not_equals: "not equals",
  starts_with: "starts with", ends_with: "ends with", regex: "matches regex",
}
const ACTION_TYPES = [
  { type: "set_status",   label: "Set status",    hasValue: true,  values: ["open", "waiting", "done", "snoozed"] },
  { type: "set_priority", label: "Set priority",  hasValue: true,  values: ["high", "med", "low"] },
  { type: "set_topic",    label: "Assign topic",  hasValue: false },
  { type: "archive",      label: "Archive",       hasValue: false },
  { type: "skip",         label: "Mark as done",  hasValue: false },
]

// ─── Toggle ───────────────────────────────────────────────

function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!active)}
      style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer",
        background: active ? "var(--accent)" : "var(--bg-elev2)", position: "relative", padding: 0 }}>
      <span style={{ position: "absolute", top: 2, left: active ? 16 : 2, width: 14, height: 14,
        borderRadius: "50%", background: "white", transition: "left 0.12s" }} />
    </button>
  )
}

// ─── Rule builder ─────────────────────────────────────────

function RuleBuilder({ initial, onSave, onCancel }: {
  initial?: InboxRule
  onSave: (name: string, conditions: Record<string, unknown>, actions: unknown[]) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [operator, setOperator] = useState<"AND" | "OR">(
    (initial?.conditions as any)?.operator ?? "AND"
  )
  const [conditions, setConditions] = useState<ConditionRow[]>(
    (initial?.conditions as any)?.rules ?? [{ field: "from_email", op: "contains", value: "" }]
  )
  const [actions, setActions] = useState<ActionRow[]>(
    (initial?.actions as any[]) ?? [{ type: "set_status", value: "done" }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function addCondition() {
    setConditions(c => [...c, { field: "from_email", op: "contains", value: "" }])
  }
  function removeCondition(i: number) {
    setConditions(c => c.filter((_, j) => j !== i))
  }
  function updateCondition(i: number, key: keyof ConditionRow, val: string) {
    setConditions(c => c.map((r, j) => j === i ? { ...r, [key]: val } : r))
  }
  function addAction() {
    setActions(a => [...a, { type: "skip" }])
  }
  function removeAction(i: number) {
    setActions(a => a.filter((_, j) => j !== i))
  }
  function updateAction(i: number, key: keyof ActionRow, val: string) {
    setActions(a => a.map((r, j) => j === i ? { ...r, [key]: val } : r))
  }

  async function handleSave() {
    if (!name.trim()) { setError("Add meg a szabály nevét."); return }
    if (conditions.some(c => !c.value)) { setError("Minden feltételhez adj meg értéket."); return }
    setSaving(true)
    setError("")
    try {
      await onSave(
        name,
        { operator, rules: conditions },
        actions,
      )
    } catch {
      setError("Mentés sikertelen.")
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{initial ? "Szabály szerkesztése" : "Új szabály"}</div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>Feltétel → művelet lánc. Minden beérkező emailre lefut.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Mégse</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {saving && <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />}
            Mentés
          </button>
        </div>
      </div>

      <input className="rb-input" style={{ width: "100%", maxWidth: 400 }}
        placeholder="Szabály neve…" value={name} onChange={e => setName(e.target.value)} />

      {/* Conditions */}
      <div className="rb-block">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div className="rb-block-label" style={{ margin: 0 }}>Ha</div>
          <select className="rb-pill" value={operator}
            onChange={e => setOperator(e.target.value as "AND" | "OR")}
            style={{ background: "none", border: "none", cursor: "pointer" }}>
            <option value="AND">minden feltétel teljesül (AND)</option>
            <option value="OR">bármelyik teljesül (OR)</option>
          </select>
        </div>
        {conditions.map((c, i) => (
          <div key={i} className="rb-line">
            <select className="rb-pill" value={c.field}
              onChange={e => updateCondition(i, "field", e.target.value)}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              {FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
            </select>
            <select className="rb-pill" value={c.op}
              onChange={e => updateCondition(i, "op", e.target.value)}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              {OPS.map(o => <option key={o} value={o}>{OP_LABELS[o]}</option>)}
            </select>
            <input className="rb-input" value={c.value} placeholder="érték…"
              onChange={e => updateCondition(i, "value", e.target.value)} />
            {conditions.length > 1 && (
              <button className="sb-icon-btn" onClick={() => removeCondition(i)}>
                <X size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
        ))}
        <button className="rb-add" onClick={addCondition}>
          <Plus size={11} strokeWidth={1.5} /> Feltétel hozzáadása
        </button>
      </div>

      {/* Actions */}
      <div className="rb-block">
        <div className="rb-block-label">Ekkor</div>
        {actions.map((a, i) => {
          const def = ACTION_TYPES.find(t => t.type === a.type) ?? ACTION_TYPES[0]
          return (
            <div key={i} className="rb-line">
              <select className="rb-pill" value={a.type}
                onChange={e => updateAction(i, "type", e.target.value)}
                style={{ background: "none", border: "none", cursor: "pointer" }}>
                {ACTION_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
              {def.hasValue && def.values && (
                <select className="rb-pill" value={a.value ?? ""}
                  onChange={e => updateAction(i, "value", e.target.value)}
                  style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {def.values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
              {actions.length > 1 && (
                <button className="sb-icon-btn" onClick={() => removeAction(i)}>
                  <X size={12} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )
        })}
        <button className="rb-add" onClick={addAction}>
          <Plus size={11} strokeWidth={1.5} /> Művelet hozzáadása
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={13} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ padding: 12, background: "var(--accent-soft)", borderRadius: 8, fontSize: 12, color: "var(--fg2)",
        display: "flex", alignItems: "center", gap: 10 }}>
        <Info size={13} strokeWidth={1.5} />
        <span>A szabályok csak az <strong>új emailekre</strong> futnak le automatikusan. Meglévőkre a "Futtatás most" gombbal alkalmazható.</span>
      </div>
    </div>
  )
}

// ─── Rule row ─────────────────────────────────────────────

function RuleRow({ rule, onEdit }: { rule: InboxRule; onEdit: () => void }) {
  const updateRule = useUpdateInboxRuleMutation()
  const deleteRule = useDeleteInboxRuleMutation()

  const conditions = (rule.conditions as any)?.rules ?? []
  const actions    = (rule.actions as any[]) ?? []

  return (
    <div style={{ padding: "16px 20px", display: "grid",
      gridTemplateColumns: "36px 1.5fr 2fr 80px 100px 72px",
      gap: 16, alignItems: "center", borderBottom: "1px solid var(--border)" }}>

      <div style={{ display: "grid", placeItems: "center" }}>
        <Toggle active={rule.active}
          onChange={v => updateRule.mutate({ id: rule.id, active: v })} />
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg1)" }}>{rule.name}</div>
        <div style={{ fontSize: 11, color: "var(--fg3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
          {conditions.map((c: ConditionRow, i: number) => (
            <span key={i}>{i > 0 ? ` ${(rule.conditions as any).operator} ` : ""}{FIELD_LABELS[c.field] ?? c.field} {OP_LABELS[c.op] ?? c.op} "{c.value}"</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {actions.map((a: ActionRow, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg2)" }}>
            <ArrowRight size={11} strokeWidth={1.5} />
            <span>{ACTION_TYPES.find(t => t.type === a.type)?.label ?? a.type}
              {a.value ? `: ${a.value}` : ""}
            </span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13,
        color: "var(--fg1)", fontVariantNumeric: "tabular-nums" }}>
        {rule.run_count}
      </div>

      <div>
        <span style={{ height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500,
          display: "inline-flex", alignItems: "center", gap: 5,
          color: rule.active ? "var(--success)" : "var(--fg3)",
          background: rule.active ? "rgb(52 211 153 / 0.12)" : "var(--bg-elev2)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%",
            background: rule.active ? "var(--success)" : "var(--fg3)" }} />
          {rule.active ? "Aktív" : "Szünetel"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <button className="sb-icon-btn" aria-label="Szerkesztés" onClick={onEdit}>
          <Pencil size={13} strokeWidth={1.5} />
        </button>
        <button className="sb-icon-btn" aria-label="Törlés"
          onClick={() => { if (confirm(`Törlöd: "${rule.name}"?`)) deleteRule.mutate(rule.id) }}>
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function InboxRulesPage() {
  const rulesQuery  = useInboxRulesQuery()
  const createRule  = useCreateInboxRuleMutation()
  const updateRule  = useUpdateInboxRuleMutation()
  const runExisting = useRunRulesOnExistingMutation()

  const [showBuilder, setShowBuilder] = useState(false)
  const [editing, setEditing]         = useState<InboxRule | null>(null)
  const [runResult, setRunResult]     = useState<{ processed: number; changed: number } | null>(null)

  const rules = rulesQuery.data ?? []

  async function handleSave(name: string, conditions: Record<string, unknown>, actions: unknown[]) {
    if (editing) {
      await updateRule.mutateAsync({ id: editing.id, name, conditions, actions })
      setEditing(null)
    } else {
      await createRule.mutateAsync({ name, conditions, actions, position: rules.length, active: true })
      setShowBuilder(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="page-head">
        <div>
          <h1>Inbox szabályok</h1>
          <div className="sub">
            {rules.length} szabály · {rules.reduce((s, r) => s + r.run_count, 0)} email feldolgozva
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={runExisting.isPending}
            onClick={() => { setRunResult(null); runExisting.mutate(undefined, { onSuccess: (r) => setRunResult(r) }) }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {runExisting.isPending
              ? <><Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> Futtatás…</>
              : <><Play size={14} strokeWidth={1.5} /> Futtatás meglévőkre</>}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowBuilder(true) }}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} strokeWidth={1.5} /> Új szabály
          </button>
        </div>
      </div>

      {runResult && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, fontSize: 13,
          background: runResult.changed > 0 ? "rgb(52 211 153 / 0.1)" : "var(--bg-elev2)",
          border: `1px solid ${runResult.changed > 0 ? "rgb(52 211 153 / 0.3)" : "var(--border)"}`,
          color: "var(--fg2)", display: "flex", alignItems: "center", gap: 10,
        }}>
          <CheckCircle2 size={15} strokeWidth={1.5} style={{ color: runResult.changed > 0 ? "var(--success)" : "var(--fg3)", flexShrink: 0 }} />
          <span>
            <strong style={{ color: "var(--fg1)" }}>{runResult.processed}</strong> ticket vizsgálva
            {" · "}
            <strong style={{ color: "var(--fg1)" }}>{runResult.changed}</strong> módosítva
            {runResult.processed === 0 && " — még nincs email a rendszerben"}
            {runResult.processed > 0 && runResult.changed === 0 && " — egy sem illeszkedett a szabályokra"}
          </span>
          <button className="sb-icon-btn" style={{ marginLeft: "auto" }} onClick={() => setRunResult(null)}>
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {rulesQuery.isLoading && (
        <div style={{ textAlign: "center", color: "var(--fg3)", fontSize: 13, padding: 32 }}>
          <Loader2 size={16} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> Betöltés…
        </div>
      )}

      {!rulesQuery.isLoading && rules.length === 0 && !showBuilder && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--fg3)" }}>
          <div style={{ marginBottom: 12, fontSize: 13 }}>Még nincs szabály. Hozz létre egyet hogy automatikusan rendezze az emailjeidet.</div>
          <button className="btn btn-primary" onClick={() => setShowBuilder(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} strokeWidth={1.5} /> Első szabály
          </button>
        </div>
      )}

      {(showBuilder && !editing) && (
        <RuleBuilder onSave={handleSave} onCancel={() => setShowBuilder(false)} />
      )}

      {editing && (
        <RuleBuilder initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {rules.length > 0 && (
        <div className="card p-0">
          <div style={{ padding: "12px 20px", display: "grid",
            gridTemplateColumns: "36px 1.5fr 2fr 80px 100px 72px",
            gap: 16, fontSize: 11, fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.04em", color: "var(--fg3)", borderBottom: "1px solid var(--border)" }}>
            <div />
            <div>Szabály</div>
            <div>Ha → ekkor</div>
            <div style={{ textAlign: "right" }}>Futás</div>
            <div>Állapot</div>
            <div />
          </div>
          {rules.map((r) => (
            <RuleRow key={r.id} rule={r}
              onEdit={() => { setShowBuilder(false); setEditing(r) }} />
          ))}
        </div>
      )}
    </div>
  )
}
