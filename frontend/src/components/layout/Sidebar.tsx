import { Link, useNavigate, useLocation } from "react-router-dom"
import {
  ChevronRight,
  Search,
  Plus,
  LayoutDashboard,
  Clock,
  Wallet,
  FileText,
  Lock,
  Settings,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { TOPIC_TREE, type TopicNode } from "./topicTree"

type NavItem = {
  id: string
  to: string
  label: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", to: "/", label: "Dashboard", icon: LayoutDashboard },
  { id: "time", to: "/time", label: "Time tracking", icon: Clock },
  { id: "finance", to: "/finance", label: "Finances", icon: Wallet },
  { id: "notes", to: "/notes", label: "Notes", icon: FileText },
  { id: "vault", to: "/vault", label: "Vault", icon: Lock },
]

function Caret({ open, leaf }: { open: boolean; leaf: boolean }) {
  return (
    <span
      className="tt-caret"
      data-open={open ? "true" : "false"}
      data-leaf={leaf ? "true" : "false"}
    >
      <ChevronRight size={10} strokeWidth={2} />
    </span>
  )
}

function TopicRow({
  node,
  depth,
  activeId,
}: {
  node: TopicNode
  depth: number
  activeId: string | null
}) {
  const navigate = useNavigate()
  const isExpanded = useUIStore((s) => s.isTopicExpanded(node.id))
  const toggleTopic = useUIStore((s) => s.toggleTopic)
  const hasChildren = (node.children?.length ?? 0) > 0
  const isActive = activeId === node.id

  return (
    <div>
      <div
        className="tt-row"
        data-active={isActive ? "true" : "false"}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (hasChildren) toggleTopic(node.id)
          navigate(`/topics/${node.id}`)
        }}
      >
        <Caret open={isExpanded} leaf={!hasChildren} />
        <span className="tt-icon">{node.emoji}</span>
        <span className="tt-name">{node.name}</span>
        <span className="tt-count">{node.count}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((c) => (
            <TopicRow
              key={c.id}
              node={c}
              depth={depth + 1}
              activeId={activeId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function isNavActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/"
  return pathname === to || pathname.startsWith(`${to}/`)
}

function activeTopicIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/topics\/([^/]+)/)
  return m ? m[1] : null
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const openCmdk = useUIStore((s) => s.openCmdk)
  const location = useLocation()
  const activeTopicId = activeTopicIdFromPath(location.pathname)

  return (
    <aside className="sb" data-collapsed={collapsed ? "true" : "false"}>
      <div className="sb-header">
        <div className="sb-brand">
          <div className="sb-brand-glyph">DB</div>
          <span className="sb-brand-name">DigiBrain</span>
        </div>
        {!collapsed && (
          <button
            type="button"
            className="sb-collapse-btn"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <button type="button" className="sb-search" onClick={openCmdk}>
        <Search size={14} strokeWidth={1.5} />
        <span className="sb-search-text">Search</span>
        <span className="sb-search-kbd">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      <div className="sb-scroll">
        <div className="sb-section-label">
          <span>Topics</span>
          <button type="button" className="add-btn" aria-label="New topic">
            <Plus size={12} strokeWidth={1.5} />
          </button>
        </div>
        <div className="tt-tree">
          {TOPIC_TREE.map((t) => (
            <TopicRow
              key={t.id}
              node={t}
              depth={0}
              activeId={activeTopicId}
            />
          ))}
        </div>

        <div className="sb-divider" />

        <nav className="sb-nav">
          {NAV_ITEMS.map((it) => {
            const Icon = it.icon
            const active = isNavActive(location.pathname, it.to)
            return (
              <Link
                key={it.id}
                to={it.to}
                className="sb-nav-item"
                data-active={active ? "true" : "false"}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span className="sb-nav-label">{it.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="sb-footer">
        <div className="sb-footer-user">
          <div className="sb-avatar">M</div>
          <div className="sb-user-meta">
            <div className="sb-user-name">Marcell</div>
            <div className="sb-user-email">marcell@digibrain.local</div>
          </div>
        </div>
        <div className="sb-footer-actions">
          <button type="button" className="sb-icon-btn" aria-label="Settings">
            <Settings size={14} strokeWidth={1.5} />
          </button>
          <button type="button" className="sb-icon-btn" aria-label="Toggle theme">
            <Moon size={14} strokeWidth={1.5} />
          </button>
          {collapsed && (
            <button
              type="button"
              className="sb-icon-btn"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
