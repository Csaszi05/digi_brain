function TopBar({ crumbs = [], onCmdK }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumbs.length - 1 ? "last" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="global-search" onClick={onCmdK}>
        <Icon name="search" size={14} />
        <span className="global-search-text">Search topics, tasks, notes…</span>
        <span className="kbd-hint"><kbd>⌘</kbd><kbd>K</kbd></span>
      </div>
      <div className="topbar-right">
        <button className="btn btn-ghost btn-icon" aria-label="Notifications"><Icon name="bell" size={16} /></button>
        <button className="btn btn-ghost btn-icon" aria-label="Help"><Icon name="circle-help" size={16} /></button>
        <div className="sb-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>M</div>
      </div>
    </header>
  );
}
Object.assign(window, { TopBar });
