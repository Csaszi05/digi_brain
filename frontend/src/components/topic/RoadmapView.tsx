import { useMemo } from "react"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import type { KanbanColumn } from "@/api/topics"

const DAY_WIDTH = 36
const ROW_HEIGHT = 36
const ROW_GAP = 6
const TODAY_OFFSET_DAYS = 7 // start range one week before today

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#fb7185",
  medium: "#fbbf24",
  low: "#34d399",
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function pickWindow(tasks: Task[]) {
  // Compute a sensible time window: max(today-7d, earliest start) → max(latest due, today+30d)
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

  // Pad each end by 2 days so bars don't touch the edges
  earliest = new Date(earliest.getTime() - 2 * 86_400_000)
  latest = new Date(latest.getTime() + 2 * 86_400_000)
  return { start: earliest, end: latest, today }
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric" })
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short" })
}

type Props = {
  topicId: string
  columns: KanbanColumn[]
  onTaskClick?: (task: Task) => void
}

export function RoadmapView({ topicId, columns, onTaskClick }: Props) {
  const tasksQuery = useTopicTasksQuery(topicId)
  const tasks = tasksQuery.data ?? []

  const columnsById = useMemo(
    () => new Map(columns.map((c) => [c.id, c])),
    [columns]
  )

  const dated = useMemo(
    () => tasks.filter((t) => t.start_date || t.end_date || t.due_date),
    [tasks]
  )
  const undated = useMemo(
    () => tasks.filter((t) => !t.start_date && !t.end_date && !t.due_date),
    [tasks]
  )

  const { start, end, today } = useMemo(() => pickWindow(dated), [dated])
  const totalDays = diffDays(end, start) + 1
  const todayOffset = diffDays(today, start)

  const dayList = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < totalDays; i++) {
      arr.push(new Date(start.getTime() + i * 86_400_000))
    }
    return arr
  }, [start, totalDays])

  if (tasksQuery.isLoading) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading…</div>
  }
  if (tasks.length === 0) {
    return (
      <div
        className="grid place-items-center text-fg3 text-sm"
        style={{ padding: 48, border: "1px dashed var(--border)", borderRadius: 12 }}
      >
        No tasks yet. Add some in the Kanban view.
      </div>
    )
  }

  const totalWidth = totalDays * DAY_WIDTH

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
                  <div className="text-[10px] uppercase font-semibold" style={{ color: "var(--fg2)", letterSpacing: "0.04em" }}>
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

        {/* Task bars */}
        <div
          className="relative"
          style={{
            width: totalWidth,
            padding: `${ROW_GAP}px 0`,
          }}
        >
          {/* Today vertical line */}
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

          {dated.length === 0 ? (
            <div className="text-fg3 text-sm text-center" style={{ padding: 24 }}>
              No tasks have dates yet. Set start / end / due in the task panel.
            </div>
          ) : (
            dated.map((t) => (
              <RoadmapBar
                key={t.id}
                task={t}
                start={start}
                column={columnsById.get(t.column_id)}
                onClick={() => onTaskClick?.(t)}
              />
            ))
          )}
        </div>
      </div>

      {undated.length > 0 && (
        <div>
          <div className="tp-section-label">Undated tasks</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {undated.map((t) => (
              <button
                key={t.id}
                type="button"
                className="tag"
                onClick={() => onTaskClick?.(t)}
                style={{ cursor: "pointer" }}
              >
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

function RoadmapBar({
  task,
  start,
  column,
  onClick,
}: {
  task: Task
  start: Date
  column: KanbanColumn | undefined
  onClick: () => void
}) {
  // Resolve dates
  const sd = task.start_date ? startOfDayUTC(new Date(task.start_date)) : null
  const ed = task.end_date ? startOfDayUTC(new Date(task.end_date)) : null
  const dd = task.due_date ? startOfDayUTC(new Date(task.due_date)) : null

  const today = startOfDayUTC(new Date())
  const isDone = !!column?.is_done_column

  const barStartIso = sd ?? ed ?? dd
  const barEndIso = ed ?? dd ?? sd
  if (!barStartIso || !barEndIso) return null

  const barStartDay = diffDays(barStartIso, start)
  const barEndDay = diffDays(barEndIso, start)
  const barLeft = barStartDay * DAY_WIDTH
  const barWidth = Math.max((barEndDay - barStartDay + 1) * DAY_WIDTH, 14)

  // Buffer zone: from end_date to due_date (only when both exist and due_date > end_date)
  let bufferLeft = 0
  let bufferWidth = 0
  if (ed && dd && dd.getTime() > ed.getTime()) {
    const bs = diffDays(ed, start) + 1
    const be = diffDays(dd, start)
    bufferLeft = bs * DAY_WIDTH
    bufferWidth = (be - bs + 1) * DAY_WIDTH
  }

  // State color
  const priorityColor = PRIORITY_COLOR[task.priority]
  let barColor = priorityColor
  let barOpacity = 0.85
  if (isDone) {
    barColor = "#34d399"
    barOpacity = 0.5
  } else if (dd && today.getTime() > dd.getTime()) {
    // Overdue
    barColor = "#fb7185"
  } else if (ed && today.getTime() > ed.getTime()) {
    // At risk (slipped past planned end but not due yet)
    barColor = "#fbbf24"
  }

  return (
    <div
      className="relative"
      style={{ height: ROW_HEIGHT + ROW_GAP, paddingTop: ROW_GAP }}
    >
      {/* Buffer zone */}
      {bufferWidth > 0 && (
        <div
          className="absolute rounded-md"
          style={{
            left: bufferLeft,
            top: ROW_GAP,
            height: ROW_HEIGHT,
            width: bufferWidth,
            background: priorityColor,
            opacity: 0.18,
          }}
        />
      )}

      {/* Bar */}
      <div
        className="absolute rounded-md flex items-center px-2 cursor-pointer transition-all hover:brightness-110"
        style={{
          left: barLeft,
          top: ROW_GAP,
          height: ROW_HEIGHT,
          width: barWidth,
          background: barColor,
          opacity: barOpacity,
          color: "var(--bg-app)",
          fontSize: 12,
          fontWeight: 500,
          border: `1px solid ${barColor}`,
          textDecoration: isDone ? "line-through" : "none",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
        title={[
          task.title,
          sd && `Start: ${sd.toISOString().slice(0, 10)}`,
          ed && `Planned end: ${ed.toISOString().slice(0, 10)}`,
          dd && `Due: ${dd.toISOString().slice(0, 10)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        onClick={onClick}
      >
        <span className="truncate" style={{ minWidth: 0 }}>
          {task.title}
        </span>
      </div>

      {/* Due date marker (vertical pin if no buffer) */}
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
