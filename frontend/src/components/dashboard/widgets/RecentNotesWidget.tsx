import { useNavigate } from "react-router-dom"
import { useAllNotesQuery } from "@/api/notes"
import { useTopicsQuery, type Topic } from "@/api/topics"

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}

function snippet(content: string): string {
  return content
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
}

export function RecentNotesWidget() {
  const notesQuery = useAllNotesQuery()
  const topicsQuery = useTopicsQuery()
  const navigate = useNavigate()

  const topicsById = new Map<string, Topic>(
    (topicsQuery.data ?? []).map((t) => [t.id, t])
  )
  const notes = (notesQuery.data ?? []).slice(0, 3)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Recent notes</h2>
      </div>
      {notes.length === 0 ? (
        <div
          className="grid place-items-center text-fg3 text-sm"
          style={{ padding: 32, border: "1px dashed var(--border)", borderRadius: 12 }}
        >
          No notes yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => {
            const topic = n.topic_id ? topicsById.get(n.topic_id) : null
            return (
              <div
                key={n.id}
                className="note-card"
                onClick={() => navigate("/notes")}
              >
                <div className="flex items-center justify-between">
                  {topic ? (
                    <span className="tag" style={{ height: 20, fontSize: 11 }}>
                      <span
                        className="tag-dot"
                        style={{ background: topic.color ?? "var(--accent)" }}
                      />
                      {topic.name}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] text-fg3">
                    {formatRelative(n.updated_at)}
                  </span>
                </div>
                <div className="note-card-title">{n.title}</div>
                {n.content.trim() && (
                  <div className="note-card-snippet">{snippet(n.content)}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
