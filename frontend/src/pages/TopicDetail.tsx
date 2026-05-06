import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  KanbanSquare,
  GitBranch,
  Network,
  List as ListIcon,
  CalendarRange,
  Workflow,
  Plus,
} from "lucide-react"
import { useTopicQuery } from "@/api/topics"
import { useTopicTasksQuery, type Task } from "@/api/tasks"
import { KanbanBoard } from "@/components/topic/KanbanBoard"
import { TaskPanel } from "@/components/topic/TaskPanel"
import { TopicHeader } from "@/components/topic/TopicHeader"

type ViewMode = "kanban" | "list" | "pipeline" | "tree" | "roadmap" | "diagram"

const VIEW_TABS: { id: ViewMode; label: string; icon: typeof KanbanSquare }[] = [
  { id: "kanban", label: "Kanban", icon: KanbanSquare },
  { id: "list", label: "List", icon: ListIcon },
  { id: "pipeline", label: "Pipeline", icon: Workflow },
  { id: "tree", label: "Tree", icon: GitBranch },
  { id: "roadmap", label: "Roadmap", icon: CalendarRange },
  { id: "diagram", label: "Diagram", icon: Network },
]

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>()
  const [view, setView] = useState<ViewMode>("kanban")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const topicQuery = useTopicQuery(id)
  const tasksQuery = useTopicTasksQuery(id)

  if (!id) return null

  if (topicQuery.isLoading) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading topic…</div>
  }
  if (topicQuery.isError || !topicQuery.data) {
    return <div className="text-danger text-sm py-12 text-center">Topic not found.</div>
  }

  const topic = topicQuery.data
  const taskCount = tasksQuery.data?.length ?? 0

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <TopicHeader
        topic={topic}
        taskCount={taskCount}
        rightSlot={
          <>
            <div className="tabs">
              {VIEW_TABS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="tab"
                    data-active={view === t.id ? "true" : "false"}
                    onClick={() => setView(t.id)}
                  >
                    <Icon size={13} strokeWidth={1.5} />
                    {t.label}
                  </button>
                )
              })}
            </div>
            <button type="button" className="btn btn-primary">
              <Plus size={14} strokeWidth={1.5} />
              Add task
            </button>
          </>
        }
      />

      {/* View body */}
      {view === "kanban" && (
        <KanbanBoard
          topicId={topic.id}
          columns={topic.kanban_columns}
          onTaskClick={(t: Task) => setSelectedTaskId(t.id)}
        />
      )}
      {view !== "kanban" && (
        <div
          className="grid place-items-center text-fg3 text-sm"
          style={{
            padding: 48,
            border: "1px dashed var(--border)",
            borderRadius: 12,
          }}
        >
          {VIEW_TABS.find((t) => t.id === view)?.label} view — coming soon
        </div>
      )}

      {selectedTaskId && (() => {
        const selected = tasksQuery.data?.find((t) => t.id === selectedTaskId)
        if (!selected) return null
        return (
          <TaskPanel
            task={selected}
            columns={topic.kanban_columns}
            topicId={topic.id}
            onClose={() => setSelectedTaskId(null)}
          />
        )
      })()}
    </div>
  )
}
