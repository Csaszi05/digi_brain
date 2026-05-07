import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTopicQuery, useTopicsQuery } from "@/api/topics"
import { useTopicTasksQuery } from "@/api/tasks"
import { useTimeEntriesQuery } from "@/api/time"
import { startOfWeek } from "./types"

type Props = {
  config?: { topicId?: string }
}

export function PinnedTopicWidget({ config }: Props) {
  const navigate = useNavigate()
  const topicId = config?.topicId
  const topicQuery = useTopicQuery(topicId)
  const tasksQuery = useTopicTasksQuery(topicId)
  const entriesQuery = useTimeEntriesQuery({
    topicId: topicId ?? null,
    since: startOfWeek().toISOString(),
  })

  if (!topicId) {
    return (
      <div className="card flex flex-col gap-2">
        <div className="text-13 text-fg3">Pinned topic — no topic selected.</div>
        <div className="text-xs text-fg3">
          Open Customize and pick a topic for this widget.
        </div>
      </div>
    )
  }

  if (topicQuery.isLoading) {
    return <div className="card text-fg3 text-sm py-6 text-center">Loading…</div>
  }
  if (!topicQuery.data) {
    return <div className="card text-fg3 text-sm py-6 text-center">Topic not found.</div>
  }

  const topic = topicQuery.data
  const tasks = tasksQuery.data ?? []
  const doneColumnIds = new Set(
    topic.kanban_columns.filter((c) => c.is_done_column).map((c) => c.id)
  )
  const openTasks = tasks.filter((t) => !doneColumnIds.has(t.column_id))
  const doneTasks = tasks.filter((t) => doneColumnIds.has(t.column_id))

  const now = Date.now()
  const weekMs = (entriesQuery.data ?? []).reduce((sum, e) => {
    const start = new Date(e.started_at).getTime()
    const end = e.ended_at ? new Date(e.ended_at).getTime() : now
    return sum + Math.max(0, end - start)
  }, 0)
  const hours = (weekMs / 3_600_000).toFixed(1)

  const stripe = topic.color ?? "var(--accent)"

  return (
    <div className="card relative" style={{ borderLeft: `3px solid ${stripe}` }}>
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate(`/topics/${topic.id}`)}
      >
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl"
          style={{ background: "var(--bg-elev2)" }}
        >
          {topic.icon ?? "📁"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-fg1 truncate">
            {topic.name}
          </div>
          <div className="text-xs text-fg3 mt-0.5">
            {openTasks.length} open · {doneTasks.length} done · {hours}h this week
          </div>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} style={{ color: "var(--fg3)" }} />
      </div>

      {openTasks.slice(0, 3).length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {openTasks.slice(0, 3).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 text-13 text-fg2 truncate"
            >
              <span
                className={`dot dot-${
                  t.priority === "high" ? "high" : t.priority === "medium" ? "med" : "low"
                }`}
                style={{ width: 6, height: 6 }}
              />
              <span className="truncate">{t.title}</span>
            </div>
          ))}
          {openTasks.length > 3 && (
            <div className="text-xs text-fg3">+ {openTasks.length - 3} more</div>
          )}
        </div>
      )}
    </div>
  )
}

export function PinnedTopicConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const topicsQuery = useTopicsQuery()
  const topicId = (config.topicId as string | undefined) ?? ""

  return (
    <div>
      <div className="tp-field-label">Topic</div>
      <select
        className="tp-field-select"
        value={topicId}
        onChange={(e) => onChange({ ...config, topicId: e.target.value || null })}
      >
        <option value="">— Select a topic —</option>
        {(topicsQuery.data ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {t.icon ? `${t.icon} ` : ""}
            {t.name}
          </option>
        ))}
      </select>
    </div>
  )
}
