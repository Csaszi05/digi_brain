import { useTopicsQuery } from "@/api/topics"

export function ActiveTopicsWidget() {
  const topicsQuery = useTopicsQuery()
  const count = (topicsQuery.data ?? []).filter((t) => !t.archived).length
  const roots = (topicsQuery.data ?? []).filter((t) => !t.archived && !t.parent_id).length

  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">Active topics</div>
      </div>
      <div className="stat-value">{count}</div>
      <div className="stat-foot">
        <span>
          {roots} root{roots === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  )
}
