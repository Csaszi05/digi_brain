import type { Task } from "@/api/tasks"

const PRIORITY_DOT_CLASS: Record<Task["priority"], string> = {
  high: "dot-high",
  medium: "dot-med",
  low: "dot-low",
}

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function TaskCard({ task }: { task: Task }) {
  const due = formatDueDate(task.due_date)
  const isToday = due === "Today"

  return (
    <div className="kb-card">
      <div className="kb-card-title">{task.title}</div>
      {task.description && <div className="kb-card-desc">{task.description}</div>}
      <div className="kb-card-foot">
        <span
          className={`dot ${PRIORITY_DOT_CLASS[task.priority]}`}
          style={{ width: 8, height: 8 }}
        />
        {due && (
          <span
            className={isToday ? "tag tag-accent" : ""}
            style={
              isToday
                ? { height: 18, fontSize: 11, padding: "0 6px" }
                : { fontSize: 12, color: "var(--fg3)", fontVariantNumeric: "tabular-nums" }
            }
          >
            {due}
          </span>
        )}
      </div>
    </div>
  )
}
