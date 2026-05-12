import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft, ChevronDown, Plus, Trash2, RefreshCw, Wifi, Loader2,
  CheckCircle2, XCircle, Calendar, Eye, EyeOff,
} from "lucide-react"
import { TopicPicker } from "@/components/ui/TopicPicker"
import {
  useCalendarAccountsQuery, useAddCalendarAccountMutation,
  useDeleteCalendarAccountMutation, useTestCalendarAccountMutation,
  useSyncCalendarAccountMutation, useCalendarsQuery, useUpdateCalendarMutation,
  type CalendarAccount, type CalendarItem,
} from "@/api/calendar"

// ─── Provider presets ─────────────────────────────────────

const PRESETS: Record<string, { label: string; caldav_url: string; hint: string }> = {
  google: {
    label: "Google Calendar",
    caldav_url: "https://calendar.google.com/calendar/dav/{email}/events",
    hint: "Google fiók → Biztonság → 2-lépéses hitelesítés → App jelszavak → DigiBrain",
  },
  apple: {
    label: "Apple / iCloud",
    caldav_url: "https://caldav.icloud.com",
    hint: "appleid.apple.com → Biztonság → App-specifikus jelszavak",
  },
  outlook: {
    label: "Outlook",
    caldav_url: "https://outlook.office365.com/owa/{email}/calendar",
    hint: "account.microsoft.com → Biztonság → App jelszavak",
  },
  custom: { label: "Egyedi CalDAV", caldav_url: "", hint: "" },
}

