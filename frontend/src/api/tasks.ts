import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type TaskPriority = "low" | "medium" | "high"

export type Task = {
  id: string
  topic_id: string
  user_id: string
  column_id: string
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | null
  position: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type TaskCreate = {
  title: string
  description?: string | null
  column_id: string
  priority?: TaskPriority
  due_date?: string | null
}

export type TaskUpdate = Partial<{
  title: string
  description: string | null
  column_id: string
  priority: TaskPriority
  due_date: string | null
  position: number
}>

const KEYS = {
  all: ["tasks"] as const,
  byTopic: (topicId: string) => ["tasks", { topicId }] as const,
}

export function useTopicTasksQuery(topicId: string | undefined) {
  return useQuery({
    queryKey: topicId ? KEYS.byTopic(topicId) : ["tasks", "_disabled"],
    enabled: !!topicId,
    queryFn: async () => {
      const { data } = await api.get<Task[]>(`/topics/${topicId}/tasks`)
      return data
    },
  })
}

export function useCreateTaskMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TaskCreate) => {
      const { data } = await api.post<Task>(`/topics/${topicId}/tasks`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.byTopic(topicId) })
    },
  })
}

export function useUpdateTaskMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TaskUpdate) => {
      const { data } = await api.patch<Task>(`/tasks/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.byTopic(topicId) })
    },
  })
}

export function useDeleteTaskMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.byTopic(topicId) })
    },
  })
}
