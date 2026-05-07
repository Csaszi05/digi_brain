import { TrendingUp } from "lucide-react"
import { useTimeEntriesQuery } from "@/api/time"
import { startOfWeek } from "./types"

export function HoursWeekWidget() {
  const since = startOfWeek().toISOString()
  const entriesQuery = useTimeEntriesQuery({ since })
  const now = Date.now()

  const totalMs = (entriesQuery.data ?? []).reduce((sum, e) => {
    const start = new Date(e.started_at).getTime()
    const end = e.ended_at ? new Date(e.ended_at).getTime() : now
    return sum + Math.max(0, end - start)
  }, 0)
  const hours = (totalMs / 3_600_000).toFixed(1)
  const sessions = entriesQuery.data?.length ?? 0

  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">Hours this week</div>
      </div>
      <div className="stat-value">
        {hours}<sup>h</sup>
      </div>
      <div className="stat-foot">
        <span className="delta delta-up">
          <TrendingUp size={12} strokeWidth={1.5} />
          {sessions} session{sessions === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  )
}
