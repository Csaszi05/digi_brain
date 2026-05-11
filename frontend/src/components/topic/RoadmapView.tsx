import { useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import { createPortal } from "react-dom"
import { api } from "@/lib/api"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { useTopicsQuery, type KanbanColumn, type Topic } from "@/api/topics"

const DAY_WIDTH = 36
const ROW_HEIGHT = 36
const ROW_GAP = 6
const TODAY_OFFSET_DAYS = 7

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#34d399",
}

// Deterministic color from topic id for child topics without explicit color
function stableColor(id: string): string {
  const palette = ["#818cf8", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fbbf24"]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric" })
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short" })
}

function pickWindow(tasks: Task[]) {
  const today = startOfDayUTC(new Date())
  let earliest = new Date(today.getTime() - TODAY_OFFSET_DAYS * 86_400_000)
  let latest = new Date(today.getTime() + 30 * 86_400_000)

  for (const t of tasks) {
    for (const iso of [t.start_date, t.end_date, t.due_date]) {
      if (!iso) continue
      const d = startOfDayUTC(new Date(iso))
      if (d.getTime() < earliest.getTime()) earliest = d
      if (d.getTime() > latest.getTime()) latest = d
    }
  }

  earliest = new Date(earliest.getTime() - 2 * 86_400_000)
  latest = new Date(latest.getTime() + 2 * 86_400_000)
  return { start: earliest, end: latest, today }
}

type TaskGroup = {
  topic: Topic | null   // null = current topic
  depth: number         // 0 = current, 1 = child, 2 = grandchild …
  color: string
  tasks: Task[]
}

