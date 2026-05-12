import { useState, useRef, useEffect, useMemo } from "react"
import { Search, X, ChevronDown, Tag } from "lucide-react"
import { useTopicsQuery, type Topic } from "@/api/topics"

// ─── Helpers ─────────────────────────────────────────────

type FlatTopic = Topic & { depth: number }

function flattenTopics(topics: Topic[], parentId: string | null = null, depth = 0): FlatTopic[] {
  return topics
    .filter(t => t.parent_id === parentId)
    .flatMap(t => [
      { ...t, depth },
      ...flattenTopics(topics, t.id, depth + 1),
    ])
}

// ─── Component ────────────────────────────────────────────

type Props = {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  clearable?: boolean
  size?: "sm" | "md"
}

export function TopicPicker({
  value,
  onChange,
  placeholder = "— Nincs topic —",
  clearable = true,
  size = "md",
}: Props) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState("")
  const containerRef        = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  const topicsQuery = useTopicsQuery()
  const all = topicsQuery.data ?? []

  const selected = all.find(t => t.id === value) ?? null

  const flat = useMemo(() => flattenTopics(all), [all])

  const filtered = useMemo(() => {
    if (!query.trim()) return flat
    const q = query.toLowerCase()
    return flat.filter(t => t.name.toLowerCase().includes(q))
  }, [flat, query])

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [open])

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 30)
    else setQuery("")
  }, [open])

  const height = size === "sm" ? 26 : 32
  const fontSize = size === "sm" ? 12 : 13

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", minWidth: 160 }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          height, padding: "0 8px 0 10px",
          fontSize, color: selected ? "var(--fg1)" : "var(--fg3)",
          background: "var(--bg-elev1)",
          border: "1px solid var(--border)",
          borderRadius: 6, cursor: "pointer", width: "100%",
          transition: "border-color 0.1s",
        }}
      >
        {selected ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color ?? "var(--accent)", flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <Tag size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: "left" }}>{placeholder}</span>
          </>
        )}
        {clearable && selected ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            style={{ color: "var(--fg3)", display: "flex", padding: 2, borderRadius: 3, marginLeft: "auto" }}
          >
            <X size={11} strokeWidth={2} />
          </span>
        ) : (
          <ChevronDown size={12} strokeWidth={1.5} style={{ color: "var(--fg3)", marginLeft: "auto", flexShrink: 0 }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
          background: "var(--bg-elev2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          minWidth: 220, width: "max-content", maxWidth: 320,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7 }}>
            <Search size={13} strokeWidth={1.5} style={{ color: "var(--fg3)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Keresés…"
              style={{
                background: "transparent", border: "none", outline: "none",
                fontSize: 13, color: "var(--fg1)", width: "100%",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg3)", padding: 0 }}>
                <X size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Options */}
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {/* No topic option */}
            {!query && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false) }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 12px", fontSize: 13,
                  color: value === null ? "var(--fg1)" : "var(--fg3)",
                  background: value === null ? "var(--bg-hover)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border)", flexShrink: 0 }} />
                {placeholder}
              </button>
            )}

            {filtered.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--fg3)" }}>
                Nincs találat: „{query}"
              </div>
            )}

            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false) }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "7px 12px",
                  paddingLeft: 12 + t.depth * 16,
                  fontSize: 13,
                  color: value === t.id ? "var(--fg1)" : "var(--fg2)",
                  background: value === t.id ? "var(--accent-soft)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => { if (value !== t.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)" }}
                onMouseLeave={e => { if (value !== t.id) (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: t.color ?? "var(--accent)",
                  flexShrink: 0,
                  opacity: t.depth > 0 ? 0.7 : 1,
                }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.name}
                </span>
                {value === t.id && (
                  <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 11 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
