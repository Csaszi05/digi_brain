import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/api"
import { useAuthStore, type AuthUser } from "@/stores/authStore"

type Tab = "login" | "register"

type AuthResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const emailRef = useRef<HTMLInputElement>(null)

  const switchTab = (t: Tab) => {
    setTab(t)
    setError(null)
    setConfirm("")
    setTimeout(() => emailRef.current?.focus(), 50)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (tab === "register") {
      if (password !== confirm) {
        setError("Passwords do not match")
        return
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters")
        return
      }
    }

    setLoading(true)
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register"
      const { data } = await api.post<AuthResponse>(endpoint, { email, password })
      login(data.access_token, data.user)
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (err as any).response?.data?.detail
          : null
      setError(
        detail ??
          (tab === "login"
            ? "Invalid email or password"
            : "Registration failed. Please try again.")
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-bg-app px-4"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "var(--accent)",
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.04em",
            }}
          >
            DB
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "var(--fg1)",
              margin: 0,
            }}
          >
            DigiBrain
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg3)", margin: 0 }}>
            Your personal second brain
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{ padding: "28px 28px 24px" }}
        >
          {/* Tabs */}
          <div className="tabs mb-6">
            <button
              type="button"
              className="tab"
              data-active={tab === "login" ? "true" : "false"}
              onClick={() => switchTab("login")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Sign in
            </button>
            <button
              type="button"
              className="tab"
              data-active={tab === "register" ? "true" : "false"}
              onClick={() => switchTab("register")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <div className="tp-field-label">Email</div>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                className="tp-field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <div className="tp-field-label">Password</div>
              <input
                type="password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                className="tp-field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "Min. 8 characters" : ""}
                required
              />
            </div>

            {tab === "register" && (
              <div>
                <div className="tp-field-label">Confirm password</div>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="tp-field-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </div>
            )}

            {error && (
              <div
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  border: "1px solid var(--danger)",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ height: 40, fontSize: 14, fontWeight: 600, marginTop: 4 }}
            >
              {loading
                ? "Please wait…"
                : tab === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>

        <p
          className="text-center mt-4 text-xs text-fg3"
        >
          Self-hosted · Your data stays yours
        </p>
      </div>
    </div>
  )
}
