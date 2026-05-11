import { useState } from "react"
import { ChevronRight, Pencil } from "lucide-react"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { useTopicQuery, type KanbanColumn } from "@/api/topics"

const PRIORITY_DOT_CLASS: Record<Task["priority"], string> = {
  high: "dot-high",
  medium: "dot-med",
  low: "dot-low",
}

const MAX_DEPTH = 4

type Props = {
  task: Task
  depth: number
  /** All tasks at the same "peer" level — used to find parent_task_id sub-tasks. */
  peerTasks: Task[]
  columnsById: Map<string, KanbanColumn>
  onOpenTask?: (task: Task) => void
}

export function ExpandableSubRow({
  task,
  depth,
  peerTasks,
  columnsById,
  onOpenTask,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const isLinked = !!task.linked_topic_id
  const directChildren = peerTasks.filter((t) => t.parent_task_id === task.id)
  const hasChildren = directChildren.length > 0 || isLinked
  const canExpand = hasChildren && depth < MAX_DEPTH

  // Lazy-fetch the linked topic's tasks and columns only when expanded.
  const linkedTasksQuery = useTopicTasksQuery(
    isLinked && expanded ? task.linked_topic_id ?? undefined : undefined
  )
  const linkedTopicQuery = useTopicQuery(
    isLinked && expanded ? task.linked_topic_id ?? undefined : undefined
  )

  const linkedColumnsById = new Map<string, KanbanColumn>(
    (linkedTopicQuery.data?.kanban_columns ?? []).map((c) => [c.id, c])
  )

  const linkedTopLevelTasks = (linkedTasksQuery.data ?? []).filter(
    (t) => !t.parent_task_id
  )

  const col = columnsById.get(task.column_id)
  const isDone = !!col?.is_done_column

  // Indent guide: subtle left border per depth level
  const indentPx = depth * 16

  return (
    <div>
      <div
        className="group/subrow flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-bg-hover"
        style={{
          marginLeft: indentPx,
          cursor: "pointer",
          borderLeft: depth > 0 ? "1px solid var(--border)" : "none",
          paddingLeft: depth > 0 ? 10 : 6,
          marginTop: 1,
        }}
        onClick={(e) => {
          e.stopPropagation()
          // If no children, open task panel; if has children, toggle expand
          if (!hasChildren) onOpenTask?.(task)
        }}
      >
        {/* Caret */}
        {canExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              cursor: "pointer",
              color: "var(--fg2)",
              display: "grid",
              placeItems: "center",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 120ms",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={11} strokeWidth={2} />
          </button>
        ) : (
          <span style={{ width: 11, flexShrink: 0 }} />
        )}

        {/* Icon or priority dot */}
        {task.icon ? (
          <span style={{ fontSize: 13, flexShrink: 0 }}>{task.icon}</span>
        ) : (
          <span
            className={`dot ${PRIORITY_DOT_CLASS[task.priority]}`}
            style={{ width: 6, height: 6, flexShrink: 0 }}
          />
        )}

        {/* Title */}
        <span
          className="text-[12px] flex-1 truncate"
          style={{
            color: isDone ? "var(--fg3)" : "var(--fg1)",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {task.title}
        </span>

        {/* Story points */}
        {task.story_points !== null && task.story_points !== undefined && (
          <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--indigo-300)" }}>
            {task.story_points}sp
          </span>
        )}

        {/* Column */}
        {col && (
          <span className="text-[10px] text-fg3 shrink-0">{col.name}</span>
        )}

        {/* Linked badge */}
        {isLinked && (
          <span
            className="text-[10px] shrink-0"
            style={{ color: "var(--accent-hover)" }}
            title="Has linked page"
          >
            📄
          </span>
        )}

        {/* Edit button — always opens TaskPanel */}
        {onOpenTask && (
          <button
            type="button"
            className="opacity-0 group-hover/subrow:opacity-100 transition-opacity shrink-0"
            aria-label="Edit"
            onClick={(e) => {
              e.stopPropagation()
              onOpenTask(task)
            }}
            style={{
              background: "transparent",
              border: 0,
              padding: 2,
              cursor: "pointer",
              color: "var(--fg3)",
              display: "grid",
              placeItems: "center",
              borderRadius: 4,
            }}
          >
            <Pencil size={10} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Children */}
      {expanded && canExpand && (
        <div>
          {linkedTasksQuery.isLoading && (
            <div
              className="text-[11px] text-fg3 py-1"
              style={{ marginLeft: indentPx + 16 + 10 }}
            >
              Loading…
            </div>
          )}

          {/* Linked topic tasks */}
          {isLinked &&
            linkedTopLevelTasks.map((child) => (
              <ExpandableSubRow
                key={child.id}
                task={child}
                depth={depth + 1}
                peerTasks={linkedTasksQuery.data ?? []}
                columnsById={linkedColumnsById}
                onOpenTask={onOpenTask}
              />
            ))}
          {isLinked && !linkedTasksQuery.isLoading && linkedTopLevelTasks.length === 0 && (
            <div
              className="text-[11px] text-fg3 py-1 italic"
              style={{ marginLeft: indentPx + 16 + 10 }}
            >
              No tasks on this page.
            </div>
          )}

          {/* parent_task_id sub-tasks */}
          {!isLinked &&
            directChildren.map((child) => (
              <ExpandableSubRow
                key={child.id}
                task={child}
                depth={depth + 1}
                peerTasks={peerTasks}
                columnsById={columnsById}
                onOpenTask={onOpenTask}
              />
            ))}
        </div>
      )}
    </div>
  )
}
