import { useEffect, useRef, useState } from "react"
import { useCreateColumnMutation } from "@/api/columns"

type Props = {
  topicId: string
  onClose: () => void
}

export function AddColumnInline({ topicId, onClose }: Props) {
  const [name, setName] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)
  const create = useCreateColumnMutation(topicId)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const submit = async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    const trimmed = name.trim()
    if (!trimmed) {
      onClose()
      return
    }
    try {
      await create.mutateAsync({ name: trimmed })
      onClose()
    } catch {
      submittedRef.current = false
    }
  }

  return (
    <div
      className="kb-col flex flex-col"
      style={{ width: 280, padding: 12, gap: 8, alignSelf: "stretch", maxHeight: 120 }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={ref}
        value={name}
        placeholder="Column name…"
        disabled={create.isPending}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") onClose()
        }}
        onBlur={submit}
        style={{
          background: "var(--bg-elev2)",
          border: "1px solid var(--border-strong)",
          borderRadius: 6,
          color: "var(--fg1)",
          fontSize: 13,
          fontWeight: 500,
          padding: "6px 10px",
          outline: "none",
        }}
      />
      <div className="text-xs text-fg3">Enter to create, Esc to cancel</div>
    </div>
  )
}
