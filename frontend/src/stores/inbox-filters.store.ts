import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { InboxFilters } from '@/types/comment.types'

export const useInboxFiltersStore = defineStore('inboxFilters', () => {
  const filters = ref<InboxFilters>({
    status: 'all',
    timeRange: '7days',
    sortBy: 'newest',
  })

  function setStatus(status: 'all' | 'unread' | 'read'): void {
    filters.value.status = status
  }

  function setPageId(pageId?: string): void {
    filters.value.pageId = pageId
  }

  function setTimeRange(timeRange: 'today' | '7days' | '30days'): void {
    filters.value.timeRange = timeRange
  }

  function setSortBy(sortBy: 'newest' | 'oldest'): void {
    filters.value.sortBy = sortBy
  }

  function setSearchText(searchText?: string): void {
    filters.value.searchText = searchText
  }

  function reset(): void {
    filters.value = {
      status: 'all',
      timeRange: '7days',
      sortBy: 'newest',
    }
  }

  return {
    filters,
    setStatus,
    setPageId,
    setTimeRange,
    setSortBy,
    setSearchText,
    reset,
  }
})
