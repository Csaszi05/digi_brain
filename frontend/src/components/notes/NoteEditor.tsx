import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Eye, Pencil, Trash2, X } from "lucide-react"
import {
  useDeleteNoteMutation,
  useUpdateNoteMutation,
  type Note,
} from "@/api/notes"
import { useTopicsQuery } from "@/api/topics"

type Props = {
  note: Note
  onClose: () => void
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

export function NoteEditor({ note, onClose }: Props) {
  const update = useUpdateNoteMutation(note.topic_id)
  const del = useDeleteNoteMutation(note.topic_id)
  const topicsQuery = useTopicsQuery()

  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const titleSavedRef = useRef(note.title)
  const contentSavedRef = useRef(note.content)

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    titleSavedRef.current = note.title
    contentSavedRef.current = note.content
  }, [note.id, note.title, note.content])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const saveTitle = () => {
    const trimmed = title.trim()
    if (!trimmed || trimmed === titleSavedRef.current) {
      if (!trimmed) setTitle(titleSavedRef.current)
      return
    }
    titleSavedRef.current = trimmed
    update.mutate({ id: note.id, title: trimmed })
  }

  const saveContent = () => {
    if (content === contentSavedRef.current) return
    contentSavedRef.current = content
    update.mutate({ id: note.id, content })
  }

  const handleDelete = async () => {
    if (!window.confirm("Delete this note?")) return
    await del.mutateAsync(note.id)
    onClose()
  }

  return createPortal(
    <>
      <div className="tp-backdrop" onClick={onClose} />
      <aside
        className="tp-panel"
        role="dialog"
        aria-label="Note editor"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 720 }}
      >
        <header className="tp-header">
          <div className="tp-header-meta">
            <span>Updated {formatRelative(note.updated_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="tabs" style={{ height: 28 }}>
              <button
                type="button"
                className="tab"
                data-active={mode === "edit" ? "true" : "false"}
                onClick={() => {
                  saveContent()
                  setMode("edit")
                }}
              >
                <Pencil size={12} strokeWidth={1.5} />
                Edit
              </button>
              <button
                type="button"
                className="tab"
                data-active={mode === "preview" ? "true" : "false"}
                onClick={() => {
                  saveContent()
                  setMode("preview")
                }}
              >
                <Eye size={12} strokeWidth={1.5} />
                Preview
              </button>
            </div>
            <button
              type="button"
              className="sb-icon-btn"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
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
            placeholder="Note title"
          />

          <div>
            <div className="tp-field-label">Topic</div>
            <select
              className="tp-field-select"
              value={note.topic_id ?? ""}
              onChange={(e) =>
                update.mutate({
                  id: note.id,
                  topic_id: e.target.value || null,
                })
              }
            >
              <option value="">— No topic —</option>
              {(topicsQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ""}
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {mode === "edit" ? (
            <textarea
              className="tp-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={saveContent}
              placeholder="Write your note in markdown…"
              style={{ minHeight: 400, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
            />
          ) : (
            <div className="md-preview">
              {content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <div className="text-fg3 italic text-sm">Nothing to preview yet.</div>
              )}
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
