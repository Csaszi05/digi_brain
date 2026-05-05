import { useEffect, useState } from "react"
import { Play, Square } from "lucide-react"

type ActiveTimerProps = {
  topic: string
  task?: string
  startedAt: Date
  onStop?: () => void
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function ActiveTimer({ topic, task, startedAt, onStop }: ActiveTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)))
    }, 1000)
    return () => window.clearInterval(id)
  }, [startedAt])

  return (
    <div className="card flex items-center gap-4 px-5 py-4">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: "var(--accent-soft)", color: "var(--indigo-300)" }}
      >
        <Play size={16} strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mini-label">Currently tracking</div>
        <div className="mt-0.5 text-base font-semibold text-fg1">
          {topic}
          {task && <span className="font-normal text-fg3"> · {task}</span>}
        </div>
      </div>
      <div className="font-mono text-2xl font-medium tabular-nums text-fg1">
        {formatElapsed(elapsed)}
      </div>
      <button className="btn" onClick={onStop} type="button">
        <Square size={14} strokeWidth={1.5} />
        Stop
      </button>
    </div>
  )
}
