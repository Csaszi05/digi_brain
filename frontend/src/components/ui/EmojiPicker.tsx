import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Work & Projects",
    emojis: ["💼","📁","📂","📋","📊","📈","📉","✅","❌","🎯","🏆","🔑","💡","⚡","🚀","🛠️","⚙️","🖥️","💻","📌"],
  },
  {
    label: "School & Study",
    emojis: ["📚","📖","✏️","📝","🎓","🔬","🧪","📐","🗒️","📑","📄","🗂️","🖊️","🧮","🔭"],
  },
  {
    label: "People",
    emojis: ["👤","👥","🤝","👋","👍","👎","💬","🗣️","🧑‍💻","👩‍💻","👨‍💻","🧑‍🎓"],
  },
  {
    label: "Status & Symbols",
    emojis: ["⭐","🔥","🎉","✨","💯","🆕","✔️","⏳","🔄","🟢","🟡","🔴","🔵","⚪","⚫","♻️"],
  },
  {
    label: "Nature",
    emojis: ["🌱","🌿","🌲","🍃","🌸","🌻","🌙","☀️","⛅","🌈","🌊","❄️","🏔️","🌍"],
  },
  {
    label: "Objects",
    emojis: ["📦","🗃️","🗄️","📬","📡","🔋","💾","📷","🎵","🎮","🧩","🎲","🎸","🎧","🕹️"],
  },
  {
    label: "Animals",
    emojis: ["🐱","🐶","🐰","🦊","🐻","🐼","🐯","🦁","🐮","🐸","🦋","🐝","🦅","🦉","🐬"],
  },
  {
    label: "Food & Travel",
    emojis: ["☕","🍕","🍔","🍜","🎂","🍎","✈️","🚗","🏠","🏢","🗺️","🏖️","🏕️"],
  },
]

type Props = {
  /** Currently selected emoji or null. */
  value: string | null
  onChange: (emoji: string | null) => void
  /** The element that triggers the picker. Rendered as-is; the picker opens next to it. */
  trigger: React.ReactNode
}

export function EmojiPicker({ value, onChange, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const openPicker = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect()
      const pickerWidth = 300
      let left = rect.left + window.scrollX
      if (left + pickerWidth > window.innerWidth - 8) {
        left = window.innerWidth - pickerWidth - 8
      }
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: Math.max(left, 8),
      })
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const picker = document.getElementById("digibrain-emoji-picker")
      if (!picker?.contains(e.target as Node) && !wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("mousedown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const pick = (emoji: string) => {
    onChange(emoji)
    setOpen(false)
  }

  return (
    <>
      <div ref={wrapRef} onClick={openPicker} style={{ display: "contents" }}>
        {trigger}
      </div>

      {open &&
        createPortal(
          <div
            id="digibrain-emoji-picker"
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              zIndex: 200,
              width: 300,
              maxHeight: 380,
              background: "var(--bg-elev1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--fg3)", fontWeight: 500 }}>
                Pick an emoji
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {value && (
                  <button
                    type="button"
                    onClick={() => { onChange(null); setOpen(false) }}
                    className="sb-icon-btn"
                    title="Remove icon"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "6px 4px 8px" }}>
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--fg3)",
                      padding: "6px 8px 3px",
                    }}
                  >
                    {cat.label}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(8, 1fr)",
                      gap: 1,
                      padding: "0 4px",
                    }}
                  >
                    {cat.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => pick(emoji)}
                        title={emoji}
                        style={{
                          background: value === emoji ? "var(--accent-soft)" : "transparent",
                          border: 0,
                          borderRadius: 5,
                          cursor: "pointer",
                          fontSize: 18,
                          lineHeight: 1,
                          padding: "4px 2px",
                          textAlign: "center",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            value === emoji ? "var(--accent-soft)" : "transparent"
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
