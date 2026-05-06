import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type Topic = {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  icon: string | null
  color: string | null
  archived: boolean
  position: number
  created_at: string
}

export type KanbanColumn = {
  id: string
  topic_id: string
  name: string
  color: string | null
  position: number
  is_done_column: boolean
}

export type TopicWithColumns = Topic & {
  kanban_columns: KanbanColumn[]
}

export type TopicCreate = {
  name: string
  parent_id?: string | null
  icon?: string | null
  color?: string | null
}

export type TopicUpdate = Partial<{
  name: string
  parent_id: string | null
  icon: string | null
  color: string | null
  archived: boolean
  position: number
}>

const KEYS = {
  all: ["topics"] as const,
  list: (includeArchived: boolean) => ["topics", { includeArchived }] as const,
  detail: (id: string) => ["topics", id] as const,
}

export function useTopicsQuery(includeArchived = false) {
  return useQuery({
    queryKey: KEYS.list(includeArchived),
    queryFn: async () => {
      const { data } = await api.get<Topic[]>("/topics", {
        params: { include_archived: includeArchived },
      })
      return data
    },
  })
}

export function useTopicQuery(id: string | undefined) {
  return useQuery({
    queryKey: id ? KEYS.detail(id) : ["topics", "_disabled"],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<TopicWithColumns>(`/topics/${id}`)
      return data
    },
  })
}

export function useCreateTopicMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TopicCreate) => {
      const { data } = await api.post<TopicWithColumns>("/topics", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useUpdateTopicMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TopicUpdate) => {
      const { data } = await api.patch<Topic>(`/topics/${id}`, payload)
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) })
    },
  })
}

export function useDeleteTopicMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/topics/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
