import { Plus } from "lucide-react"
import { ActiveTimer } from "@/components/dashboard/ActiveTimer"
import { StatCard } from "@/components/dashboard/StatCard"
import { RecentTasks, type RecentTask } from "@/components/dashboard/RecentTasks"
import { TimeDistribution, type TimeSlice } from "@/components/dashboard/TimeDistribution"
import { RecentNotes, type RecentNote } from "@/components/dashboard/RecentNotes"
import { useActiveTimerQuery, useStopTimerMutation } from "@/api/time"
import { useTopicsQuery } from "@/api/topics"

const RECENT_TASKS: RecentTask[] = [
  { title: "Finish problem set 4 — supply & demand", topic: "Microeconomics", color: "#a78bfa", priority: "high", due: "Today" },
  { title: "Review macroeconomic policy lecture notes", topic: "Macroeconomics", color: "#60a5fa", priority: "med", due: "Tomorrow" },
  { title: "Project Atlas: Q2 roadmap draft", topic: "Project Atlas", color: "#f472b6", priority: "high", due: "Apr 14" },
  { title: "Statistics — chapter 3 exercises", topic: "Statistics", color: "#34d399", priority: "low", due: "Apr 16" },
  { title: "Annual health check-up booking", topic: "Health", color: "#fbbf24", priority: "med", due: "Apr 22" },
  { title: "Thesis: outline literature review", topic: "Thesis research", color: "#fb7185", priority: "med", due: "Apr 28" },
]

const TIME_DIST: TimeSlice[] = [
  { topic: "Microeconomics", color: "#a78bfa", hours: 8.5, pct: 28 },
  { topic: "Project Atlas", color: "#f472b6", hours: 7.2, pct: 24 },
  { topic: "Macroeconomics", color: "#60a5fa", hours: 5.0, pct: 17 },
  { topic: "Statistics", color: "#34d399", hours: 4.3, pct: 14 },
  { topic: "Thesis research", color: "#fb7185", hours: 2.8, pct: 9 },
  { topic: "Other", color: "#52525b", hours: 2.4, pct: 8 },
]

const RECENT_NOTES: RecentNote[] = [
  {
    title: "Marshallian vs Hicksian demand",
    snippet:
      "Two ways to slice the demand curve. Marshall fixes income; Hicks fixes utility. Slutsky equation links the two via substitution + income effects…",
    topic: "Microeconomics",
    color: "#a78bfa",
    date: "2h ago",
  },
  {
    title: "Atlas Q2 roadmap — open questions",
    snippet:
      "Unclear whether the analytics rewrite blocks the customer-portal launch. Need confirmation from Anna by Friday before committing to the timeline…",
    topic: "Project Atlas",
    color: "#f472b6",
    date: "Yesterday",
  },
  {
    title: "Standard error vs standard deviation",
    snippet:
      "SD describes variability of the data; SE describes variability of the estimate. SE = SD / sqrt(n). Interview answer: SE shrinks with bigger samples; SD doesn't.",
    topic: "Statistics",
    color: "#34d399",
    date: "2 days ago",
  },
]

function getGreeting(date: Date) {
  const h = date.getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export default function Dashboard() {
  const now = new Date()
  const userName = "Marcell"
  const tasksThisWeek = 8

  const activeTimer = useActiveTimerQuery()
  const stopTimer = useStopTimerMutation()
  const topicsQuery = useTopicsQuery()
  const activeEntry = activeTimer.data ?? null
  const activeTopicName = activeEntry
    ? topicsQuery.data?.find((t) => t.id === activeEntry.topic_id)?.name ?? "Unknown topic"
    : null

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="page-head">
        <div>
          <h1>
            {getGreeting(now)}, {userName}
          </h1>
          <div className="sub">
            {formatDate(now)} — {tasksThisWeek} tasks scheduled this week
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn" type="button">
            <Plus size={14} strokeWidth={1.5} />
            Quick capture
          </button>
          <button className="btn btn-primary" type="button">
            <Plus size={14} strokeWidth={1.5} />
            Add task
          </button>
        </div>
      </div>

      {activeEntry && activeTopicName && (
        <ActiveTimer
          topic={activeTopicName}
          startedAt={new Date(activeEntry.started_at)}
          onStop={() => stopTimer.mutate()}
        />
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Hours this week"
          value="30.2"
          suffix="h"
          spark={[18, 22, 19, 26, 28, 24, 30]}
          sparkColor="var(--indigo-400)"
          delta="+12%"
          deltaDir="up"
          foot="vs last week"
        />
        <StatCard
          label="Tasks completed"
          value="12"
          delta="+3"
          deltaDir="up"
          foot="vs last week"
          spark={[5, 7, 4, 9, 8, 11, 12]}
          sparkColor="var(--emerald-400)"
        />
        <StatCard
          label="Spent this month"
          value="184 230"
          suffix="HUF"
          progress={62}
          progressLabel="62% of 300k"
          progressClass="ok"
        />
        <StatCard
          label="Active topics"
          value="14"
          foot="3 archived this month"
        />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        <RecentTasks tasks={RECENT_TASKS} />
        <TimeDistribution slices={TIME_DIST} totalHours={30.2} />
      </div>

      <RecentNotes notes={RECENT_NOTES} />
    </div>
  )
}
