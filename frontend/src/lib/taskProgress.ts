import type { Task } from "@/api/tasks"
import type { KanbanColumn } from "@/api/topics"

export type TaskProgress = {
  pct: number          // 0–100
  pointsDone: number   // effective points done
  pointsTotal: number  // effective points total
  countDone: number
  countTotal: number
}

/**
 * Weighted progress over a set of child tasks.
 *
 * Each child contributes `story_points ?? 1` effective weight.
 * Children in a `is_done_column` are counted as done.
 *
 * Returns null when the children array is empty.
 */
export function computeTaskProgress(
  children: Task[],
  columnsById: Map<string, KanbanColumn>
): TaskProgress | null {
  if (children.length === 0) return null

  const isDone = (t: Task) =>
    !!columnsById.get(t.column_id)?.is_done_column

  const weight = (t: Task) => t.story_points ?? 1

  const pointsTotal = children.reduce((s, c) => s + weight(c), 0)
  const pointsDone = children.filter(isDone).reduce((s, c) => s + weight(c), 0)
  const countTotal = children.length
  const countDone = children.filter(isDone).length
  const pct = pointsTotal > 0 ? Math.round((pointsDone / pointsTotal) * 100) : 0

  return { pct, pointsDone, pointsTotal, countDone, countTotal }
}

/** Progress bar color based on percentage. */
export function progressColor(pct: number): string {
  if (pct >= 100) return "var(--success)"
  if (pct >= 50) return "var(--accent)"
  if (pct >= 25) return "var(--warn)"
  return "var(--danger)"
}
