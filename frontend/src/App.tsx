import { Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<div>Login – hamarosan</div>} />
      <Route path="/dashboard" element={<div>Dashboard – hamarosan</div>} />
      <Route path="/topics/:id" element={<div>Téma nézet – hamarosan</div>} />
      <Route path="/time" element={<div>Időkövetés – hamarosan</div>} />
      <Route path="/finance" element={<div>Pénzügyek – hamarosan</div>} />
      <Route path="/vault" element={<div>Vault – hamarosan</div>} />
    </Routes>
  )
}