/** Recursively collect all descendant topics with their depth level. */
function getDescendantsWithDepth(
  parentId: string,
  allTopics: Topic[],
  depth: number
): Array<{ topic: Topic; depth: number }> {
  const direct = allTopics
    .filter((t) => t.parent_id === parentId && !t.archived)
    .sort((a, b) => a.position - b.position)
  return direct.flatMap((t) => [
    { topic: t, depth },
    ...getDescendantsWithDepth(t.id, allTopics, depth + 1),
  ])
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function RoadmapView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const topicsQuery = useTopicsQuery()

  const descendants = useMemo(
    () => getDescendantsWithDepth(topicId, topicsQuery.data ?? [], 1),
    [topicId, topicsQuery.data]
  )

  // Fetch tasks for every descendant topic in parallel.
  const descendantTasksResults = useQueries({
    queries: descendants.map(({ topic: t }) => ({
      queryKey: ["tasks", { topicId: t.id }],
      queryFn: async () => {
        const { data } = await api.get<Task[]>(`/topics/${t.id}/tasks`)
        return data
      },
      staleTime: 30_000,
    })),
  })

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  // Build groups: [current topic, ...descendants in tree order]
  const groups = useMemo<TaskGroup[]>(() => {
    const result: TaskGroup[] = []

    const ownTasks = tasksQuery.data ?? []
    result.push({
      topic: null,
      depth: 0,
      color: "var(--accent)",
      tasks: ownTasks,
    })

    descendants.forEach(({ topic: ct, depth }, i) => {
      const ctTasks = descendantTasksResults[i]?.data ?? []
      result.push({
        topic: ct,
        depth,
        color: ct.color ?? stableColor(ct.id),
        tasks: ctTasks,
      })
    })

    return result
  }, [tasksQuery.data, descendants, descendantTasksResults])

  // All tasks flattened for time window computation
  const allTasks = useMemo(
    () => groups.flatMap((g) => g.tasks),
    [groups]
  )
  const allDated = useMemo(
    () => allTasks.filter((t) => t.start_date || t.end_date || t.due_date),
    [allTasks]
  )

  const { start, end, today } = useMemo(() => pickWindow(allDated), [allDated])
  const totalDays = diffDays(end, start) + 1
  const todayOffset = diffDays(today, start)

  const dayList = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < totalDays; i++) {
      arr.push(new Date(start.getTime() + i * 86_400_000))
    }
    return arr
  }, [start, totalDays])

  const isLoading = tasksQuery.isLoading || descendantTasksResults.some((q) => q.isLoading)

  if (isLoading) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading…</div>
  }
  if (allTasks.length === 0) {
    return (
      <div
        className="grid place-items-center text-fg3 text-sm"
        style={{ padding: 48, border: "1px dashed var(--border)", borderRadius: 12 }}
      >
        No tasks or sub-topics yet.
      </div>
    )
  }

  const totalWidth = totalDays * DAY_WIDTH

  // Collect undated tasks from all groups
  const allUndated = groups.flatMap((g) =>
    g.tasks
      .filter((t) => !t.start_date && !t.end_date && !t.due_date)
      .map((t) => ({ task: t, group: g }))
  )

  return (
    <div className="flex flex-col gap-4">
      <div
        className="overflow-x-auto"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--bg-elev1)",
        }}
      >
        {/* Time axis */}
        <div
          className="sticky top-0 flex"
          style={{
            background: "var(--bg-elev1)",
            borderBottom: "1px solid var(--border)",
            zIndex: 1,
            width: totalWidth,
          }}
        >
          {dayList.map((d, i) => {
            const isMonthStart = d.getUTCDate() === 1 || i === 0
            return (
              <div
                key={i}
                style={{
                  width: DAY_WIDTH,
                  flexShrink: 0,
                  padding: "6px 0",
                  textAlign: "center",
                  borderRight: "1px solid var(--border)",
                }}
              >
                {isMonthStart && (
                  <div
                    className="text-[10px] uppercase font-semibold"
                    style={{ color: "var(--fg2)", letterSpacing: "0.04em" }}
                  >
                    {formatMonthLabel(d)}
                  </div>
                )}
                <div className="text-[11px] tabular-nums" style={{ color: "var(--fg3)" }}>
                  {formatDayLabel(d)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Task bars — grouped by topic */}
        <div className="relative" style={{ width: totalWidth, padding: `${ROW_GAP}px 0` }}>
          {/* Today line */}
          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute"
              style={{
                left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2,
                top: 0,
                bottom: 0,
                width: 1,
                background: "var(--accent)",
                opacity: 0.6,
                zIndex: 0,
              }}
              title="Today"
            />
          )}

          {groups.map((group, gi) => {
            const dated = group.tasks.filter(
              (t) => t.start_date || t.end_date || t.due_date
            )
            // Show the group block even if no dated tasks (just don't show it)
            if (dated.length === 0 && !group.topic) return null
            if (dated.length === 0) return null

            const indent = group.depth * 16  // px indent per depth level
            const labelOpacity = Math.max(0.5, 1 - group.depth * 0.15)
            const barOpacityBase = Math.max(0.5, 0.85 - group.depth * 0.1)

            return (
              <div key={group.topic?.id ?? "own"}>
                {/* Group label for descendant topics */}
                {group.topic && (
                  <div
                    className="flex items-center gap-1.5 py-1"
                    style={{
                      paddingLeft: 8 + indent,
                      borderTop: gi > 0 ? "1px solid var(--border)" : "none",
                      marginTop: gi > 0 ? 4 : 0,
                      opacity: labelOpacity,
                    }}
                  >
                    {/* Depth indicator lines */}
                    {Array.from({ length: group.depth }).map((_, di) => (
                      <span
                        key={di}
                        style={{
                          width: 1,
                          height: 14,
                          background: "var(--border-strong)",
                          flexShrink: 0,
                          marginRight: 2,
                        }}
                      />
                    ))}
                    <span
                      className="tag-dot shrink-0"
                      style={{
                        background: group.color,
                        width: Math.max(4, 8 - group.depth),
                        height: Math.max(4, 8 - group.depth),
                      }}
                    />
                    <span
                      style={{
                        fontSize: Math.max(10, 12 - group.depth),
                        fontWeight: group.depth === 1 ? 600 : 500,
                        color: `var(--fg${Math.min(3, group.depth + 1)})`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.topic.icon ? `${group.topic.icon} ` : ""}
                      {group.topic.name}
                    </span>
                  </div>
                )}

                {dated.map((t) => {
                  const barColor = group.depth === 0
                    ? PRIORITY_COLOR[t.priority]
                    : group.color
                  const colEntry = columnsById.get(t.column_id)
                  const isDone = group.depth === 0
                    ? !!colEntry?.is_done_column
                    : !!t.completed_at

                  return (
                    <RoadmapBar
                      key={t.id}
                      task={t}
                      start={start}
                      barColor={barColor}
                      barOpacityOverride={barOpacityBase}
                      isDoneOverride={isDone}
                      indent={indent}
                      topicLabel={group.topic?.name}
                      topicColor={group.topic ? group.color : undefined}
                      onClick={() => onTaskClick?.(t)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Undated tasks from all groups */}
      {allUndated.length > 0 && (
        <div>
          <div className="tp-section-label">Undated tasks</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {allUndated.map(({ task: t, group: g }) => (
              <button
                key={t.id}
                type="button"
                className="tag"
                onClick={() => onTaskClick?.(t)}
                style={{ cursor: "pointer" }}
              >
                {g.topic && (
                  <span
                    className="tag-dot"
                    style={{ background: g.color, width: 6, height: 6 }}
                  />
                )}
                <span
                  className={`dot dot-${
                    t.priority === "high" ? "high" : t.priority === "medium" ? "med" : "low"
                  }`}
                  style={{ width: 6, height: 6 }}
                />
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function RoadmapBar({
  task,
  start,
  barColor,
  barOpacityOverride,
  isDoneOverride,
  indent = 0,
  topicLabel,
  topicColor,
  onClick,
}: {
  task: Task
  start: Date
  barColor: string
  barOpacityOverride?: number   // reduces opacity for deeper levels
  isDoneOverride: boolean
  indent?: number               // left indent in px for hierarchy visualization
  topicLabel?: string
  topicColor?: string
  onClick: () => void
}) {
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const sd = task.start_date ? startOfDayUTC(new Date(task.start_date)) : null
  const ed = task.end_date ? startOfDayUTC(new Date(task.end_date)) : null
  const dd = task.due_date ? startOfDayUTC(new Date(task.due_date)) : null

  const today = startOfDayUTC(new Date())

  const barStartIso = sd ?? ed ?? dd
  const barEndIso = ed ?? dd ?? sd
  if (!barStartIso || !barEndIso) return null

  const barStartDay = diffDays(barStartIso, start)
  const barEndDay = diffDays(barEndIso, start)
  const indentPx = indent ?? 0
  const barLeft = barStartDay * DAY_WIDTH + indentPx
  const barWidth = Math.max((barEndDay - barStartDay + 1) * DAY_WIDTH - indentPx, 14)

  let bufferLeft = 0
  let bufferWidth = 0
  if (ed && dd && dd.getTime() > ed.getTime()) {
    const bs = diffDays(ed, start) + 1
    const be = diffDays(dd, start)
    bufferLeft = bs * DAY_WIDTH + indentPx
    bufferWidth = (be - bs + 1) * DAY_WIDTH - indentPx
  }

  let color = barColor
  let barOpacity = barOpacityOverride ?? 0.85
  if (isDoneOverride) {
    color = "#34d399"
    barOpacity = Math.min(barOpacity, 0.5)
  } else if (dd && today.getTime() > dd.getTime()) {
    color = "#fb7185"
  } else if (ed && today.getTime() > ed.getTime()) {
    color = "#fbbf24"
  }

  // Keep tooltip inside the viewport
  const ttLeft = tooltipPos
    ? Math.min(tooltipPos.x + 12, window.innerWidth - 220)
    : 0
  const ttTop = tooltipPos
    ? Math.min(tooltipPos.y + 16, window.innerHeight - 140)
    : 0

  return (
    <div
      className="relative"
      style={{ height: ROW_HEIGHT + ROW_GAP, paddingTop: ROW_GAP }}
    >
      {bufferWidth > 0 && (
        <div
          className="absolute rounded-md"
          style={{
            left: bufferLeft,
            top: ROW_GAP,
            height: ROW_HEIGHT,
            width: bufferWidth,
            background: barColor,
            opacity: 0.18,
          }}
        />
      )}

      <div
        className="absolute rounded-md flex items-center px-2 cursor-pointer transition-all hover:brightness-110"
        style={{
          left: barLeft,
          top: ROW_GAP,
          height: ROW_HEIGHT,
          width: barWidth,
          background: color,
          opacity: barOpacity,
          color: "var(--bg-app)",
          fontSize: 12,
          fontWeight: 500,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textDecoration: isDoneOverride ? "line-through" : "none",
        }}
        onClick={onClick}
        onMouseEnter={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltipPos(null)}
      >
        <span className="truncate" style={{ minWidth: 0 }}>
          {task.icon ? `${task.icon} ` : ""}
          {task.title}
        </span>
      </div>

      {/* Styled tooltip — fixed position so it's never clipped by the scrollable container */}
      {tooltipPos &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: ttTop,
              left: ttLeft,
              zIndex: 500,
              background: "var(--bg-elev1)",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              boxShadow: "var(--shadow-md)",
              padding: "8px 12px",
              minWidth: 180,
              maxWidth: 260,
              pointerEvents: "none",
            }}
          >
            <div
              className="font-semibold text-fg1 truncate"
              style={{ fontSize: 13 }}
            >
              {task.icon ? `${task.icon} ` : ""}
              {task.title}
            </div>

            {topicLabel && (
              <div
                className="flex items-center gap-1.5 mt-1"
                style={{ fontSize: 11 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: topicColor ?? "var(--accent)",
                    flexShrink: 0,
                  }}
                />
                <span className="text-fg3 truncate">{topicLabel}</span>
              </div>
            )}

            <div className="mt-1.5 flex flex-col gap-0.5" style={{ fontSize: 11, color: "var(--fg3)" }}>
              {sd && <span>Start: {fmtDate(sd)}</span>}
              {ed && <span>Planned end: {fmtDate(ed)}</span>}
              {dd && (
                <span style={{ color: isDoneOverride ? "var(--success)" : "var(--fg2)" }}>
                  Due: {fmtDate(dd)}
                  {!isDoneOverride && dd.getTime() < today.getTime() && " ⚠"}
                </span>
              )}
              {isDoneOverride && (
                <span style={{ color: "var(--success)" }}>✓ Done</span>
              )}
              {task.story_points !== null && task.story_points !== undefined && (
                <span style={{ color: "var(--indigo-300)" }}>
                  {task.story_points} story points
                </span>
              )}
            </div>
          </div>,
          document.body
        )}

      {dd && !ed && (
        <div
          className="absolute"
          style={{
            left: diffDays(dd, start) * DAY_WIDTH + DAY_WIDTH / 2,
            top: ROW_GAP,
            bottom: 0,
            width: 2,
            background: "var(--danger)",
            zIndex: 0,
          }}
          title={`Due: ${dd.toISOString().slice(0, 10)}`}
        />
      )}
    </div>
  )
}
