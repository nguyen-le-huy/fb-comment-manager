import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePageStore = defineStore('page', () => {
  const pageId = ref<string | null>(null)
  const pageName = ref<string | null>(null)

  function selectPage(id: string, name: string): void {
    pageId.value = id
    pageName.value = name
  }

  function clearPage(): void {
    pageId.value = null
    pageName.value = null
  }

  return { pageId, pageName, selectPage, clearPage }
})
