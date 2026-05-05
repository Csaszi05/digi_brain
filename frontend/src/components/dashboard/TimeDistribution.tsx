import { ChevronDown } from "lucide-react"

export type TimeSlice = {
  topic: string
  color: string
  hours: number
  pct: number
}

type TimeDistributionProps = {
  slices: TimeSlice[]
  totalHours: number
}

export function TimeDistribution({ slices, totalHours }: TimeDistributionProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="text-base font-semibold text-fg1">This week's time</div>
          <div className="mt-0.5 text-xs text-fg3">{totalHours} hours total</div>
        </div>
        <button className="btn btn-ghost btn-sm" type="button">
          This week
          <ChevronDown size={12} strokeWidth={1.5} />
        </button>
      </div>

      <div className="mb-4 flex h-2 overflow-hidden rounded bg-bg-elev2">
        {slices.map((s) => (
          <div
            key={s.topic}
            style={{ width: `${s.pct}%`, background: s.color }}
            title={`${s.topic} · ${s.hours}h`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {slices.map((s) => (
          <div key={s.topic} className="flex items-center gap-2.5">
            <span
              className="tag-dot"
              style={{ background: s.color, width: 8, height: 8 }}
            />
            <span className="flex-1 text-13 text-fg2">{s.topic}</span>
            <span className="text-xs tabular-nums text-fg3">{s.pct}%</span>
            <span className="min-w-[40px] text-right text-13 font-medium tabular-nums text-fg1">
              {s.hours}h
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
