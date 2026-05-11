import { Navigate, Outlet, Routes, Route } from "react-router-dom"
import { RootLayout } from "@/components/layout/RootLayout"
import { useAuthStore } from "@/stores/authStore"
import Dashboard from "@/pages/Dashboard"
import LoginPage from "@/pages/LoginPage"
import TopicDetail from "@/pages/TopicDetail"
import NotesPage from "@/pages/NotesPage"
import NotePage from "@/pages/NotePage"
import TimePage from "@/pages/TimePage"
import FinancePage from "@/pages/FinancePage"

/**
 * Wraps all protected routes. Redirects to /login when there is no valid
 * token. The login page itself must remain outside this wrapper.
 */
function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

function Placeholder({ title }: { title: string }) {
  return (
    <div
      className="placeholder text-center"
      style={{
        padding: 48,
        border: "1px dashed var(--border)",
        borderRadius: 12,
        color: "var(--fg3)",
        fontSize: 13,
      }}
    >
      {title} — coming soon
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — redirect to /login if not authenticated */}
      <Route element={<AuthLayout />}>
        {/* Full-screen pages (no sidebar) */}
        <Route path="/notes/:id" element={<NotePage />} />

        {/* Shell with sidebar + topbar */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/topics/:id" element={<TopicDetail />} />
          <Route path="/time" element={<TimePage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/vault" element={<Placeholder title="Vault" />} />
        </Route>
      </Route>

      <Route path="/dashboard" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
