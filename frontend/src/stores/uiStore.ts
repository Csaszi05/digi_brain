import { create } from "zustand"
import { persist } from "zustand/middleware"

type UIState = {
  sidebarCollapsed: boolean
  expandedTopicIds: string[]
  cmdkOpen: boolean
  toggleSidebar: () => void
  toggleTopic: (id: string) => void
  isTopicExpanded: (id: string) => boolean
  openCmdk: () => void
  closeCmdk: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      expandedTopicIds: ["univ"],
      cmdkOpen: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTopic: (id) =>
        set((s) => {
          const has = s.expandedTopicIds.includes(id)
          return {
            expandedTopicIds: has
              ? s.expandedTopicIds.filter((x) => x !== id)
              : [...s.expandedTopicIds, id],
          }
        }),
      isTopicExpanded: (id) => get().expandedTopicIds.includes(id),
      openCmdk: () => set({ cmdkOpen: true }),
      closeCmdk: () => set({ cmdkOpen: false }),
    }),
    {
      name: "digibrain-ui",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        expandedTopicIds: s.expandedTopicIds,
      }),
    }
  )
)
