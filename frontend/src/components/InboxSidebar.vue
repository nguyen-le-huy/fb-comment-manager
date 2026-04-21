<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { FbPage } from '@/types/page.types'
import { useInboxStore } from '@/stores/inbox.store'
import { useInboxFiltersStore } from '@/stores/inbox-filters.store'
import { useAuthStore } from '@/stores/auth.store'
import { usePageStore } from '@/stores/page.store'
import {
  InboxIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  FacebookIcon,
  LogOutIcon,
} from 'lucide-vue-next'

interface Props {
  pages: FbPage[]
  isPagesLoading: boolean
}

const props = defineProps<Props>()

const inboxStore = useInboxStore()
const filtersStore = useInboxFiltersStore()
const authStore = useAuthStore()
const pageStore = usePageStore()
const router = useRouter()

const pagesWithUnreadCounts = computed(() => {
  return props.pages.map((page) => ({
    ...page,
    unreadCount: inboxStore.pageUnreadCounts[page.pageId] ?? 0,
  }))
})

const totalComments = computed(() => inboxStore.comments.length)
const unreadCount = computed(() => inboxStore.unreadCount)
const readCount = computed(() => totalComments.value - unreadCount.value)

const isActiveAll = computed(
  () => filtersStore.filters.status === 'all' && !filtersStore.filters.pageId,
)
const isActiveUnread = computed(
  () => filtersStore.filters.status === 'unread' && !filtersStore.filters.pageId,
)
const isActiveRead = computed(
  () => filtersStore.filters.status === 'read' && !filtersStore.filters.pageId,
)

function selectAll(): void {
  filtersStore.setStatus('all')
  filtersStore.setPageId(undefined)
  pageStore.clearPage()
}

function selectUnread(): void {
  filtersStore.setStatus('unread')
  filtersStore.setPageId(undefined)
  pageStore.clearPage()
}

function selectRead(): void {
  filtersStore.setStatus('read')
  filtersStore.setPageId(undefined)
  pageStore.clearPage()
}

function selectPage(page: FbPage): void {
  filtersStore.setStatus('all')
  filtersStore.setPageId(page.pageId)
  pageStore.selectPage(page.pageId, page.pageName)
}

function isPageActive(pageId: string): boolean {
  return pageStore.pageId === pageId
}

function handleLogout(): void {
  authStore.clearAuth()
  pageStore.clearPage()
  filtersStore.reset()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <div class="px-5 py-5 border-b border-slate-200 shrink-0">
      <h2 class="text-base font-semibold text-slate-900">Comment Manager</h2>
      <p class="text-xs text-slate-400 mt-0.5">Tất cả bình luận fanpage</p>
    </div>

    <nav class="flex-1 overflow-y-auto p-3 space-y-0.5">
      <button
        id="inbox-filter-all"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          isActiveAll
            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ]"
        @click="selectAll"
      >
        <InboxIcon class="h-4 w-4 shrink-0" />
        <span class="flex-1 text-left">Tất cả</span>
        <span
          v-if="totalComments > 0"
          :class="[
            'text-xs px-1.5 py-0.5 rounded-full font-semibold',
            isActiveAll ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600',
          ]"
        >
          {{ totalComments }}
        </span>
      </button>

      <button
        id="inbox-filter-unread"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          isActiveUnread
            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ]"
        @click="selectUnread"
      >
        <CircleDotIcon class="h-4 w-4 shrink-0" />
        <span class="flex-1 text-left">Chưa đọc</span>
        <span
          v-if="unreadCount > 0"
          :class="[
            'text-xs px-1.5 py-0.5 rounded-full font-semibold',
            isActiveUnread ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600',
          ]"
        >
          {{ unreadCount }}
        </span>
      </button>

      <button
        id="inbox-filter-read"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          isActiveRead
            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ]"
        @click="selectRead"
      >
        <CheckCircle2Icon class="h-4 w-4 shrink-0" />
        <span class="flex-1 text-left">Đã đọc</span>
        <span
          v-if="readCount > 0"
          :class="[
            'text-xs px-1.5 py-0.5 rounded-full font-semibold',
            isActiveRead ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600',
          ]"
        >
          {{ readCount }}
        </span>
      </button>

      <div class="pt-4 pb-1">
        <p class="px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Fanpages</p>
      </div>

      <div v-if="isPagesLoading" class="space-y-2 px-3 py-2">
        <div v-for="item in 4" :key="item" class="h-9 animate-pulse rounded-lg bg-slate-100"></div>
      </div>

      <button
        v-for="page in pagesWithUnreadCounts"
        :key="page.pageId"
        :id="`inbox-page-${page.pageId}`"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          isPageActive(page.pageId)
            ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ]"
        @click="selectPage(page)"
      >
        <span
          :class="[
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full overflow-hidden',
            isPageActive(page.pageId) ? 'bg-white/20' : 'bg-indigo-100',
          ]"
        >
          <img
            v-if="page.pageAvatar"
            :src="page.pageAvatar"
            :alt="page.pageName"
            class="h-full w-full object-cover"
          />
          <FacebookIcon
            v-else
            :class="['h-3.5 w-3.5', isPageActive(page.pageId) ? 'text-white' : 'text-indigo-600']"
          />
        </span>
        <span class="flex-1 truncate text-left text-sm">{{ page.pageName }}</span>
        <span
          v-if="page.unreadCount > 0"
          :class="[
            'text-xs px-1.5 py-0.5 rounded-full font-semibold',
            isPageActive(page.pageId) ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700',
          ]"
        >
          {{ page.unreadCount }}
        </span>
      </button>

      <div
        v-if="!isPagesLoading && pagesWithUnreadCounts.length === 0"
        class="px-3 py-3 text-xs text-slate-400"
      >
        Chưa có fanpage nào
      </div>
    </nav>

    <div class="p-3 border-t border-slate-200 shrink-0">
      <button
        id="logout-btn"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        @click="handleLogout"
      >
        <LogOutIcon class="h-4 w-4 shrink-0 group-hover:text-red-500" />
        <span class="flex-1 text-left">Đăng xuất</span>
      </button>
    </div>
  </div>
</template>
