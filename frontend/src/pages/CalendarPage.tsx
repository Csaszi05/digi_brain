import { useState, useCallback, useMemo } from "react"
import { Calendar, dateFnsLocalizer, Views, type View, type SlotInfo } from "react-big-calendar"
import { format, parse, startOfWeek, getDay, addHours, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { hu } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Clock,
  MapPin, AlignLeft, Loader2, CalendarDays,
} from "lucide-react"
import { TopicPicker } from "@/components/ui/TopicPicker"
import {
  useCalendarEventsQuery, useCalendarsQuery,
  useCreateCalendarEventMutation, useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation, useLogAsTimeEntryMutation,
  type CalendarEvent, type CalendarItem,
} from "@/api/calendar"
import { useTopicsQuery } from "@/api/topics"

// ─── Localizer ────────────────────────────────────────────

const locales = { hu }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

// ─── Event modal ──────────────────────────────────────────

type ModalMode = "create" | "edit"

function EventModal({
  mode,
  initialStart,
  initialEnd,
  event,
  calendars,
  onSave,
  onDelete,
  onLogTime,
  onClose,
}: {
  mode: ModalMode
  initialStart?: Date
  initialEnd?: Date
  event?: CalendarEvent
  calendars: CalendarItem[]
  onSave: (data: {
    calendar_id: string; title: string; description?: string
    location?: string; starts_at: string; ends_at: string
    all_day: boolean; topic_id?: string | null
  }) => Promise<void>
  onDelete?: () => Promise<void>
  onLogTime?: () => Promise<void>
  onClose: () => void
}) {
  const toLocal = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }
  const nowLocal = () => toLocal(new Date().toISOString())

  const defaultCal = calendars.find(c => c.active)?.id ?? calendars[0]?.id ?? ""

  const [calId, setCalId]         = useState(event?.calendar_id ?? defaultCal)
  const [title, setTitle]         = useState(event?.title ?? "")
  const [desc, setDesc]           = useState(event?.description ?? "")
  const [location, setLocation]   = useState(event?.location ?? "")
  const [topicId, setTopicId]     = useState<string>(event?.topic_id ?? "")
  const [allDay, setAllDay]       = useState(event?.all_day ?? false)
  const [startsAt, setStartsAt]   = useState(
    event ? toLocal(event.starts_at) : (initialStart ? toLocal(initialStart.toISOString()) : nowLocal())
  )
  const [endsAt, setEndsAt]       = useState(
    event ? toLocal(event.ends_at) : (initialEnd ? toLocal(initialEnd.toISOString()) : toLocal(addHours(initialStart ?? new Date(), 1).toISOString()))
  )
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState("")

  const selectedCal = calendars.find(c => c.id === calId)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError("Add meg az esemény nevét."); return }
    if (!calId)        { setError("Válassz naptárat."); return }
    setSaving(true)
    try {
      await onSave({
        calendar_id: calId,
        title: title.trim(),
        description: desc || undefined,
        location: location || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at:   new Date(endsAt).toISOString(),
        all_day:   allDay,
        topic_id:  topicId || null,
      })
      onClose()
    } catch {
      setError("Mentés sikertelen.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm("Törlöd ezt az eseményt? A naptáradból is törlődik.")) return
    setDeleting(true)
    try { await onDelete(); onClose() }
    catch { setError("Törlés sikertelen."); setDeleting(false) }
  }

  const isPast = event ? new Date(event.ends_at) < new Date() : false

  return (
    <div className="tp-backdrop" onClick={onClose}>
      <div className="absolute inset-0 grid place-items-center p-6" onClick={e => e.stopPropagation()}>
        <div className="card" style={{ width: "100%", maxWidth: 520, position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
          <button className="sb-icon-btn" onClick={onClose} style={{ position: "absolute", top: 12, right: 12 }}>
            <X size={16} strokeWidth={1.5} />
          </button>

          <div style={{ fontSize: 15, fontWeight: 600, paddingRight: 32 }}>
            {mode === "create" ? "Új esemény" : "Esemény szerkesztése"}
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Title */}
            <input
              autoFocus
              className="rb-input"
              style={{ width: "100%", fontSize: 15, fontWeight: 500, height: 36 }}
              placeholder="Esemény neve…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            {/* Calendar selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CalendarDays size={14} strokeWidth={1.5} style={{ color: "var(--fg3)", flexShrink: 0 }} />
              <select
                className="rb-input"
                style={{ flex: 1, background: "none", border: "1px solid var(--border)", cursor: "pointer" }}
                value={calId}
                onChange={e => setCalId(e.target.value)}
              >
                {calendars.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedCal?.color && (
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: selectedCal.color, flexShrink: 0 }} />
              )}
            </div>

            {/* Dates */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Clock size={14} strokeWidth={1.5} style={{ color: "var(--fg3)", flexShrink: 0 }} />
              <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  className="rb-input"
                  style={{ flex: 1, minWidth: 160 }}
                  value={allDay ? startsAt.slice(0, 10) : startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                />
                <span style={{ color: "var(--fg3)", alignSelf: "center" }}>→</span>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  className="rb-input"
                  style={{ flex: 1, minWidth: 160 }}
                  value={allDay ? endsAt.slice(0, 10) : endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg2)", cursor: "pointer", paddingLeft: 24 }}>
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)}
                style={{ accentColor: "var(--accent)" }} />
              Egésznapos esemény
            </label>

            {/* Topic */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 14, flexShrink: 0 }} />
              <TopicPicker
                value={topicId || null}
                onChange={id => setTopicId(id ?? "")}
              />
            </div>

            {/* Location */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={14} strokeWidth={1.5} style={{ color: "var(--fg3)", flexShrink: 0 }} />
              <input
                className="rb-input"
                style={{ flex: 1 }}
                placeholder="Helyszín (opcionális)"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            {/* Description */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlignLeft size={14} strokeWidth={1.5} style={{ color: "var(--fg3)", flexShrink: 0, marginTop: 6 }} />
              <textarea
                className="ib-textarea"
                style={{ flex: 1, minHeight: 60, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-elev1)" }}
                placeholder="Leírás (opcionális)"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
              />
            </div>

            {error && (
              <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {mode === "edit" && onDelete && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleDelete}
                  disabled={deleting} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--danger)" }}>
                  {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} strokeWidth={1.5} />}
                  Törlés
                </button>
              )}
              {mode === "edit" && onLogTime && isPast && !event?.time_entry_id && (
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={async () => { await onLogTime(); onClose() }}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={12} strokeWidth={1.5} /> Log as time
                </button>
              )}
              {mode === "edit" && event?.time_entry_id && (
                <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                  ✓ Naplózva
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Mégse</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {saving ? <Loader2 size={12} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {mode === "create" ? "Létrehozás" : "Mentés"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────

type RBCEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: CalendarEvent
}

export default function CalendarPage() {
  const [view, setView]           = useState<View>(Views.WEEK)
  const [date, setDate]           = useState(new Date())
  const [creating, setCreating]   = useState<{ start: Date; end: Date } | null>(null)
  const [editing, setEditing]     = useState<CalendarEvent | null>(null)

  // Date range for query
  const since = useMemo(() => {
    const d = view === Views.MONTH ? startOfMonth(subMonths(date, 1)) : startOfWeek(date, { weekStartsOn: 1 })
    return d.toISOString()
  }, [date, view])
  const until = useMemo(() => {
    const d = view === Views.MONTH ? endOfMonth(addMonths(date, 1)) : new Date(date.getTime() + 14 * 86400_000)
    return d.toISOString()
  }, [date, view])

  const eventsQuery   = useCalendarEventsQuery({ since, until })
  const calendarsQuery = useCalendarsQuery()
  const topicsQuery   = useTopicsQuery()
  const createEvent   = useCreateCalendarEventMutation()
  const updateEvent   = useUpdateCalendarEventMutation()
  const deleteEvent   = useDeleteCalendarEventMutation()
  const logTime       = useLogAsTimeEntryMutation()

  const calendars = calendarsQuery.data ?? []
  const topics    = topicsQuery.data ?? []

  // Map to react-big-calendar format
  const rbcEvents = useMemo<RBCEvent[]>(() => {
    return (eventsQuery.data ?? []).map(ev => {
      const cal = calendars.find(c => c.id === ev.calendar_id)
      return {
        id:       ev.id,
        title:    ev.title,
        start:    new Date(ev.starts_at),
        end:      new Date(ev.ends_at),
        allDay:   ev.all_day,
        resource: ev,
        color:    cal?.color ?? undefined,
      }
    })
  }, [eventsQuery.data, calendars])

  const handleSelectSlot = useCallback((slot: SlotInfo) => {
    setEditing(null)
    setCreating({ start: slot.start, end: slot.end })
  }, [])

  const handleSelectEvent = useCallback((e: RBCEvent) => {
    setCreating(null)
    setEditing(e.resource)
  }, [])

  // Custom event style per calendar color
  const eventStyleGetter = useCallback((event: RBCEvent) => {
    const cal = calendars.find(c => c.id === event.resource.calendar_id)
    const color = cal?.color ?? "var(--accent)"
    const topic = topics.find(t => t.id === event.resource.topic_id)
    const bg = topic?.color ?? color
    return {
      style: {
        background: bg,
        border: "none",
        borderRadius: 4,
        color: "#fff",
        fontSize: 12,
        fontWeight: 500,
        padding: "1px 6px",
      },
    }
  }, [calendars, topics])

  function navigate(direction: "prev" | "next" | "today") {
    if (direction === "today") { setDate(new Date()); return }
    const delta = view === Views.MONTH ? (direction === "next" ? 1 : -1) : (direction === "next" ? 7 : -7)
    setDate(d => {
      const nd = new Date(d)
      if (view === Views.MONTH) return direction === "next" ? addMonths(d, 1) : subMonths(d, 1)
      nd.setDate(d.getDate() + delta)
      return nd
    })
  }

  const headerLabel = useMemo(() => {
    if (view === Views.MONTH) return format(date, "yyyy MMMM", { locale: hu })
    const ws = startOfWeek(date, { weekStartsOn: 1 })
    const we = new Date(ws.getTime() + 6 * 86400_000)
    const startLabel = format(ws, "MMM d", { locale: hu })
    const endLabel   = format(we, "d", { locale: hu })
    const year       = format(date, "yyyy")
    return `${startLabel} – ${endLabel}, ${year}`
  }, [date, view])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
        borderBottom: "1px solid var(--border)", flexShrink: 0, background: "var(--bg-base)",
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("today")}>Ma</button>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="sb-icon-btn" onClick={() => navigate("prev")}><ChevronLeft size={16} strokeWidth={1.5} /></button>
          <button className="sb-icon-btn" onClick={() => navigate("next")}><ChevronRight size={16} strokeWidth={1.5} /></button>
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{headerLabel}</span>

        {/* Legend */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {calendars.filter(c => c.active).map(c => (
            <span key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color ?? "var(--accent)" }} />
              {c.name}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[Views.WEEK, Views.DAY, Views.MONTH].map(v => (
            <button key={v} className="btn btn-ghost btn-sm"
              style={{ fontWeight: view === v ? 600 : 400, color: view === v ? "var(--fg1)" : "var(--fg3)" }}
              onClick={() => setView(v)}>
              {{ week: "Hét", day: "Nap", month: "Hónap" }[v]}
            </button>
          ))}
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setCreating({ start: new Date(), end: addHours(new Date(), 1) })}
          style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Plus size={13} strokeWidth={1.5} /> Új esemény
        </button>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1, overflow: "hidden", padding: "0 8px 8px" }}>
        <Calendar
          localizer={localizer}
          events={rbcEvents}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          style={{ height: "100%" }}
          messages={{
            today: "Ma", previous: "Előző", next: "Következő",
            month: "Hónap", week: "Hét", day: "Nap", agenda: "Napirend",
            date: "Dátum", time: "Idő", event: "Esemény",
            noEventsInRange: "Nincs esemény ebben az időszakban.",
            allDay: "Egésznapos",
          }}
          culture="hu"
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          popup
        />
      </div>

      {/* Create modal */}
      {creating && calendars.length > 0 && (
        <EventModal
          mode="create"
          initialStart={creating.start}
          initialEnd={creating.end}
          calendars={calendars}

          onSave={async (data) => { await createEvent.mutateAsync(data) }}
          onClose={() => setCreating(null)}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EventModal
          mode="edit"
          event={editing}
          calendars={calendars}

          onSave={async (data) => { await updateEvent.mutateAsync({ id: editing.id, ...data }) }}
          onDelete={async () => { await deleteEvent.mutateAsync(editing.id) }}
          onLogTime={async () => { await logTime.mutateAsync({ eventId: editing.id }) }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* No calendars warning */}
      {!calendarsQuery.isLoading && calendars.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
        }}>
          <div className="card" style={{ textAlign: "center", maxWidth: 360, padding: 32 }}>
            <CalendarDays size={32} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Még nincs naptár csatlakoztatva</div>
            <div style={{ fontSize: 12, color: "var(--fg3)", marginBottom: 16 }}>
              A naptár használatához adj hozzá egy fiókot a beállításokban.
            </div>
            <a href="/calendar/settings" className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} strokeWidth={1.5} /> Fiók hozzáadása
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
