import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronRight, FileText, Lock, Plus } from "lucide-react"
import {
  useTopicTasksQuery,
  type Task,
} from "@/api/tasks"
import { useTopicQuery } from "@/api/topics"
import type { BlockingState } from "@/lib/blockingState"
import type { KanbanColumn } from "@/api/topics"
import { AddTaskInline } from "./AddTaskInline"

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
  /** Direct sub-tasks (parent_task_id === task.id). Used when this task is NOT linked to a page. */
  children?: Task[]
  /** Lookup for column metadata of THIS topic (used to label sub-task status). */
  columnsById?: Map<string, KanbanColumn>
  /** Topic id for create-sub-task mutation. */
  topicId?: string
}

export function TaskCard({
  task,
  asOverlay = false,
  onClick,
  blocking,
  children,
  columnsById,
  topicId,
}: Props) {
  const sortable = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.column_id },
    disabled: asOverlay,
  })
  const navigate = useNavigate()

  const due = formatDueDate(task.due_date)
  const isToday = due === "Today"
  const isLinked = !!task.linked_topic_id

  const isCurrentlyBlocked = !!blocking?.currentlyBlocked && !task.completed_at
  const [expanded, setExpanded] = useState(false)
  const [addingSub, setAddingSub] = useState(false)

  // For linked tasks, lazy-fetch the linked topic + its tasks when expanded.
  const linkedTopicQuery = useTopicQuery(
    isLinked && expanded ? task.linked_topic_id ?? undefined : undefined
  )
  const linkedTasksQuery = useTopicTasksQuery(
    isLinked && expanded ? task.linked_topic_id ?? undefined : undefined
  )

  // Decide what counts as "children" for the expand: linked-page tasks if linked, else parent_task_id sub-tasks.
  const linkedTopLevelTasks = useMemo(
    () =>
      (linkedTasksQuery.data ?? []).filter((t) => !t.parent_task_id),
    [linkedTasksQuery.data]
  )
  const linkedColumnsById = useMemo(
    () =>
      new Map(
        (linkedTopicQuery.data?.kanban_columns ?? []).map((c) => [c.id, c])
      ),
    [linkedTopicQuery.data]
  )

  const inTopicChildren = !isLinked && (children ?? []).length > 0
  // For linked tasks we don't know the count without fetching, so the caret shows optimistically.
  const showCaret = inTopicChildren || isLinked

  const sortedInTopicChildren = (children ?? [])
    .slice()
    .sort((a, b) => {
      const aDone = !!columnsById?.get(a.column_id)?.is_done_column
      const bDone = !!columnsById?.get(b.column_id)?.is_done_column
      if (aDone !== bDone) return aDone ? 1 : -1
      if (a.position !== b.position) return a.position - b.position
      return a.created_at.localeCompare(b.created_at)
    })

  const sortedLinkedTasks = linkedTopLevelTasks.slice().sort((a, b) => {
    const aDone = !!linkedColumnsById.get(a.column_id)?.is_done_column
    const bDone = !!linkedColumnsById.get(b.column_id)?.is_done_column
    if (aDone !== bDone) return aDone ? 1 : -1
    if (a.position !== b.position) return a.position - b.position
    return a.created_at.localeCompare(b.created_at)
  })

  const linkedFirstColumnId = useMemo(() => {
    const cols = linkedTopicQuery.data?.kanban_columns ?? []
    const sorted = [...cols].sort((a, b) => a.position - b.position)
    return sorted[0]?.id
  }, [linkedTopicQuery.data])

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
        if (asOverlay) return
        // dnd-kit suppresses click when a real drag happened — this fires only on a clean click.
        if (isLinked && task.linked_topic_id) {
          navigate(`/topics/${task.linked_topic_id}`)
        } else {
          onClick?.(task)
        }
      }}
    >
      <div className="kb-card-title flex items-start gap-1.5">
        {showCaret && (
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              marginTop: 2,
              cursor: "pointer",
              color: "var(--fg2)",
              display: "grid",
              placeItems: "center",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 120ms",
              flexShrink: 0,
            }}
          >
            <ChevronRight size={12} strokeWidth={2} />
          </button>
        )}
        {isCurrentlyBlocked && (
          <Lock
            size={12}
            strokeWidth={1.5}
            style={{ color: "var(--danger)", flexShrink: 0, marginTop: 3 }}
            aria-label="Currently blocked"
          />
        )}
        {isLinked && (
          <FileText
            size={12}
            strokeWidth={1.5}
            style={{ color: "var(--accent-hover)", flexShrink: 0, marginTop: 3 }}
            aria-label="Has a linked page"
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
        {inTopicChildren && (
          <span className="text-xs text-fg3 tabular-nums" title={`${children!.length} sub-tasks`}>
            ⊞ {children!.length}
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

      {expanded && (
        <div
          className="mt-2.5 pt-2 flex flex-col gap-1"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* Linked-topic tasks */}
          {isLinked && (
            <>
              {linkedTasksQuery.isLoading && (
                <div className="text-xs text-fg3 px-1.5 py-1">Loading page tasks…</div>
              )}
              {!linkedTasksQuery.isLoading && sortedLinkedTasks.length === 0 && !addingSub && (
                <div className="text-xs text-fg3 px-1.5 py-1">No tasks on this page yet.</div>
              )}
              {sortedLinkedTasks.map((c) => {
                const col = linkedColumnsById.get(c.column_id)
                const isDone = !!col?.is_done_column
                return (
                  <div
                    key={c.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/topics/${task.linked_topic_id}`)
                    }}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 cursor-pointer hover:bg-bg-hover"
                    style={{
                      fontSize: 12,
                      color: isDone ? "var(--fg3)" : "var(--fg1)",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    <span
                      className={`dot ${PRIORITY_DOT_CLASS[c.priority]}`}
                      style={{ width: 6, height: 6 }}
                    />
                    <span className="truncate flex-1">{c.title}</span>
                    {col && (
                      <span className="text-[10px] shrink-0" style={{ color: "var(--fg3)" }}>
                        {col.name}
                      </span>
                    )}
                  </div>
                )
              })}
              {addingSub && task.linked_topic_id && linkedFirstColumnId && (
                <div onClick={(e) => e.stopPropagation()} className="mt-1">
                  <AddTaskInline
                    topicId={task.linked_topic_id}
                    columnId={linkedFirstColumnId}
                    placeholder="Page task title…"
                    onClose={() => setAddingSub(false)}
                  />
                </div>
              )}
              {!addingSub && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAddingSub(true)
                  }}
                  disabled={!linkedFirstColumnId}
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-fg3 hover:text-fg1 hover:bg-bg-hover"
                  style={{ background: "transparent", border: 0, cursor: "pointer" }}
                >
                  <Plus size={12} strokeWidth={1.5} />
                  Add task to page
                </button>
              )}
            </>
          )}

          {/* In-topic sub-tasks (parent_task_id) — only when NOT linked */}
          {!isLinked && (
            <>
              {sortedInTopicChildren.map((c) => {
                const col = columnsById?.get(c.column_id)
                const isDone = !!col?.is_done_column
                return (
                  <div
                    key={c.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onClick?.(c)
                    }}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 cursor-pointer hover:bg-bg-hover"
                    style={{
                      fontSize: 12,
                      color: isDone ? "var(--fg3)" : "var(--fg1)",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    <span
                      className={`dot ${PRIORITY_DOT_CLASS[c.priority]}`}
                      style={{ width: 6, height: 6 }}
                    />
                    <span className="truncate flex-1">{c.title}</span>
                    {col && (
                      <span className="text-[10px] shrink-0" style={{ color: "var(--fg3)" }}>
                        {col.name}
                      </span>
                    )}
                  </div>
                )
              })}
              {addingSub && topicId && (
                <div onClick={(e) => e.stopPropagation()} className="mt-1">
                  <AddTaskInline
                    topicId={topicId}
                    columnId={task.column_id}
                    parentTaskId={task.id}
                    placeholder="Sub-task title…"
                    onClose={() => setAddingSub(false)}
                  />
                </div>
              )}
              {!addingSub && topicId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAddingSub(true)
                  }}
                  className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-fg3 hover:text-fg1 hover:bg-bg-hover"
                  style={{ background: "transparent", border: 0, cursor: "pointer" }}
                >
                  <Plus size={12} strokeWidth={1.5} />
                  Add sub-task
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
