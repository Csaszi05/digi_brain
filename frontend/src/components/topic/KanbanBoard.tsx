import { useState } from "react"
import { Plus, MoreHorizontal } from "lucide-react"
import type { KanbanColumn } from "@/api/topics"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { TaskCard } from "./TaskCard"
import { AddTaskInline } from "./AddTaskInline"

const COLUMN_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#60a5fa"]

function colorForColumn(col: KanbanColumn, idx: number): string {
  if (col.color) return col.color
  if (col.is_done_column) return "#34d399"
  return COLUMN_COLORS[idx % COLUMN_COLORS.length]
}

export function KanbanBoard({ topicId, columns }: { topicId: string; columns: KanbanColumn[] }) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const [addingForColumn, setAddingForColumn] = useState<string | null>(null)

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)
  const tasksByColumn = new Map<string, Task[]>()
  for (const task of tasksQuery.data ?? []) {
    if (!tasksByColumn.has(task.column_id)) tasksByColumn.set(task.column_id, [])
    tasksByColumn.get(task.column_id)!.push(task)
  }
  for (const list of tasksByColumn.values()) {
    list.sort((a, b) => a.position - b.position)
  }

  return (
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
              <div className="kb-col-body">
                {tasksQuery.isLoading && (
                  <div className="px-2 py-3 text-xs text-fg3">Loading…</div>
                )}
                {tasksQuery.isError && (
                  <div className="px-2 py-3 text-xs text-danger">Failed to load tasks</div>
                )}
                {tasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
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
              </div>
            </div>
          )
        })}
        <button type="button" className="kb-add-col">
          <Plus size={14} strokeWidth={1.5} />
          Add column
        </button>
      </div>
    </div>
  )
}
