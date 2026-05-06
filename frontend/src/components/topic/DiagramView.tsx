import { useMemo, useRef } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  useTopicTasksQuery,
  useUpdateTaskMutation,
  type Task,
} from "@/api/tasks"
import { useTopicLinksQuery, type LinkType } from "@/api/links"
import type { KanbanColumn } from "@/api/topics"

const NODE_WIDTH = 220
const NODE_MIN_HEIGHT = 70
const GRID_COLS = 4
const GRID_GAP_X = 280
const GRID_GAP_Y = 110

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#34d399",
}

const LINK_STYLE: Record<LinkType, {
  stroke: string
  strokeDasharray?: string
  marker: MarkerType | null
  label: string
}> = {
  blocks: {
    stroke: "var(--fg2)",
    marker: MarkerType.ArrowClosed,
    label: "blocks",
  },
  relates: {
    stroke: "var(--accent-hover)",
    strokeDasharray: "6 4",
    marker: null,
    label: "relates",
  },
  duplicates: {
    stroke: "var(--fg3)",
    strokeDasharray: "2 4",
    marker: MarkerType.Arrow,
    label: "duplicates",
  },
}

/** Default grid position for a task that has never been laid out yet. */
function defaultPosition(index: number): { x: number; y: number } {
  const col = index % GRID_COLS
  const row = Math.floor(index / GRID_COLS)
  return { x: col * GRID_GAP_X, y: row * GRID_GAP_Y }
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function DiagramView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const linksQuery = useTopicLinksQuery(topicId)
  const updateTask = useUpdateTaskMutation(topicId)

  // Debounce position writes so dragging doesn't spam the API.
  const pendingTimers = useRef(new Map<string, number>())

  const tasks = tasksQuery.data ?? []
  const links = linksQuery.data ?? []

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = tasks.map((t, i) => {
      const col = columnsById.get(t.column_id)
      const isDone = !!col?.is_done_column
      const px = t.position_x ?? defaultPosition(i).x
      const py = t.position_y ?? defaultPosition(i).y

      return {
        id: t.id,
        position: { x: px, y: py },
        data: {
          label: <DiagramNodeLabel task={t} columnName={col?.name} done={isDone} />,
        },
        style: {
          width: NODE_WIDTH,
          minHeight: NODE_MIN_HEIGHT,
          background: "var(--bg-elev2)",
          color: "var(--fg1)",
          border: `1px solid ${isDone ? "var(--success)" : "var(--border)"}`,
          borderLeft: `3px solid ${PRIORITY_COLOR[t.priority]}`,
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          opacity: isDone ? 0.65 : 1,
        },
      } as Node
    })

    const edges: Edge[] = links.map((l, i) => {
      const style = LINK_STYLE[l.link_type as LinkType]
      return {
        id: `e-${l.id}`,
        source: l.source_id,
        target: l.target_id,
        type: "smoothstep",
        label: style.label,
        labelStyle: { fontSize: 10, fill: "var(--fg3)", fontWeight: 500 },
        labelBgStyle: { fill: "var(--bg-elev1)" },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        markerEnd: style.marker
          ? { type: style.marker, color: style.stroke }
          : undefined,
        style: {
          stroke: style.stroke,
          strokeWidth: 1.5,
          strokeDasharray: style.strokeDasharray,
        },
        // dedupe key just in case the same link comes back twice
        data: { idx: i },
      } as Edge
    })

    return { nodes, edges }
  }, [tasks, links, columnsById])

  const handleNodesChange = (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type !== "position" || !change.position || change.dragging) continue
      // dragging just stopped — persist the final coordinates
      const id = change.id
      const { x, y } = change.position
      const existing = pendingTimers.current.get(id)
      if (existing) window.clearTimeout(existing)
      const timeout = window.setTimeout(() => {
        updateTask.mutate({
          id,
          position_x: Math.round(x),
          position_y: Math.round(y),
        })
        pendingTimers.current.delete(id)
      }, 200)
      pendingTimers.current.set(id, timeout)
    }
  }

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
    <div className="flex flex-col gap-2">
      <div
        style={{
          height: 600,
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--bg-elev1)",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          onNodesChange={handleNodesChange}
          onNodeClick={(_, node) => {
            const t = tasks.find((x) => x.id === node.id)
            if (t) onTaskClick?.(t)
          }}
        >
          <Background gap={24} color="var(--border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="text-xs text-fg3 px-1">
        Tip: drag tasks to reposition — layout persists. Add Blocks / Relates / Duplicates links from the task panel.
      </div>
    </div>
  )
}

function DiagramNodeLabel({
  task,
  columnName,
  done,
}: {
  task: Task
  columnName: string | undefined
  done: boolean
}) {
  return (
    <div className="text-left">
      <div
        className="font-medium leading-tight"
        style={{
          color: "var(--fg1)",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {task.title}
      </div>
      {columnName && (
        <div className="text-[11px] text-fg3 mt-1">{columnName}</div>
      )}
    </div>
  )
}
