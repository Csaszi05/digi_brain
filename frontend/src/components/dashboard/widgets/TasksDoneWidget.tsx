import { CheckCircle2 } from "lucide-react"
import { useAllTasksQuery } from "@/api/tasks"
import { isoDate, startOfWeek } from "./types"

export function TasksDoneWidget() {
  const tasksQuery = useAllTasksQuery({
    completedSince: isoDate(startOfWeek()),
    orderBy: "completed_at",
    limit: 200,
  })
  const count = tasksQuery.data?.length ?? 0

  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">Tasks completed</div>
      </div>
      <div className="stat-value">{count}</div>
      <div className="stat-foot">
        <span className="delta delta-up">
          <CheckCircle2 size={12} strokeWidth={1.5} />
          this week
        </span>
      </div>
    </div>
  )
}