// ─── Add account form ─────────────────────────────────────

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [preset, setPreset]   = useState("google")
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [name, setName]       = useState("")
  const [customUrl, setCustomUrl] = useState("")
  const [error, setError]     = useState("")

  const add = useAddCalendarAccountMutation()
  const cfg = PRESETS[preset]

  const caldavUrl = preset === "google"
    ? cfg.caldav_url.replace("{email}", email)
    : preset === "outlook"
    ? cfg.caldav_url.replace("{email}", email)
    : preset === "custom"
    ? customUrl
    : cfg.caldav_url

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password || !caldavUrl) { setError("Töltsd ki az összes kötelező mezőt."); return }
    try {
      await add.mutateAsync({
        provider: preset,
        display_name: name || undefined,
        caldav_url: caldavUrl,
        username: email,
        password,
      })
      onDone()
    } catch {
      setError("Nem sikerült menteni. Ellenőrizd az adatokat.")
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card-header" style={{ marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Új naptár fiók</div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>CalDAV szinkronizáció — jelszó titkosítva tárolódik</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Mégse</button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(PRESETS).map(([key, p]) => (
          <button key={key} type="button" className="ib-chip"
            data-active={preset === key ? "true" : "false"}
            onClick={() => setPreset(key)}>{p.label}</button>
        ))}
      </div>

      {cfg.hint && (
        <div style={{ fontSize: 11, color: "var(--fg3)", lineHeight: 1.5 }}>{cfg.hint}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
            Email cím <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input type="email" className="rb-input" style={{ width: "100%" }}
            placeholder="te@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
            App jelszó <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input type={showPass ? "text" : "password"} className="rb-input" style={{ flex: 1 }}
              placeholder="App jelszó" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="sb-icon-btn" onClick={() => setShowPass(v => !v)}>
              {showPass ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>Megjelenő név (opcionális)</label>
          <input className="rb-input" style={{ width: "100%" }} placeholder="pl. Munkahelyi naptár"
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        {preset === "custom" && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
              CalDAV URL <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input className="rb-input" style={{ width: "100%" }}
              placeholder="https://caldav.example.com/..." value={customUrl}
              onChange={e => setCustomUrl(e.target.value)} />
          </div>
        )}
      </div>

      {caldavUrl && (
        <div style={{ fontSize: 11, color: "var(--fg3)", padding: "8px 10px", background: "var(--bg-elev2)", borderRadius: 6 }}>
          URL: <strong style={{ color: "var(--fg2)", fontFamily: "var(--font-mono)" }}>{caldavUrl}</strong>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
          <XCircle size={13} strokeWidth={1.5} /> {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary" disabled={add.isPending}
          style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {add.isPending
            ? <><Loader2 size={13} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> Mentés…</>
            : <><CheckCircle2 size={13} strokeWidth={1.5} /> Fiók hozzáadása</>}
        </button>
      </div>
    </form>
  )
}

// ─── Calendar row (topic assignment) ─────────────────────

function CalendarRow({ cal }: { cal: CalendarItem }) {
  const updateCal = useUpdateCalendarMutation()

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: cal.color ?? "var(--fg3)", flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--fg1)" }}>{cal.name}</span>
      <TopicPicker
        value={cal.topic_id}
        onChange={id => updateCal.mutate({ id: cal.id, topic_id: id })}
        placeholder="Topic nincs rendelve"
        size="sm"
      />
      <button
        className="sb-icon-btn"
        style={{ color: cal.active ? "var(--success)" : "var(--fg3)" }}
        title={cal.active ? "Aktív — kattints a szüneteltetéshez" : "Szüneteltetve — kattints az aktiváláshoz"}
        onClick={() => updateCal.mutate({ id: cal.id, active: !cal.active })}
      >
        <Wifi size={13} strokeWidth={1.5} />
      </button>
    </div>
  )
}

// ─── Account row ─────────────────────────────────────────

function AccountRow({ acc }: { acc: CalendarAccount }) {
  const deleteAcc  = useDeleteCalendarAccountMutation()
  const testAcc    = useTestCalendarAccountMutation()
  const syncAcc    = useSyncCalendarAccountMutation()
  const calsQuery  = useCalendarsQuery(acc.id)

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [syncCount, setSyncCount]   = useState<number | null>(null)
  const [expanded, setExpanded]     = useState(true)

  const cals = calsQuery.data ?? []

  async function handleTest() {
    setTestResult(null)
    const r = await testAcc.mutateAsync(acc.id)
    setTestResult(r)
    setTimeout(() => setTestResult(null), 6000)
  }

  async function handleSync() {
    setSyncCount(null)
    const r = await syncAcc.mutateAsync(acc.id)
    setSyncCount(r.synced)
    setTimeout(() => setSyncCount(null), 4000)
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="ib-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
          {(acc.display_name || acc.username).slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{acc.display_name || acc.username}</div>
          <div style={{ fontSize: 11, color: "var(--fg3)" }}>{acc.username} · {acc.provider}</div>
          {testResult && (
            <div style={{ fontSize: 11, marginTop: 3, color: testResult.ok ? "var(--success)" : "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}>
              {testResult.ok ? <CheckCircle2 size={11} strokeWidth={1.5} /> : <XCircle size={11} strokeWidth={1.5} />}
              {testResult.message}
            </div>
          )}
          {syncCount !== null && (
            <div style={{ fontSize: 11, marginTop: 3, color: "var(--success)" }}>
              ✓ {syncCount} esemény szinkronizálva
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testAcc.isPending}
            style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {testAcc.isPending ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={12} strokeWidth={1.5} />}
            Teszt
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncAcc.isPending}
            style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {syncAcc.isPending ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} strokeWidth={1.5} />}
            Sync
          </button>
          <button className="sb-icon-btn" onClick={() => setExpanded(v => !v)}>
            <ChevronDown size={13} strokeWidth={1.5} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          <button className="sb-icon-btn" aria-label="Törlés"
            onClick={() => { if (confirm(`Törlöd: ${acc.display_name || acc.username}?`)) deleteAcc.mutate(acc.id) }}>
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Calendars */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Naptárak — Topic hozzárendelés
          </div>
          {calsQuery.isLoading && (
            <div style={{ fontSize: 12, color: "var(--fg3)" }}>
              <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> Betöltés…
            </div>
          )}
          {cals.length === 0 && !calsQuery.isLoading && (
            <div style={{ fontSize: 12, color: "var(--fg3)" }}>
              Még nincs szinkronizálva — nyomd meg a Sync gombot.
            </div>
          )}
          {cals.map(cal => <CalendarRow key={cal.id} cal={cal} />)}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function CalendarSettingsPage() {
  const navigate = useNavigate()
  const accountsQuery = useCalendarAccountsQuery()
  const [showAdd, setShowAdd] = useState(false)

  const accounts = accountsQuery.data ?? []

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6">
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="sb-icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={16} strokeWidth={1.5} /></button>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={20} strokeWidth={1.5} /> Naptár beállítások
            </h1>
            <div className="sub">CalDAV szinkronizáció — Google, Apple, Outlook</div>
          </div>
        </div>
        {!showAdd && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} strokeWidth={1.5} /> Fiók hozzáadása
          </button>
        )}
      </div>

      {showAdd && <AddAccountForm onDone={() => setShowAdd(false)} />}

      {accountsQuery.isLoading && (
        <div style={{ textAlign: "center", color: "var(--fg3)", padding: 32 }}>
          <Loader2 size={16} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", display: "inline" }} />
        </div>
      )}

      {!accountsQuery.isLoading && accounts.length === 0 && !showAdd && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--fg3)" }}>
          <Calendar size={32} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 13, marginBottom: 12 }}>Még nincs naptár fiók hozzáadva.</div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} strokeWidth={1.5} /> Első fiók hozzáadása
          </button>
        </div>
      )}

      {accounts.map(acc => <AccountRow key={acc.id} acc={acc} />)}

      {accounts.length > 0 && (
        <div className="card" style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--fg1)" }}>Szinkronizáció:</strong> 5 percenként automatikus.
          A naptárakhoz topic-ot rendelve az események megjelennek a topic oldalán és a dashboard widgeten is.
          Az "Log as time entry" gombbal befejezett eseményeket átkonvertálhatsz time tracking bejegyzéssé.
        </div>
      )}
    </div>
  )
}
