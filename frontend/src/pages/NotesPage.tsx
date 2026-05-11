import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search } from "lucide-react"
import {
  useAllNotesQuery,
  useCreateNoteMutation,
} from "@/api/notes"
import { useTopicsQuery } from "@/api/topics"

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
  return content
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
}

export default function NotesPage() {
  const [filterTopicId, setFilterTopicId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  const notesQuery = useAllNotesQuery(filterTopicId)
  const topicsQuery = useTopicsQuery()
  const create = useCreateNoteMutation(filterTopicId)

  const filtered = useMemo(() => {
    const all = notesQuery.data ?? []
    if (!search.trim()) return all
    const needle = search.trim().toLowerCase()
    return all.filter(
      (n) =>
        n.title.toLowerCase().includes(needle) ||
        n.content.toLowerCase().includes(needle)
    )
  }, [notesQuery.data, search])

  const topicById = useMemo(() => {
    const map = new Map<string, { name: string; icon: string | null; color: string | null }>()
    for (const t of topicsQuery.data ?? []) map.set(t.id, t)
    return map
  }, [topicsQuery.data])

  const handleNew = async () => {
    const note = await create.mutateAsync({
      title: "Untitled note",
      content: "",
      topic_id: filterTopicId,
    })
    navigate(`/notes/${note.id}`)
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1>Notes</h1>
          <div className="text-13 text-fg3 mt-0.5">
            {filtered.length} note{filtered.length === 1 ? "" : "s"}
            {filterTopicId && topicById.get(filterTopicId) && (
              <> in {topicById.get(filterTopicId)!.name}</>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleNew}
          disabled={create.isPending}
        >
          <Plus size={14} strokeWidth={1.5} />
          {create.isPending ? "Creating…" : "New note"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 max-w-md px-3"
          style={{
            height: 32,
            background: "var(--bg-elev1)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          <Search size={14} strokeWidth={1.5} style={{ color: "var(--fg3)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or content…"
            className="flex-1 bg-transparent border-0 outline-none text-13 text-fg1"
            style={{ font: "inherit" }}
          />
        </div>

        <select
          value={filterTopicId ?? ""}
          onChange={(e) => setFilterTopicId(e.target.value || null)}
          className="tp-field-select"
          style={{ width: 220 }}
        >
          <option value="">All topics</option>
          {(topicsQuery.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon ? `${t.icon} ` : ""}
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {notesQuery.isLoading && (
        <div className="text-sm text-fg3 text-center py-12">Loading notes…</div>
      )}
      {notesQuery.isError && (
        <div className="text-sm text-danger text-center py-12">Could not load notes</div>
      )}
      {!notesQuery.isLoading && !notesQuery.isError && filtered.length === 0 && (
        <div
          className="grid place-items-center text-fg3 text-sm"
          style={{
            padding: 48,
            border: "1px dashed var(--border)",
            borderRadius: 12,
          }}
        >
          {search.trim()
            ? `No notes match "${search}"`
            : filterTopicId
              ? "No notes in this topic yet."
              : "No notes yet. Click + to create one."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((n) => {
          const topic = n.topic_id ? topicById.get(n.topic_id) : null
          return (
            <div key={n.id} className="note-card" onClick={() => navigate(`/notes/${n.id}`)}>
              {topic && (
                <div className="flex items-center gap-2">
                  <span
                    className="tag-dot shrink-0"
                    style={{
                      background: topic.color ?? "var(--accent)",
                      width: 6,
                      height: 6,
                    }}
                  />
                  <span className="text-xs text-fg3 truncate">
                    {topic.icon ? `${topic.icon} ` : ""}
                    {topic.name}
                  </span>
                </div>
              )}
              <div className="note-card-title">{n.title}</div>
              {n.content.trim() && (
                <div className="note-card-snippet">{snippet(n.content)}</div>
              )}
              <div className="note-card-meta">
                <span>Updated {formatRelative(n.updated_at)}</span>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
