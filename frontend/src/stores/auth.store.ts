import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthUser } from '@/types/auth.types'

const AUTH_TOKEN_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  const initialToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null

  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(initialToken)
  const isAuthenticated = computed<boolean>(() => !!token.value)

  function setAuth(newUser: AuthUser, newToken: string): void {
    user.value = newUser
    token.value = newToken

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    }
  }

  function clearAuth(): void {
    user.value = null
    token.value = null

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    clearAuth,
  }
})
