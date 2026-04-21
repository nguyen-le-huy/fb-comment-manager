import axios, { type AxiosRequestConfig } from 'axios'
import { getActivePinia } from 'pinia'
import router from '@/router'
import { ENV } from '@/config/env'
import { useAuthStore } from '@/stores/auth.store'

const http = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: false,
})

function getAuthStore(): ReturnType<typeof useAuthStore> | null {
  const pinia = getActivePinia()
  return pinia ? useAuthStore(pinia) : null
}

http.interceptors.request.use((config) => {
  const authStore = getAuthStore()
  if (authStore?.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const authStore = getAuthStore()
      authStore?.clearAuth()
      await router.push({ name: 'Login' })
    }
    return Promise.reject(error)
  },
)

export const apiService = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return http.get<T, T>(url, config)
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return http.post<T, T>(url, data, config)
  },
}
