import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type ShoppingList = {
  id: string
  user_id: string
  name: string
  icon: string
  position: number
  item_count: number
  checked_count: number
  created_at: string
  updated_at: string
}

export type ShoppingItem = {
  id: string
  list_id: string
  name: string
  quantity: string | null
  note: string | null
  category: string | null
  checked: boolean
  position: number
  created_at: string
  updated_at: string
}

// ─── Lists ────────────────────────────────────────────────

export function useShoppingListsQuery() {
  return useQuery({
    queryKey: ["shopping-lists"],
    queryFn: async () => {
      const { data } = await api.get<ShoppingList[]>("/shopping/lists")
      return data
    },
    refetchOnWindowFocus: true,
  })
}

export function useCreateShoppingListMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; icon?: string }) => {
      const { data } = await api.post<ShoppingList>("/shopping/lists", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
  })
}

export function useUpdateShoppingListMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; icon?: string; position?: number }) => {
      const { data } = await api.patch<ShoppingList>(`/shopping/lists/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists"] }),
  })
}

export function useDeleteShoppingListMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/shopping/lists/${id}`) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-lists"] })
      qc.invalidateQueries({ queryKey: ["shopping-items"] })
    },
  })
}

// ─── Items ────────────────────────────────────────────────

export function useShoppingItemsQuery(listId: string | null) {
  return useQuery({
    queryKey: ["shopping-items", listId],
    queryFn: async () => {
      if (!listId) return [] as ShoppingItem[]
      const { data } = await api.get<ShoppingItem[]>(`/shopping/lists/${listId}/items`)
      return data
    },
    enabled: !!listId,
    refetchOnWindowFocus: true,
  })
}

export function useCreateShoppingItemMutation(listId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string; quantity?: string | null; note?: string | null; category?: string | null
    }) => {
      if (!listId) throw new Error("No list selected")
      const { data } = await api.post<ShoppingItem>(`/shopping/lists/${listId}/items`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-items", listId] })
      qc.invalidateQueries({ queryKey: ["shopping-lists"] })
    },
  })
}

export function useUpdateShoppingItemMutation(listId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string
      name?: string
      quantity?: string | null
      note?: string | null
      category?: string | null
      checked?: boolean
      position?: number
    }) => {
      const { data } = await api.patch<ShoppingItem>(`/shopping/items/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-items", listId] })
      qc.invalidateQueries({ queryKey: ["shopping-lists"] })
    },
  })
}

export function useDeleteShoppingItemMutation(listId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/shopping/items/${id}`) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-items", listId] })
      qc.invalidateQueries({ queryKey: ["shopping-lists"] })
    },
  })
}

export function useClearCheckedMutation(listId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!listId) throw new Error("No list selected")
      const { data } = await api.post<{ deleted: number }>(`/shopping/lists/${listId}/clear-checked`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-items", listId] })
      qc.invalidateQueries({ queryKey: ["shopping-lists"] })
    },
  })
}

export function useUncheckAllMutation(listId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!listId) throw new Error("No list selected")
      await api.post(`/shopping/lists/${listId}/uncheck-all`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-items", listId] })
      qc.invalidateQueries({ queryKey: ["shopping-lists"] })
    },
  })
}
