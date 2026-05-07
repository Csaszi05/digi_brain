import { useNavigate } from "react-router-dom"
import { useAllTasksQuery, type Task } from "@/api/tasks"
import { useTopicsQuery } from "@/api/topics"
import { isoDate } from "./types"

const PRIORITY_DOT_CLASS: Record<Task["priority"], string> = {
  high: "dot-high",
  medium: "dot-med",
  low: "dot-low",
}

function formatDue(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff < 0) return `${-diff}d overdue`
  return `in ${diff}d`
}

export function UpcomingDeadlinesWidget() {
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + 7)

  const tasksQuery = useAllTasksQuery({
    dueBefore: isoDate(horizon),
    onlyOpen: true,
    orderBy: "due_date",
    limit: 8,
  })
  const topicsQuery = useTopicsQuery()
  const navigate = useNavigate()

  const tasks = (tasksQuery.data ?? []).filter((t) => t.due_date !== null)
  const topicsById = new Map((topicsQuery.data ?? []).map((t) => [t.id, t]))

  return (
    <div className="card p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="text-base font-semibold text-fg1">Upcoming deadlines</div>
        <span className="text-xs text-fg3">next 7 days</span>
      </div>
      <div>
        {tasksQuery.isLoading && (
          <div className="text-sm text-fg3 px-5 py-6 text-center">Loading…</div>
        )}
        {!tasksQuery.isLoading && tasks.length === 0 && (
          <div className="text-sm text-fg3 px-5 py-6 text-center">
            Nothing on the horizon.
          </div>
        )}
        {tasks.map((t, i) => {
          const topic = topicsById.get(t.topic_id)
          const due = formatDue(t.due_date)
          const isOverdue = due.endsWith("overdue")
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-bg-hover ${
                i < tasks.length - 1 ? "border-b border-border" : ""
              }`}
              onClick={() => navigate(`/topics/${t.topic_id}`)}
            >
              <span
                className={`dot ${PRIORITY_DOT_CLASS[t.priority]}`}
                style={{ width: 8, height: 8 }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-13 font-medium text-fg1 truncate">{t.title}</div>
                {topic && (
                  <div className="text-xs text-fg3 mt-0.5 truncate">{topic.name}</div>
                )}
              </div>
              <span
                className="text-xs tabular-nums whitespace-nowrap"
                style={{ color: isOverdue ? "var(--danger)" : "var(--fg2)" }}
              >
                {due}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
