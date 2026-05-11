import { useEffect, useMemo, useRef, useState } from "react"
import { Settings2 } from "lucide-react"
import { ActiveTimer } from "@/components/dashboard/ActiveTimer"
import { CustomizePanel } from "@/components/dashboard/CustomizePanel"
import {
  DEFAULT_LAYOUT_TYPES,
  WIDGETS,
} from "@/components/dashboard/widgets/registry"
import {
  useDashboardConfigQuery,
  useUpdateDashboardConfigMutation,
  type WidgetInstance,
} from "@/api/dashboard"
import { useActiveTimerQuery, useStopTimerMutation } from "@/api/time"
import { useTopicsQuery } from "@/api/topics"

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

function defaultLayout(): WidgetInstance[] {
  return DEFAULT_LAYOUT_TYPES.map((type) => ({
    id: crypto.randomUUID(),
    type,
    config: WIDGETS[type]?.defaultConfig
      ? { ...WIDGETS[type].defaultConfig }
      : undefined,
  }))
}

export default function Dashboard() {
  const now = new Date()
  const userName = "Marcell"

  const configQuery = useDashboardConfigQuery()
  const updateConfig = useUpdateDashboardConfigMutation()

  const activeTimer = useActiveTimerQuery()
  const stopTimer = useStopTimerMutation()
  const topicsQuery = useTopicsQuery()
  const activeEntry = activeTimer.data ?? null
  const activeTopicName = activeEntry
    ? topicsQuery.data?.find((t) => t.id === activeEntry.topic_id)?.name ?? "Unknown topic"
    : null

  // Local layout state, seeded from server config or default.
  const [layout, setLayout] = useState<WidgetInstance[]>([])
  const [showCustomize, setShowCustomize] = useState(false)
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) return
    if (configQuery.isLoading) return
    const remote = configQuery.data?.layout
    if (remote && Array.isArray(remote) && remote.length > 0) {
      setLayout(remote)
    } else {
      setLayout(defaultLayout())
    }
    seededRef.current = true
  }, [configQuery.isLoading, configQuery.data])

  // Debounced auto-save when layout changes.
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!seededRef.current) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      updateConfig.mutate({ layout })
    }, 400)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  const taskCount = useMemo(() => layout.length, [layout])

  if (configQuery.isLoading || !seededRef.current) {
    return <div className="text-fg3 text-sm py-12 text-center">Loading dashboard…</div>
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
      <div className="page-head">
        <div>
          <h1>
            {getGreeting(now)}, {userName}
          </h1>
          <div className="sub">
            {formatDate(now)} — {taskCount} widget{taskCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setShowCustomize(true)}
          >
            <Settings2 size={14} strokeWidth={1.5} />
            Customize
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {layout.map((inst) => {
          const meta = WIDGETS[inst.type]
          if (!meta) return null
          const Component = meta.Component
          // On mobile: full width for all widgets; on sm+: respect span
          return (
            <div
              key={inst.id}
              className="col-span-2"
              style={{ gridColumn: `span ${meta.span}` }}
            >
              <Component config={inst.config} />
            </div>
          )
        })}
      </div>

      {showCustomize && (
        <CustomizePanel
          layout={layout}
          onChange={setLayout}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </div>
  )
}
