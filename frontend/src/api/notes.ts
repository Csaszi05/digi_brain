import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type Note = {
  id: string
  user_id: string
  topic_id: string | null
  title: string
  content: string
  file_path: string | null
  created_at: string
  updated_at: string
}

export type NoteCreate = {
  title: string
  content?: string
  topic_id?: string | null
}

export type NoteUpdate = Partial<{
  title: string
  content: string
  topic_id: string | null
}>

const KEYS = {
  all: ["notes"] as const,
  global: (filterTopicId: string | null) =>
    ["notes", "global", { filterTopicId }] as const,
  byTopic: (topicId: string) => ["notes", { topicId }] as const,
}

export function useTopicNotesQuery(topicId: string | undefined) {
  return useQuery({
    queryKey: topicId ? KEYS.byTopic(topicId) : ["notes", "_disabled"],
    enabled: !!topicId,
    queryFn: async () => {
      const { data } = await api.get<Note[]>(`/topics/${topicId}/notes`)
      return data
    },
  })
}

/** All the user's notes, optionally filtered by topic id. */
export function useAllNotesQuery(filterTopicId: string | null = null) {
  return useQuery({
    queryKey: KEYS.global(filterTopicId),
    queryFn: async () => {
      const { data } = await api.get<Note[]>("/notes", {
        params: filterTopicId ? { topic_id: filterTopicId } : {},
      })
      return data
    },
  })
}

export function useCreateNoteMutation(topicId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: NoteCreate) => {
      const { data } = await api.post<Note>("/notes", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      if (topicId) qc.invalidateQueries({ queryKey: KEYS.byTopic(topicId) })
    },
  })
}

export function useUpdateNoteMutation(topicId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & NoteUpdate) => {
      const { data } = await api.patch<Note>(`/notes/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      if (topicId) qc.invalidateQueries({ queryKey: KEYS.byTopic(topicId) })
    },
  })
}

export function useDeleteNoteMutation(topicId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
      if (topicId) qc.invalidateQueries({ queryKey: KEYS.byTopic(topicId) })
    },
  })
}
