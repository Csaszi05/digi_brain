import { useTransactionsQuery } from "@/api/finance"
import { isoDate, startOfMonth } from "./types"

function formatHUF(n: number): string {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 })
    .format(n)
    .replace(/,/g, " ")
}

export function SpentMonthWidget() {
  const txQuery = useTransactionsQuery({ since: isoDate(startOfMonth()) })

  // Sum expenses per currency. We don't auto-convert.
  const totals = new Map<string, number>()
  for (const t of txQuery.data ?? []) {
    if (t.kind !== "expense") continue
    totals.set(t.currency, (totals.get(t.currency) ?? 0) + Number(t.amount))
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">Spent this month</div>
      </div>
      <div className="stat-value">
        {sorted.length === 0 ? (
          "—"
        ) : sorted[0][0] === "HUF" ? (
          <>
            {formatHUF(sorted[0][1])}<sup>HUF</sup>
          </>
        ) : (
          <>
            {sorted[0][1].toFixed(2)}<sup>{sorted[0][0]}</sup>
          </>
        )}
      </div>
      <div className="stat-foot">
        {sorted.length > 1 && (
          <span>
            + {sorted
              .slice(1)
              .map(([cur, amt]) =>
                cur === "HUF" ? `${formatHUF(amt)} ${cur}` : `${amt.toFixed(2)} ${cur}`
              )
              .join(", ")}
          </span>
        )}
        {sorted.length === 0 && <span>no expenses yet</span>}
      </div>
    </div>
  )
}
