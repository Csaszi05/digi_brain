import { useState } from "react"
import { Clock, X } from "lucide-react"
import { useCreateManualEntryMutation } from "@/api/time"
import { useTopicsQuery } from "@/api/topics"

type Props = {
  onClose: () => void
}

function toLocalDatetimeInput(date: Date): string {
  // Returns "YYYY-MM-DDTHH:MM" for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

function formatDuration(startIso: string, endIso: string): string | null {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const ms = end - start
  if (ms <= 0) return null
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function ManualTimeEntryForm({ onClose }: Props) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const [topicId, setTopicId] = useState("")
  const [startedAt, setStartedAt] = useState(toLocalDatetimeInput(oneHourAgo))
  const [endedAt, setEndedAt] = useState(toLocalDatetimeInput(now))
  const [note, setNote] = useState("")

  const topicsQuery = useTopicsQuery()
  const create = useCreateManualEntryMutation()

  const duration = startedAt && endedAt ? formatDuration(
    new Date(startedAt).toISOString(),
    new Date(endedAt).toISOString()
  ) : null

  const isValid = !!topicId && !!startedAt && !!endedAt && duration !== null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    try {
      await create.mutateAsync({
        topic_id: topicId,
        started_at: new Date(startedAt).toISOString(),
        ended_at: new Date(endedAt).toISOString(),
        note: note.trim() || null,
      })
      onClose()
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (err as any).response?.data?.detail
          : null
      window.alert(detail || "Could not create entry")
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col gap-4"
      style={{ maxWidth: 480 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} strokeWidth={1.5} style={{ color: "var(--fg3)" }} />
          <span className="text-base font-semibold text-fg1">Add manual entry</span>
        </div>
        <button type="button" className="sb-icon-btn" onClick={onClose}>
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div>
        <div className="tp-field-label">Topic</div>
        <select
          className="tp-field-select"
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          required
        >
          <option value="">Select a topic…</option>
          {(topicsQuery.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon ? `${t.icon} ` : ""}
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="tp-field-label">Start</div>
          <input
            type="datetime-local"
            className="tp-field-input"
            value={startedAt}
            max={endedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="tp-field-label">End</div>
          <input
            type="datetime-local"
            className="tp-field-input"
            value={endedAt}
            min={startedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Duration preview */}
      <div
        className="flex items-center justify-center rounded-lg py-2"
        style={{ background: "var(--bg-elev2)", border: "1px solid var(--border)" }}
      >
        {duration ? (
          <span className="font-mono text-xl font-medium tabular-nums text-fg1">
            {duration}
          </span>
        ) : (
          <span className="text-sm text-danger">End must be after start</span>
        )}
      </div>

      <div>
        <div className="tp-field-label">Note (optional)</div>
        <input
          className="tp-field-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What were you working on?"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid || create.isPending}
        >
          {create.isPending ? "Saving…" : "Save entry"}
        </button>
      </div>
    </form>
  )
}
