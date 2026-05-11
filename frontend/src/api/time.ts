import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type TimeEntry = {
  id: string
  user_id: string
  topic_id: string
  task_id: string | null
  started_at: string
  ended_at: string | null
  note: string | null
  created_at: string
}

export type TimeEntryStart = {
  topic_id: string
  task_id?: string | null
  note?: string | null
}

export type TimeEntryUpdate = Partial<{
  topic_id: string
  task_id: string | null
  note: string | null
  started_at: string
  ended_at: string | null
}>

const KEYS = {
  all: ["time"] as const,
  active: ["time", "active"] as const,
  entries: (filter: { topicId?: string | null; since?: string; until?: string } = {}) =>
    ["time", "entries", filter] as const,
}

/** The currently-running entry, polled every 30s for cross-tab freshness. */
export function useActiveTimerQuery() {
  return useQuery({
    queryKey: KEYS.active,
    queryFn: async () => {
      const { data } = await api.get<TimeEntry | null>("/time/active")
      return data
    },
    refetchInterval: 30_000,
  })
}

export function useStartTimerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TimeEntryStart) => {
      const { data } = await api.post<TimeEntry>("/time/start", payload)
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(KEYS.active, data)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useStopTimerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<TimeEntry>("/time/stop")
      return data
    },
    onSuccess: () => {
      qc.setQueryData(KEYS.active, null)
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useTimeEntriesQuery(filter: {
  topicId?: string | null
  since?: string
  until?: string
} = {}) {
  return useQuery({
    queryKey: KEYS.entries(filter),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.topicId) params.topic_id = filter.topicId
      if (filter.since) params.since = filter.since
      if (filter.until) params.until = filter.until
      const { data } = await api.get<TimeEntry[]>("/time/entries", { params })
      return data
    },
  })
}

export function useUpdateTimeEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TimeEntryUpdate) => {
      const { data } = await api.patch<TimeEntry>(`/time/entries/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export type TimeEntryManualCreate = {
  topic_id: string
  task_id?: string | null
  started_at: string  // ISO
  ended_at: string    // ISO
  note?: string | null
}

export function useCreateManualEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TimeEntryManualCreate) => {
      const { data } = await api.post<TimeEntry>("/time/entries", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteTimeEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/time/entries/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
