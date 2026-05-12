import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type CalendarAccount = {
  id: string
  user_id: string
  provider: string
  display_name: string | null
  caldav_url: string
  username: string
  active: boolean
  created_at: string
  updated_at: string
}

export type CalendarItem = {
  id: string
  account_id: string
  user_id: string
  external_id: string
  name: string
  color: string | null
  topic_id: string | null
  active: boolean
}

export type CalendarEvent = {
  id: string
  calendar_id: string
  user_id: string
  external_uid: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  topic_id: string | null
  time_entry_id: string | null
  status: string
  updated_at: string
}

// ─── Accounts ─────────────────────────────────────────────

export function useCalendarAccountsQuery() {
  return useQuery({
    queryKey: ["calendar-accounts"],
    queryFn: async () => {
      const { data } = await api.get<CalendarAccount[]>("/calendar/accounts")
      return data
    },
  })
}

export function useAddCalendarAccountMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      provider: string; display_name?: string
      caldav_url: string; username: string; password: string
    }) => {
      const { data } = await api.post<CalendarAccount>("/calendar/accounts", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-accounts"] }),
  })
}

export function useDeleteCalendarAccountMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/calendar/accounts/${id}`) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-accounts"] })
      qc.invalidateQueries({ queryKey: ["calendars"] })
    },
  })
}

export function useTestCalendarAccountMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ ok: boolean; message: string }>(`/calendar/accounts/${id}/test`)
      return data
    },
  })
}

export function useSyncCalendarAccountMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ synced: number }>(`/calendar/accounts/${id}/sync`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendars"] })
      qc.invalidateQueries({ queryKey: ["calendar-events"] })
    },
  })
}

// ─── Calendars ────────────────────────────────────────────

export function useCalendarsQuery(accountId?: string) {
  return useQuery({
    queryKey: ["calendars", accountId],
    queryFn: async () => {
      const { data } = await api.get<CalendarItem[]>("/calendar/calendars", {
        params: accountId ? { account_id: accountId } : {},
      })
      return data
    },
  })
}

export function useUpdateCalendarMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; topic_id?: string | null; active?: boolean; color?: string }) => {
      const { data } = await api.patch<CalendarItem>(`/calendar/calendars/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendars"] }),
  })
}

// ─── Events ───────────────────────────────────────────────

export function useCalendarEventsQuery(params?: {
  since?: string; until?: string; topic_id?: string; calendar_id?: string
}) {
  return useQuery({
    queryKey: ["calendar-events", params],
    queryFn: async () => {
      const { data } = await api.get<CalendarEvent[]>("/calendar/events", { params })
      return data
    },
  })
}

export type CalendarEventCreate = {
  calendar_id: string
  title: string
  description?: string
  location?: string
  starts_at: string
  ends_at: string
  all_day?: boolean
  topic_id?: string | null
}

export function useCreateCalendarEventMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CalendarEventCreate) => {
      const { data } = await api.post<CalendarEvent>("/calendar/events", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  })
}

export function useUpdateCalendarEventMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CalendarEventCreate> & { id: string }) => {
      const { data } = await api.patch<CalendarEvent>(`/calendar/events/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  })
}

export function useDeleteCalendarEventMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/calendar/events/${id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events"] }),
  })
}

export function useLogAsTimeEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventId, note }: { eventId: string; note?: string }) => {
      const { data } = await api.post<CalendarEvent>(`/calendar/events/${eventId}/log-time`, { note })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] })
      qc.invalidateQueries({ queryKey: ["time-entries"] })
    },
  })
}
