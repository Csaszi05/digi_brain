import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, FileText, Link2Off, Trash2, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTopicsQuery, type KanbanColumn } from "@/api/topics"
import {
  useDeleteTaskMutation,
  usePromoteTaskMutation,
  useTopicTasksQuery,
  useUpdateTaskMutation,
  type Task,
  type TaskPriority,
} from "@/api/tasks"
import { EmojiPicker } from "@/components/ui/EmojiPicker"
import { TaskLinksSection } from "./TaskLinksSection"

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
  const promote = usePromoteTaskMutation(topicId)
  const tasksQuery = useTopicTasksQuery(topicId)
  const topicsQuery = useTopicsQuery()
  const navigate = useNavigate()

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

  const handleOpenAsPage = async () => {
    if (task.linked_topic_id) {
      navigate(`/topics/${task.linked_topic_id}`)
      onClose()
      return
    }
    try {
      const updated = await promote.mutateAsync(task.id)
      if (updated.linked_topic_id) {
        navigate(`/topics/${updated.linked_topic_id}`)
        onClose()
      }
    } catch {
      window.alert("Could not promote task to a page.")
    }
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
          <div className="flex items-center gap-2">
            <EmojiPicker
              value={task.icon}
              onChange={(emoji) => update.mutate({ id: task.id, icon: emoji })}
              trigger={
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl hover:bg-bg-hover"
                  style={{ background: "var(--bg-elev2)", border: 0, cursor: "pointer", flexShrink: 0 }}
                  aria-label="Pick emoji icon"
                >
                  {task.icon ?? "📝"}
                </button>
              }
            />
            <input
              className="tp-title flex-1"
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
          </div>

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

          <div>
            <div className="tp-field-label">Story points</div>
            <div className="flex flex-wrap gap-1.5">
              {[null, 1, 2, 3, 5, 8, 13, 21].map((pt) => {
                const active = task.story_points === pt
                return (
                  <button
                    key={pt ?? "none"}
                    type="button"
                    onClick={() => update.mutate({ id: task.id, story_points: pt })}
                    style={{
                      minWidth: 34,
                      height: 28,
                      padding: "0 10px",
                      background: active ? "var(--accent)" : "var(--bg-elev2)",
                      color: active ? "var(--fg-on-accent)" : "var(--fg2)",
                      border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      fontVariantNumeric: "tabular-nums",
                      cursor: "pointer",
                      transition: "background 120ms, border-color 120ms",
                    }}
                  >
                    {pt ?? "—"}
                  </button>
                )
              })}
            </div>
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
              <div className="tp-field-label">Parent task</div>
              <select
                className="tp-field-select"
                value={task.parent_task_id ?? ""}
                onChange={(e) =>
                  update.mutate({
                    id: task.id,
                    parent_task_id: e.target.value || null,
                  })
                }
              >
                <option value="">— None (root) —</option>
                {(tasksQuery.data ?? [])
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="tp-meta-grid">
            <div>
              <div className="tp-field-label">Start date</div>
              <input
                type="date"
                className="tp-field-input"
                value={isoToDateInput(task.start_date)}
                onChange={(e) =>
                  update.mutate({
                    id: task.id,
                    start_date: dateInputToIso(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <div className="tp-field-label">End date (planned)</div>
              <input
                type="date"
                className="tp-field-input"
                value={isoToDateInput(task.end_date)}
                onChange={(e) =>
                  update.mutate({
                    id: task.id,
                    end_date: dateInputToIso(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div>
            <div className="tp-field-label">Due date (hard deadline)</div>
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

          {/* ─── Linked page ────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="tp-section-label" style={{ marginBottom: 0 }}>
              Linked page
            </div>
            {/* Single always-visible dropdown — no modes */}
            <select
              className="tp-field-select"
              value={task.linked_topic_id ?? ""}
              onChange={(e) =>
                update.mutate({
                  id: task.id,
                  linked_topic_id: e.target.value || null,
                })
              }
            >
              <option value="">— No linked page —</option>
              {(topicsQuery.data ?? [])
                .filter((t) => t.id !== topicId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon ? `${t.icon} ` : ""}
                    {t.name}
                  </option>
                ))}
            </select>
            {/* Action buttons below the dropdown */}
            <div className="flex items-center gap-2">
              {task.linked_topic_id ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenAsPage}
                >
                  <ExternalLink size={13} strokeWidth={1.5} />
                  Open page
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleOpenAsPage}
                  disabled={promote.isPending}
                  title="Create a new sub-topic page from this task"
                >
                  <FileText size={13} strokeWidth={1.5} />
                  {promote.isPending ? "Creating…" : "Create new page"}
                </button>
              )}
              {task.linked_topic_id && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    update.mutate({ id: task.id, linked_topic_id: null })
                  }
                >
                  <Link2Off size={13} strokeWidth={1.5} />
                  Remove link
                </button>
              )}
            </div>
          </div>

          <TaskLinksSection
            task={task}
            topicId={topicId}
            allTasks={tasksQuery.data ?? []}
            columns={columns}
          />

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
          <div className="ml-auto" />
          <button
            type="button"
            className="btn"
            onClick={handleOpenAsPage}
            disabled={promote.isPending}
            title={
              task.linked_topic_id
                ? "Open the linked sub-topic page"
                : "Create a sub-topic page for this task"
            }
          >
            {task.linked_topic_id ? (
              <>
                <ExternalLink size={14} strokeWidth={1.5} />
                Open page
              </>
            ) : (
              <>
                <FileText size={14} strokeWidth={1.5} />
                {promote.isPending ? "Creating…" : "Open as page"}
              </>
            )}
          </button>
        </footer>
      </aside>
    </>,
    document.body
  )
}
