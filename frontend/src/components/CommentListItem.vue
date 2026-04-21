<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInboxStore } from '@/stores/inbox.store'
import { CheckIcon, ReplyIcon } from 'lucide-vue-next'
import type { Comment } from '@/types/comment.types'

interface Props {
  comment: Comment
}

interface Emits {
  (e: 'select'): void
  (e: 'mark-read'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const inboxStore = useInboxStore()
const isHovered = ref(false)

const isSelected = computed(
  () => inboxStore.selectedCommentId === props.comment.commentId,
)

const previewText = computed(() => {
  return props.comment.message.length > 75
    ? props.comment.message.substring(0, 75) + '…'
    : props.comment.message
})

const relativeTime = computed(() => {
  const date = new Date(props.comment.createdTime)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins}p trước`
  if (diffHours < 24) return `${diffHours}h trước`
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7) return `${diffDays}d trước`

  return date.toLocaleDateString('vi-VN')
})

const avatarFallback = computed(() => {
  return props.comment.author.name.charAt(0).toUpperCase()
})

function handleSelect(): void {
  emit('select')
}

function handleMarkRead(e: Event): void {
  e.stopPropagation()
  emit('mark-read')
}
</script>

<template>
  <div
    :id="`comment-item-${comment.commentId}`"
    :class="[
      'group relative flex gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-b border-slate-100 last:border-b-0',
      isSelected
        ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
        : 'hover:bg-slate-50 border-l-2 border-l-transparent',
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleSelect"
  >
    <!-- Unread dot -->
    <span
      v-if="!comment.isRead"
      class="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-500 shrink-0"
    />

    <!-- Avatar -->
    <div class="shrink-0 mt-0.5">
      <img
        v-if="comment.author.avatar"
        :src="comment.author.avatar"
        :alt="comment.author.name"
        class="h-9 w-9 rounded-full object-cover ring-2 ring-white"
      />
      <span
        v-else
        class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold ring-2 ring-white"
      >
        {{ avatarFallback }}
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Row 1: Name + Time -->
      <div class="flex items-baseline justify-between gap-2 mb-0.5">
        <p
          :class="[
            'text-sm truncate',
            !comment.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700',
          ]"
        >
          {{ comment.author.name }}
        </p>
        <span class="text-xs text-slate-400 shrink-0">{{ relativeTime }}</span>
      </div>

      <!-- Row 2: Page name -->
      <p class="text-xs text-indigo-500 font-medium mb-1 truncate">{{ comment.page.name }}</p>

      <!-- Row 3: Message preview -->
      <p
        :class="[
          'text-xs leading-relaxed line-clamp-2',
          !comment.isRead ? 'text-slate-700' : 'text-slate-400',
        ]"
      >
        {{ previewText }}
      </p>

      <!-- Row 4: Footer badges -->
      <div class="flex items-center justify-between mt-2">
        <div class="flex items-center gap-1.5">
          <span
            v-if="!comment.isRead"
            class="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-indigo-500 inline-block" />
            Chưa đọc
          </span>
          <span
            v-if="comment.replies.length > 0"
            class="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full"
          >
            <ReplyIcon class="h-3 w-3" />
            {{ comment.replies.length }}
          </span>
        </div>

        <!-- Hover action: mark read -->
        <button
          v-if="!comment.isRead && isHovered"
          class="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-0.5 rounded-lg hover:bg-indigo-50"
          @click="handleMarkRead"
        >
          <CheckIcon class="h-3 w-3" />
          Đã đọc
        </button>
      </div>
    </div>
  </div>
</template>
