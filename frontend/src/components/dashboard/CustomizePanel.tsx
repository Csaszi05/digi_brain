import { useEffect } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus, X } from "lucide-react"
import type { WidgetInstance } from "@/api/dashboard"
import { WIDGETS } from "./widgets/registry"

type Props = {
  layout: WidgetInstance[]
  onChange: (next: WidgetInstance[]) => void
  onClose: () => void
}

function makeId(): string {
  return crypto.randomUUID()
}

function SortableRow({
  inst,
  onRemove,
  onConfigChange,
}: {
  inst: WidgetInstance
  onRemove: () => void
  onConfigChange: (config: Record<string, unknown>) => void
}) {
  const sortable = useSortable({ id: inst.id })
  const meta = WIDGETS[inst.type]
  const Editor = meta?.ConfigEditor

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="rounded-md border border-border bg-bg-elev1 p-3 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="hover:text-fg1"
          style={{
            background: "transparent",
            border: 0,
            padding: 2,
            cursor: "grab",
            color: "var(--fg2)",
            display: "grid",
            placeItems: "center",
          }}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical size={14} strokeWidth={1.5} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-13 font-medium text-fg1 truncate">
            {meta?.title ?? inst.type}
          </div>
          {meta?.description && (
            <div className="text-xs text-fg3 truncate">{meta.description}</div>
          )}
        </div>
        <span className="text-[11px] text-fg3 tabular-nums">
          span {meta?.span ?? "?"}
        </span>
        <button
          type="button"
          className="sb-icon-btn"
          aria-label="Remove widget"
          onClick={onRemove}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
      {Editor && (
        <div className="pt-2 border-t border-border">
          <Editor config={inst.config ?? {}} onChange={onConfigChange} />
        </div>
      )}
    </div>
  )
}

export function CustomizePanel({ layout, onChange, onClose }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = layout.findIndex((w) => w.id === active.id)
    const newIdx = layout.findIndex((w) => w.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    onChange(arrayMove(layout, oldIdx, newIdx))
  }

  const addWidget = (type: string) => {
    const meta = WIDGETS[type]
    if (!meta) return
    onChange([
      ...layout,
      {
        id: makeId(),
        type,
        config: meta.defaultConfig ? { ...meta.defaultConfig } : undefined,
      },
    ])
  }

  const removeAt = (id: string) => {
    onChange(layout.filter((w) => w.id !== id))
  }

  const updateConfig = (id: string, config: Record<string, unknown>) => {
    onChange(layout.map((w) => (w.id === id ? { ...w, config } : w)))
  }

  // Available = widgets not in layout (single-instance only) + multi-instance widgets always
  const usedTypes = new Set(layout.map((w) => w.type))
  const available = Object.values(WIDGETS).filter(
    (m) => m.multiInstance || !usedTypes.has(m.type)
  )

  return createPortal(
    <>
      <div className="tp-backdrop" onClick={onClose} />
      <aside
        className="tp-panel"
        role="dialog"
        aria-label="Customize dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tp-header">
          <div className="tp-header-meta">
            <span className="text-fg1 font-semibold">Customize dashboard</span>
          </div>
          <button
            type="button"
            className="sb-icon-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="tp-body">
          <div>
            <div className="tp-section-label">Active widgets</div>
            {layout.length === 0 ? (
              <div className="text-sm text-fg3 py-4">
                No widgets yet. Add some from the list below.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={layout.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {layout.map((inst) => (
                      <SortableRow
                        key={inst.id}
                        inst={inst}
                        onRemove={() => removeAt(inst.id)}
                        onConfigChange={(c) => updateConfig(inst.id, c)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div>
            <div className="tp-section-label">Add widget</div>
            {available.length === 0 ? (
              <div className="text-sm text-fg3 py-4">
                Every widget is already on your dashboard.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {available.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    className="rounded-md border border-border bg-bg-elev1 p-3 flex items-center gap-3 hover:border-border-strong text-left"
                    onClick={() => addWidget(m.type)}
                  >
                    <Plus size={14} strokeWidth={1.5} style={{ color: "var(--fg3)" }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-13 font-medium text-fg1">{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-fg3">{m.description}</div>
                      )}
                    </div>
                    <span className="text-[11px] text-fg3 tabular-nums">
                      span {m.span}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="tp-footer">
          <span className="text-xs text-fg3 mr-auto">Saved automatically.</span>
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
        </footer>
      </aside>
    </>,
    document.body
  )
}
