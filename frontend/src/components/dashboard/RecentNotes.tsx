import { ArrowRight } from "lucide-react"

export type RecentNote = {
  title: string
  snippet: string
  topic: string
  color: string
  date: string
}

type RecentNotesProps = {
  notes: RecentNote[]
}

export function RecentNotes({ notes }: RecentNotesProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Recent notes</h2>
        <button className="btn btn-ghost btn-sm" type="button">
          All notes
          <ArrowRight size={12} strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {notes.map((n, i) => (
          <div key={i} className="card flex cursor-pointer flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="tag" style={{ height: 20, fontSize: 11 }}>
                <span className="tag-dot" style={{ background: n.color }} />
                {n.topic}
              </span>
              <span className="text-[11px] text-fg3">{n.date}</span>
            </div>
            <div className="text-sm font-semibold leading-tight text-fg1">
              {n.title}
            </div>
            <div
              className="text-13 leading-normal text-fg2"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {n.snippet}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
