import { useState } from "react"
import { X, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react"
import { useAddEmailAccountMutation } from "@/api/emailAccounts"

const PRESETS: Record<string, { imap_host: string; imap_port: number; label: string }> = {
  gmail:   { imap_host: "imap.gmail.com",     imap_port: 993, label: "Gmail" },
  outlook: { imap_host: "imap.outlook.com",   imap_port: 993, label: "Outlook / Hotmail" },
  icloud:  { imap_host: "imap.mail.me.com",   imap_port: 993, label: "iCloud" },
  custom:  { imap_host: "",                   imap_port: 993, label: "Custom IMAP" },
}

export function AddEmailAccountModal({ onClose }: { onClose: () => void }) {
  const [preset, setPreset]           = useState("gmail")
  const [email, setEmail]             = useState("")
  const [password, setPassword]       = useState("")
  const [showPass, setShowPass]       = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [customHost, setCustomHost]   = useState("")
  const [customPort, setCustomPort]   = useState(993)
  const [error, setError]             = useState("")

  const add = useAddEmailAccountMutation()

  const cfg = PRESETS[preset]
  const host = preset === "custom" ? customHost : cfg.imap_host
  const port = preset === "custom" ? customPort : cfg.imap_port

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email || !password || !host) {
      setError("Fill in all required fields.")
      return
    }
    try {
      await add.mutateAsync({
        provider: preset === "custom" ? "imap" : preset,
        email,
        display_name: displayName || undefined,
        imap_host: host,
        imap_port: port,
        password,
      })
      onClose()
    } catch {
      setError("Failed to save account. Check your details.")
    }
  }

  return (
    <div className="tp-backdrop" onClick={onClose}>
      <div className="absolute inset-0 grid place-items-center p-6" onClick={e => e.stopPropagation()}>
        <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative" }}>
          <button className="sb-icon-btn" onClick={onClose} style={{ position: "absolute", top: 12, right: 12 }}>
            <X size={16} strokeWidth={1.5} />
          </button>

          <div className="card-header" style={{ marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Add email account</div>
              <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>
                Connects via IMAP/TLS — your password is encrypted at rest
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Provider preset */}
            <div>
              <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>Provider</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    className="ib-chip"
                    data-active={preset === key ? "true" : "false"}
                    onClick={() => setPreset(key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
                Email address <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="email"
                className="rb-input"
                style={{ width: "100%" }}
                placeholder="you@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* App password */}
            <div>
              <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
                App password <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type={showPass ? "text" : "password"}
                  className="rb-input"
                  style={{ flex: 1 }}
                  placeholder={preset === "gmail" ? "xxxx xxxx xxxx xxxx" : "App password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="sb-icon-btn" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>
              {preset === "gmail" && (
                <div style={{ fontSize: 11, color: "var(--fg3)", marginTop: 5 }}>
                  Enable 2-Step Verification on your Google account, then generate an App Password at
                  myaccount.google.com → Security → App passwords.
                </div>
              )}
            </div>

            {/* Display name (optional) */}
            <div>
              <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
                Display name <span style={{ color: "var(--fg3)" }}>(optional)</span>
              </label>
              <input
                type="text"
                className="rb-input"
                style={{ width: "100%" }}
                placeholder="Work email"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            {/* Custom IMAP host */}
            {preset === "custom" && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>
                    IMAP host <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    className="rb-input"
                    style={{ width: "100%" }}
                    placeholder="imap.example.com"
                    value={customHost}
                    onChange={e => setCustomHost(e.target.value)}
                  />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ fontSize: 12, color: "var(--fg3)", display: "block", marginBottom: 6 }}>Port</label>
                  <input
                    type="number"
                    className="rb-input"
                    style={{ width: "100%" }}
                    value={customPort}
                    onChange={e => setCustomPort(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* Server info */}
            {host && (
              <div style={{ fontSize: 11, color: "var(--fg3)", padding: "8px 10px", background: "var(--bg-elev2)", borderRadius: 6 }}>
                Connecting to <strong style={{ color: "var(--fg2)" }}>{host}:{port}</strong> over TLS
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--danger)" }}>
                <AlertCircle size={13} strokeWidth={1.5} /> {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={add.isPending}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {add.isPending
                  ? <><Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                  : <><CheckCircle2 size={12} strokeWidth={1.5} /> Connect account</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
