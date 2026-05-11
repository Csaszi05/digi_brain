import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import {
  useActiveTimerQuery,
  useDeleteTimeEntryMutation,
  useTimeEntriesQuery,
  type TimeEntry,
} from "@/api/time"
import { useTopicsQuery, type Topic } from "@/api/topics"
import { ManualTimeEntryForm } from "@/components/time/ManualTimeEntryForm"

type Period = "today" | "week" | "month" | "year"

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
]

function startOfDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date = new Date()): Date {
  const d = startOfDay(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? 6 : day - 1 // Monday-anchored
  d.setDate(d.getDate() - diff)
  return d
}

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfYear(date = new Date()): Date {
  return new Date(date.getFullYear(), 0, 1)
}

function periodRange(period: Period): { since: Date; label: string } {
  const now = new Date()
  switch (period) {
    case "today":
      return { since: startOfDay(now), label: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) }
    case "week":
      return { since: startOfWeek(now), label: "Last 7 days" }
    case "month":
      return { since: startOfMonth(now), label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
    case "year":
      return { since: startOfYear(now), label: String(now.getFullYear()) }
  }
}

function durationMs(entry: TimeEntry, now: number): number {
  const start = new Date(entry.started_at).getTime()
  const end = entry.ended_at ? new Date(entry.ended_at).getTime() : now
  return Math.max(0, end - start)
}

function formatHours(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatHourDecimal(ms: number): string {
  return (ms / 3_600_000).toFixed(1)
}

function formatStarted(iso: string): string {
  const d = new Date(iso)
  const today = startOfDay()
  const target = startOfDay(d)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0)
    return `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  if (diffDays === -1)
    return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default function TimePage() {
  const [period, setPeriod] = useState<Period>("week")
  const [showManualForm, setShowManualForm] = useState(false)
  const range = useMemo(() => periodRange(period), [period])
  const sinceIso = range.since.toISOString()

  const entriesQuery = useTimeEntriesQuery({ since: sinceIso })
  const activeQuery = useActiveTimerQuery()
  const topicsQuery = useTopicsQuery()
  const deleteEntry = useDeleteTimeEntryMutation()

  const topicsById = useMemo(() => {
    const map = new Map<string, Topic>()
    for (const t of topicsQuery.data ?? []) map.set(t.id, t)
    return map
  }, [topicsQuery.data])

  const entries = entriesQuery.data ?? []
  const now = Date.now()

  // Aggregate per topic
  const totalsByTopic = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      const ms = durationMs(e, now)
      map.set(e.topic_id, (map.get(e.topic_id) ?? 0) + ms)
    }
    return map
  }, [entries, now])

  const totalMs = useMemo(
    () => entries.reduce((sum, e) => sum + durationMs(e, now), 0),
    [entries, now]
  )

  const ranked = useMemo(() => {
    return [...totalsByTopic.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([topicId, ms]) => ({
        topicId,
        topic: topicsById.get(topicId),
        ms,
        pct: totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0,
      }))
  }, [totalsByTopic, totalMs, topicsById])

  const longestSession = useMemo(() => {
    let max = 0
    for (const e of entries) {
      const d = durationMs(e, now)
      if (d > max) max = d
    }
    return max
  }, [entries, now])

  const sessions = entries.length

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="page-head">
        <div>
          <h1>Time tracking</h1>
          <div className="sub">
            {range.label} · {formatHourDecimal(totalMs)}h
            {activeQuery.data && (
              <>
                {" · "}
                <span style={{ color: "var(--accent-hover)" }}>timer running</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setShowManualForm((v) => !v)}
        >
          {showManualForm ? (
            <><X size={14} strokeWidth={1.5} /> Cancel</>
          ) : (
            <><Plus size={14} strokeWidth={1.5} /> Add manual entry</>
          )}
        </button>
      </div>

      {showManualForm && (
        <ManualTimeEntryForm onClose={() => setShowManualForm(false)} />
      )}

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
        <StatBox label="Total time" value={formatHourDecimal(totalMs)} suffix="h" />
        <StatBox
          label="Sessions"
          value={String(sessions)}
          foot={sessions === 1 ? "1 session" : `${sessions} sessions`}
        />
        <StatBox
          label="Top topic"
          value={ranked[0]?.topic?.name ?? "—"}
          foot={ranked[0] ? `${formatHourDecimal(ranked[0].ms)}h · ${ranked[0].pct}%` : "no data"}
          isString
        />
        <StatBox
          label="Longest session"
          value={formatHourDecimal(longestSession)}
          suffix="h"
        />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <div className="card">
          <div className="card-header">
            <div className="text-base font-semibold text-fg1">Top topics</div>
          </div>
          {ranked.length === 0 ? (
            <div className="text-sm text-fg3 py-6 text-center">
              No tracked time in this period.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {ranked.map((r) => (
                <div key={r.topicId}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="tag-dot shrink-0"
                      style={{
                        background: r.topic?.color ?? "var(--accent)",
                        width: 8,
                        height: 8,
                      }}
                    />
                    <span className="text-13 flex-1 truncate text-fg1">
                      {r.topic?.name ?? <em className="text-fg3">deleted topic</em>}
                    </span>
                    <span className="text-xs text-fg3 tabular-nums">{r.pct}%</span>
                    <span className="text-13 font-medium tabular-nums text-fg1 min-w-[50px] text-right">
                      {formatHours(r.ms)}
                    </span>
                  </div>
                  <div className="progress" style={{ height: 4 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${r.pct}%`,
                        background: r.topic?.color ?? "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="text-base font-semibold text-fg1">Recent sessions</div>
          </div>
          {entriesQuery.isLoading && (
            <div className="text-sm text-fg3 py-6 text-center">Loading…</div>
          )}
          {entries.length === 0 && !entriesQuery.isLoading && (
            <div className="text-sm text-fg3 py-6 text-center">
              No sessions in this period yet.
            </div>
          )}
          <div>
            {entries.slice(0, 12).map((e, i) => {
              const t = topicsById.get(e.topic_id)
              const ms = durationMs(e, now)
              const isRunning = !e.ended_at
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 px-5 py-3 ${
                    i < entries.slice(0, 12).length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span
                    className="tag-dot shrink-0"
                    style={{
                      background: t?.color ?? "var(--accent)",
                      width: 8,
                      height: 8,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-13 font-medium text-fg1 truncate">
                      {t?.name ?? "Deleted topic"}
                    </div>
                    {e.note && (
                      <div className="text-xs text-fg3 truncate mt-0.5">{e.note}</div>
                    )}
                  </div>
                  <span className="text-xs text-fg3 tabular-nums whitespace-nowrap">
                    {formatStarted(e.started_at)}
                  </span>
                  <span
                    className="text-13 font-medium tabular-nums whitespace-nowrap"
                    style={{
                      color: isRunning ? "var(--accent-hover)" : "var(--fg1)",
                      minWidth: 64,
                      textAlign: "right",
                    }}
                  >
                    {isRunning ? "running" : formatHours(ms)}
                  </span>
                  {!isRunning && (
                    <button
                      type="button"
                      className="sb-icon-btn"
                      aria-label="Delete entry"
                      onClick={() => {
                        if (window.confirm("Delete this time entry?")) {
                          deleteEntry.mutate(e.id)
                        }
                      }}
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({
  label,
  value,
  suffix,
  foot,
  isString,
}: {
  label: string
  value: string
  suffix?: string
  foot?: string
  isString?: boolean
}) {
  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">{label}</div>
      </div>
      <div
        className="stat-value"
        style={isString ? { fontSize: 18, fontWeight: 600, lineHeight: 1.3 } : undefined}
      >
        {value}
        {suffix && <sup>{suffix}</sup>}
      </div>
      <div className="stat-foot">{foot && <span>{foot}</span>}</div>
    </div>
  )
}
