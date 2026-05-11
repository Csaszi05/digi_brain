import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { useTopicsQuery, type KanbanColumn, type Topic } from "@/api/topics"

type TaskNode = Task & { children: TaskNode[] }

function buildTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<string, TaskNode>()
  for (const t of tasks) byId.set(t.id, { ...t, children: [] })

  const roots: TaskNode[] = []
  for (const node of byId.values()) {
    if (node.parent_task_id && byId.has(node.parent_task_id)) {
      byId.get(node.parent_task_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortRecursive = (nodes: TaskNode[]) => {
    nodes.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position
      return a.created_at.localeCompare(b.created_at)
    })
    for (const n of nodes) sortRecursive(n.children)
  }
  sortRecursive(roots)
  return roots
}

const PRIORITY_DOT_CLASS: Record<Task["priority"], string> = {
  high: "dot-high",
  medium: "dot-med",
  low: "dot-low",
}

/** Sub-topic node — visual indicator it's a folder, navigates on click. */
function SubTopicNode({ topic, depth }: { topic: Topic; depth: number }) {
  const navigate = useNavigate()
  return (
    <div
      className="flex items-center gap-3 rounded-md border bg-bg-elev1 px-3 py-2 cursor-pointer hover:border-border-strong"
      style={{
        marginLeft: depth * 24,
        borderColor: topic.color ?? "var(--border)",
        borderLeftWidth: topic.color ? 3 : 1,
      }}
      onClick={() => navigate(`/topics/${topic.id}`)}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{topic.icon ?? "📁"}</span>
      {topic.color && !topic.icon && (
        <span
          className="tag-dot shrink-0"
          style={{ background: topic.color, width: 8, height: 8 }}
        />
      )}
      <span className="text-13 font-semibold flex-1 truncate text-fg1">
        {topic.name}
      </span>
      <span className="tag shrink-0" style={{ height: 18, fontSize: 10, padding: "0 5px" }}>
        topic
      </span>
      <ChevronRight size={14} strokeWidth={1.5} style={{ color: "var(--fg3)" }} />
    </div>
  )
}

function TaskNodeRow({
  node,
  depth,
  columnsById,
  onTaskClick,
}: {
  node: TaskNode
  depth: number
  columnsById: Map<string, KanbanColumn>
  onTaskClick?: (task: Task) => void
}) {
  const col = columnsById.get(node.column_id)
  const stripeColor = col?.color ?? (col?.is_done_column ? "#34d399" : "var(--accent)")
  const isDone = !!col?.is_done_column

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-md border border-border bg-bg-elev1 px-3 py-2 cursor-pointer hover:border-border-strong"
        style={{ marginLeft: depth * 24 }}
        onClick={() => onTaskClick?.(node)}
      >
        {node.icon ? (
          <span style={{ fontSize: 14, flexShrink: 0 }}>{node.icon}</span>
        ) : (
          <span
            className={`dot ${PRIORITY_DOT_CLASS[node.priority]}`}
            style={{ width: 8, height: 8 }}
          />
        )}
        <span
          className="tag-dot shrink-0"
          style={{ background: stripeColor, width: 6, height: 6 }}
        />
        <span
          className="text-13 flex-1 truncate"
          style={{
            color: isDone ? "var(--fg3)" : "var(--fg1)",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {node.title}
        </span>
        {node.story_points !== null && node.story_points !== undefined && (
          <span className="text-[11px] tabular-nums" style={{ color: "var(--indigo-300)" }}>
            {node.story_points}sp
          </span>
        )}
        {col && <span className="text-xs text-fg3 shrink-0">{col.name}</span>}
        {node.children.length > 0 && (
          <span className="text-xs text-fg3 tabular-nums shrink-0">
            ⊞ {node.children.length}
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {node.children.map((c) => (
            <TaskNodeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              columnsById={columnsById}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function TreeView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const topicsQuery = useTopicsQuery()
  const tasks = tasksQuery.data ?? []
  const tree = useMemo(() => buildTree(tasks), [tasks])

  const childTopics = useMemo(
    () =>
      (topicsQuery.data ?? [])
        .filter((t) => t.parent_id === topicId && !t.archived)
        .sort((a, b) => a.position - b.position),
    [topicsQuery.data, topicId]
  )

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  const isEmpty = childTopics.length === 0 && tasks.length === 0

  if (tasksQuery.isLoading) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading…</div>
  }
  if (isEmpty) {
    return (
      <div
        className="grid place-items-center text-fg3 text-sm"
        style={{ padding: 48, border: "1px dashed var(--border)", borderRadius: 12 }}
      >
        No tasks or sub-topics yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Sub-topics appear first */}
      {childTopics.map((t) => (
        <SubTopicNode key={t.id} topic={t} depth={0} />
      ))}

      {/* Task tree */}
      {tree.map((n) => (
        <TaskNodeRow
          key={n.id}
          node={n}
          depth={0}
          columnsById={columnsById}
          onTaskClick={onTaskClick}
        />
      ))}

      <div className="text-xs text-fg3 mt-2">
        Sub-topics are clickable · Set "Parent task" in the panel to nest tasks
      </div>
    </div>
  )
}
