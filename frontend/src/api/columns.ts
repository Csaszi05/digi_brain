import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { KanbanColumn } from "@/api/topics"

export type KanbanColumnCreate = {
  name: string
  color?: string | null
  is_done_column?: boolean
}

export type KanbanColumnUpdate = Partial<{
  name: string
  color: string | null
  is_done_column: boolean
  position: number
}>

const TOPICS_KEY = ["topics"] as const

export function useCreateColumnMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: KanbanColumnCreate) => {
      const { data } = await api.post<KanbanColumn>(
        `/topics/${topicId}/columns`,
        payload
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TOPICS_KEY })
    },
  })
}

export function useUpdateColumnMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & KanbanColumnUpdate) => {
      const { data } = await api.patch<KanbanColumn>(`/columns/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics", topicId] })
      qc.invalidateQueries({ queryKey: TOPICS_KEY })
    },
  })
}

export function useDeleteColumnMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/columns/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topics", topicId] })
      qc.invalidateQueries({ queryKey: TOPICS_KEY })
      qc.invalidateQueries({ queryKey: ["tasks", { topicId }] })
    },
  })
}
