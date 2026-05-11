import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ArrowLeft,
  Bold,
  Code,
  Columns2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Eye,
  Trash2,
} from "lucide-react"
import {
  useDeleteNoteMutation,
  useUpdateNoteMutation,
  type Note,
} from "@/api/notes"
import { api } from "@/lib/api"
import { useTopicsQuery } from "@/api/topics"
import { MarkdownEditorPane } from "@/components/notes/MarkdownEditorPane"

type ViewMode = "split" | "editor" | "preview"

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}


// Fetch a single note.
async function fetchNote(id: string): Promise<Note> {
  const { data } = await api.get<Note>(`/notes/${id}`)
  return data
}

export default function NotePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("split")

  const topicsQuery = useTopicsQuery()
  const update = useUpdateNoteMutation(null)
  const del = useDeleteNoteMutation(null)

  const titleSaved = useRef("")
  const contentSaved = useRef("")
  const saveTimer = useRef<number | null>(null)

  // Load the note
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchNote(id)
      .then((n) => {
        setNote(n)
        setTitle(n.title)
        setContent(n.content)
        titleSaved.current = n.title
        contentSaved.current = n.content
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [id])

  // Auto-save content with debounce
  const triggerSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!note) return
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        const titleChanged = newTitle.trim() && newTitle.trim() !== titleSaved.current
        const contentChanged = newContent !== contentSaved.current
        if (!titleChanged && !contentChanged) return
        const updates: { title?: string; content?: string } = {}
        if (titleChanged) { updates.title = newTitle.trim(); titleSaved.current = newTitle.trim() }
        if (contentChanged) { updates.content = newContent; contentSaved.current = newContent }
        update.mutate({ id: note.id, ...updates })
      }, 800)
    },
    [note, update]
  )

  const handleTitleChange = (val: string) => {
    setTitle(val)
    triggerSave(val, content)
  }

  const handleContentChange = useCallback(
    (val: string) => {
      setContent(val)
      triggerSave(title, val)
    },
    [title, triggerSave]
  )

  const handleDelete = async () => {
    if (!note) return
    if (!window.confirm("Delete this note permanently?")) return
    await del.mutateAsync(note.id)
    navigate("/notes")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-app text-fg3 text-sm">
        Loading note…
      </div>
    )
  }
  if (!note) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-app text-fg3 text-sm">
        Note not found.{" "}
        <button className="btn btn-ghost ml-2" onClick={() => navigate("/notes")}>
          Back
        </button>
      </div>
    )
  }

  const linkedTopic = note.topic_id
    ? topicsQuery.data?.find((t) => t.id === note.topic_id)
    : null

  const TOOLBAR_ACTIONS: {
    icon: typeof Bold
    label: string
    syntax: string
    wrap?: boolean
    block?: boolean
  }[] = [
    { icon: Bold, label: "Bold", syntax: "**", wrap: true },
    { icon: Italic, label: "Italic", syntax: "_", wrap: true },
    { icon: Heading1, label: "H1", syntax: "# ", block: true },
    { icon: Heading2, label: "H2", syntax: "## ", block: true },
    { icon: Heading3, label: "H3", syntax: "### ", block: true },
    { icon: List, label: "Bullet list", syntax: "- ", block: true },
    { icon: ListOrdered, label: "Numbered list", syntax: "1. ", block: true },
    { icon: Quote, label: "Quote", syntax: "> ", block: true },
    { icon: Code, label: "Inline code", syntax: "`", wrap: true },
    { icon: Link, label: "Link", syntax: "[text](url)", wrap: false },
    { icon: Minus, label: "Divider", syntax: "\n---\n", wrap: false },
  ]

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100vh",
        background: "var(--bg-app)",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <header
        className="topbar shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <input
          className="flex-1 bg-transparent border-0 outline-none text-base font-semibold text-fg1 min-w-0"
          style={{ letterSpacing: "-0.01em", font: "inherit" }}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
        />

        <select
          className="tp-field-select"
          style={{ width: 180 }}
          value={note.topic_id ?? ""}
          onChange={(e) =>
            update.mutate({ id: note.id, topic_id: e.target.value || null })
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

        <span className="text-xs text-fg3 tabular-nums">
          {update.isPending ? "Saving…" : `Saved ${formatRelative(note.updated_at)}`}
        </span>

        {/* View mode toggle */}
        <div className="tabs" style={{ height: 28 }}>
          <button
            type="button"
            className="tab"
            data-active={viewMode === "editor" ? "true" : "false"}
            onClick={() => setViewMode("editor")}
            title="Editor only"
          >
            <FileText size={13} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="tab"
            data-active={viewMode === "split" ? "true" : "false"}
            onClick={() => setViewMode("split")}
            title="Split view"
          >
            <Columns2 size={13} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="tab"
            data-active={viewMode === "preview" ? "true" : "false"}
            onClick={() => setViewMode("preview")}
            title="Preview only"
          >
            <Eye size={13} strokeWidth={1.5} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={handleDelete}
          aria-label="Delete note"
          style={{ color: "var(--danger)" }}
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      </header>

      {/* Formatting toolbar */}
      {viewMode !== "preview" && (
        <div
          className="flex items-center gap-0.5 px-4 shrink-0"
          style={{
            height: 36,
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elev1)",
          }}
        >
          {TOOLBAR_ACTIONS.map((action, i) => {
            const Icon = action.icon
            return (
              <button
                key={i}
                type="button"
                title={action.label}
                className="sb-icon-btn"
                style={{ width: 28, height: 28 }}
                onClick={() => {
                  // For block-level, prepend on new line
                  const insert = action.block
                    ? `\n${action.syntax}`
                    : action.syntax
                  setContent((prev) => {
                    const newContent = prev + insert
                    triggerSave(title, newContent)
                    return newContent
                  })
                }}
              >
                <Icon size={13} strokeWidth={1.5} />
              </button>
            )
          })}
          {linkedTopic && (
            <span
              className="tag ml-auto"
              style={{ height: 20, fontSize: 11 }}
            >
              <span
                className="tag-dot"
                style={{ background: linkedTopic.color ?? "var(--accent)" }}
              />
              {linkedTopic.icon ? `${linkedTopic.icon} ` : ""}
              {linkedTopic.name}
            </span>
          )}
        </div>
      )}

      {/* Editor / Preview area */}
      <div className="flex flex-1 min-h-0">
        {viewMode !== "preview" && (
          <div
            style={{
              flex: 1,
              borderRight: viewMode === "split" ? "1px solid var(--border)" : "none",
              overflow: "hidden",
            }}
          >
            <MarkdownEditorPane
              value={content}
              onChange={handleContentChange}
              placeholder="Write your note in markdown…"
            />
          </div>
        )}

        {viewMode !== "editor" && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 32px",
              background: "var(--bg-elev1)",
            }}
          >
            {content.trim() ? (
              <div className="md-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-fg3 text-sm italic">
                Nothing to preview yet. Start writing on the left.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
