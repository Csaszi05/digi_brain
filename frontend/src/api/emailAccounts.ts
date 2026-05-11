import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type EmailAccount = {
  id: string
  user_id: string
  provider: string
  email: string
  display_name: string | null
  imap_host: string | null
  imap_port: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export type AddAccountPayload = {
  provider: string
  email: string
  display_name?: string
  imap_host: string
  imap_port: number
  password: string
}

export function useEmailAccountsQuery() {
  return useQuery({
    queryKey: ["email-accounts"],
    queryFn: async () => {
      const { data } = await api.get<EmailAccount[]>("/api/v1/email-accounts")
      return data
    },
  })
}

export function useAddEmailAccountMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddAccountPayload) => {
      const { data } = await api.post<EmailAccount>("/api/v1/email-accounts", payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-accounts"] }),
  })
}

export function useDeleteEmailAccountMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/email-accounts/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-accounts"] }),
  })
}

export function useTestEmailAccountMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ ok: boolean; message: string }>(
        `/api/v1/email-accounts/${id}/test`
      )
      return data
    },
  })
}

export function useSyncEmailAccountMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ synced: number }>(
        `/api/v1/email-accounts/${id}/sync`
      )
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  })
}
