import { useMemo, useState, type ReactNode } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import type { KanbanColumn, TopicWithColumns } from "@/api/topics"
import {
  useTopicTasksQuery,
  useUpdateTaskMutation,
  type Task,
} from "@/api/tasks"
import { useUpdateColumnMutation } from "@/api/columns"
import { useTopicLinksQuery } from "@/api/links"
import { computeBlockingState } from "@/lib/blockingState"
import { TaskCard } from "./TaskCard"
import { AddTaskInline } from "./AddTaskInline"
import { DroppableColumnBody } from "./DroppableColumnBody"
import { ColumnHeader } from "./ColumnHeader"
import { AddColumnInline } from "./AddColumnInline"

const COLUMN_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#60a5fa"]

/** Stable per-column default color: deterministic hash of the column id, so reordering doesn't repaint. */
function colorForColumn(col: KanbanColumn): string {
  if (col.color) return col.color
  if (col.is_done_column) return "#34d399"
  let h = 0
  for (let i = 0; i < col.id.length; i++) h = (h * 31 + col.id.charCodeAt(i)) | 0
  return COLUMN_COLORS[Math.abs(h) % COLUMN_COLORS.length]
}

/** Group only top-level tasks (no parent) by column. Sub-tasks are rendered nested inside their parent card. */
function groupTopLevelByColumn(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    if (t.parent_task_id) continue
    if (!map.has(t.column_id)) map.set(t.column_id, [])
    map.get(t.column_id)!.push(t)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.position - b.position)
  }
  return map
}

/** Index by parent task id → direct children list. */
function buildChildrenIndex(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.parent_task_id) continue
    if (!map.has(t.parent_task_id)) map.set(t.parent_task_id, [])
    map.get(t.parent_task_id)!.push(t)
  }
  return map
}

const TASKS_KEY = (topicId: string) => ["tasks", { topicId }] as const
const TOPIC_DETAIL_KEY = (id: string) => ["topics", id] as const

/**
 * Wrap a column in useSortable. Drag listeners are forwarded to the grip handle
 * inside ColumnHeader via render-prop, so dragging anywhere else in the column
 * (cards, buttons, body) doesn't accidentally start a column drag.
 */
