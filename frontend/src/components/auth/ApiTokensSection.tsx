import { useEffect, useState } from "react"
import { api } from "@/lib/api"

type Token = { id: string; name: string; created_at: string; last_used_at: string | null }

function errorDetail(err: unknown, fallback: string): string {
  return err && typeof err === "object" && "response" in err
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? ((err as any).response?.data?.detail ?? fallback)
    : fallback
}

export function ApiTokensSection() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [name, setName] = useState("")
  const [created, setCreated] = useState<string | null>(null) // raw token shown once
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    api.get<Token[]>("/auth/tokens").then(({ data }) => setTokens(data)).catch(() => {})
  }
  useEffect(load, [])

  const create = async () => {
    setError(null); setBusy(true)
    try {
      const { data } = await api.post<{ token: string }>("/auth/tokens", { name: name || "MCP" })
      setCreated(data.token); setName(""); load()
    } catch (err) {
      setError(errorDetail(err, "Could not create token"))
    } finally { setBusy(false) }
  }

  const revoke = async (id: string) => {
    setError(null)
    try {
      await api.delete(`/auth/tokens/${id}`); load()
    } catch (err) {
      setError(errorDetail(err, "Could not revoke token"))
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
      <div className="text-xs font-medium uppercase text-fg3 mb-3" style={{ letterSpacing: "0.04em" }}>
        API tokens (for MCP / programmatic access)
      </div>

      <p className="text-sm text-fg2" style={{ margin: "0 0 10px" }}>
        Machine access that works even with 2FA on. Use it in the MCP server's
        config instead of your password.
      </p>

      {created && (
        <div className="rounded-md px-3 py-2" style={{ background: "var(--success-soft)", border: "1px solid var(--success)", marginBottom: 10 }}>
          <div className="text-sm" style={{ color: "var(--fg1)", fontWeight: 600, marginBottom: 4 }}>
            Copy this token now — it won't be shown again:
          </div>
          <code style={{ fontSize: 13, wordBreak: "break-all" }}>{created}</code>
          <div>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => setCreated(null)}>Done</button>
          </div>
        </div>
      )}

      <div className="flex gap-2" style={{ marginBottom: 10 }}>
        <input
          type="text" className="tp-field-input" value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Token name (e.g. MCP – Mac)"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
          {busy ? "…" : "Create"}
        </button>
      </div>

      {tokens.length > 0 && (
        <div className="flex flex-col gap-1">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between" style={{ fontSize: 13, padding: "4px 0" }}>
              <span className="text-fg2">
                {t.name}
                <span className="text-fg3" style={{ marginLeft: 8, fontSize: 11 }}>
                  {t.last_used_at ? "used" : "never used"}
                </span>
              </span>
              <button type="button" onClick={() => revoke(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 12 }}>
                Revoke
              </button>
            </div>
          ))}
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
