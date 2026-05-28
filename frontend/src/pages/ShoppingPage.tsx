import { useEffect, useMemo, useRef, useState } from "react"
import {
  ShoppingCart, Plus, MoreHorizontal, Trash2, X, ChevronDown, Check,
  Pencil, Loader2, RotateCcw,
} from "lucide-react"
import {
  type ShoppingItem, type ShoppingList,
  useShoppingListsQuery, useCreateShoppingListMutation,
  useUpdateShoppingListMutation, useDeleteShoppingListMutation,
  useShoppingItemsQuery, useCreateShoppingItemMutation,
  useUpdateShoppingItemMutation, useDeleteShoppingItemMutation,
  useClearCheckedMutation, useUncheckAllMutation,
} from "@/api/shopping"
import { EmojiPicker } from "@/components/ui/EmojiPicker"

// ─── Category order (matches backend dict order) ────────

const CATEGORY_ORDER = [
  "Zöldség", "Gyümölcs", "Pékáru", "Tejtermék", "Hűtött & Tojás",
  "Hús & Hal", "Mirelit", "Tartós", "Italok", "Édesség & Snack",
  "Háztartás", "Drogéria",
]
const OTHER = "Egyéb"

const CATEGORY_EMOJI: Record<string, string> = {
  "Zöldség": "🥦",
  "Gyümölcs": "🍎",
  "Pékáru": "🥖",
  "Tejtermék": "🥛",
  "Hűtött & Tojás": "🥚",
  "Hús & Hal": "🥩",
  "Mirelit": "🧊",
  "Tartós": "🥫",
  "Italok": "🥤",
  "Édesség & Snack": "🍫",
  "Háztartás": "🧹",
  "Drogéria": "🧴",
  [OTHER]: "📦",
}

function groupByCategory(items: ShoppingItem[]) {
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const groups = new Map<string, ShoppingItem[]>()
  for (const it of unchecked) {
    const key = it.category && CATEGORY_ORDER.includes(it.category) ? it.category : OTHER
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(it)
  }
  const ordered: { category: string; items: ShoppingItem[] }[] = []
  for (const cat of [...CATEGORY_ORDER, OTHER]) {
    const g = groups.get(cat)
    if (g && g.length) ordered.push({ category: cat, items: g })
  }
  return { groups: ordered, checked }
}

// ─── Item row ────────────────────────────────────────────

