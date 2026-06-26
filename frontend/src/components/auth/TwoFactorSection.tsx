import { useEffect, useState } from "react"
import { api } from "@/lib/api"

type Phase = "loading" | "off" | "setup" | "backup" | "on"

type SetupData = { secret: string; otpauth_uri: string; qr_data_url: string }

function errorDetail(err: unknown, fallback: string): string {
  return err && typeof err === "object" && "response" in err
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((err as any).response?.data?.detail ?? fallback)
    : fallback
}

export function TwoFactorSection() {
  const [phase, setPhase] = useState<Phase>("loading")
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disablePassword, setDisablePassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ enabled: boolean }>("/auth/2fa/status")
      .then(({ data }) => setPhase(data.enabled ? "on" : "off"))
      .catch(() => setPhase("off"))
  }, [])

  const startSetup = async () => {
    setError(null); setBusy(true)
    try {
      const { data } = await api.post<SetupData>("/auth/2fa/setup")
      setSetup(data); setPhase("setup"); setCode("")
    } catch (err) {
      setError(errorDetail(err, "Could not start setup"))
    } finally { setBusy(false) }
  }

  const enable = async () => {
    setError(null); setBusy(true)
    try {
      const { data } = await api.post<{ backup_codes: string[] }>("/auth/2fa/enable", { code })
      setBackupCodes(data.backup_codes); setPhase("backup"); setCode("")
    } catch (err) {
      setError(errorDetail(err, "Invalid code"))
    } finally { setBusy(false) }
  }

  const disable = async () => {
    setError(null); setBusy(true)
    try {
      await api.post("/auth/2fa/disable", { current_password: disablePassword, code })
      setPhase("off"); setDisablePassword(""); setCode("")
    } catch (err) {
      setError(errorDetail(err, "Could not disable 2FA"))
    } finally { setBusy(false) }
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
      <div className="text-xs font-medium uppercase text-fg3 mb-3" style={{ letterSpacing: "0.04em" }}>
        Two-factor authentication
      </div>

      {phase === "loading" && <div className="text-sm text-fg3">Loading…</div>}

      {phase === "off" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-fg2" style={{ margin: 0 }}>
            Add a second step at login with an authenticator app (Google Authenticator, Authy, 1Password).
          </p>
          <button type="button" className="btn btn-primary" onClick={startSetup} disabled={busy} style={{ alignSelf: "flex-start" }}>
            {busy ? "Please wait…" : "Set up two-factor"}
          </button>
        </div>
      )}

      {phase === "setup" && setup && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg2" style={{ margin: 0 }}>
            1. Scan this QR with your authenticator app:
          </p>
          <img src={setup.qr_data_url} alt="2FA QR code" style={{ width: 180, height: 180, alignSelf: "center", background: "#fff", borderRadius: 8, padding: 8 }} />
          <p className="text-xs text-fg3" style={{ margin: 0, wordBreak: "break-all" }}>
            Can't scan? Secret: <code>{setup.secret}</code>
          </p>
          <div>
            <div className="tp-field-label">2. Enter the 6-digit code to confirm</div>
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code"
              className="tp-field-input" value={code}
              onChange={(e) => setCode(e.target.value)} placeholder="123456"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => { setPhase("off"); setSetup(null) }}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={enable} disabled={busy || !code}>
              {busy ? "Verifying…" : "Enable"}
            </button>
          </div>
        </div>
      )}

      {phase === "backup" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg1" style={{ margin: 0, fontWeight: 600 }}>
            ✅ Two-factor is on. Save these backup codes — each works once if you lose your phone:
          </p>
          <div style={{ background: "var(--bg-elev2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 14, columns: 2 }}>
            {backupCodes.map((c) => <div key={c}>{c}</div>)}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setPhase("on")} style={{ alignSelf: "flex-start" }}>
            I've saved them
          </button>
        </div>
      )}

      {phase === "on" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg2" style={{ margin: 0 }}>
            🔒 Two-factor is <strong>on</strong>. To turn it off, confirm your password and a current code.
          </p>
          <div>
            <div className="tp-field-label">Current password</div>
            <input type="password" className="tp-field-input" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <div className="tp-field-label">2FA code (or backup code)</div>
            <input type="text" inputMode="numeric" className="tp-field-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </div>
          <button type="button" className="btn btn-ghost" onClick={disable} disabled={busy || !disablePassword || !code} style={{ alignSelf: "flex-start", color: "var(--danger)" }}>
            {busy ? "Please wait…" : "Disable two-factor"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)", fontSize: 13, marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  )
}
