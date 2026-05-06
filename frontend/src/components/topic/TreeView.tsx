import { useMemo } from "react"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import type { KanbanColumn } from "@/api/topics"

type Node = Task & { children: Node[] }

function buildTree(tasks: Task[]): Node[] {
  const byId = new Map<string, Node>()
  for (const t of tasks) byId.set(t.id, { ...t, children: [] })

  const roots: Node[] = []
  for (const node of byId.values()) {
    if (node.parent_task_id && byId.has(node.parent_task_id)) {
      byId.get(node.parent_task_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortRecursive = (nodes: Node[]) => {
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

function NodeRow({
  node,
  depth,
  columnsById,
  onTaskClick,
}: {
  node: Node
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
        <span
          className={`dot ${PRIORITY_DOT_CLASS[node.priority]}`}
          style={{ width: 8, height: 8 }}
        />
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
        {col && <span className="text-xs text-fg3 shrink-0">{col.name}</span>}
        {node.children.length > 0 && (
          <span className="text-xs text-fg3 tabular-nums shrink-0">
            {node.children.length}
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {node.children.map((c) => (
            <NodeRow
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
  const tasks = tasksQuery.data ?? []
  const tree = useMemo(() => buildTree(tasks), [tasks])
  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  if (tasksQuery.isLoading) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading…</div>
  }
  if (tasks.length === 0) {
    return (
      <div
        className="grid place-items-center text-fg3 text-sm"
        style={{ padding: 48, border: "1px dashed var(--border)", borderRadius: 12 }}
      >
        No tasks yet. Add some in the Kanban view.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {tree.map((n) => (
        <NodeRow
          key={n.id}
          node={n}
          depth={0}
          columnsById={columnsById}
          onTaskClick={onTaskClick}
        />
      ))}
      <div className="text-xs text-fg3 mt-2">
        Tip: set "Parent task" in the task panel to nest tasks here.
      </div>
    </div>
  )
}
