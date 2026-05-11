import axios from "axios"
import { useAuthStore } from "@/stores/authStore"

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
})

// Attach the Bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 → clear auth state and redirect to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loop if we're already on the login page.
      if (!window.location.pathname.startsWith("/login")) {
        useAuthStore.getState().logout()
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)
