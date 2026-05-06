import { Routes, Route, Navigate } from "react-router-dom"
import { RootLayout } from "@/components/layout/RootLayout"
import Dashboard from "@/pages/Dashboard"
import TopicDetail from "@/pages/TopicDetail"
import NotesPage from "@/pages/NotesPage"
import TimePage from "@/pages/TimePage"
import FinancePage from "@/pages/FinancePage"

function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder text-center" style={{
      padding: 48,
      border: "1px dashed var(--border)",
      borderRadius: 12,
      color: "var(--fg3)",
      fontSize: 13,
    }}>
      {title} — coming soon
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/topics/:id" element={<TopicDetail />} />
        <Route path="/time" element={<TimePage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/vault" element={<Placeholder title="Vault" />} />
      </Route>
      <Route path="/login" element={<Placeholder title="Login" />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
