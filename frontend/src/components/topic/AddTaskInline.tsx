import { useEffect, useRef, useState } from "react"
import { useCreateTaskMutation } from "@/api/tasks"

type Props = {
  topicId: string
  columnId: string
  onClose: () => void
}

export function AddTaskInline({ topicId, columnId, onClose }: Props) {
  const [title, setTitle] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)
  const submittedRef = useRef(false)
  const create = useCreateTaskMutation(topicId)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const submit = async () => {
    // Guard: Enter triggers submit, then onClose unmounts the textarea and
    // fires a blur event which would call submit() again. Without this flag
    // the task gets created twice.
    if (submittedRef.current) return
    submittedRef.current = true

    const trimmed = title.trim()
    if (!trimmed) {
      onClose()
      return
    }
    try {
      await create.mutateAsync({ title: trimmed, column_id: columnId })
      onClose()
    } catch {
      submittedRef.current = false
    }
  }

  return (
    <div className="kb-card" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={ref}
        className="kb-card-input"
        rows={2}
        value={title}
        placeholder="Task title…"
        disabled={create.isPending}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === "Escape") onClose()
        }}
        onBlur={submit}
      />
    </div>
  )
}
