import type { Task } from "@/api/tasks"
import type { TaskLink } from "@/api/links"
import type { KanbanColumn } from "@/api/topics"

export type BlockingState = {
  /** Outgoing 'blocks' link count — how many tasks this one blocks */
  blocksCount: number
  /** Incoming 'blocks' link count — how many tasks block this one */
  blockedByCount: number
  /** True if at least one blocker is not in a done column */
  currentlyBlocked: boolean
}

export function computeBlockingState(
  taskId: string,
  links: TaskLink[],
  tasks: Task[],
  columns: KanbanColumn[]
): BlockingState {
  const columnsById = new Map(columns.map((c) => [c.id, c]))
  const tasksById = new Map(tasks.map((t) => [t.id, t]))

  let blocksCount = 0
  let blockedByCount = 0
  let currentlyBlocked = false

  for (const l of links) {
    if (l.link_type !== "blocks") continue
    if (l.source_id === taskId) {
      blocksCount += 1
    } else if (l.target_id === taskId) {
      blockedByCount += 1
      const blocker = tasksById.get(l.source_id)
      if (blocker) {
        const col = columnsById.get(blocker.column_id)
        if (!col?.is_done_column) currentlyBlocked = true
      }
    }
  }

  return { blocksCount, blockedByCount, currentlyBlocked }
}
