<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import InboxSidebar from '@/components/InboxSidebar.vue'
import { usePages } from '@/composables/usePages'

const { pages, isLoading, fetchPages } = usePages()

onMounted(() => {
  void fetchPages()
})
</script>

<template>
  <div class="h-screen bg-white flex overflow-hidden">
    <aside class="hidden md:flex w-56 lg:w-64 shrink-0 flex-col border-r border-slate-200 bg-white z-10">
      <InboxSidebar :pages="pages" :is-pages-loading="isLoading" />
    </aside>

    <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
      <RouterView />
    </main>
  </div>
</template>
