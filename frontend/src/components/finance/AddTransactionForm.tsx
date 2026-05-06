import { useState } from "react"
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateTransactionMutation,
  type TransactionKind,
} from "@/api/finance"
import { useTopicsQuery } from "@/api/topics"

const COMMON_CURRENCIES = ["HUF", "EUR", "USD", "GBP"]
const PRESET_COLORS = [
  "#818cf8",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
  "#52525b",
]

type Props = {
  onClose: () => void
  defaultCurrency?: string
}

export function AddTransactionForm({ onClose, defaultCurrency = "HUF" }: Props) {
  const categoriesQuery = useCategoriesQuery()
  const topicsQuery = useTopicsQuery()
  const createTx = useCreateTransactionMutation()
  const createCat = useCreateCategoryMutation()

  const today = new Date().toISOString().slice(0, 10)

  const [kind, setKind] = useState<TransactionKind>("expense")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [categoryId, setCategoryId] = useState("")
  const [topicId, setTopicId] = useState("")
  const [date, setDate] = useState(today)
  const [note, setNote] = useState("")
  const [creatingCat, setCreatingCat] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])

  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    try {
      const cat = await createCat.mutateAsync({ name: trimmed, color: newCatColor })
      setCategoryId(cat.id)
      setCreatingCat(false)
      setNewCatName("")
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (err as any).response?.data?.detail
          : null
      window.alert(detail || "Could not create category")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = Number(amount)
    if (!categoryId || !Number.isFinite(num) || num <= 0) return
    try {
      await createTx.mutateAsync({
        category_id: categoryId,
        amount: num.toFixed(2),
        currency,
        kind,
        note: note.trim() || null,
        date,
        topic_id: topicId || null,
      })
      onClose()
    } catch {
      window.alert("Could not create transaction")
    }
  }

  return (
    <form
      className="card flex flex-col gap-3"
      onSubmit={handleSubmit}
      style={{ maxWidth: 560 }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">New transaction</h3>
        <div className="tabs" style={{ height: 28 }}>
          <button
            type="button"
            className="tab"
            data-active={kind === "expense" ? "true" : "false"}
            onClick={() => setKind("expense")}
          >
            Expense
          </button>
          <button
            type="button"
            className="tab"
            data-active={kind === "income" ? "true" : "false"}
            onClick={() => setKind("income")}
          >
            Income
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <div className="tp-field-label">Amount</div>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="tp-field-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>
        <div>
          <div className="tp-field-label">Currency</div>
          <select
            className="tp-field-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="tp-field-label" style={{ marginBottom: 0 }}>
            Category
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setCreatingCat((v) => !v)}
          >
            {creatingCat ? "Cancel" : "+ New"}
          </button>
        </div>
        {creatingCat ? (
          <div className="flex gap-2">
            <input
              className="tp-field-input"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleCreateCategory()
                }
              }}
            />
            <select
              className="tp-field-select"
              style={{ width: 130 }}
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
            >
              {PRESET_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCreateCategory}
              disabled={createCat.isPending || !newCatName.trim()}
            >
              Add
            </button>
          </div>
        ) : (
          <select
            className="tp-field-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Pick a category…</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="tp-field-label">Date</div>
          <input
            type="date"
            className="tp-field-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <div className="tp-field-label">Topic (optional)</div>
          <select
            className="tp-field-select"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">— None —</option>
            {(topicsQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon ? `${t.icon} ` : ""}
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="tp-field-label">Note (optional)</div>
        <input
          className="tp-field-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Lunch at the cafeteria…"
        />
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={
            createTx.isPending ||
            !categoryId ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0
          }
        >
          {createTx.isPending ? "Saving…" : "Save transaction"}
        </button>
      </div>
    </form>
  )
}
