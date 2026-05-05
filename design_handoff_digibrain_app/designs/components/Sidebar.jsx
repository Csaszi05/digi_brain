/* Sidebar — fixed left, 260/64px, collapsible. */
const { useState } = React;

const TOPIC_TREE = [
  {
    id: "univ", emoji: "📚", name: "University — Business Informatics", count: 47,
    children: [
      {
        id: "sem1", emoji: "📁", name: "Semester 1", count: 18,
        children: [
          { id: "micro", emoji: "📄", name: "Microeconomics", count: 8 },
          { id: "math", emoji: "📄", name: "Mathematics", count: 6 },
          { id: "prog", emoji: "📄", name: "Programming I", count: 4 },
        ],
      },
      { id: "sem2", emoji: "📁", name: "Semester 2", count: 12, children: [
        { id: "macro", emoji: "📄", name: "Macroeconomics", count: 5 },
        { id: "stats", emoji: "📄", name: "Statistics", count: 7 },
      ]},
      { id: "thesis", emoji: "📄", name: "Thesis research", count: 3 },
    ],
  },
  {
    id: "work", emoji: "💼", name: "Work", count: 23,
    children: [
      { id: "proj-a", emoji: "📁", name: "Project Atlas", count: 14 },
      { id: "proj-b", emoji: "📁", name: "Client onboarding", count: 9 },
    ],
  },
  {
    id: "personal", emoji: "🏠", name: "Personal", count: 15,
    children: [
      { id: "health", emoji: "📁", name: "Health", count: 4 },
      { id: "finance", emoji: "📁", name: "Finance", count: 6 },
      { id: "travel", emoji: "📁", name: "Travel", count: 5 },
    ],
  },
];

function Caret({ open, leaf }) {
  return (
    <span className="tt-caret" data-open={open ? "true" : "false"} data-leaf={leaf ? "true" : "false"}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </span>
  );
}

function TopicNode({ node, depth, activeId, onSelect, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div>
      <div
        className="tt-row"
        data-active={activeId === node.id ? "true" : "false"}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={(e) => {
          if (hasChildren) setOpen(o => !o);
          onSelect && onSelect(node.id);
        }}
      >
        <Caret open={open} leaf={!hasChildren} />
        <span className="tt-icon">{node.emoji}</span>
        <span className="tt-name">{node.name}</span>
        <span className="tt-count">{node.count}</span>
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map(c => (
            <TopicNode key={c.id} node={c} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "topic", label: "Topic detail", icon: "kanban-square" },
  { id: "time", label: "Time tracking", icon: "clock" },
  { id: "finance", label: "Finances", icon: "wallet" },
  { id: "notes", label: "Notes", icon: "file-text" },
  { id: "vault", label: "Vault", icon: "lock" },
];

function Icon({ name, size = 16 }) {
  // Render lucide icon via the global lucide UMD; React renders an <i data-lucide=...>
  // and we replace nodes after mount via lucide.createIcons().
  return <i data-lucide={name} style={{ width: size, height: size, display: "inline-flex" }}></i>;
}

function Sidebar({ collapsed, onToggle, currentScreen, onNavigate, activeTopic = "micro" }) {
  return (
    <aside className="sb" data-collapsed={collapsed ? "true" : "false"}>
      <div className="sb-header">
        <div className="sb-brand">
          <div className="sb-brand-glyph">DB</div>
          <span className="sb-brand-name">DigiBrain</span>
        </div>
        {!collapsed && (
          <button className="sb-collapse-btn" onClick={onToggle} aria-label="Collapse sidebar">
            <Icon name="panel-left-close" size={16} />
          </button>
        )}
      </div>

      <div className="sb-search" onClick={() => window.dispatchEvent(new CustomEvent("db-cmdk"))}>
        <Icon name="search" size={14} />
        <span className="sb-search-text">Search</span>
        <span className="sb-search-kbd">
          <kbd>⌘</kbd><kbd>K</kbd>
        </span>
      </div>

      <div className="sb-scroll">
        <div className="sb-section-label">
          <span>Topics</span>
          <button className="add-btn" aria-label="New topic">
            <Icon name="plus" size={12} />
          </button>
        </div>
        <div className="tt-tree">
          {TOPIC_TREE.map(t => (
            <TopicNode
              key={t.id} node={t} depth={0}
              activeId={activeTopic}
              defaultOpen={t.id === "univ"}
            />
          ))}
        </div>

        <div className="sb-divider"></div>

        <nav className="sb-nav">
          {NAV_ITEMS.map(it => (
            <button
              key={it.id}
              className="sb-nav-item"
              data-active={currentScreen === it.id ? "true" : "false"}
              onClick={() => onNavigate(it.id)}
            >
              <Icon name={it.icon} size={16} />
              <span className="sb-nav-label">{it.label}</span>
            </button>
          ))}
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
          <button className="sb-icon-btn" aria-label="Settings"><Icon name="settings" size={14} /></button>
          <button className="sb-icon-btn" aria-label="Toggle theme"><Icon name="moon" size={14} /></button>
          {collapsed && (
            <button className="sb-icon-btn" onClick={onToggle} aria-label="Expand sidebar"><Icon name="panel-left-open" size={14} /></button>
          )}
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar, Icon, TOPIC_TREE });
