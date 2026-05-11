import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTopicNotesQuery, useCreateNoteMutation, type Note } from "@/api/notes"

type Props = {
  topicId: string
  onOpenNote?: (note: Note) => void
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
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function snippet(content: string): string {
  // Strip basic markdown so the card preview is readable.
  return content
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
}

export function NotesSection({ topicId, onOpenNote }: Props) {
  const notesQuery = useTopicNotesQuery(topicId)
  const create = useCreateNoteMutation(topicId)
  const navigate = useNavigate()

  const handleNew = async () => {
    const note = await create.mutateAsync({
      title: "Untitled note",
      content: "",
      topic_id: topicId,
    })
    navigate(`/notes/${note.id}`)
    onOpenNote?.(note)
  }

  const handleOpen = (note: Note) => {
    navigate(`/notes/${note.id}`)
    onOpenNote?.(note)
  }

  const notes = notesQuery.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Notes for this topic</h2>
        <span className="text-xs text-fg3 tabular-nums">
          {notes.length} note{notes.length === 1 ? "" : "s"}
        </span>
      </div>

      {notesQuery.isLoading && (
        <div className="text-sm text-fg3">Loading notes…</div>
      )}
      {notesQuery.isError && (
        <div className="text-sm text-danger">Could not load notes</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <div key={n.id} className="note-card" onClick={() => handleOpen(n)}>
            <div className="note-card-title">{n.title}</div>
            {n.content.trim() && (
              <div className="note-card-snippet">{snippet(n.content)}</div>
            )}
            <div className="note-card-meta">
              <span>Updated {formatRelative(n.updated_at)}</span>
            </div>
          </div>
        ))}
        <button type="button" className="note-card-add" onClick={handleNew} disabled={create.isPending}>
          <Plus size={16} strokeWidth={1.5} />
          {create.isPending ? "Creating…" : "New note"}
        </button>
      </div>
    </div>
  )
}
