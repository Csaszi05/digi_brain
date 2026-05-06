import { useEffect, useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { ChevronDown, Play, Square } from "lucide-react"
import {
  useActiveTimerQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from "@/api/time"
import { useTopicsQuery } from "@/api/topics"

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

  // Idle — show "Start tracking" with a topic picker
  const topics = topicsQuery.data ?? []

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="timer-widget" disabled={start.isPending}>
          <Play size={12} strokeWidth={1.5} />
          {start.isPending ? "Starting…" : "Start tracking"}
          <ChevronDown size={12} strokeWidth={1.5} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dm-content" sideOffset={4} align="end" style={{ maxHeight: 320, overflowY: "auto" }}>
          <div className="dm-label">Pick a topic</div>
          {topics.length === 0 && (
            <div className="dm-item" style={{ color: "var(--fg3)" }}>
              No topics yet
            </div>
          )}
          {topics.map((t) => (
            <DropdownMenu.Item
              key={t.id}
              className="dm-item"
              onSelect={() => start.mutate({ topic_id: t.id })}
            >
              <span style={{ width: 16, textAlign: "center" }}>{t.icon ?? "📁"}</span>
              <span className="truncate">{t.name}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
