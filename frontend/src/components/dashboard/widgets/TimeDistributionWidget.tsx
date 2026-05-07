import { useTimeEntriesQuery } from "@/api/time"
import { useTopicsQuery, type Topic } from "@/api/topics"
import { startOfWeek } from "./types"

export function TimeDistributionWidget() {
  const since = startOfWeek().toISOString()
  const entriesQuery = useTimeEntriesQuery({ since })
  const topicsQuery = useTopicsQuery()
  const now = Date.now()

  const topicsById = new Map<string, Topic>(
    (topicsQuery.data ?? []).map((t) => [t.id, t])
  )

  const totalsByTopic = new Map<string, number>()
  for (const e of entriesQuery.data ?? []) {
    const start = new Date(e.started_at).getTime()
    const end = e.ended_at ? new Date(e.ended_at).getTime() : now
    const ms = Math.max(0, end - start)
    totalsByTopic.set(e.topic_id, (totalsByTopic.get(e.topic_id) ?? 0) + ms)
  }
  const totalMs = [...totalsByTopic.values()].reduce((s, v) => s + v, 0)

  const slices = [...totalsByTopic.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([topicId, ms]) => ({
      topicId,
      topic: topicsById.get(topicId),
      ms,
      pct: totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0,
      hours: ms / 3_600_000,
    }))

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="text-base font-semibold text-fg1">This week's time</div>
          <div className="text-xs text-fg3 mt-0.5">
            {(totalMs / 3_600_000).toFixed(1)} hours total
          </div>
        </div>
      </div>

      {slices.length === 0 ? (
        <div className="text-sm text-fg3 py-6 text-center">
          No time tracked this week.
        </div>
      ) : (
        <>
          <div
            className="mb-4 flex h-2 overflow-hidden rounded bg-bg-elev2"
            style={{ borderRadius: 4 }}
          >
            {slices.map((s) => (
              <div
                key={s.topicId}
                style={{
                  width: `${s.pct}%`,
                  background: s.topic?.color ?? "var(--accent)",
                }}
                title={`${s.topic?.name ?? "?"} · ${s.hours.toFixed(1)}h`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {slices.slice(0, 6).map((s) => (
              <div key={s.topicId} className="flex items-center gap-2.5">
                <span
                  className="tag-dot"
                  style={{
                    background: s.topic?.color ?? "var(--accent)",
                    width: 8,
                    height: 8,
                  }}
                />
                <span className="flex-1 text-13 text-fg2 truncate">
                  {s.topic?.name ?? "—"}
                </span>
                <span className="text-xs tabular-nums text-fg3">{s.pct}%</span>
                <span className="text-13 font-medium tabular-nums text-fg1 min-w-[40px] text-right">
                  {s.hours.toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
