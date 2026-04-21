<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const route = useRoute()
const pageId = computed(() => String(route.params.pageId ?? ''))
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4">
    <Card class="w-full">
      <CardHeader>
        <CardTitle>Bài viết của Fanpage</CardTitle>
        <CardDescription>PostsView sẽ được hoàn thiện ở phase tiếp theo.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-1 text-sm text-slate-500">
        <p>Fanpage ID: {{ pageId }}</p>
      </CardContent>
    </Card>
  </main>
</template>
