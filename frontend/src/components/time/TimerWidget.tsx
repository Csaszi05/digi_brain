import { useEffect, useState } from "react"
import { ChevronDown, Play, Square } from "lucide-react"
import {
  useActiveTimerQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/api/time"
import { useTopicsQuery } from "@/api/topics"
import { TopicPicker } from "@/components/ui/TopicPicker"

function formatElapsed(totalSeconds: number) {
  const t = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function TimerWidget() {
  const activeQuery = useActiveTimerQuery()
  const start = useStartTimerMutation()
  const stop = useStopTimerMutation()
  const topicsQuery = useTopicsQuery()

  const active = activeQuery.data ?? null
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])

  if (active) {
    const startedAt = new Date(active.started_at).getTime()
    const elapsedSec = (now - startedAt) / 1000
    const topicName =
      topicsQuery.data?.find((t) => t.id === active.topic_id)?.name ??
      "Unknown topic"

    return (
      <div className="timer-widget running">
        <span
          className="grid h-5 w-5 place-items-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--indigo-300)" }}
        >
          <Play size={10} strokeWidth={1.5} />
        </span>
        <span className="timer-widget-label">{topicName}</span>
        <span className="timer-widget-tick">{formatElapsed(elapsedSec)}</span>
        <button
          type="button"
          className="sb-icon-btn"
          aria-label="Stop timer"
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
        >
          <Square size={12} strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  // Idle — show "Start tracking" with a searchable topic picker
  return (
    <TopicPicker
      value={null}
      clearable={false}
      onChange={(id) => {
        if (id) start.mutate({ topic_id: id })
      }}
      trigger={({ toggle }) => (
        <button
          type="button"
          className="timer-widget"
          onClick={toggle}
          disabled={start.isPending}
        >
          <Play size={12} strokeWidth={1.5} />
          {start.isPending ? "Starting…" : "Start tracking"}
          <ChevronDown size={12} strokeWidth={1.5} />
        </button>
      )}
    />
  )
}
