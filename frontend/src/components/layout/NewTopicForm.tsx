import { useEffect, useRef, useState } from "react"
import { useCreateTopicMutation } from "@/api/topics"

type Props = {
  parentId?: string | null
  placeholder?: string
  onClose: () => void
}

export function NewTopicForm({ parentId = null, placeholder = "New topic name…", onClose }: Props) {
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)
  const create = useCreateTopicMutation()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async () => {
    // Guard: Enter triggers submit, then onClose unmounts the input and
    // fires a blur event which would call submit() again. Without this flag
    // the topic gets created twice.
    if (submittedRef.current) return
    submittedRef.current = true

    const trimmed = name.trim()
    if (!trimmed) {
      onClose()
      return
    }
    try {
      await create.mutateAsync({ name: trimmed, parent_id: parentId })
      onClose()
    } catch {
      submittedRef.current = false
    }
  }

  return (
    <div
      className="tt-row"
      style={{ paddingLeft: 8, gap: 6 }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="tt-icon">📁</span>
      <input
        ref={inputRef}
        type="text"
        value={name}
        placeholder={placeholder}
        disabled={create.isPending}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") onClose()
        }}
        onBlur={() => {
          // Submit on blur — if empty, just close
          submit()
        }}
        style={{
          flex: 1,
          minWidth: 0,
          background: "var(--bg-elev2)",
          border: "1px solid var(--border-strong)",
          borderRadius: 4,
          color: "var(--fg1)",
          fontSize: 13,
          padding: "2px 6px",
          outline: "none",
        }}
      />
    </div>
  )
}
