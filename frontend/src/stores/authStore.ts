import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AuthUser = {
  id: string
  email: string
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "digibrain-auth",
      // Only persist token and user — isAuthenticated is derived on hydration
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token && !!state.user
        }
      },
    }
  )
)
