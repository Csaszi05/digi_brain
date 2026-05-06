import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import {
  useBudgetsQuery,
  useCategoriesQuery,
  useDeleteTransactionMutation,
  useTransactionsQuery,
  type Category,
  type Transaction,
} from "@/api/finance"
import { AddTransactionForm } from "@/components/finance/AddTransactionForm"

type Period = "week" | "month" | "year"

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
]

function startOfWeek(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfYear(date = new Date()): Date {
  return new Date(date.getFullYear(), 0, 1)
}

function periodRange(period: Period): { since: string; label: string } {
  const now = new Date()
  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  switch (period) {
    case "week":
      return { since: toIso(startOfWeek(now)), label: "Last 7 days" }
    case "month":
      return {
        since: toIso(startOfMonth(now)),
        label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      }
    case "year":
      return { since: toIso(startOfYear(now)), label: String(now.getFullYear()) }
  }
}

function formatAmount(amount: string | number, currency: string): string {
  const n = Number(amount)
  if (currency === "HUF") {
    // Space thousands separator
    return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(n).replace(/,/g, " ")} HUF`
  }
  if (currency === "EUR") return `€${n.toFixed(2)}`
  if (currency === "USD") return `$${n.toFixed(2)}`
  return `${n.toFixed(2)} ${currency}`
}

function formatTxDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>("month")
  const [showAdd, setShowAdd] = useState(false)
  const range = useMemo(() => periodRange(period), [period])

  const txQuery = useTransactionsQuery({ since: range.since })
  const categoriesQuery = useCategoriesQuery()
  const budgetsQuery = useBudgetsQuery()
  const deleteTx = useDeleteTransactionMutation()

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c)
    return map
  }, [categoriesQuery.data])

  const txs = txQuery.data ?? []

  // Stats. Multi-currency: keep currencies separate — we don't auto-convert.
  const totalsByCurrency = useMemo(() => {
    const expense = new Map<string, number>()
    const income = new Map<string, number>()
    for (const t of txs) {
      const target = t.kind === "expense" ? expense : income
      target.set(t.currency, (target.get(t.currency) ?? 0) + Number(t.amount))
    }
    return { expense, income }
  }, [txs])

  const expenseRows = useMemo(
    () =>
      [...totalsByCurrency.expense.entries()].sort((a, b) => b[1] - a[1]),
    [totalsByCurrency]
  )
  const incomeRows = useMemo(
    () => [...totalsByCurrency.income.entries()].sort((a, b) => b[1] - a[1]),
    [totalsByCurrency]
  )

  const largestExpense = useMemo(() => {
    let max: Transaction | null = null
    for (const t of txs) {
      if (t.kind !== "expense") continue
      if (!max || Number(t.amount) > Number(max.amount)) max = t
    }
    return max
  }, [txs])

  // Donut data: by category, expenses only, in default (most-used) currency
  const donutData = useMemo(() => {
    const totals = new Map<string, { ms: number; color: string; name: string }>()
    for (const t of txs) {
      if (t.kind !== "expense") continue
      const cat = categoriesById.get(t.category_id)
      const key = t.category_id
      const existing = totals.get(key) ?? {
        ms: 0,
        color: cat?.color ?? "var(--accent)",
        name: cat?.name ?? "—",
      }
      // Mix currencies into a single chart by treating amount as a unitless sum.
      // For multi-currency aggregation we'd convert; for now this just gives proportions.
      existing.ms += Number(t.amount)
      totals.set(key, existing)
    }
    return [...totals.entries()].map(([id, v]) => ({
      id,
      name: v.name,
      value: v.ms,
      color: v.color,
    }))
  }, [txs, categoriesById])

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  // Budget progress: spent in this period for each budget's category
  const budgetRows = useMemo(() => {
    const spentByCat = new Map<string, number>()
    for (const t of txs) {
      if (t.kind !== "expense") continue
      spentByCat.set(t.category_id, (spentByCat.get(t.category_id) ?? 0) + Number(t.amount))
    }
    return (budgetsQuery.data ?? [])
      .filter((b) => {
        // Only show budgets relevant to the current period
        if (period === "week" && b.period === "weekly") return true
        if (period === "month" && b.period === "monthly") return true
        if (period === "year" && b.period === "yearly") return true
        return false
      })
      .map((b) => {
        const cat = categoriesById.get(b.category_id)
        const spent = spentByCat.get(b.category_id) ?? 0
        const limit = Number(b.amount)
        const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
        const overage = spent > limit ? spent - limit : 0
        let cls = "ok"
        if (pct >= 100) cls = "danger"
        else if (pct >= 85) cls = "warn"
        return {
          id: b.id,
          category: cat,
          limit,
          spent,
          pct,
          overage,
          cls,
          currency: b.currency,
        }
      })
  }, [budgetsQuery.data, txs, categoriesById, period])

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="page-head">
        <div>
          <h1>Finances</h1>
          <div className="sub">
            {range.label} · {txs.length} transaction{txs.length === 1 ? "" : "s"}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={14} strokeWidth={1.5} />
          Add transaction
        </button>
      </div>

      <div className="tabs">
        {PERIOD_TABS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="tab"
            data-active={period === p.id ? "true" : "false"}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatBox
          label="Total spent"
          rows={expenseRows.map(([cur, amt]) => formatAmount(amt, cur))}
        />
        <StatBox
          label="Total income"
          rows={incomeRows.map(([cur, amt]) => formatAmount(amt, cur))}
        />
        <StatBox
          label="Transactions"
          rows={[String(txs.length)]}
          foot={txs.length === 1 ? "1 record" : `${txs.length} records`}
        />
        <StatBox
          label="Largest expense"
          rows={[largestExpense ? formatAmount(largestExpense.amount, largestExpense.currency) : "—"]}
          foot={
            largestExpense
              ? categoriesById.get(largestExpense.category_id)?.name ?? "—"
              : "no expenses yet"
          }
        />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <div className="card">
          <div className="card-header">
            <div className="text-base font-semibold text-fg1">Spending by category</div>
            <span className="text-xs text-fg3">expenses only</span>
          </div>
          {donutData.length === 0 ? (
            <div className="text-sm text-fg3 py-12 text-center">
              No expenses in this period.
            </div>
          ) : (
            <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
              <div style={{ width: 200, height: 200, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.id} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-elev2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {donutData
                  .sort((a, b) => b.value - a.value)
                  .map((d) => {
                    const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0
                    return (
                      <div key={d.id} className="flex items-center gap-2">
                        <span
                          className="tag-dot shrink-0"
                          style={{ background: d.color, width: 8, height: 8 }}
                        />
                        <span className="text-13 flex-1 truncate text-fg1">{d.name}</span>
                        <span className="text-xs text-fg3 tabular-nums">{pct}%</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="text-base font-semibold text-fg1">Budget progress</div>
            <span className="text-xs text-fg3">{period}</span>
          </div>
          {budgetRows.length === 0 ? (
            <div className="text-sm text-fg3 py-6">
              No budgets for this period yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {budgetRows.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="tag-dot shrink-0"
                      style={{
                        background: r.category?.color ?? "var(--accent)",
                        width: 8,
                        height: 8,
                      }}
                    />
                    <span className="text-13 flex-1 truncate text-fg1">
                      {r.category?.name ?? "—"}
                    </span>
                    <span className="text-xs text-fg3 tabular-nums">
                      {formatAmount(r.spent, r.currency)} / {formatAmount(r.limit, r.currency)}
                    </span>
                  </div>
                  <div className="progress" style={{ height: 5 }}>
                    <div
                      className={`progress-bar ${r.cls}`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                  {r.overage > 0 && (
                    <div className="text-[11px] mt-1" style={{ color: "var(--danger)" }}>
                      Over by {formatAmount(r.overage, r.currency)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-base font-semibold text-fg1">Transactions</div>
        </div>
        {txs.length === 0 && !txQuery.isLoading && (
          <div className="text-sm text-fg3 py-12 text-center">
            No transactions in this period yet.
          </div>
        )}
        <div>
          {txs.map((t, i) => {
            const cat = categoriesById.get(t.category_id)
            const sign = t.kind === "income" ? "+" : "−"
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i < txs.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-xs text-fg3 tabular-nums w-16 shrink-0">
                  {formatTxDate(t.date)}
                </span>
                <span
                  className="tag-dot shrink-0"
                  style={{
                    background: cat?.color ?? "var(--accent)",
                    width: 8,
                    height: 8,
                  }}
                />
                <span className="text-13 text-fg1 shrink-0">{cat?.name ?? "—"}</span>
                <span className="text-13 text-fg3 truncate flex-1">
                  {t.note ?? ""}
                </span>
                <span
                  className="font-mono text-13 tabular-nums whitespace-nowrap"
                  style={{
                    color: t.kind === "income" ? "var(--success)" : "var(--fg1)",
                  }}
                >
                  {sign} {formatAmount(t.amount, t.currency)}
                </span>
                <button
                  type="button"
                  className="sb-icon-btn"
                  aria-label="Delete transaction"
                  onClick={() => {
                    if (window.confirm("Delete this transaction?")) {
                      deleteTx.mutate(t.id)
                    }
                  }}
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add transaction modal */}
      {showAdd && (
        <div className="tp-backdrop" onClick={() => setShowAdd(false)}>
          <div
            className="absolute inset-0 grid place-items-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ maxWidth: 560 }}>
              <button
                type="button"
                className="sb-icon-btn"
                aria-label="Close"
                onClick={() => setShowAdd(false)}
                style={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
              <AddTransactionForm onClose={() => setShowAdd(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({
  label,
  rows,
  foot,
}: {
  label: string
  rows: string[]
  foot?: string
}) {
  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">{label}</div>
      </div>
      <div className="flex flex-col gap-1">
        {rows.length === 0 ? (
          <div className="stat-value" style={{ fontSize: 22 }}>
            —
          </div>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="stat-value" style={{ fontSize: 18, lineHeight: 1.3 }}>
              {r}
            </div>
          ))
        )}
      </div>
      <div className="stat-foot">{foot && <span>{foot}</span>}</div>
    </div>
  )
}