function ItemRow({
  item, onToggle, onOpenDetails,
}: {
  item: ShoppingItem
  onToggle: () => void
  onOpenDetails: () => void
}) {
  return (
    <div
      className="sh-item"
      data-checked={item.checked ? "true" : "false"}
    >
      <button
        type="button"
        className="sh-check"
        onClick={onToggle}
        aria-label={item.checked ? "Mégse kész" : "Kész"}
      >
        {item.checked && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="sh-item-text" onClick={onToggle}>
        <div className="sh-item-name">{item.name}</div>
        {item.note && (
          <div className="sh-item-note">{item.note}</div>
        )}
      </div>
      {item.quantity && (
        <span className="sh-qty">{item.quantity}</span>
      )}
      <button
        type="button"
        className="sh-details-btn"
        onClick={(e) => { e.stopPropagation(); onOpenDetails() }}
        aria-label="Részletek"
      >
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </button>
    </div>
  )
}

// ─── Item details bottom sheet / popover ────────────────

function ItemDetails({
  item, listId, onClose,
}: { item: ShoppingItem; listId: string; onClose: () => void }) {
  const update = useUpdateShoppingItemMutation(listId)
  const del = useDeleteShoppingItemMutation(listId)

  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity ?? "")
  const [note, setNote] = useState(item.note ?? "")
  const [category, setCategory] = useState(item.category ?? "")

  useEffect(() => {
    setName(item.name)
    setQuantity(item.quantity ?? "")
    setNote(item.note ?? "")
    setCategory(item.category ?? "")
  }, [item.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const save = () => {
    update.mutate({
      id: item.id,
      name: name.trim() || item.name,
      quantity: quantity.trim() || null,
      note: note.trim() || null,
      category: category || null,
    })
  }

  const handleDelete = () => {
    if (window.confirm(`Töröljük: ${item.name}?`)) {
      del.mutate(item.id)
      onClose()
    }
  }

  return (
    <>
      <div className="sh-sheet-backdrop" onClick={onClose} />
      <div className="sh-sheet" role="dialog" aria-label="Tétel szerkesztése">
        <div className="sh-sheet-handle" />
        <div className="sh-sheet-header">
          <span className="sh-sheet-title">Tétel szerkesztése</span>
          <button className="sb-icon-btn" onClick={onClose} aria-label="Bezárás">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="sh-sheet-body">
          <div>
            <label className="sh-label">Név</label>
            <input
              className="rb-input sh-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={save}
            />
          </div>

          <div className="sh-row-2">
            <div>
              <label className="sh-label">Mennyiség</label>
              <input
                className="rb-input sh-input"
                placeholder="pl. 2 l"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                onBlur={save}
              />
            </div>
            <div>
              <label className="sh-label">Kategória</label>
              <select
                className="sh-select"
                value={category}
                onChange={e => {
                  setCategory(e.target.value)
                  update.mutate({ id: item.id, category: e.target.value || null })
                }}
              >
                <option value="">(Auto / Egyéb)</option>
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="sh-label">Megjegyzés</label>
            <input
              className="rb-input sh-input"
              placeholder="pl. laktózmentes"
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={save}
            />
          </div>
        </div>

        <div className="sh-sheet-footer">
          <button className="btn" onClick={handleDelete} style={{ color: "var(--danger)" }}>
            <Trash2 size={14} strokeWidth={1.5} /> Törlés
          </button>
          <button className="btn btn-primary" onClick={() => { save(); onClose() }}>
            Kész
          </button>
        </div>
      </div>
    </>
  )
}

// ─── List sidebar (desktop) ─────────────────────────────

function ListSidebar({
  lists, activeId, onSelect, onNew,
}: {
  lists: ShoppingList[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <aside className="sh-lists">
      <div className="sh-lists-header">
        <span>Listák</span>
        <button className="sb-icon-btn" onClick={onNew} aria-label="Új lista">
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
      <div className="sh-lists-body">
        {lists.map(l => {
          const remaining = l.item_count - l.checked_count
          return (
            <button
              key={l.id}
              type="button"
              className="sh-list-row"
              data-active={activeId === l.id ? "true" : "false"}
              onClick={() => onSelect(l.id)}
            >
              <span className="sh-list-icon">{l.icon}</span>
              <span className="sh-list-name">{l.name}</span>
              <span className="sh-list-count">
                {l.item_count > 0 ? `${remaining}/${l.item_count}` : "—"}
              </span>
            </button>
          )
        })}
        {lists.length === 0 && (
          <div className="sh-lists-empty">
            Még nincs lista. <br />
            Hozz létre egyet!
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── List dropdown (mobile) ────────────────────────────

function ListDropdown({
  lists, activeId, onSelect, onNew,
}: {
  lists: ShoppingList[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = lists.find(l => l.id === activeId)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div className="sh-dropdown" ref={ref}>
      <button
        type="button"
        className="sh-dropdown-trigger"
        onClick={() => setOpen(v => !v)}
      >
        <span className="sh-list-icon">{active?.icon ?? "🛒"}</span>
        <span className="sh-dropdown-name">{active?.name ?? "Válassz listát"}</span>
        <ChevronDown size={14} strokeWidth={1.5}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div className="sh-dropdown-panel">
          {lists.map(l => {
            const remaining = l.item_count - l.checked_count
            return (
              <button
                key={l.id}
                type="button"
                className="sh-dropdown-item"
                data-active={activeId === l.id ? "true" : "false"}
                onClick={() => { onSelect(l.id); setOpen(false) }}
              >
                <span className="sh-list-icon">{l.icon}</span>
                <span className="sh-list-name">{l.name}</span>
                <span className="sh-list-count">
                  {l.item_count > 0 ? `${remaining}/${l.item_count}` : "—"}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            className="sh-dropdown-item sh-dropdown-new"
            onClick={() => { onNew(); setOpen(false) }}
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>Új lista</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="sh-empty">
      <ShoppingCart size={40} strokeWidth={1} style={{ opacity: 0.4 }} />
      <div style={{ fontSize: 14, marginTop: 8 }}>Még nincs bevásárló listád.</div>
      <button className="btn btn-primary" onClick={onNew} style={{ marginTop: 12 }}>
        <Plus size={14} strokeWidth={1.5} /> Új lista
      </button>
    </div>
  )
}

// ─── List action menu (rename, icon, delete) ──────────

function ListActionsMenu({
  list, onClose,
}: { list: ShoppingList; onClose: () => void }) {
  const update = useUpdateShoppingListMutation()
  const del = useDeleteShoppingListMutation()
  const uncheckAll = useUncheckAllMutation(list.id)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(list.name)

  const handleDelete = () => {
    if (window.confirm(`Töröljük a "${list.name}" listát az összes tétellel?`)) {
      del.mutate(list.id)
      onClose()
    }
  }

  return (
    <>
      <div className="sh-menu-backdrop" onClick={onClose} />
      <div className="sh-menu" role="menu">
        {renaming ? (
          <div style={{ padding: 12 }}>
            <input
              autoFocus
              className="rb-input sh-input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  update.mutate({ id: list.id, name: name.trim() || list.name })
                  setRenaming(false)
                  onClose()
                }
                if (e.key === "Escape") setRenaming(false)
              }}
            />
          </div>
        ) : (
          <>
            <EmojiPicker
              value={list.icon}
              onChange={emoji => { update.mutate({ id: list.id, icon: emoji ?? "🛒" }); onClose() }}
              trigger={
                <button className="sh-menu-item">
                  <span style={{ fontSize: 16 }}>{list.icon}</span>
                  <span>Ikon módosítása</span>
                </button>
              }
            />
            <button className="sh-menu-item" onClick={() => setRenaming(true)}>
              <Pencil size={14} strokeWidth={1.5} />
              <span>Átnevezés</span>
            </button>
            <button className="sh-menu-item" onClick={() => { uncheckAll.mutate(); onClose() }}>
              <RotateCcw size={14} strokeWidth={1.5} />
              <span>Minden pipa törlése</span>
            </button>
            <div className="sh-menu-divider" />
            <button className="sh-menu-item" onClick={handleDelete} style={{ color: "var(--danger)" }}>
              <Trash2 size={14} strokeWidth={1.5} />
              <span>Lista törlése</span>
            </button>
          </>
        )}
      </div>
    </>
  )
}

// ─── Main page ─────────────────────────────────────────

export default function ShoppingPage() {
  const listsQuery = useShoppingListsQuery()
  const lists = listsQuery.data ?? []

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [detailsItem, setDetailsItem] = useState<ShoppingItem | null>(null)

  const createList = useCreateShoppingListMutation()

  // Pick first list once data loads / when active is gone
  useEffect(() => {
    if (lists.length === 0) { setActiveId(null); return }
    if (!activeId || !lists.find(l => l.id === activeId)) {
      setActiveId(lists[0].id)
    }
  }, [lists, activeId])

  const itemsQuery = useShoppingItemsQuery(activeId)
  const items = itemsQuery.data ?? []
  const { groups, checked } = useMemo(() => groupByCategory(items), [items])
  const activeList = lists.find(l => l.id === activeId) ?? null

  const createItem = useCreateShoppingItemMutation(activeId)
  const updateItem = useUpdateShoppingItemMutation(activeId)
  const clearChecked = useClearCheckedMutation(activeId)

  // Quick-add input
  const inputRef = useRef<HTMLInputElement>(null)
  const [quickAdd, setQuickAdd] = useState("")

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const name = quickAdd.trim()
    if (!name || !activeId) return
    createItem.mutate({ name })
    setQuickAdd("")
    inputRef.current?.focus()
  }

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    createList.mutate({ name }, {
      onSuccess: (lst) => {
        setActiveId(lst.id)
        setNewName("")
        setShowNew(false)
      },
    })
  }

  return (
    <div className="sh-page">
      {/* Desktop sidebar */}
      <div className="sh-sidebar-wrap">
        <ListSidebar
          lists={lists}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={() => setShowNew(true)}
        />
      </div>

      {/* Main column */}
      <div className="sh-main">
        {listsQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--fg3)" }}>
            <Loader2 size={20} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : lists.length === 0 && !showNew ? (
          <EmptyState onNew={() => setShowNew(true)} />
        ) : (
          <>
            {/* Sticky top: header + quickadd stay together at viewport top */}
            <div className="sh-stickytop">
            {/* Header (sticky on mobile) */}
            <div className="sh-header">
              {/* Mobile: dropdown ; Desktop: title */}
              <div className="sh-header-title sh-mobile-only">
                <ListDropdown
                  lists={lists}
                  activeId={activeId}
                  onSelect={setActiveId}
                  onNew={() => setShowNew(true)}
                />
              </div>
              <div className="sh-header-title sh-desktop-only">
                {activeList && (
                  <>
                    <span style={{ fontSize: 20 }}>{activeList.icon}</span>
                    <span style={{ fontSize: 18, fontWeight: 600 }}>{activeList.name}</span>
                  </>
                )}
              </div>

              {activeList && (
                <>
                  <span className="sh-header-count">
                    {activeList.checked_count}/{activeList.item_count} kész
                  </span>
                  <button
                    type="button"
                    className="sb-icon-btn"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Lista műveletek"
                  >
                    <MoreHorizontal size={16} strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>

            {/* New list inline form */}
            {showNew && (
              <form onSubmit={handleCreateList} className="sh-newlist">
                <input
                  autoFocus
                  className="rb-input sh-input"
                  placeholder="Lista neve (pl. Heti bevásárlás)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
                  Létrehoz
                </button>
                <button type="button" className="btn btn-ghost"
                  onClick={() => { setShowNew(false); setNewName("") }}>
                  Mégse
                </button>
              </form>
            )}

            {activeList && !showNew && (
              <>
                {/* Quick-add input — part of sticky top */}
                <form onSubmit={handleAdd} className="sh-quickadd">
                  <Plus size={16} strokeWidth={1.5} style={{ color: "var(--fg3)", flexShrink: 0 }} />
                  <input
                    ref={inputRef}
                    className="sh-quickadd-input"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="Tétel hozzáadása…"
                    value={quickAdd}
                    onChange={e => setQuickAdd(e.target.value)}
                  />
                </form>
              </>
            )}
            </div>

            {activeList && !showNew && (
              <>
                {/* Items grouped by category */}
                <div className="sh-items">
                  {items.length === 0 && (
                    <div style={{ textAlign: "center", padding: 32, color: "var(--fg3)", fontSize: 13 }}>
                      Üres lista — kezdj el írni felül!
                    </div>
                  )}

                  {groups.map(g => (
                    <div key={g.category} className="sh-group">
                      <div className="sh-category">
                        <span style={{ marginRight: 6 }}>{CATEGORY_EMOJI[g.category]}</span>
                        {g.category}
                      </div>
                      {g.items.map(it => (
                        <ItemRow
                          key={it.id}
                          item={it}
                          onToggle={() => updateItem.mutate({ id: it.id, checked: !it.checked })}
                          onOpenDetails={() => setDetailsItem(it)}
                        />
                      ))}
                    </div>
                  ))}

                  {checked.length > 0 && (
                    <div className="sh-group">
                      <div className="sh-category sh-category-done">
                        <span style={{ marginRight: 6 }}>✓</span>
                        Kész ({checked.length})
                      </div>
                      {checked.map(it => (
                        <ItemRow
                          key={it.id}
                          item={it}
                          onToggle={() => updateItem.mutate({ id: it.id, checked: !it.checked })}
                          onOpenDetails={() => setDetailsItem(it)}
                        />
                      ))}
                      <button
                        type="button"
                        className="btn btn-ghost sh-clear"
                        onClick={() => clearChecked.mutate()}
                      >
                        <Trash2 size={13} strokeWidth={1.5} /> Készek törlése
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Details sheet */}
      {detailsItem && activeId && (
        <ItemDetails
          item={detailsItem}
          listId={activeId}
          onClose={() => setDetailsItem(null)}
        />
      )}

      {/* List actions menu */}
      {menuOpen && activeList && (
        <ListActionsMenu list={activeList} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  )
}
