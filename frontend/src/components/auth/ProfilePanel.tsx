import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/authStore"

type Props = {
  onClose: () => void
}

export function ProfilePanel({ onClose }: Props) {
  const { user, login } = useAuthStore()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newEmail, setNewEmail] = useState(user?.email ?? "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const submittedRef = useRef(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittedRef.current) return
    setError(null)
    setSuccess(false)

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }
    if (!newEmail.trim()) {
      setError("Email cannot be empty")
      return
    }

    const payload: Record<string, string> = { current_password: currentPassword }
    if (newEmail !== user?.email) payload.new_email = newEmail
    if (newPassword) payload.new_password = newPassword

    if (Object.keys(payload).length === 1) {
      // Only current_password provided — nothing to change
      setError("No changes to save")
      return
    }

    setLoading(true)
    submittedRef.current = true
    try {
      const { data } = await api.patch<{
        access_token: string
        user: { id: string; email: string }
      }>("/auth/me", payload)

      login(data.access_token, data.user)
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(onClose, 1200)
    } catch (err: unknown) {
      submittedRef.current = false
      const detail =
        err && typeof err === "object" && "response" in err
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (err as any).response?.data?.detail
          : null
      setError(detail ?? "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <>
      <div className="tp-backdrop" onClick={onClose} />
      <aside
        className="tp-panel"
        role="dialog"
        aria-label="Edit profile"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420 }}
      >
        <header className="tp-header">
          <div className="tp-header-meta">
            <span className="text-fg1 font-semibold">Account settings</span>
          </div>
          <button type="button" className="sb-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="tp-body flex flex-col gap-4">
          <div>
            <div className="tp-field-label">Email</div>
            <input
              type="text"
              className="tp-field-input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div className="text-xs font-medium uppercase text-fg3 mb-3" style={{ letterSpacing: "0.04em" }}>
              Change password (optional)
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="tp-field-label">New password</div>
                <input
                  type="password"
                  className="tp-field-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <div className="tp-field-label">Confirm new password</div>
                <input
                  type="password"
                  className="tp-field-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div className="tp-field-label">
              Current password <span style={{ color: "var(--danger)" }}>*</span>
            </div>
            <input
              type="password"
              className="tp-field-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to save changes"
              autoComplete="current-password"
              required
            />
          </div>

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
          {success && (
            <div
              className="rounded-md px-3 py-2 text-sm"
              style={{
                background: "var(--success-soft)",
                color: "var(--success)",
                border: "1px solid var(--success)",
                fontSize: 13,
              }}
            >
              Profile updated successfully.
            </div>
          )}

          <div className="flex justify-end gap-2" style={{ paddingBottom: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !currentPassword}
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </aside>
    </>,
    document.body
  )
}
