import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus, Trash2, RefreshCw, CheckCircle2, XCircle,
  Loader2, ChevronLeft, Wifi, WifiOff, Settings2,
} from "lucide-react"
import {
  useEmailAccountsQuery,
  useAddEmailAccountMutation,
  useDeleteEmailAccountMutation,
  useTestEmailAccountMutation,
  useSyncEmailAccountMutation,
  type EmailAccount,
} from "@/api/emailAccounts"
import { Eye, EyeOff } from "lucide-react"

// ─── Presets ─────────────────────────────────────────────

const PRESETS: Record<string, { imap_host: string; imap_port: number; label: string; hint?: string }> = {
  gmail: {
    imap_host: "imap.gmail.com", imap_port: 993, label: "Gmail",
    hint: "Szükséges: Google fiók → Biztonság → 2-lépéses hitelesítés, majd App jelszó generálása.",
  },
  outlook: {
    imap_host: "imap.outlook.com", imap_port: 993, label: "Outlook / Hotmail",
    hint: "Microsoft-fiókhoz is működik. App jelszót az account.microsoft.com oldalon generálhatsz.",
  },
  icloud: {
    imap_host: "imap.mail.me.com", imap_port: 993, label: "iCloud",
    hint: "App-specifikus jelszót az appleid.apple.com oldalon generálhatsz.",
  },
  custom: { imap_host: "", imap_port: 993, label: "Egyedi IMAP" },
}

