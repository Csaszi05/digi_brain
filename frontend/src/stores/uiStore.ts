import { create } from "zustand"
import { persist } from "zustand/middleware"

type UIState = {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  expandedTopicIds: string[]
  cmdkOpen: boolean
  toggleSidebar: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleTopic: (id: string) => void
  isTopicExpanded: (id: string) => boolean
  openCmdk: () => void
  closeCmdk: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      expandedTopicIds: ["univ"],
      cmdkOpen: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
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
