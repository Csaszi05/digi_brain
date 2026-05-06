import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type LinkType = "blocks" | "relates" | "duplicates"

export type TaskLink = {
  id: string
  source_id: string
  target_id: string
  link_type: LinkType
  created_at: string
}

export type TaskLinkCreate = {
  target_id: string
  link_type: LinkType
}

const KEYS = {
  topicLinks: (topicId: string) => ["links", { topicId }] as const,
}

export function useTopicLinksQuery(topicId: string | undefined) {
  return useQuery({
    queryKey: topicId ? KEYS.topicLinks(topicId) : ["links", "_disabled"],
    enabled: !!topicId,
    queryFn: async () => {
      const { data } = await api.get<TaskLink[]>(`/topics/${topicId}/links`)
      return data
    },
  })
}

export function useCreateLinkMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sourceId,
      ...payload
    }: { sourceId: string } & TaskLinkCreate) => {
      const { data } = await api.post<TaskLink>(`/tasks/${sourceId}/links`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.topicLinks(topicId) })
    },
  })
}

export function useDeleteLinkMutation(topicId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(`/links/${linkId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.topicLinks(topicId) })
    },
  })
}
