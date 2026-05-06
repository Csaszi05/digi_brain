import { useMemo, useState } from "react"
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
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, MoreHorizontal } from "lucide-react"
import type { KanbanColumn } from "@/api/topics"
import {
  useTopicTasksQuery,
  useUpdateTaskMutation,
  type Task,
} from "@/api/tasks"
import { TaskCard } from "./TaskCard"
import { AddTaskInline } from "./AddTaskInline"
import { DroppableColumnBody } from "./DroppableColumnBody"

const COLUMN_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#60a5fa"]

function colorForColumn(col: KanbanColumn, idx: number): string {
  if (col.color) return col.color
  if (col.is_done_column) return "#34d399"
  return COLUMN_COLORS[idx % COLUMN_COLORS.length]
}

function groupAndSort(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!map.has(t.column_id)) map.set(t.column_id, [])
    map.get(t.column_id)!.push(t)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.position - b.position)
  }
  return map
}

const TASKS_KEY = (topicId: string) => ["tasks", { topicId }] as const

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function KanbanBoard({ topicId, columns, onTaskClick }: Props) {
  const queryClient = useQueryClient()
  const tasksQuery = useTopicTasksQuery(topicId)
  const updateTask = useUpdateTaskMutation(topicId)

  const [addingForColumn, setAddingForColumn] = useState<string | null>(null)
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
    () => groupAndSort(tasksQuery.data ?? []),
    [tasksQuery.data]
  )

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string
    const found = (tasksQuery.data ?? []).find((t) => t.id === id) ?? null
    setActiveTask(found)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null)

    const { active, over } = e
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const allTasks = tasksQuery.data ?? []
    const moving = allTasks.find((t) => t.id === activeId)
    if (!moving) return

    // Resolve destination column id and target index inside that column.
    let destColumnId: string
    let destIndex: number

    const overData = over.data.current as { type?: string; columnId?: string } | undefined
    if (overData?.type === "column" && overData.columnId) {
      destColumnId = overData.columnId
      const list = tasksByColumn.get(destColumnId) ?? []
      // If the dragged task is already in this column, drop at the end means same column reorder
      destIndex = list.filter((t) => t.id !== activeId).length
    } else if (overData?.type === "task" && overData.columnId) {
      destColumnId = overData.columnId
      const list = tasksByColumn.get(destColumnId) ?? []
      const overIdx = list.findIndex((t) => t.id === overId)
      destIndex = overIdx >= 0 ? overIdx : list.length
    } else {
      return
    }

    // Build the new ordering for source + destination columns.
    const sourceColumnId = moving.column_id
    const sourceList = (tasksByColumn.get(sourceColumnId) ?? []).filter((t) => t.id !== activeId)
    const destListWithoutMoving =
      destColumnId === sourceColumnId
        ? sourceList
        : (tasksByColumn.get(destColumnId) ?? []).filter((t) => t.id !== activeId)

    const newDestList = [...destListWithoutMoving]
    const movedTask: Task = { ...moving, column_id: destColumnId }
    newDestList.splice(destIndex, 0, movedTask)

    // Renumber positions.
    const updates: { id: string; column_id: string; position: number }[] = []
    const rebuilt: Task[] = []

    for (const col of sortedColumns) {
      let list: Task[]
      if (col.id === destColumnId && col.id === sourceColumnId) {
        list = newDestList
      } else if (col.id === destColumnId) {
        list = newDestList
      } else if (col.id === sourceColumnId) {
        list = sourceList
      } else {
        list = tasksByColumn.get(col.id) ?? []
      }

      list.forEach((t, idx) => {
        const original = allTasks.find((o) => o.id === t.id)!
        const next: Task = { ...original, column_id: col.id, position: idx }
        rebuilt.push(next)
        if (original.column_id !== next.column_id || original.position !== next.position) {
          updates.push({ id: next.id, column_id: next.column_id, position: next.position })
        }
      })
    }

    // Optimistic cache update.
    queryClient.setQueryData<Task[]>(TASKS_KEY(topicId), rebuilt)

    // Send PATCHes for affected tasks (parallel).
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
      // On failure, refetch to restore truth.
      queryClient.invalidateQueries({ queryKey: TASKS_KEY(topicId) })
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
        <div className="kb-board">
          {sortedColumns.map((col, idx) => {
            const tasks = tasksByColumn.get(col.id) ?? []
            const stripeColor = colorForColumn(col, idx)
            return (
              <div key={col.id} className="kb-col">
                <div className="kb-col-stripe" style={{ background: stripeColor }} />
                <div className="kb-col-head">
                  <div className="kb-col-head-name">
                    <span
                      className="tag-dot"
                      style={{ background: stripeColor, width: 8, height: 8 }}
                    />
                    {col.name}
                    <span className="kb-col-count">{tasks.length}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="sb-icon-btn"
                      aria-label="Add task"
                      onClick={() => setAddingForColumn(col.id)}
                    >
                      <Plus size={14} strokeWidth={1.5} />
                    </button>
                    <button type="button" className="sb-icon-btn" aria-label="Column options">
                      <MoreHorizontal size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
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
                      <TaskCard key={t.id} task={t} onClick={onTaskClick} />
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
              </div>
            )
          })}
          <button type="button" className="kb-add-col">
            <Plus size={14} strokeWidth={1.5} />
            Add column
          </button>
        </div>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} asOverlay />}
      </DragOverlay>
    </DndContext>
  )
}
