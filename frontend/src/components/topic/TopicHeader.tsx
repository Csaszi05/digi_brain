import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Archive, MoreHorizontal, Trash2, X } from "lucide-react"
import {
  useDeleteTopicMutation,
  useUpdateTopicMutation,
  type TopicWithColumns,
} from "@/api/topics"

const PRESET_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
  "#818cf8",
  "#52525b",
]

type Props = {
  topic: TopicWithColumns
  taskCount: number
  rightSlot?: React.ReactNode
}

export function TopicHeader({ topic, taskCount, rightSlot }: Props) {
  const navigate = useNavigate()
  const update = useUpdateTopicMutation()
  const del = useDeleteTopicMutation()

  // Inline edit state (each persists locally; commit on blur)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(topic.name)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const titleSavedRef = useRef(false)

  const [iconEditing, setIconEditing] = useState(false)
  const [iconDraft, setIconDraft] = useState(topic.icon ?? "")
  const iconInputRef = useRef<HTMLInputElement>(null)
  const iconSavedRef = useRef(false)

  // When the underlying topic changes (e.g. after a save / refetch), resync drafts.
  useEffect(() => {
    setTitleDraft(topic.name)
    setIconDraft(topic.icon ?? "")
  }, [topic.id, topic.name, topic.icon])

  useEffect(() => {
    if (titleEditing) {
      titleSavedRef.current = false
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [titleEditing])

  useEffect(() => {
    if (iconEditing) {
      iconSavedRef.current = false
      iconInputRef.current?.focus()
      iconInputRef.current?.select()
    }
  }, [iconEditing])

  const commitTitle = () => {
    if (titleSavedRef.current) return
    titleSavedRef.current = true
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === topic.name) {
      setTitleDraft(topic.name)
      setTitleEditing(false)
      return
    }
    update.mutate({ id: topic.id, name: trimmed })
    setTitleEditing(false)
  }

  const commitIcon = () => {
    if (iconSavedRef.current) return
    iconSavedRef.current = true
    const trimmed = iconDraft.trim()
    const next = trimmed || null
    if (next === (topic.icon ?? null)) {
      setIconEditing(false)
      return
    }
    update.mutate({ id: topic.id, icon: next })
    setIconEditing(false)
  }

  const handleArchive = async () => {
    if (!window.confirm(`Archive "${topic.name}"? It can be restored later.`)) return
    await update.mutateAsync({ id: topic.id, archived: true })
    navigate("/")
  }

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete "${topic.name}" permanently? This also deletes all sub-topics, tasks, and notes inside it.`
      )
    )
      return
    await del.mutateAsync(topic.id)
    navigate("/")
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {iconEditing ? (
          <input
            ref={iconInputRef}
            className="topic-icon-input"
            value={iconDraft}
            maxLength={4}
            onChange={(e) => setIconDraft(e.target.value)}
            onBlur={commitIcon}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitIcon()
              if (e.key === "Escape") {
                iconSavedRef.current = true
                setIconDraft(topic.icon ?? "")
                setIconEditing(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-2xl"
            style={{ background: "var(--bg-elev2)" }}
            aria-label="Change icon"
            onClick={() => setIconEditing(true)}
          >
            {topic.icon ?? "📁"}
          </button>
        )}

        <div className="min-w-0 flex-1">
          {titleEditing ? (
            <input
              ref={titleInputRef}
              className="topic-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") {
                  titleSavedRef.current = true
                  setTitleDraft(topic.name)
                  setTitleEditing(false)
                }
              }}
            />
          ) : (
            <h1
              className="truncate cursor-text rounded-md px-1 -mx-1 hover:bg-bg-hover transition-colors"
              onClick={() => setTitleEditing(true)}
              title="Click to rename"
            >
              {topic.name}
            </h1>
          )}
          <div className="text-13 text-fg3 mt-0.5">
            {taskCount} task{taskCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="btn btn-icon" aria-label="Topic actions">
              <MoreHorizontal size={16} strokeWidth={1.5} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="dm-content"
              sideOffset={4}
              align="end"
            >
              <div className="dm-label">Color</div>
              <div className="dm-color-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="dm-color-swatch"
                    style={{ background: c }}
                    data-active={topic.color === c ? "true" : "false"}
                    aria-label={`Color ${c}`}
                    onClick={() => update.mutate({ id: topic.id, color: c })}
                  />
                ))}
                <button
                  type="button"
                  className="dm-color-swatch clear"
                  data-active={!topic.color ? "true" : "false"}
                  aria-label="Clear color"
                  onClick={() => update.mutate({ id: topic.id, color: null })}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>

              <DropdownMenu.Separator className="dm-separator" />

              <DropdownMenu.Item className="dm-item" onSelect={handleArchive}>
                <Archive size={14} strokeWidth={1.5} />
                Archive
              </DropdownMenu.Item>
              <DropdownMenu.Item className="dm-item danger" onSelect={handleDelete}>
                <Trash2 size={14} strokeWidth={1.5} />
                Delete topic
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}

