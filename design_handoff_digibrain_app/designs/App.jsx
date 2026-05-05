/* DigiBrain App — top-level shell, navigation, sidebar collapse */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const CRUMBS = {
  dashboard: ["DigiBrain", "Dashboard"],
  topic: ["University — Business Informatics", "Semester 1", "Microeconomics"],
  time: ["DigiBrain", "Time tracking"],
  finance: ["DigiBrain", "Finances"],
  notes: ["DigiBrain", "Notes"],
  vault: ["DigiBrain", "Vault"],
};

function ScreenSwitch({ name }) {
  if (name === "dashboard") return <Dashboard />;
  if (name === "topic") return <TopicDetail />;
  if (name === "time") return <TimeTracking />;
  if (name === "finance") return <Finance />;
  return (
    <div className="page-inner">
      <div className="page-head"><div><h1>{name === "notes" ? "Notes" : "Vault"}</h1><div className="sub">Coming in a later phase.</div></div></div>
      <div className="placeholder" style={{ minHeight: 320 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Icon name={name === "notes" ? "file-text" : "lock"} size={24} />
          <div>{name === "notes" ? "Markdown notes view" : "Encrypted vault"}</div>
        </div>
      </div>
    </div>
  );
}

function DigiBrainApp({ initialScreen = "dashboard", initialCollapsed = false, sidebarVariant = "standard" }) {
  const [screen, setScreen] = useStateApp(initialScreen);
  const [collapsed, setCollapsed] = useStateApp(
    sidebarVariant === "compact" ? true :
    sidebarVariant === "expanded" ? false :
    initialCollapsed
  );

  useEffectApp(() => {
    if (sidebarVariant === "compact") setCollapsed(true);
    else if (sidebarVariant === "expanded") setCollapsed(false);
  }, [sidebarVariant]);

  useEffectApp(() => {
    // upgrade lucide icons whenever DOM changes
    if (window.lucide) window.lucide.createIcons();
  });

  const activeTopic = screen === "topic" ? "micro" : null;

  return (
    <div className="app-shell" data-sidebar={collapsed ? "collapsed" : "expanded"}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        currentScreen={screen}
        onNavigate={setScreen}
        activeTopic={activeTopic}
      />
      <div className="main">
        <TopBar crumbs={CRUMBS[screen] || ["DigiBrain"]} />
        <div className="main-scroll">
          <ScreenSwitch name={screen} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DigiBrainApp });
