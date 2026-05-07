import type { WidgetMeta } from "./types"
import { HoursWeekWidget } from "./HoursWeekWidget"
import { TasksDoneWidget } from "./TasksDoneWidget"
import { SpentMonthWidget } from "./SpentMonthWidget"
import { ActiveTopicsWidget } from "./ActiveTopicsWidget"
import { RecentTasksWidget } from "./RecentTasksWidget"
import { TimeDistributionWidget } from "./TimeDistributionWidget"
import { RecentNotesWidget } from "./RecentNotesWidget"
import { UpcomingDeadlinesWidget } from "./UpcomingDeadlinesWidget"
import { PinnedTopicWidget, PinnedTopicConfigEditor } from "./PinnedTopicWidget"

export const WIDGETS: Record<string, WidgetMeta> = {
  "hours-week": {
    type: "hours-week",
    title: "Hours this week",
    description: "Total time tracked since Monday.",
    span: 1,
    Component: HoursWeekWidget,
  },
  "tasks-done": {
    type: "tasks-done",
    title: "Tasks completed",
    description: "Count of tasks moved to Done this week.",
    span: 1,
    Component: TasksDoneWidget,
  },
  "spent-month": {
    type: "spent-month",
    title: "Spent this month",
    description: "Total expenses this month, per currency.",
    span: 1,
    Component: SpentMonthWidget,
  },
  "active-topics": {
    type: "active-topics",
    title: "Active topics",
    description: "Number of non-archived topics.",
    span: 1,
    Component: ActiveTopicsWidget,
  },
  "recent-tasks": {
    type: "recent-tasks",
    title: "Recent tasks",
    description: "Last 6 updated tasks across all topics.",
    span: 2,
    Component: RecentTasksWidget,
  },
  "time-distribution": {
    type: "time-distribution",
    title: "This week's time",
    description: "Time per topic, this week.",
    span: 2,
    Component: TimeDistributionWidget,
  },
  "upcoming-deadlines": {
    type: "upcoming-deadlines",
    title: "Upcoming deadlines",
    description: "Open tasks due in the next 7 days.",
    span: 2,
    Component: UpcomingDeadlinesWidget,
  },
  "recent-notes": {
    type: "recent-notes",
    title: "Recent notes",
    description: "Last 3 notes you touched.",
    span: 4,
    Component: RecentNotesWidget,
  },
  "pinned-topic": {
    type: "pinned-topic",
    title: "Pinned topic",
    description: "Quick access to a chosen topic.",
    span: 2,
    multiInstance: true,
    defaultConfig: { topicId: null },
    Component: PinnedTopicWidget,
    ConfigEditor: PinnedTopicConfigEditor,
  },
}

export const DEFAULT_LAYOUT_TYPES: string[] = [
  "hours-week",
  "tasks-done",
  "spent-month",
  "active-topics",
  "recent-tasks",
  "time-distribution",
  "upcoming-deadlines",
  "recent-notes",
]
