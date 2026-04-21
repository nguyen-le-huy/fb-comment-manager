<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import { useToast } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { toast } = useToast()


function getQueryParam(value: LocationQueryValue | LocationQueryValue[]): string | undefined {
  if (Array.isArray(value)) {
    return value[0] ?? undefined
  }
  return value ?? undefined
}

onMounted(() => {
  const token = getQueryParam(route.query.token)
  const userId = getQueryParam(route.query.userId)
  const name = getQueryParam(route.query.name)

  if (!token || !userId || !name) {
    toast({
      title: 'Lỗi',
      description: 'Đăng nhập thất bại.',
      variant: 'destructive',
    })
    void router.replace({ name: 'Login' })
    return
  }

  authStore.setAuth({ id: userId, name }, token)
  void router.replace({ name: 'AllComments' })
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <p class="text-sm text-slate-500">Đang xử lý đăng nhập...</p>
  </main>
</template>
