import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar, type Crumb } from "./TopBar"
import { MobileNav } from "./MobileNav"
import { useUIStore } from "@/stores/uiStore"

const ROUTE_CRUMBS: Record<string, Crumb[]> = {
  "/": [{ label: "Dashboard" }],
  "/time": [{ label: "Time tracking" }],
  "/finance": [{ label: "Finances" }],
  "/notes": [{ label: "Notes" }],
  "/vault": [{ label: "Vault" }],
}

function crumbsForPath(pathname: string): Crumb[] {
  if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname]
  if (pathname.startsWith("/topics/")) {
    return [{ label: "Topics" }, { label: pathname.split("/").pop() ?? "" }]
  }
  return []
}

export function RootLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const location = useLocation()
  const crumbs = crumbsForPath(location.pathname)

  return (
    <div className="app-shell" data-sidebar={collapsed ? "collapsed" : "expanded"}>
      <Sidebar />
      <div className="main">
        <TopBar crumbs={crumbs} />
        <div className="main-scroll">
          <div className="page-inner">
            <Outlet />
          </div>
        </div>
      </div>
      {/* Bottom navigation — hidden on desktop via CSS media query */}
      <MobileNav />
    </div>
  )
}