function SortableColumnItem({
  columnId,
  children,
}: {
  columnId: string
  children: (args: {
    dragHandleProps: ReturnType<typeof useSortable>["listeners"] &
      ReturnType<typeof useSortable>["attributes"]
    isDragging: boolean
  }) => ReactNode
}) {
  const sortable = useSortable({
    id: columnId,
    data: { type: "column", columnId },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  }

  // Combine attributes + listeners into a single props bag for the drag handle.
  // We cast through unknown to avoid clashing aria-* type narrowing.
  const dragHandleProps = {
    ...(sortable.attributes as object),
    ...(sortable.listeners as object),
  } as ReturnType<typeof useSortable>["listeners"] &
    ReturnType<typeof useSortable>["attributes"]

  return (
    <div ref={sortable.setNodeRef} style={style} className="kb-col group/col">
      {children({ dragHandleProps, isDragging: sortable.isDragging })}
    </div>
  )
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
  /** Always opens the TaskPanel regardless of linked state. */
  onTaskEdit?: (task: Task) => void
  /** Controlled adding-state. If provided, parent owns it (so external triggers like a header button can drive it). */
  addingForColumn?: string | null
  onAddingForColumnChange?: (id: string | null) => void
}

export function KanbanBoard({
  topicId,
  columns,
  onTaskClick,
  onTaskEdit,
  addingForColumn: addingForColumnProp,
  onAddingForColumnChange,
}: Props) {
  const queryClient = useQueryClient()
  const tasksQuery = useTopicTasksQuery(topicId)
  const linksQuery = useTopicLinksQuery(topicId)
  const updateTask = useUpdateTaskMutation(topicId)
  const updateColumn = useUpdateColumnMutation(topicId)

  const [internalAddingForColumn, setInternalAddingForColumn] = useState<string | null>(null)
  const addingForColumn = addingForColumnProp ?? internalAddingForColumn
  const setAddingForColumn = (id: string | null) => {
    if (onAddingForColumnChange) onAddingForColumnChange(id)
    else setInternalAddingForColumn(id)
  }
  const [addingColumn, setAddingColumn] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  )

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  )

  const tasksByColumn = useMemo(
    () => groupTopLevelByColumn(tasksQuery.data ?? []),
    [tasksQuery.data]
  )

  const childrenByParent = useMemo(
    () => buildChildrenIndex(tasksQuery.data ?? []),
    [tasksQuery.data]
  )

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string
    const type = (e.active.data.current as { type?: string } | undefined)?.type
    if (type === "task") {
      const found = (tasksQuery.data ?? []).find((t) => t.id === id) ?? null
      setActiveTask(found)
    }
  }

  const handleColumnReorder = async (activeId: string, overId: string) => {
    const oldIdx = sortedColumns.findIndex((c) => c.id === activeId)
    const newIdx = sortedColumns.findIndex((c) => c.id === overId)
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

    const reordered = arrayMove(sortedColumns, oldIdx, newIdx)
    const renumbered = reordered.map((c, i) => ({ ...c, position: i }))

    // Optimistic cache update on the topic detail
    queryClient.setQueryData<TopicWithColumns>(
      TOPIC_DETAIL_KEY(topicId),
      (old) => (old ? { ...old, kanban_columns: renumbered } : old)
    )

    try {
      await Promise.all(
        renumbered
          .filter((c, i) => sortedColumns.find((o) => o.id === c.id)?.position !== i)
          .map((c) => updateColumn.mutateAsync({ id: c.id, position: c.position }))
      )
    } catch {
      queryClient.invalidateQueries({ queryKey: TOPIC_DETAIL_KEY(topicId) })
    }
  }

  const handleTaskReorder = async (activeId: string, overId: string, e: DragEndEvent) => {
    const allTasks = tasksQuery.data ?? []
    const moving = allTasks.find((t) => t.id === activeId)
    if (!moving) return

    let destColumnId: string
    let destIndex: number

    const overData = e.over!.data.current as { type?: string; columnId?: string } | undefined
    if (overData?.type === "column-body" && overData.columnId) {
      destColumnId = overData.columnId
      const list = tasksByColumn.get(destColumnId) ?? []
      destIndex = list.filter((t) => t.id !== activeId).length
    } else if (overData?.type === "task" && overData.columnId) {
      destColumnId = overData.columnId
      const list = tasksByColumn.get(destColumnId) ?? []
      const overIdx = list.findIndex((t) => t.id === overId)
      destIndex = overIdx >= 0 ? overIdx : list.length
    } else {
      return
    }

    const sourceColumnId = moving.column_id
    const sourceList = (tasksByColumn.get(sourceColumnId) ?? []).filter((t) => t.id !== activeId)
    const destListWithoutMoving =
      destColumnId === sourceColumnId
        ? sourceList
        : (tasksByColumn.get(destColumnId) ?? []).filter((t) => t.id !== activeId)

    const newDestList = [...destListWithoutMoving]
    const movedTask: Task = { ...moving, column_id: destColumnId }
    newDestList.splice(destIndex, 0, movedTask)

    const updates: { id: string; column_id: string; position: number }[] = []
    const rebuilt: Task[] = []

    for (const col of sortedColumns) {
      let list: Task[]
      if (col.id === destColumnId && col.id === sourceColumnId) list = newDestList
      else if (col.id === destColumnId) list = newDestList
      else if (col.id === sourceColumnId) list = sourceList
      else list = tasksByColumn.get(col.id) ?? []

      list.forEach((t, idx) => {
        const original = allTasks.find((o) => o.id === t.id)!
        const next: Task = { ...original, column_id: col.id, position: idx }
        rebuilt.push(next)
        if (original.column_id !== next.column_id || original.position !== next.position) {
          updates.push({ id: next.id, column_id: next.column_id, position: next.position })
        }
      })
    }

    queryClient.setQueryData<Task[]>(TASKS_KEY(topicId), rebuilt)

    try {
      await Promise.all(
        updates.map((u) =>
          updateTask.mutateAsync({
            id: u.id,
            column_id: u.column_id,
            position: u.position,
          })
        )
      )
    } catch {
      queryClient.invalidateQueries({ queryKey: TASKS_KEY(topicId) })
    }
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const activeType = (active.data.current as { type?: string } | undefined)?.type

    if (activeType === "column") {
      await handleColumnReorder(activeId, overId)
    } else if (activeType === "task") {
      await handleTaskReorder(activeId, overId, e)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="kb-board-wrap">
        <SortableContext
          items={sortedColumns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="kb-board">
            {sortedColumns.map((col) => {
              const tasks = tasksByColumn.get(col.id) ?? []
              const stripeColor = colorForColumn(col)
              return (
                <SortableColumnItem key={col.id} columnId={col.id}>
                  {({ dragHandleProps, isDragging }) => (
                    <>
                      <div className="kb-col-stripe" style={{ background: stripeColor }} />
                      <ColumnHeader
                        column={col}
                        topicId={topicId}
                        taskCount={tasks.length}
                        stripeColor={stripeColor}
                        onAddTask={() => setAddingForColumn(col.id)}
                        dragHandleProps={dragHandleProps}
                        isDraggingColumn={isDragging}
                      />
                      <DroppableColumnBody columnId={col.id}>
                        {tasksQuery.isLoading && (
                          <div className="px-2 py-3 text-xs text-fg3">Loading…</div>
                        )}
                        {tasksQuery.isError && (
                          <div className="px-2 py-3 text-xs text-danger">Failed to load tasks</div>
                        )}
                        <SortableContext
                          items={tasks.map((t) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {tasks.map((t) => (
                            <TaskCard
                              key={t.id}
                              task={t}
                              onClick={onTaskClick}
                              onEdit={onTaskEdit}
                              blocking={computeBlockingState(
                                t.id,
                                linksQuery.data ?? [],
                                tasksQuery.data ?? [],
                                columns
                              )}
                              children={childrenByParent.get(t.id)}
                              columnsById={columnsById}
                              topicId={topicId}
                            />
                          ))}
                        </SortableContext>
                        {addingForColumn === col.id && (
                          <AddTaskInline
                            topicId={topicId}
                            columnId={col.id}
                            onClose={() => setAddingForColumn(null)}
                          />
                        )}
                        {addingForColumn !== col.id && (
                          <button
                            type="button"
                            className="kb-add-task"
                            onClick={() => setAddingForColumn(col.id)}
                          >
                            <Plus size={12} strokeWidth={1.5} />
                            Add task
                          </button>
                        )}
                      </DroppableColumnBody>
                    </>
                  )}
                </SortableColumnItem>
              )
            })}
            {addingColumn ? (
              <AddColumnInline topicId={topicId} onClose={() => setAddingColumn(false)} />
            ) : (
              <button
                type="button"
                className="kb-add-col"
                onClick={() => setAddingColumn(true)}
              >
                <Plus size={14} strokeWidth={1.5} />
                Add column
              </button>
            )}
          </div>
        </SortableContext>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} asOverlay />}
      </DragOverlay>
    </DndContext>
  )
}
