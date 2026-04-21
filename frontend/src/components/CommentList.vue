<script setup lang="ts">
import { ref, computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useInboxStore } from '@/stores/inbox.store'
import { useInboxFiltersStore } from '@/stores/inbox-filters.store'
import CommentListItem from './CommentListItem.vue'
import { SearchIcon, SlidersHorizontalIcon, ArrowUpDownIcon, MessageSquareOffIcon } from 'lucide-vue-next'

interface Props {
  isLoading: boolean
}

interface Emits {
  (e: 'comment-selected', commentId: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const inboxStore = useInboxStore()
const filtersStore = useInboxFiltersStore()
const searchInput = ref('')

function handleSelect(commentId: string): void {
  inboxStore.selectComment(commentId)
  emit('comment-selected', commentId)
}

const filteredComments = computed(() => {
  let result = inboxStore.comments

  // Filter by status
  if (filtersStore.filters.status === 'unread') {
    result = result.filter(c => !c.isRead)
  } else if (filtersStore.filters.status === 'read') {
    result = result.filter(c => c.isRead)
  }

  // Filter by page
  if (filtersStore.filters.pageId) {
    result = result.filter(c => c.pageId === filtersStore.filters.pageId)
  }

  // Filter by search text
  if (searchInput.value.trim()) {
    const search = searchInput.value.toLowerCase()
    result = result.filter(
      c =>
        c.author.name.toLowerCase().includes(search) ||
        c.message.toLowerCase().includes(search),
    )
  }

  // Filter by time range
  const now = new Date()
  if (filtersStore.filters.timeRange === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    result = result.filter(c => new Date(c.createdTime) >= startOfDay)
  } else if (filtersStore.filters.timeRange === '7days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    result = result.filter(c => new Date(c.createdTime) >= sevenDaysAgo)
  } else if (filtersStore.filters.timeRange === '30days') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    result = result.filter(c => new Date(c.createdTime) >= thirtyDaysAgo)
  }

  // Sort
  if (filtersStore.filters.sortBy === 'oldest') {
    return [...result].sort(
      (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime(),
    )
  }
  return [...result].sort(
    (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime(),
  )
})

const filterLabel = computed(() => {
  if (filtersStore.filters.status === 'unread') return 'Chưa đọc'
  if (filtersStore.filters.status === 'read') return 'Đã đọc'
  return 'Tất cả'
})
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Filter Bar -->
    <div class="shrink-0 border-b border-slate-200 bg-white">
      <!-- Search -->
      <div class="px-4 pt-4 pb-3">
        <div class="relative">
          <SearchIcon
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
          />
          <Input
            id="comments-search"
            v-model="searchInput"
            type="text"
            placeholder="Tìm theo tên hoặc nội dung..."
            class="pl-9 h-9 bg-slate-50 border-slate-200 text-sm focus-visible:ring-indigo-400"
          />
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="flex items-center gap-2 px-4 pb-3 flex-wrap">
        <!-- Status tabs -->
        <div class="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
          <button
            id="filter-status-all"
            :class="[
              'px-3 py-1.5 font-medium transition-colors',
              filtersStore.filters.status === 'all'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ]"
            @click="filtersStore.setStatus('all')"
          >
            Tất cả
          </button>
          <button
            id="filter-status-unread"
            :class="[
              'px-3 py-1.5 font-medium transition-colors border-l border-slate-200',
              filtersStore.filters.status === 'unread'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ]"
            @click="filtersStore.setStatus('unread')"
          >
            Chưa đọc
          </button>
          <button
            id="filter-status-read"
            :class="[
              'px-3 py-1.5 font-medium transition-colors border-l border-slate-200',
              filtersStore.filters.status === 'read'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ]"
            @click="filtersStore.setStatus('read')"
          >
            Đã đọc
          </button>
        </div>

        <!-- Sort -->
        <div class="flex items-center gap-1.5 ml-auto">
          <ArrowUpDownIcon class="h-3.5 w-3.5 text-slate-400" />
          <select
            id="filter-sort"
            :value="filtersStore.filters.sortBy"
            class="text-xs border border-slate-200 rounded-md bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            @change="filtersStore.setSortBy(($event.target as HTMLSelectElement).value as 'newest' | 'oldest')"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>

          <!-- Time range -->
          <SlidersHorizontalIcon class="h-3.5 w-3.5 text-slate-400 ml-1" />
          <select
            id="filter-time"
            :value="filtersStore.filters.timeRange"
            class="text-xs border border-slate-200 rounded-md bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            @change="filtersStore.setTimeRange(($event.target as HTMLSelectElement).value as 'today' | '7days' | '30days')"
          >
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày</option>
            <option value="30days">30 ngày</option>
          </select>
        </div>
      </div>

      <!-- Result count -->
      <div class="px-4 pb-2 text-xs text-slate-400 flex items-center gap-1.5">
        <span>{{ filteredComments.length }} kết quả</span>
        <span>·</span>
        <span>{{ filterLabel }}</span>
      </div>
    </div>

    <!-- Comments List -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-0 divide-y divide-slate-100">
        <div
          v-for="i in 6"
          :key="i"
          class="flex gap-3 px-4 py-3.5"
        >
          <Skeleton class="h-9 w-9 rounded-full shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="flex justify-between">
              <Skeleton class="h-3.5 w-28" />
              <Skeleton class="h-3 w-12" />
            </div>
            <Skeleton class="h-3 w-20" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-3 w-3/4" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredComments.length === 0"
        class="flex flex-col items-center justify-center h-full py-16 text-center px-8"
      >
        <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <MessageSquareOffIcon class="h-7 w-7 text-slate-400" />
        </div>
        <p class="text-sm font-semibold text-slate-700 mb-1">Không có bình luận</p>
        <p class="text-xs text-slate-400">
          Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm
        </p>
      </div>

      <!-- Comment Items -->
      <div v-else>
        <CommentListItem
          v-for="comment in filteredComments"
          :key="comment.commentId"
          :comment="comment"
          @select="handleSelect(comment.commentId)"
          @mark-read="inboxStore.markCommentAsRead(comment.commentId)"
        />
      </div>
    </div>
  </div>
</template>
