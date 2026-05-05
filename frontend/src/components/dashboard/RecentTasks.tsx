type Priority = "high" | "med" | "low"

export type RecentTask = {
  title: string
  topic: string
  color: string
  priority: Priority
  due: string
}

type RecentTasksProps = {
  tasks: RecentTask[]
}

export function RecentTasks({ tasks }: RecentTasksProps) {
  return (
    <div className="card p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="text-base font-semibold text-fg1">Recent tasks</div>
        <button className="btn btn-ghost btn-sm" type="button">
          View all
        </button>
      </div>
      <div>
        {tasks.map((t, i) => (
          <div
            key={i}
            className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-bg-hover ${
              i < tasks.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span
              className={`dot dot-${t.priority}`}
              style={{ width: 8, height: 8 }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-13 font-medium text-fg1">{t.title}</div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="tag"
                  style={{ height: 18, fontSize: 11, padding: "0 6px" }}
                >
                  <span className="tag-dot" style={{ background: t.color }} />
                  {t.topic}
                </span>
              </div>
            </div>
            <span className="whitespace-nowrap text-xs tabular-nums text-fg3">
              {t.due}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
