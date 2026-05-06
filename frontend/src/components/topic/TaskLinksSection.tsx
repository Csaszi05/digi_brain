import { useState } from "react"
import { Plus, X } from "lucide-react"
import {
  useCreateLinkMutation,
  useDeleteLinkMutation,
  useTopicLinksQuery,
  type LinkType,
  type TaskLink,
} from "@/api/links"
import type { Task } from "@/api/tasks"
import type { KanbanColumn } from "@/api/topics"

type Props = {
  task: Task
  topicId: string
  allTasks: Task[]
  columns: KanbanColumn[]
}

type LinkRow = {
  link: TaskLink
  /** The task on the OTHER side of the link from the current task */
  other: Task | undefined
  /** "outgoing" = current is source, "incoming" = current is target */
  direction: "outgoing" | "incoming"
}

const SECTION_LABELS: Record<string, string> = {
  blocks: "Blocks",
  blocked_by: "Blocked by",
  relates: "Related",
  duplicates: "Duplicates",
  duplicated_by: "Duplicated by",
}

function colorForColumn(col: KanbanColumn | undefined): string {
  if (!col) return "var(--fg3)"
  if (col.color) return col.color
  if (col.is_done_column) return "#34d399"
  return "var(--accent)"
}

export function TaskLinksSection({ task, topicId, allTasks, columns }: Props) {
  const linksQuery = useTopicLinksQuery(topicId)
  const create = useCreateLinkMutation(topicId)
  const del = useDeleteLinkMutation(topicId)

  const [adding, setAdding] = useState(false)
  const [pendingType, setPendingType] = useState<LinkType | "blocked_by">("blocks")
  const [pendingTarget, setPendingTarget] = useState<string>("")

  const allLinks = linksQuery.data ?? []
  const myLinks: LinkRow[] = []
  for (const l of allLinks) {
    if (l.source_id === task.id) {
      myLinks.push({
        link: l,
        other: allTasks.find((t) => t.id === l.target_id),
        direction: "outgoing",
      })
    } else if (l.target_id === task.id) {
      myLinks.push({
        link: l,
        other: allTasks.find((t) => t.id === l.source_id),
        direction: "incoming",
      })
    }
  }

  // Group: blocks (outgoing), blocked_by (incoming blocks), relates, duplicates
  const grouped: Record<string, LinkRow[]> = {
    blocks: [],
    blocked_by: [],
    relates: [],
    duplicates: [],
    duplicated_by: [],
  }
  for (const row of myLinks) {
    if (row.link.link_type === "blocks") {
      grouped[row.direction === "outgoing" ? "blocks" : "blocked_by"].push(row)
    } else if (row.link.link_type === "relates") {
      grouped.relates.push(row)
    } else if (row.link.link_type === "duplicates") {
      grouped[row.direction === "outgoing" ? "duplicates" : "duplicated_by"].push(row)
    }
  }

  const otherTopicTasks = allTasks.filter((t) => t.id !== task.id)

  const submit = async () => {
    if (!pendingTarget) {
      setAdding(false)
      return
    }
    try {
      // For "blocked by" we flip source/target on a 'blocks' link.
      if (pendingType === "blocked_by") {
        await create.mutateAsync({
          sourceId: pendingTarget,
          target_id: task.id,
          link_type: "blocks",
        })
      } else {
        await create.mutateAsync({
          sourceId: task.id,
          target_id: pendingTarget,
          link_type: pendingType,
        })
      }
      setAdding(false)
      setPendingTarget("")
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).response?.data?.detail
          : null
      window.alert(detail || "Could not create link")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="tp-section-label" style={{ marginBottom: 0 }}>
          Links
        </div>
        {!adding && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAdding(true)}
            disabled={otherTopicTasks.length === 0}
          >
            <Plus size={12} strokeWidth={1.5} />
            Add link
          </button>
        )}
      </div>

      {(["blocked_by", "blocks", "relates", "duplicates", "duplicated_by"] as const).map(
        (key) => {
          const list = grouped[key]
          if (list.length === 0) return null
          return (
            <div key={key}>
              <div className="text-[11px] font-medium uppercase text-fg3 mb-1.5" style={{ letterSpacing: "0.04em" }}>
                {SECTION_LABELS[key]}
              </div>
              <div className="flex flex-col gap-1">
                {list.map((row) => {
                  const otherCol = row.other
                    ? columns.find((c) => c.id === row.other!.column_id)
                    : undefined
                  return (
                    <div
                      key={row.link.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-bg-elev1 px-3 py-2"
                    >
                      <span
                        className="tag-dot shrink-0"
                        style={{ background: colorForColumn(otherCol), width: 8, height: 8 }}
                      />
                      <span className="text-13 text-fg1 truncate flex-1">
                        {row.other?.title ?? <em className="text-fg3">deleted task</em>}
                      </span>
                      {otherCol && (
                        <span className="text-xs text-fg3">{otherCol.name}</span>
                      )}
                      <button
                        type="button"
                        className="sb-icon-btn"
                        aria-label="Remove link"
                        onClick={() => del.mutate(row.link.id)}
                      >
                        <X size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }
      )}

      {adding && (
        <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-bg-elev1 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              className="tp-field-select"
              value={pendingType}
              onChange={(e) => setPendingType(e.target.value as typeof pendingType)}
            >
              <option value="blocks">Blocks</option>
              <option value="blocked_by">Blocked by</option>
              <option value="relates">Relates to</option>
              <option value="duplicates">Duplicates</option>
            </select>
            <select
              className="tp-field-select"
              value={pendingTarget}
              onChange={(e) => setPendingTarget(e.target.value)}
            >
              <option value="">Pick a task…</option>
              {otherTopicTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setAdding(false)
                setPendingTarget("")
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={submit}
              disabled={!pendingTarget || create.isPending}
            >
              {create.isPending ? "Adding…" : "Add link"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
