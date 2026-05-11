import { Link, useLocation } from "react-router-dom"
import { Clock, FileText, LayoutDashboard, Wallet } from "lucide-react"
import { useUIStore } from "@/stores/uiStore"

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/time", label: "Time", icon: Clock },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/notes", label: "Notes", icon: FileText },
]

function isNavActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/"
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function MobileNav() {
  const location = useLocation()
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar)

  return (
    <nav className="mobile-nav">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = isNavActive(location.pathname, to)
        return (
          <Link
            key={to}
            to={to}
            className="mobile-nav-item"
            data-active={active ? "true" : "false"}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.5} />
            {label}
          </Link>
        )
      })}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={openMobileSidebar}
        aria-label="Topics"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Topics
      </button>
    </nav>
  )
}
