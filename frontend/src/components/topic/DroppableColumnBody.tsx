import { useDroppable } from "@dnd-kit/core"
import type { ReactNode } from "react"

type Props = {
  columnId: string
  children: ReactNode
}

/**
 * Wraps a kanban column body so empty columns can still receive drops.
 * SortableContext handles drops onto specific cards; this handles drops onto
 * the empty space of a column.
 */
export function DroppableColumnBody({ columnId, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${columnId}`,
    data: { type: "column-body", columnId },
  })
  return (
    <div
      ref={setNodeRef}
      className="kb-col-body"
      style={
        isOver ? { background: "var(--accent-soft)", transition: "background 120ms" } : undefined
      }
    >
      {children}
    </div>
  )
}