// ─── Add form ─────────────────────────────────────────────

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const [preset, setPreset]       = useState("gmail")
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [showPass, setShowPass]   = useState(false)
  const [name, setName]           = useState("")
  const [host, setHost]           = useState("")
  const [port, setPort]           = useState(993)
  const [error, setError]         = useState("")

  const add = useAddEmailAccountMutation()
  const cfg = PRESETS[preset]
  const resolvedHost = preset === "custom" ? host : cfg.imap_host
  const resolvedPort = preset === "custom" ? port : cfg.imap_port

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password || !resolvedHost) { setError("Töltsd ki az összes kötelező mezőt."); return }
    try {
      await add.mutateAsync({
        provider: preset === "custom" ? "imap" : preset,
        email, display_name: name || undefined,
        imap_host: resolvedHost, imap_port: resolvedPort, password,
      })
      onDone()
    } catch {
      setError("Nem sikerült menteni. Ellenőrizd az adatokat.")
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card-header" style={{ marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Új email fiók</div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>IMAP/TLS kapcsolat — a jelszó titkosítva tárolódik</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Mégse</button>
      </div>

      {/* Provider chips */}
      <div>
        <div style={{ fontSize: 12, color: "var(--fg3)", marginBottom: 8 }}>Szolgáltató</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} type="button" className="ib-chip"
              data-active={preset === key ? "true" : "false"}
              onClick={() => setPreset(key)}>
              {p.label}
            </button>
          ))}
        </div>
        {cfg.hint && (
          <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 8, lineHeight: 1.5 }}>{cfg.hint}</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
            Email cím <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input type="email" className="rb-input" style={{ width: "100%" }}
            placeholder="te@gmail.com" value={email}
            onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
            App jelszó <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input type={showPass ? "text" : "password"} className="rb-input" style={{ flex: 1 }}
              placeholder="App jelszó (nem a normál jelszavad)"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="sb-icon-btn" onClick={() => setShowPass(v => !v)}>
              {showPass ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>Megjelenő név (opcionális)</label>
          <input className="rb-input" style={{ width: "100%" }}
            placeholder="pl. Munkahelyi email" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {preset === "custom" && (
          <>
            <div>
              <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
                IMAP host <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input className="rb-input" style={{ width: "100%" }}
                placeholder="imap.example.com" value={host} onChange={e => setHost(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>Port</label>
              <input type="number" className="rb-input" style={{ width: "100%" }}
                value={port} onChange={e => setPort(Number(e.target.value))} />
            </div>
          </>
        )}
      </div>

      {resolvedHost && (
        <div style={{ fontSize: 11, color: "var(--fg3)", padding: "8px 10px", background: "var(--bg-elev2)", borderRadius: 6 }}>
          Kapcsolódás: <strong style={{ color: "var(--fg2)" }}>{resolvedHost}:{resolvedPort}</strong> · TLS titkosított
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--danger)" }}>
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

// ─── Account row ─────────────────────────────────────────

function AccountRow({ acc }: { acc: EmailAccount }) {
  const deleteAcc  = useDeleteEmailAccountMutation()
  const testAcc    = useTestEmailAccountMutation()
  const syncAcc    = useSyncEmailAccountMutation()

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [syncCount, setSyncCount]   = useState<number | null>(null)

  async function handleTest() {
    setTestResult(null)
    const res = await testAcc.mutateAsync(acc.id)
    setTestResult(res)
    setTimeout(() => setTestResult(null), 5000)
  }

  async function handleSync() {
    setSyncCount(null)
    const res = await syncAcc.mutateAsync(acc.id)
    setSyncCount(res.synced)
    setTimeout(() => setSyncCount(null), 4000)
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 16,
      alignItems: "center",
      padding: "16px 20px",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Status dot + info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: acc.active ? "var(--success)" : "var(--fg3)",
        }} />
        <div className="ib-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
          {(acc.display_name || acc.email).slice(0, 2).toUpperCase()}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg1)" }}>
          {acc.display_name || acc.email}
        </div>
        {acc.display_name && (
          <div style={{ fontSize: 12, color: "var(--fg3)" }}>{acc.email}</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--fg3)", display: "flex", alignItems: "center", gap: 4 }}>
            {acc.active ? <Wifi size={11} strokeWidth={1.5} /> : <WifiOff size={11} strokeWidth={1.5} />}
            {acc.imap_host}:{acc.imap_port} · {acc.provider.toUpperCase()} · TLS
          </span>
          {testResult && (
            <span style={{ fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 4,
              color: testResult.ok ? "var(--success)" : "var(--danger)" }}>
              {testResult.ok
                ? <><CheckCircle2 size={11} strokeWidth={1.5} /> Kapcsolat OK</>
                : <><XCircle size={11} strokeWidth={1.5} /> {testResult.message}</>}
            </span>
          )}
          {syncCount !== null && (
            <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={11} strokeWidth={1.5} /> {syncCount} új email szinkronizálva
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testAcc.isPending}
          style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {testAcc.isPending
            ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
            : <Wifi size={12} strokeWidth={1.5} />}
          Teszt
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncAcc.isPending}
          style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {syncAcc.isPending
            ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
            : <RefreshCw size={12} strokeWidth={1.5} />}
          Sync
        </button>
        <button className="sb-icon-btn" aria-label="Törlés"
          disabled={deleteAcc.isPending}
          onClick={() => { if (confirm(`Törlöd a(z) ${acc.email} fiókot?`)) deleteAcc.mutate(acc.id) }}>
          {deleteAcc.isPending
            ? <Loader2 size={13} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
            : <Trash2 size={13} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

export default function InboxSettingsPage() {
  const navigate = useNavigate()
  const accountsQuery = useEmailAccountsQuery()
  const [showAdd, setShowAdd] = useState(false)

  const accounts = accountsQuery.data ?? []

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6">
      <div className="page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="sb-icon-btn" onClick={() => navigate("/inbox")} aria-label="Vissza">
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings2 size={20} strokeWidth={1.5} /> Inbox beállítások
            </h1>
            <div className="sub">Email fiókok kezelése és szinkronizáció</div>
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

      {/* Accounts list */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Kapcsolódott fiókok
        </div>
        <div className="card p-0">
          {accountsQuery.isLoading && (
            <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--fg3)" }}>
              <Loader2 size={16} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> Betöltés…
            </div>
          )}
          {!accountsQuery.isLoading && accounts.length === 0 && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--fg3)", marginBottom: 12 }}>
                Még nincs email fiók hozzáadva.
              </div>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} strokeWidth={1.5} /> Első fiók hozzáadása
              </button>
            </div>
          )}
          {accounts.map(acc => <AccountRow key={acc.id} acc={acc} />)}
        </div>
      </div>

      {/* Sync info */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Szinkronizáció
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Automatikus polling</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>
                A szerver 2 percenként ellenőrzi az új emaileket minden aktív fiókban.
                A kapcsolat TLS titkosított, a jelszó Fernet szimmetrikus titkosítással tárolódik.
              </div>
            </div>
            <span style={{ height: 20, padding: "0 8px", borderRadius: 5, fontSize: 11, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 5,
              color: accounts.length > 0 ? "var(--success)" : "var(--fg3)",
              background: accounts.length > 0 ? "rgb(52 211 153 / 0.12)" : "var(--bg-elev2)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%",
                background: accounts.length > 0 ? "var(--success)" : "var(--fg3)" }} />
              {accounts.length > 0 ? "Aktív" : "Nincs fiók"}
            </span>
          </div>
          <div style={{ padding: "12px 14px", background: "var(--bg-elev2)", borderRadius: 8, fontSize: 12, color: "var(--fg2)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--fg1)" }}>Biztonság:</strong> Az app jelszavak soha nem tárolódnak plain text-ben.
            A titkosítási kulcs a szerver environment variable-jében él (<code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>FERNET_KEY</code>),
            a DB-ben csak a titkosított adat található.
          </div>
        </div>
      </div>

      {/* How-to */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Hogyan állíts be app jelszót?
        </div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            {
              provider: "Gmail",
              color: "#ea4335",
              steps: [
                "Menj a myaccount.google.com oldalra",
                "Biztonság → 2-lépéses hitelesítés bekapcsolása (ha még nincs)",
                "Keresőbe: \"App passwords\" → Válassz alkalmazást: Mail, eszköz: Other",
                "Írd be: DigiBrain → Generate → másold ki a 16 karakteres jelszót",
              ],
            },
            {
              provider: "Outlook / Hotmail",
              color: "#0078d4",
              steps: [
                "Menj az account.microsoft.com oldalra",
                "Biztonság → Speciális biztonsági beállítások",
                "App jelszók → Új app jelszó létrehozása",
                "Másold ki és add meg a DigiBrainben",
              ],
            },
            {
              provider: "iCloud",
              color: "#555",
              steps: [
                "Menj az appleid.apple.com oldalra",
                "Bejelentkezés és biztonság → App-specifikus jelszavak",
                "Új jelszó → Elnevezés: DigiBrain",
                "Másold ki az xxxx-xxxx-xxxx-xxxx formátumú jelszót",
              ],
            },
          ].map(p => (
            <div key={p.provider}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                {p.provider}
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                {p.steps.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--fg2)", lineHeight: 1.5 }}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
