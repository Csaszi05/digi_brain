import { TrendingDown, TrendingUp } from "lucide-react"
import { MiniSpark } from "./MiniSpark"

type ProgressClass = "ok" | "warn" | "danger"

type StatCardProps = {
  label: string
  value: string
  suffix?: string
  delta?: string
  deltaDir?: "up" | "down"
  foot?: string
  spark?: number[]
  sparkColor?: string
  progress?: number
  progressLabel?: string
  progressClass?: ProgressClass
}

export function StatCard({
  label,
  value,
  suffix,
  delta,
  deltaDir,
  foot,
  spark,
  sparkColor,
  progress,
  progressLabel,
  progressClass,
}: StatCardProps) {
  return (
    <div className="stat">
      <div className="stat-head">
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-value">
        {value}
        {suffix && <sup>{suffix}</sup>}
      </div>
      <div className="stat-foot">
        {delta && (
          <span className={`delta ${deltaDir === "down" ? "delta-down" : "delta-up"}`}>
            {deltaDir === "down" ? (
              <TrendingDown size={12} strokeWidth={1.5} />
            ) : (
              <TrendingUp size={12} strokeWidth={1.5} />
            )}
            {delta}
          </span>
        )}
        {foot && <span>{foot}</span>}
        {progress !== undefined && (
          <div className="ml-auto max-w-[140px] flex-1">
            <div className="progress">
              <div
                className={`progress-bar ${progressClass ?? ""}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {progressLabel && <span className="ml-auto">{progressLabel}</span>}
        {spark && (
          <span className="ml-auto">
            <MiniSpark data={spark} color={sparkColor} />
          </span>
        )}
      </div>
    </div>
  )
}
