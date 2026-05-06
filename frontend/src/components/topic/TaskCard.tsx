import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Lock } from "lucide-react"
import type { Task } from "@/api/tasks"
import type { BlockingState } from "@/lib/blockingState"

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

type Props = {
  task: Task
  /** When true (e.g. inside DragOverlay), skip the sortable hook and render plain. */
  asOverlay?: boolean
  onClick?: (task: Task) => void
  blocking?: BlockingState
}

export function TaskCard({ task, asOverlay = false, onClick, blocking }: Props) {
  const sortable = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.column_id },
    disabled: asOverlay,
  })

  const due = formatDueDate(task.due_date)
  const isToday = due === "Today"

  const isCurrentlyBlocked = !!blocking?.currentlyBlocked && !task.completed_at

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging && !asOverlay ? 0 : isCurrentlyBlocked ? 0.6 : 1,
    cursor: asOverlay ? "grabbing" : "grab",
  }

  return (
    <div
      ref={asOverlay ? undefined : sortable.setNodeRef}
      style={style}
      className="kb-card"
      {...(asOverlay ? {} : sortable.attributes)}
      {...(asOverlay ? {} : sortable.listeners)}
      onClick={() => {
        // dnd-kit suppresses click when a real drag happened — this fires only on a clean click.
        if (!asOverlay) onClick?.(task)
      }}
    >
      <div className="kb-card-title flex items-start gap-1.5">
        {isCurrentlyBlocked && (
          <Lock
            size={12}
            strokeWidth={1.5}
            style={{ color: "var(--danger)", flexShrink: 0, marginTop: 3 }}
            aria-label="Currently blocked"
          />
        )}
        <span className="flex-1 min-w-0">{task.title}</span>
      </div>
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
        {blocking && (blocking.blockedByCount > 0 || blocking.blocksCount > 0) && (
          <span
            className="ml-auto inline-flex items-center gap-2 text-xs tabular-nums text-fg3"
            title={`${blocking.blockedByCount} blocker${blocking.blockedByCount === 1 ? "" : "s"} · blocks ${blocking.blocksCount}`}
          >
            {blocking.blockedByCount > 0 && (
              <span aria-label="Blocked by count">⛓ {blocking.blockedByCount}</span>
            )}
            {blocking.blocksCount > 0 && (
              <span aria-label="Blocks count">→ {blocking.blocksCount}</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
