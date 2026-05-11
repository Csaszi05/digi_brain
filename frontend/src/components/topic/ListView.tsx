import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { useTopicsQuery, type KanbanColumn, type Topic } from "@/api/topics"

type SortKey = "priority" | "title" | "column" | "due_date" | "updated_at"
type SortDir = "asc" | "desc"

const PRIORITY_DOT_CLASS: Record<Task["priority"], string> = {
  high: "dot-high",
  medium: "dot-med",
  low: "dot-low",
}

const PRIORITY_RANK: Record<Task["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function compareNullable(
  a: string | number | null,
  b: string | number | null,
  asc: boolean
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (a === b) return 0
  return (a < b ? -1 : 1) * (asc ? 1 : -1)
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

/** Sub-topic row — navigates to the topic's own page. */
function SubTopicRow({ topic }: { topic: Topic }) {
  const navigate = useNavigate()
  return (
    <tr
      onClick={() => navigate(`/topics/${topic.id}`)}
      style={{ cursor: "pointer" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: 14 }}>{topic.icon ?? "📁"}</span>
      </td>
      <td colSpan={3} style={{ padding: "10px 8px" }}>
        <div className="flex items-center gap-2">
          {topic.color && (
            <span
              className="tag-dot shrink-0"
              style={{ background: topic.color, width: 8, height: 8 }}
            />
          )}
          <span className="text-13 font-semibold text-fg1">{topic.name}</span>
          <span
            className="tag"
            style={{ height: 18, fontSize: 10, padding: "0 5px", marginLeft: 4 }}
          >
            topic
          </span>
        </div>
      </td>
      <td style={{ padding: "10px 8px", color: "var(--fg3)", fontSize: 12 }}>—</td>
      <td style={{ padding: "10px 14px", textAlign: "right" }}>
        <ChevronRight size={14} strokeWidth={1.5} style={{ color: "var(--fg3)" }} />
      </td>
    </tr>
  )
}

export function ListView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const topicsQuery = useTopicsQuery()
  const [sortKey, setSortKey] = useState<SortKey>("updated_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [columnFilter, setColumnFilter] = useState<string>("")

  const childTopics = useMemo(
    () => (topicsQuery.data ?? []).filter((t) => t.parent_id === topicId && !t.archived),
    [topicsQuery.data, topicId]
  )

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  const sorted = useMemo(() => {
    const all = tasksQuery.data ?? []
    const filtered = columnFilter
      ? all.filter((t) => t.column_id === columnFilter)
      : all
    const list = [...filtered]
    const asc = sortDir === "asc"

    list.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return compareNullable(a.title.toLowerCase(), b.title.toLowerCase(), asc)
        case "priority":
          return compareNullable(PRIORITY_RANK[a.priority], PRIORITY_RANK[b.priority], asc)
        case "column": {
          const an = columnsById.get(a.column_id)
          const bn = columnsById.get(b.column_id)
          return compareNullable(an?.position ?? null, bn?.position ?? null, asc)
        }
        case "due_date":
          return compareNullable(a.due_date, b.due_date, asc)
        case "updated_at":
          return compareNullable(a.updated_at, b.updated_at, asc)
      }
    })
    return list
  }, [tasksQuery.data, columnFilter, sortKey, sortDir, columnsById])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "title" || key === "priority" || key === "column" ? "asc" : "desc")
    }
  }

  const SortableHeader = ({
    k,
    label,
    align = "left",
  }: {
    k: SortKey
    label: string
    align?: "left" | "right"
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 text-fg3 hover:text-fg1 transition-colors"
      style={{
        textAlign: align,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        width: "100%",
        font: "inherit",
      }}
    >
      {label}
      {sortKey === k &&
        (sortDir === "asc" ? (
          <ChevronUp size={12} strokeWidth={1.5} />
        ) : (
          <ChevronDown size={12} strokeWidth={1.5} />
        ))}
    </button>
  )

  const isEmpty = childTopics.length === 0 && (tasksQuery.data ?? []).length === 0

  if (tasksQuery.isLoading) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading…</div>
  }
  if (isEmpty) {
    return (
      <div
        className="grid place-items-center text-fg3 text-sm"
        style={{ padding: 48, border: "1px dashed var(--border)", borderRadius: 12 }}
      >
        No tasks or sub-topics yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <select
          className="tp-field-select"
          style={{ width: 220 }}
          value={columnFilter}
          onChange={(e) => setColumnFilter(e.target.value)}
        >
          <option value="">All columns</option>
          {columns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <span className="text-xs text-fg3 ml-auto tabular-nums">
          {childTopics.length > 0 && `${childTopics.length} sub-topic${childTopics.length === 1 ? "" : "s"} · `}
          {sorted.length} task{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-bg-elev1 overflow-hidden">
        <table className="w-full text-13 tabular-nums" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "10px 14px", width: 32 }}></th>
              <th style={{ padding: "10px 8px", width: 90 }}>
                <SortableHeader k="priority" label="Priority" />
              </th>
              <th style={{ padding: "10px 8px" }}>
                <SortableHeader k="title" label="Title" />
              </th>
              <th style={{ padding: "10px 8px", width: 160 }}>
                <SortableHeader k="column" label="Column" />
              </th>
              <th style={{ padding: "10px 8px", width: 110 }}>
                <SortableHeader k="due_date" label="Due" />
              </th>
              <th style={{ padding: "10px 14px", width: 110 }}>
                <SortableHeader k="updated_at" label="Updated" align="right" />
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Sub-topics first */}
            {childTopics.map((topic) => (
              <SubTopicRow key={topic.id} topic={topic} />
            ))}

            {/* Tasks */}
            {sorted.map((t, i) => {
              const col = columnsById.get(t.column_id)
              const isDone = !!col?.is_done_column
              const stripeColor = col?.color ?? (isDone ? "#34d399" : "var(--accent)")
              const isSubTask = !!t.parent_task_id
              return (
                <tr
                  key={t.id}
                  onClick={() => onTaskClick?.(t)}
                  style={{
                    borderBottom:
                      i < sorted.length - 1 ? "1px solid var(--border)" : "0",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  <td style={{ padding: "10px 14px" }}>
                    {t.icon ? (
                      <span style={{ fontSize: 14 }}>{t.icon}</span>
                    ) : (
                      <span
                        className={`dot ${PRIORITY_DOT_CLASS[t.priority]}`}
                        style={{ width: 8, height: 8 }}
                      />
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", color: "var(--fg2)" }}>
                    {t.priority}
                    {isSubTask && (
                      <span className="text-[10px] text-fg3 ml-1">↳</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: isSubTask ? "10px 8px 10px 24px" : "10px 8px",
                      color: isDone ? "var(--fg3)" : "var(--fg1)",
                      textDecoration: isDone ? "line-through" : "none",
                      maxWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.title}
                    {t.story_points !== null && t.story_points !== undefined && (
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: "var(--indigo-300)" }}
                      >
                        {t.story_points}sp
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {col && (
                      <span className="tag" style={{ height: 20, fontSize: 11 }}>
                        <span
                          className="tag-dot"
                          style={{ background: stripeColor, width: 6, height: 6 }}
                        />
                        {col.name}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", color: "var(--fg2)" }}>
                    {formatDueDate(t.due_date)}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--fg3)",
                      textAlign: "right",
                    }}
                  >
                    {formatRelative(t.updated_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
