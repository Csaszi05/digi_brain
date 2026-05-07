import { useMemo, useRef } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  useTopicTasksQuery,
  useUpdateTaskMutation,
  type Task,
} from "@/api/tasks"
import {
  useCreateLinkMutation,
  useDeleteLinkMutation,
  useTopicLinksQuery,
  type TaskLink,
} from "@/api/links"
import type { KanbanColumn } from "@/api/topics"

const NODE_WIDTH = 220
const GAP_X = 60
const DEFAULT_Y = 40

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#34d399",
}

type PipelineNodeData = {
  task: Task
  columnName?: string
  isDone: boolean
}

type PipelineNode = Node<PipelineNodeData, "pipelineTask">

/** Custom React Flow node with only L/R handles to enforce horizontal flow. */
function PipelineTaskNode({ data }: NodeProps<PipelineNode>) {
  const { task, columnName, isDone } = data
  return (
    <div className="pipe-node relative" data-done={isDone ? "true" : "false"}>
      <span
        className="pipe-node-priority"
        style={{ background: PRIORITY_COLOR[task.priority] }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="pipe-handle target"
        isConnectableStart={false}
      />
      <div className="pipe-node-title">{task.title}</div>
      {columnName && <div className="pipe-node-col">{columnName}</div>}
      <Handle
        type="source"
        position={Position.Right}
        className="pipe-handle source"
        isConnectableEnd={false}
      />
    </div>
  )
}

const nodeTypes = { pipelineTask: PipelineTaskNode }

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function PipelineView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const linksQuery = useTopicLinksQuery(topicId)
  const updateTask = useUpdateTaskMutation(topicId)
  const createLink = useCreateLinkMutation(topicId)
  const deleteLink = useDeleteLinkMutation(topicId)

  const pendingTimers = useRef(new Map<string, number>())

  const tasks = tasksQuery.data ?? []
  const links = linksQuery.data ?? []

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  /** Compute default positions for any task without saved coords:
   *  drop them in a horizontal line to the right of the existing tasks. */
  const positionsById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    const positioned = tasks.filter(
      (t) => t.position_x !== null && t.position_y !== null
    )
    const unpositioned = tasks.filter(
      (t) => t.position_x === null || t.position_y === null
    )
    let nextX =
      positioned.length > 0
        ? Math.max(...positioned.map((t) => t.position_x!)) + NODE_WIDTH + GAP_X
        : 0

    for (const t of positioned) {
      map.set(t.id, { x: t.position_x!, y: t.position_y! })
    }
    for (const t of unpositioned) {
      map.set(t.id, { x: nextX, y: DEFAULT_Y })
      nextX += NODE_WIDTH + GAP_X
    }
    return map
  }, [tasks])

  const nodes: PipelineNode[] = useMemo(
    () =>
      tasks.map((t) => {
        const col = columnsById.get(t.column_id)
        const pos = positionsById.get(t.id) ?? { x: 0, y: 0 }
        return {
          id: t.id,
          type: "pipelineTask",
          position: pos,
          data: {
            task: t,
            columnName: col?.name,
            isDone: !!col?.is_done_column,
          },
        }
      }),
    [tasks, columnsById, positionsById]
  )

  const edges: Edge[] = useMemo(
    () =>
      links
        .filter((l: TaskLink) => l.link_type === "blocks")
        .map((l) => ({
          id: `link-${l.id}`,
          source: l.source_id,
          target: l.target_id,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--fg2)" },
          style: { stroke: "var(--fg2)", strokeWidth: 1.5 },
          data: { linkId: l.id },
        })),
    [links]
  )

  const handleNodesChange = (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type !== "position" || !change.position || change.dragging) continue
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

  const handleConnect = async (conn: Connection) => {
    if (!conn.source || !conn.target) return
    if (conn.source === conn.target) return
    try {
      await createLink.mutateAsync({
        sourceId: conn.source,
        target_id: conn.target,
        link_type: "blocks",
      })
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (err as any).response?.data?.detail
          : null
      window.alert(detail || "Could not create connection")
    }
  }

  const handleEdgeClick = (e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation()
    const linkId = (edge.data as { linkId?: string } | undefined)?.linkId
    if (!linkId) return
    if (window.confirm("Remove this connection?")) {
      deleteLink.mutate(linkId)
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
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable
          nodesConnectable
          edgesFocusable
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onEdgeClick={handleEdgeClick}
          onNodeClick={(_, node) => {
            const t = tasks.find((x) => x.id === node.id)
            if (t) onTaskClick?.(t)
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} color="var(--border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="text-xs text-fg3 px-1">
        Tip: drag from the right edge of one task to the left edge of another to mark "comes after". Click an arrow to remove it.
      </div>
    </div>
  )
}
