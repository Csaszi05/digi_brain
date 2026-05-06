import { useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { useTopicLinksQuery } from "@/api/links"
import type { KanbanColumn } from "@/api/topics"

const NODE_WIDTH = 220
const NODE_HEIGHT = 70
const COL_GAP = 280
const ROW_GAP = 96

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#34d399",
}

/**
 * Topological layering by 'blocks' edges:
 *   layer 0 = tasks with no incoming blocks edge (sources)
 *   layer N = tasks reachable in exactly N steps via blocks edges
 * Tasks in cycles or unreachable get their own group at the end.
 */
function layoutLayers(
  taskIds: string[],
  blocksEdges: { from: string; to: string }[]
): Map<string, number> {
  const incoming = new Map<string, Set<string>>()
  const outgoing = new Map<string, Set<string>>()
  for (const id of taskIds) {
    incoming.set(id, new Set())
    outgoing.set(id, new Set())
  }
  for (const e of blocksEdges) {
    if (incoming.has(e.to)) incoming.get(e.to)!.add(e.from)
    if (outgoing.has(e.from)) outgoing.get(e.from)!.add(e.to)
  }

  // Kahn's algorithm
  const layer = new Map<string, number>()
  const queue: string[] = []
  for (const id of taskIds) {
    if ((incoming.get(id)?.size ?? 0) === 0) {
      layer.set(id, 0)
      queue.push(id)
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    const myLayer = layer.get(id)!
    for (const next of outgoing.get(id) ?? []) {
      const candidate = myLayer + 1
      if ((layer.get(next) ?? -1) < candidate) {
        layer.set(next, candidate)
      }
      // Only push next if all its parents have been laid out
      const parents = incoming.get(next)!
      if ([...parents].every((p) => layer.has(p))) {
        if (!queue.includes(next)) queue.push(next)
      }
    }
  }

  // Anything not yet in the map (cycles, etc.) goes at the back
  let maxLayer = 0
  for (const v of layer.values()) if (v > maxLayer) maxLayer = v
  for (const id of taskIds) {
    if (!layer.has(id)) layer.set(id, maxLayer + 1)
  }
  return layer
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function PipelineView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const linksQuery = useTopicLinksQuery(topicId)
  const tasks = tasksQuery.data ?? []
  const allLinks = linksQuery.data ?? []

  const blocksEdges = useMemo(
    () =>
      allLinks
        .filter((l) => l.link_type === "blocks")
        .map((l) => ({ from: l.source_id, to: l.target_id })),
    [allLinks]
  )

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  const { nodes, edges } = useMemo(() => {
    if (tasks.length === 0) return { nodes: [] as Node[], edges: [] as Edge[] }

    const taskIds = tasks.map((t) => t.id)
    const layer = layoutLayers(taskIds, blocksEdges)

    // Group tasks per layer for vertical positioning
    const byLayer = new Map<number, Task[]>()
    for (const t of tasks) {
      const l = layer.get(t.id) ?? 0
      if (!byLayer.has(l)) byLayer.set(l, [])
      byLayer.get(l)!.push(t)
    }

    const nodes: Node[] = []
    const layers = [...byLayer.keys()].sort((a, b) => a - b)
    for (const l of layers) {
      const list = byLayer.get(l)!
      list.sort((a, b) => a.position - b.position)
      list.forEach((t, idx) => {
        const col = columnsById.get(t.column_id)
        const isDone = !!col?.is_done_column
        nodes.push({
          id: t.id,
          position: { x: l * COL_GAP, y: idx * ROW_GAP },
          data: { label: <PipelineNodeLabel task={t} columnName={col?.name} done={isDone} /> },
          style: {
            width: NODE_WIDTH,
            minHeight: NODE_HEIGHT,
            background: "var(--bg-elev2)",
            color: "var(--fg1)",
            border: `1px solid ${
              isDone ? "var(--success)" : "var(--border)"
            }`,
            borderLeft: `3px solid ${PRIORITY_COLOR[t.priority]}`,
            borderRadius: 8,
            padding: 8,
            fontSize: 12,
            opacity: isDone ? 0.65 : 1,
          },
        })
      })
    }

    const edges: Edge[] = blocksEdges.map((e, i) => ({
      id: `e-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--fg2)" },
      style: { stroke: "var(--fg2)", strokeWidth: 1.5 },
    }))

    return { nodes, edges }
  }, [tasks, blocksEdges, columnsById])

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
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          const t = tasks.find((x) => x.id === node.id)
          if (t) onTaskClick?.(t)
        }}
      >
        <Background gap={24} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="text-xs text-fg3 mt-2 px-1">
        Tip: add "Blocks" links from the task panel to wire dependencies into this flow.
      </div>
    </div>
  )
}

function PipelineNodeLabel({
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
