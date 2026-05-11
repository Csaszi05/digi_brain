import { Bell, CircleHelp, Menu, Search } from "lucide-react"
import { Fragment } from "react"
import { useUIStore } from "@/stores/uiStore"
import { TimerWidget } from "@/components/time/TimerWidget"

export type Crumb = {
  label: string
  to?: string
}

type TopBarProps = {
  crumbs?: Crumb[]
}

export function TopBar({ crumbs = [] }: TopBarProps) {
  const openCmdk = useUIStore((s) => s.openCmdk)
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar)

  return (
    <header className="topbar">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        className="btn btn-ghost btn-icon md:hidden"
        aria-label="Open menu"
        onClick={openMobileSidebar}
        style={{ flexShrink: 0 }}
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>

      <div className="crumbs hidden sm:flex">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "last" : ""}>
              {c.label}
            </span>
          </Fragment>
        ))}
      </div>

      <button type="button" className="global-search" onClick={openCmdk}>
        <Search size={14} strokeWidth={1.5} />
        <span className="global-search-text">
          Search topics, tasks, notes…
        </span>
        <span className="kbd-hint">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      <div className="topbar-right">
        <TimerWidget />
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Notifications">
          <Bell size={16} strokeWidth={1.5} />
        </button>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Help">
          <CircleHelp size={16} strokeWidth={1.5} />
        </button>
        <div className="sb-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
          M
        </div>
      </div>
    </header>
  )
}
