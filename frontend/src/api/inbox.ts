import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type Ticket = {
  id: string
  user_id: string
  account_id: string
  topic_id: string | null
  linked_task_id: string | null
  thread_id: string
  subject: string
  from_name: string | null
  from_email: string
  status: "open" | "waiting" | "done" | "snoozed"
  priority: "high" | "med" | "low"
  ai_summary: string | null
  ai_intent: string | null
  due_at: string | null
  snoozed_until: string | null
  unread: boolean
  last_message_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type TicketMessage = {
  id: string
  ticket_id: string
  direction: "in" | "out"
  from_name: string | null
  from_email: string | null
  to_emails: string[] | null
  body_text: string | null
  body_html: string | null
  sent_at: string
  external_id: string | null
}

export type InboxRule = {
  id: string
  user_id: string
  name: string
  conditions: Record<string, unknown>
  actions: unknown[]
  position: number
  active: boolean
  run_count: number
  created_at: string
}

export function useTicketsQuery(params?: { status?: string; account_id?: string }) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: async () => {
      const { data } = await api.get<Ticket[]>("/tickets", { params })
      return data
    },
  })
}

export function useTicketMessagesQuery(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data } = await api.get<TicketMessage[]>(`/tickets/${ticketId}/messages`)
      return data
    },
    enabled: !!ticketId,
  })
}

export function useUpdateTicketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Ticket> & { id: string }) => {
      const { data } = await api.patch<Ticket>(`/tickets/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] })
    },
  })
}

export function useInboxRulesQuery() {
  return useQuery({
    queryKey: ["inbox-rules"],
    queryFn: async () => {
      const { data } = await api.get<InboxRule[]>("/inbox/rules")
      return data
    },
  })
}

export function useCreateInboxRuleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<InboxRule, "id" | "user_id" | "run_count" | "created_at">) => {
      const { data } = await api.post<InboxRule>("/inbox/rules", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-rules"] }),
  })
}

export function useUpdateInboxRuleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<InboxRule> & { id: string }) => {
      const { data } = await api.patch<InboxRule>(`/inbox/rules/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-rules"] }),
  })
}

export function useDeleteInboxRuleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inbox/rules/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox-rules"] }),
  })
}
