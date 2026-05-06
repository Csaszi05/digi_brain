import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Trash2, X } from "lucide-react"
import type { KanbanColumn } from "@/api/topics"
import {
  useDeleteTaskMutation,
  useUpdateTaskMutation,
  type Task,
  type TaskPriority,
} from "@/api/tasks"

type Props = {
  task: Task
  columns: KanbanColumn[]
  topicId: string
  onClose: () => void
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

function isoToDateInput(iso: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function dateInputToIso(value: string): string | null {
  if (!value) return null
  // store as midnight UTC of the chosen day
  return new Date(`${value}T00:00:00Z`).toISOString()
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const sec = Math.round((now - then) / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function TaskPanel({ task, columns, topicId, onClose }: Props) {
  const update = useUpdateTaskMutation(topicId)
  const del = useDeleteTaskMutation(topicId)

  // Local copies for text fields that we save on blur, so typing isn't laggy.
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? "")
  const titleSavedRef = useRef(task.title)
  const descSavedRef = useRef(task.description ?? "")

  // Sync local state when switching to a different task
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? "")
    titleSavedRef.current = task.title
    descSavedRef.current = task.description ?? ""
  }, [task.id, task.title, task.description])

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const saveTitle = () => {
    const trimmed = title.trim()
    if (!trimmed || trimmed === titleSavedRef.current) return
    titleSavedRef.current = trimmed
    update.mutate({ id: task.id, title: trimmed })
  }

  const saveDescription = () => {
    if (description === descSavedRef.current) return
    descSavedRef.current = description
    update.mutate({ id: task.id, description: description || null })
  }

  const handleDelete = async () => {
    if (!window.confirm("Delete this task?")) return
    await del.mutateAsync(task.id)
    onClose()
  }

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position)

  return createPortal(
    <>
      <div className="tp-backdrop" onClick={onClose} />
      <aside
        className="tp-panel"
        role="dialog"
        aria-label="Task details"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tp-header">
          <div className="tp-header-meta">
            <span className="font-mono text-xs">#{task.id.slice(0, 8)}</span>
            <span>·</span>
            <span>Updated {formatRelative(task.updated_at)}</span>
          </div>
          <button
            type="button"
            className="sb-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="tp-body">
          <input
            className="tp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                ;(e.currentTarget as HTMLInputElement).blur()
              }
            }}
            placeholder="Task title"
          />

          <div>
            <div className="tp-section-label">Description</div>
            <textarea
              className="tp-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Add a description (markdown supported soon)…"
            />
          </div>

          <div className="tp-meta-grid">
            <div>
              <div className="tp-field-label">Priority</div>
              <select
                className="tp-field-select"
                value={task.priority}
                onChange={(e) =>
                  update.mutate({
                    id: task.id,
                    priority: e.target.value as TaskPriority,
                  })
                }
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="tp-field-label">Due date</div>
              <input
                type="date"
                className="tp-field-input"
                value={isoToDateInput(task.due_date)}
                onChange={(e) =>
                  update.mutate({
                    id: task.id,
                    due_date: dateInputToIso(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div>
            <div className="tp-field-label">Column</div>
            <select
              className="tp-field-select"
              value={task.column_id}
              onChange={(e) =>
                update.mutate({
                  id: task.id,
                  column_id: e.target.value,
                })
              }
            >
              {sortedColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="tp-meta-row">
            <span>Created</span>
            <span className="num tabular-nums">{formatRelative(task.created_at)}</span>
          </div>
          {task.completed_at && (
            <div className="tp-meta-row">
              <span>Completed</span>
              <span className="num tabular-nums" style={{ color: "var(--success)" }}>
                {formatRelative(task.completed_at)}
              </span>
            </div>
          )}
        </div>

        <footer className="tp-footer">
          <button
            type="button"
            className="btn"
            onClick={handleDelete}
            disabled={del.isPending}
            style={{ color: "var(--danger)" }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Delete
          </button>
        </footer>
      </aside>
    </>,
    document.body
  )
}
