import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type TransactionKind = "expense" | "income"
export type BudgetPeriod = "weekly" | "monthly" | "yearly"

export type Category = {
  id: string
  user_id: string
  name: string
  color: string | null
  icon: string | null
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  category_id: string
  topic_id: string | null
  amount: string // server returns Decimal as string
  currency: string
  kind: TransactionKind
  note: string | null
  date: string // YYYY-MM-DD
  created_at: string
}

export type Budget = {
  id: string
  user_id: string
  category_id: string
  amount: string
  currency: string
  period: BudgetPeriod
  created_at: string
}

const KEYS = {
  categories: ["finance", "categories"] as const,
  transactions: (filter: { since?: string; until?: string; categoryId?: string | null } = {}) =>
    ["finance", "transactions", filter] as const,
  budgets: ["finance", "budgets"] as const,
}

// ─── Categories ─────────────────────────────────────────────

export function useCategoriesQuery() {
  return useQuery({
    queryKey: KEYS.categories,
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  })
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string | null; icon?: string | null }) =>
      (await api.post<Category>("/categories", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.categories }),
  })
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; color?: string | null; icon?: string | null }) =>
      (await api.patch<Category>(`/categories/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  })
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  })
}

// ─── Transactions ───────────────────────────────────────────

export function useTransactionsQuery(filter: { since?: string; until?: string; categoryId?: string | null } = {}) {
  return useQuery({
    queryKey: KEYS.transactions(filter),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.since) params.since = filter.since
      if (filter.until) params.until = filter.until
      if (filter.categoryId) params.category_id = filter.categoryId
      return (await api.get<Transaction[]>("/transactions", { params })).data
    },
  })
}

export type TransactionCreate = {
  category_id: string
  amount: number | string
  currency?: string
  kind?: TransactionKind
  note?: string | null
  date: string
  topic_id?: string | null
}

export function useCreateTransactionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TransactionCreate) =>
      (await api.post<Transaction>("/transactions", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  })
}

export function useUpdateTransactionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<TransactionCreate>) =>
      (await api.patch<Transaction>(`/transactions/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  })
}

export function useDeleteTransactionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/transactions/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  })
}

// ─── Budgets ────────────────────────────────────────────────

export function useBudgetsQuery() {
  return useQuery({
    queryKey: KEYS.budgets,
    queryFn: async () => (await api.get<Budget[]>("/budgets")).data,
  })
}

export type BudgetCreate = {
  category_id: string
  amount: number | string
  currency?: string
  period: BudgetPeriod
}

export function useCreateBudgetMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: BudgetCreate) =>
      (await api.post<Budget>("/budgets", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.budgets }),
  })
}

export function useUpdateBudgetMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string; amount?: string | number; currency?: string; period?: BudgetPeriod }) =>
      (await api.patch<Budget>(`/budgets/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.budgets }),
  })
}

export function useDeleteBudgetMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budgets/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.budgets }),
  })
}
