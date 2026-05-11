import { Link, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import {
  ChevronRight,
  Search,
  Plus,
  LayoutDashboard,
  Clock,
  Wallet,
  FileText,
  Lock,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useUIStore } from "@/stores/uiStore"
import { useAuthStore } from "@/stores/authStore"
import { useTopicsQuery } from "@/api/topics"
import { buildTopicTree, type TopicNode } from "./topicTree"
import { NewTopicForm } from "./NewTopicForm"
import { ProfilePanel } from "@/components/auth/ProfilePanel"

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
  newChildOpenForId,
  setNewChildOpenForId,
}: {
  node: TopicNode
  depth: number
  activeId: string | null
  newChildOpenForId: string | null
  setNewChildOpenForId: (id: string | null) => void
}) {
  const navigate = useNavigate()
  const isExpanded = useUIStore((s) => s.isTopicExpanded(node.id))
  const toggleTopic = useUIStore((s) => s.toggleTopic)
  const hasChildren = node.children.length > 0
  const showNewChild = newChildOpenForId === node.id
  const isActive = activeId === node.id

  return (
    <div>
      <div
        className="tt-row group/topic"
        data-active={isActive ? "true" : "false"}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (hasChildren) toggleTopic(node.id)
          navigate(`/topics/${node.id}`)
        }}
      >
        <Caret open={isExpanded || showNewChild} leaf={!hasChildren} />
        <span className="tt-icon">{node.icon ?? "📁"}</span>
        <span className="tt-name">{node.name}</span>
        <button
          type="button"
          className="add-btn opacity-0 transition-opacity group-hover/topic:opacity-100"
          aria-label="New sub-topic"
          onClick={(e) => {
            e.stopPropagation()
            if (!isExpanded) toggleTopic(node.id)
            setNewChildOpenForId(node.id)
          }}
          style={{
            width: 18,
            height: 18,
            display: "grid",
            placeItems: "center",
            background: "transparent",
            border: 0,
            color: "var(--fg3)",
            borderRadius: 4,
            cursor: "pointer",
            marginRight: 2,
          }}
        >
          <Plus size={12} strokeWidth={1.5} />
        </button>
      </div>
      {(isExpanded || showNewChild) && (hasChildren || showNewChild) && (
        <div>
          {node.children.map((c) => (
            <TopicRow
              key={c.id}
              node={c}
              depth={depth + 1}
              activeId={activeId}
              newChildOpenForId={newChildOpenForId}
              setNewChildOpenForId={setNewChildOpenForId}
            />
          ))}
          {showNewChild && (
            <div style={{ paddingLeft: 8 + (depth + 1) * 14 }}>
              <NewTopicForm
                parentId={node.id}
                onClose={() => setNewChildOpenForId(null)}
              />
            </div>
          )}
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
  const navigate = useNavigate()
  const activeTopicId = activeTopicIdFromPath(location.pathname)

  const { user, logout } = useAuthStore()
  const initials = user?.email ? user.email[0].toUpperCase() : "?"
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const topics = useTopicsQuery()
  const tree = topics.data ? buildTopicTree(topics.data) : []

  // ─── New topic UI state (local — no need to persist) ───
  const [newRootOpen, setNewRootOpen] = useState(false)
  const [newChildOpenForId, setNewChildOpenForId] = useState<string | null>(null)

  return (
    <>
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
          <button
            type="button"
            className="add-btn"
            aria-label="New topic"
            onClick={() => setNewRootOpen(true)}
          >
            <Plus size={12} strokeWidth={1.5} />
          </button>
        </div>

        <div className="tt-tree">
          {topics.isLoading && (
            <div className="px-3 py-2 text-xs text-fg3">Loading…</div>
          )}
          {topics.isError && (
            <div className="px-3 py-2 text-xs text-danger">
              Could not load topics
            </div>
          )}
          {!topics.isLoading && !topics.isError && tree.length === 0 && !newRootOpen && (
            <div className="px-3 py-2 text-xs text-fg3">
              No topics yet. Click + to add one.
            </div>
          )}
          {tree.map((t) => (
            <TopicRow
              key={t.id}
              node={t}
              depth={0}
              activeId={activeTopicId}
              newChildOpenForId={newChildOpenForId}
              setNewChildOpenForId={setNewChildOpenForId}
            />
          ))}
          {newRootOpen && (
            <NewTopicForm
              parentId={null}
              onClose={() => setNewRootOpen(false)}
            />
          )}
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
        <button
          type="button"
          className="sb-footer-user"
          onClick={() => setProfileOpen(true)}
          title="Edit profile"
          style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left", padding: 0 }}
        >
          <div className="sb-avatar">{initials}</div>
          <div className="sb-user-meta">
            <div className="sb-user-name truncate">{user?.email?.split("@")[0] ?? "User"}</div>
            <div className="sb-user-email truncate">{user?.email ?? ""}</div>
          </div>
        </button>
        <div className="sb-footer-actions">
          <button
            type="button"
            className="sb-icon-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={handleLogout}
          >
            <LogOut size={14} strokeWidth={1.5} />
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

    {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
    </>
  )
}
