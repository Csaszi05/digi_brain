import { useEffect, useRef, useState, type HTMLAttributes } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, GripVertical, MoreHorizontal, Plus, Trash2, X } from "lucide-react"
import type { KanbanColumn } from "@/api/topics"
import { useDeleteColumnMutation, useUpdateColumnMutation } from "@/api/columns"

const PRESET_COLORS = [
  "#818cf8",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
  "#52525b",
]

type Props = {
  column: KanbanColumn
  topicId: string
  taskCount: number
  stripeColor: string
  onAddTask: () => void
  /** Spread on the grip icon so dnd-kit can detect drag-from-handle. */
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  isDraggingColumn?: boolean
}

export function ColumnHeader({
  column,
  topicId,
  taskCount,
  stripeColor,
  onAddTask,
  dragHandleProps,
  isDraggingColumn,
}: Props) {
  const update = useUpdateColumnMutation(topicId)
  const del = useDeleteColumnMutation(topicId)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const savedRef = useRef(false)

  useEffect(() => setDraft(column.name), [column.name])

  useEffect(() => {
    if (editing) {
      savedRef.current = false
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    if (savedRef.current) return
    savedRef.current = true
    const trimmed = draft.trim()
    if (!trimmed || trimmed === column.name) {
      setDraft(column.name)
      setEditing(false)
      return
    }
    update.mutate({ id: column.id, name: trimmed })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete "${column.name}"${
          taskCount > 0 ? ` and its ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""
        }?`
      )
    )
      return
    await del.mutateAsync(column.id)
  }

  return (
    <div
      className="kb-col-head"
      style={isDraggingColumn ? { cursor: "grabbing", background: "var(--bg-hover)" } : undefined}
    >
      <div className="kb-col-head-name flex-1 min-w-0">
        {dragHandleProps && (
          <button
            type="button"
            className="opacity-0 group-hover/col:opacity-100 transition-opacity"
            aria-label="Drag column"
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              cursor: "grab",
              color: "var(--fg3)",
              display: "grid",
              placeItems: "center",
            }}
            {...dragHandleProps}
          >
            <GripVertical size={12} strokeWidth={1.5} />
          </button>
        )}
        <span
          className="tag-dot shrink-0"
          style={{ background: stripeColor, width: 8, height: 8 }}
        />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
              if (e.key === "Escape") {
                savedRef.current = true
                setDraft(column.name)
                setEditing(false)
              }
            }}
            className="bg-transparent border-0 outline-none text-13 font-semibold text-fg1 min-w-0 flex-1 p-0"
            style={{ font: "inherit" }}
          />
        ) : (
          <span
            className="cursor-text truncate"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {column.name}
          </span>
        )}
        <span className="kb-col-count shrink-0">{taskCount}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="sb-icon-btn"
          aria-label="Add task"
          onClick={onAddTask}
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="sb-icon-btn" aria-label="Column options">
              <MoreHorizontal size={14} strokeWidth={1.5} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="dm-content" sideOffset={4} align="end">
              <div className="dm-label">Color</div>
              <div className="dm-color-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="dm-color-swatch"
                    style={{ background: c }}
                    data-active={column.color === c ? "true" : "false"}
                    aria-label={`Color ${c}`}
                    onClick={() => update.mutate({ id: column.id, color: c })}
                  />
                ))}
                <button
                  type="button"
                  className="dm-color-swatch clear"
                  data-active={!column.color ? "true" : "false"}
                  aria-label="Clear color"
                  onClick={() => update.mutate({ id: column.id, color: null })}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>

              <DropdownMenu.Separator className="dm-separator" />

              <DropdownMenu.Item
                className="dm-item"
                onSelect={() =>
                  update.mutate({
                    id: column.id,
                    is_done_column: !column.is_done_column,
                  })
                }
              >
                <Check
                  size={14}
                  strokeWidth={1.5}
                  style={{
                    color: column.is_done_column ? "var(--success)" : "var(--fg3)",
                  }}
                />
                {column.is_done_column ? "Unmark as Done" : "Mark as Done column"}
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="dm-separator" />

              <DropdownMenu.Item className="dm-item danger" onSelect={handleDelete}>
                <Trash2 size={14} strokeWidth={1.5} />
                Delete column
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}
