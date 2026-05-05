/* Finance screen */

const FIN_CATEGORIES = [
  { id: "food", name: "Food & groceries", color: "#fbbf24", spent: 42500, currency: "HUF", budget: 60000, pct: 71 },
  { id: "rent", name: "Rent & utilities", color: "#60a5fa", spent: 95000, currency: "HUF", budget: 100000, pct: 95 },
  { id: "tuition", name: "Tuition", color: "#a78bfa", spent: 180, currency: "EUR", budget: 200, pct: 90 },
  { id: "transport", name: "Transport", color: "#34d399", spent: 12300, currency: "HUF", budget: 20000, pct: 62 },
  { id: "subscriptions", name: "Subscriptions", color: "#f472b6", spent: 28, currency: "USD", budget: 40, pct: 70 },
  { id: "fun", name: "Going out", color: "#fb7185", spent: 22400, currency: "HUF", budget: 18000, pct: 124 },
];

const TRANSACTIONS = [
  { date: "May 4", cat: "Food & groceries", color: "#fbbf24", desc: "Tesco — weekly shop", amt: -8240, cur: "HUF" },
  { date: "May 4", cat: "Subscriptions", color: "#f472b6", desc: "GitHub Copilot", amt: -10, cur: "USD" },
  { date: "May 3", cat: "Going out", color: "#fb7185", desc: "Dinner with Lili", amt: -6800, cur: "HUF" },
  { date: "May 3", cat: "Income", color: "#34d399", desc: "Freelance — Atlas invoice #12", amt: 320, cur: "EUR" },
  { date: "May 2", cat: "Transport", color: "#34d399", desc: "BKK monthly pass", amt: -9500, cur: "HUF" },
  { date: "May 1", cat: "Rent & utilities", color: "#60a5fa", desc: "Apartment rent — May", amt: -85000, cur: "HUF" },
  { date: "Apr 30", cat: "Tuition", color: "#a78bfa", desc: "Semester fee", amt: -180, cur: "EUR" },
  { date: "Apr 29", cat: "Food & groceries", color: "#fbbf24", desc: "Aldi", amt: -5420, cur: "HUF" },
];

function fmt(n, cur) {
  const abs = Math.abs(n);
  if (cur === "HUF") return `${abs.toLocaleString("hu-HU").replace(/,/g, " ")} HUF`;
  if (cur === "EUR") return `€${abs.toFixed(2)}`;
  if (cur === "USD") return `$${abs.toFixed(2)}`;
  return `${abs} ${cur}`;
}

function DonutChart({ data, size = 200 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 14;
  const c = size / 2;
  let acc = 0;
  const stroke = 22;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-elev2)" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const len = 2 * Math.PI * r * frac;
        const gap = 2 * Math.PI * r - len;
        const dasharray = `${len} ${gap}`;
        const offset = -acc * 2 * Math.PI * r;
        acc += frac;
        return (
          <circle
            key={i}
            cx={c} cy={c} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${c} ${c})`}
          />
        );
      })}
      <text x={c} y={c - 4} textAnchor="middle" fill="var(--fg1)" style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>184k</text>
      <text x={c} y={c + 16} textAnchor="middle" fill="var(--fg3)" style={{ fontSize: 11 }}>HUF this month</text>
    </svg>
  );
}

function TrendChart() {
  const data = [12, 22, 18, 26, 31, 28, 35, 30, 38, 42, 36, 44];
  const w = 280, h = 90;
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - (v / max) * (h - 8) - 4]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendfill)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Finance() {
  return (
    <div className="page-inner" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="page-head">
        <div>
          <h1>Finances</h1>
          <div className="sub">May 2026 · 24 transactions</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <span className="tag" data-active="true" style={{ background: "var(--accent-soft)", color: "var(--indigo-300)", borderColor: "transparent" }}>HUF</span>
            <span className="tag">EUR</span>
            <span className="tag">USD</span>
          </div>
          <button className="btn btn-primary"><Icon name="plus" size={14} /> Add transaction</button>
        </div>
      </div>

      <div className="tabs" style={{ alignSelf: "flex-start" }}>
        <button className="tab">This week</button>
        <button className="tab" data-active="true">This month</button>
        <button className="tab">This year</button>
        <button className="tab">Custom</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="Total spent" value="184 230" suffix="HUF"
          delta="−6%" deltaDir="up" foot="vs last month" />
        <StatCard label="Total income" value="320" suffix="EUR"
          foot="≈ 124 800 HUF" />
        <StatCard label="Net balance" value="−59 430" suffix="HUF"
          foot="After income & FX" />
        <StatCard label="Largest expense" value="95 000" suffix="HUF"
          foot="Rent · May 1" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div style={{ fontSize: 16, fontWeight: 600 }}>Spending by category</div>
              <button className="btn btn-ghost btn-sm">All currencies <Icon name="chevron-down" size={12} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <DonutChart data={FIN_CATEGORIES.filter(c => c.currency === "HUF").map(c => ({ value: c.spent, color: c.color }))} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {FIN_CATEGORIES.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="tag-dot" style={{ background: c.color, width: 8, height: 8 }}></span>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--fg2)" }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: "var(--fg1)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{fmt(c.spent, c.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Transactions</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost btn-sm"><Icon name="filter" size={12} /> All categories</button>
                <button className="btn btn-ghost btn-sm"><Icon name="search" size={12} /></button>
              </div>
            </div>
            <div>
              {TRANSACTIONS.map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto auto", alignItems: "center", gap: 16, padding: "12px 20px", borderBottom: i < TRANSACTIONS.length - 1 ? "1px solid var(--border)" : 0 }}>
                  <div style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>{t.date}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span className="tag-dot" style={{ background: t.color, width: 8, height: 8 }}></span>
                    <span style={{ fontSize: 13, color: "var(--fg1)" }}>{t.desc}</span>
                    <span className="tag" style={{ height: 18, fontSize: 11, padding: "0 6px" }}>{t.cat}</span>
                  </div>
                  <span className="tag" style={{ height: 20, fontSize: 11, fontFamily: "var(--font-mono)" }}>{t.cur}</span>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: t.amt > 0 ? "var(--emerald-400)" : "var(--fg1)", minWidth: 100, textAlign: "right" }}>
                    {t.amt > 0 ? "+" : "−"}{fmt(t.amt, t.cur)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div style={{ fontSize: 16, fontWeight: 600 }}>Budget progress</div>
              <span style={{ fontSize: 12, color: "var(--fg3)" }}>May</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {FIN_CATEGORIES.map((c, i) => {
                const cls = c.pct > 100 ? "danger" : c.pct > 85 ? "warn" : "ok";
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg1)", fontWeight: 500 }}>
                        <span className="tag-dot" style={{ background: c.color, width: 8, height: 8 }}></span>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }}>
                        {fmt(c.spent, c.currency)} / {fmt(c.budget, c.currency)}
                      </div>
                    </div>
                    <div className="progress" style={{ height: 5 }}>
                      <div className={`progress-bar ${cls}`} style={{ width: `${Math.min(c.pct, 100)}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Spending trend</div>
                <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>Past 12 months · HUF (×1000)</div>
              </div>
            </div>
            <TrendChart />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Finance });
