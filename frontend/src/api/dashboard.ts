import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type WidgetInstance = {
  id: string
  type: string
  config?: Record<string, unknown>
}

export type DashboardConfig = {
  layout: WidgetInstance[]
}

const KEYS = {
  config: ["dashboard", "config"] as const,
}

export function useDashboardConfigQuery() {
  return useQuery({
    queryKey: KEYS.config,
    queryFn: async () => {
      const { data } = await api.get<{ config: DashboardConfig | null }>("/me/dashboard")
      return data.config
    },
    staleTime: 60_000,
  })
}

export function useUpdateDashboardConfigMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (config: DashboardConfig) => {
      const { data } = await api.put<{ config: DashboardConfig }>("/me/dashboard", { config })
      return data.config
    },
    onSuccess: (data) => {
      qc.setQueryData(KEYS.config, data)
    },
  })
}
