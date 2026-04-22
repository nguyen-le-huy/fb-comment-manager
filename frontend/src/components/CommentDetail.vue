<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Separator } from '@/components/ui/separator'
import { useInboxStore } from '@/stores/inbox.store'
import { useInboxComments } from '@/composables/useInboxComments'
import ReplyForm from './ReplyForm.vue'
import {
  ExternalLinkIcon,
  FacebookIcon,
  FileTextIcon,
  ReplyIcon,
  MessageSquarePlusIcon,
  CheckCircle2Icon,
} from 'lucide-vue-next'

interface Emits {
  (e: 'back'): void
}

const emit = defineEmits<Emits>()
const inboxStore = useInboxStore()
const { replyComment, markAsRead } = useInboxComments()
const showReplyForm = ref(false)
const isReplying = ref(false)


const comment = computed(() => inboxStore.selectedComment)

watch(() => comment.value?.commentId, () => {
  showReplyForm.value = false
})

async function handleReplySubmit(message: string): Promise<void> {
  if (!comment.value || isReplying.value) return

  isReplying.value = true
  try {
    await replyComment(comment.value.commentId, comment.value.pageId, message)
    showReplyForm.value = false
  } finally {
    isReplying.value = false
  }
}

async function handleMarkRead(): Promise<void> {
  if (!comment.value || comment.value.isRead) return
  await markAsRead(comment.value.commentId)
}

function handleViewOnFacebook(): void {
  if (comment.value?.post.permalink) {
    window.open(comment.value.post.permalink, '_blank')
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const avatarFallback = computed(() => {
  return comment.value?.author.name.charAt(0).toUpperCase() ?? '?'
})

function getReplyInitial(name?: string): string {
  return name?.charAt(0).toUpperCase() ?? '?'
}

const hasCommentText = computed(() => {
  return Boolean(comment.value?.message.trim())
})
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Empty State -->
    <div
      v-if="!comment"
      class="flex-1 flex flex-col items-center justify-center text-center px-8 py-16"
    >
      <div
        class="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-5 shadow-sm"
      >
        <ReplyIcon class="h-8 w-8 text-indigo-400" />
      </div>
      <p class="text-sm font-semibold text-slate-700 mb-1">Chọn một bình luận</p>
      <p class="text-xs text-slate-400 leading-relaxed max-w-xs">
        Nhấn vào bất kỳ bình luận nào ở cột giữa để xem chi tiết và phản hồi
      </p>
    </div>

    <!-- Detail View -->
    <template v-else>
      <!-- Mobile back button -->
      <div class="flex md:hidden items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white shrink-0">
        <button
          class="flex items-center gap-1.5 text-sm text-indigo-600 font-medium py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
          @click="emit('back')"
        >
          ← Quay lại
        </button>
      </div>

      <!-- Context Header -->
      <div class="shrink-0 border-b border-slate-200 p-4 bg-slate-50">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-2.5 min-w-0">
            <div
              :class="[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5 overflow-hidden',
                comment.page.logo ? '' : 'bg-indigo-100'
              ]"
            >
              <img v-if="comment.page.logo" :src="comment.page.logo" :alt="comment.page.name" class="h-full w-full object-cover" />
              <FacebookIcon v-else class="h-4 w-4 text-indigo-600" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate">
                {{ comment.page.name }}
              </p>
              <div class="flex items-start gap-1 mt-0.5">
                <FileTextIcon class="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
                <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {{ comment.post.content }}
                </p>
              </div>
            </div>
          </div>
          <button
            v-if="comment.post.permalink"
            class="shrink-0 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 font-medium"
            @click="handleViewOnFacebook"
          >
            <ExternalLinkIcon class="h-3 w-3" />
            Xem FB
          </button>
        </div>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto">
        <!-- Post Information Block -->
        <div class="mx-4 mt-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm mb-4">
          <div class="flex gap-4">
            <!-- Media column -->
            <div v-if="comment.post.picture || comment.post.video" class="w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-slate-100 relative shadow-sm border border-slate-100">
              <img v-if="comment.post.picture" :src="comment.post.picture" class="w-full h-full object-cover" />
              <div v-if="comment.post.video" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 text-white backdrop-blur-sm">
                 <span class="text-xs font-medium border border-white/40 px-2 py-1 rounded-md bg-black/20">Video</span>
              </div>
            </div>
            
            <!-- Content column -->
            <div class="flex-1 min-w-0 flex flex-col justify-center py-1">
              <h4 v-if="comment.post.title" class="text-sm font-semibold text-slate-900 mb-1 truncate">
                {{ comment.post.title }}
              </h4>
              <p class="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                {{ comment.post.content }}
              </p>
              <button
                v-if="comment.post.permalink"
                @click="handleViewOnFacebook" 
                class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-2 text-left w-fit inline-flex items-center gap-1"
              >
                Tiếp tục xem bài viết trên FB &rarr;
              </button>
            </div>
          </div>
        </div>

        <!-- Original Comment -->
        <div class="px-4 pb-4">
          <div class="flex items-start gap-3 mb-3">
            <img
              v-if="comment.author.avatar"
              :src="comment.author.avatar"
              :alt="comment.author.name"
              class="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
            />
            <span
              v-else
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold ring-2 ring-white shadow-sm"
            >
              {{ avatarFallback }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900">{{ comment.author.name }}</p>
              <p class="text-xs text-slate-400">{{ formatTime(comment.createdTime) }}</p>
            </div>
            <!-- Mark as read -->
            <button
              v-if="!comment.isRead"
              class="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 font-medium shrink-0"
              @click="handleMarkRead"
            >
              <CheckCircle2Icon class="h-3.5 w-3.5" />
              Đánh dấu đã đọc
            </button>
          </div>

          <!-- Comment bubble -->
          <div class="ml-12 bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
            <img
              v-if="comment.attachment?.imageUrl"
              :src="comment.attachment.imageUrl"
              alt="Comment attachment"
              class="w-full max-w-sm rounded-lg border border-slate-200 bg-white object-cover mb-3"
            />
            <a
              v-else-if="comment.attachment?.url"
              :href="comment.attachment.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3"
            >
              Mở tệp đính kèm
            </a>
            <p v-if="hasCommentText" class="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {{ comment.message }}
            </p>
            <p
              v-else-if="!comment.attachment?.imageUrl && !comment.attachment?.url"
              class="text-sm text-slate-500 italic"
            >
              Không có nội dung văn bản
            </p>
          </div>
        </div>

        <!-- Previous Replies -->
        <div v-if="comment.replies.length > 0" class="px-4 pb-4">
          <Separator class="mb-4" />
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Các phản hồi ({{ comment.replies.length }})
          </p>
          <div class="space-y-4">
            <div
              v-for="reply in comment.replies"
              :key="reply.replyId"
              class="flex items-start gap-3"
            >
              <img
                v-if="reply.author.avatar"
                :src="reply.author.avatar"
                :alt="reply.author.name"
                class="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
              />
              <span
                v-else
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs font-semibold ring-2 ring-white shadow-sm"
              >
                {{ getReplyInitial(reply.author.name) }}
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 mb-1">
                  <p class="text-xs font-semibold text-slate-800">{{ reply.author.name }}</p>
                  <p class="text-xs text-slate-400">{{ formatTime(reply.createdTime) }}</p>
                </div>
                <div class="bg-indigo-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {{ reply.message }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty replies state -->
        <div v-else class="px-4 pb-4">
          <Separator class="mb-4" />
          <p class="text-xs text-slate-400 text-center py-2">Chưa có phản hồi nào</p>
        </div>
      </div>

      <!-- Reply Input Area -->
      <div class="shrink-0 border-t border-slate-200 p-4 bg-white">
        <div v-if="!showReplyForm">
          <button
            id="open-reply-form-btn"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-all duration-200 group"
            @click="showReplyForm = true"
          >
            <MessageSquarePlusIcon
              class="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors"
            />
            <span class="text-sm text-slate-400 group-hover:text-slate-600 transition-colors text-left flex-1">
              Nhập nội dung phản hồi...
            </span>
          </button>
        </div>
        <ReplyForm
          v-else
          :key="comment.commentId"
          :is-loading="isReplying"
          @submit="handleReplySubmit"
          @cancel="showReplyForm = false"
        />
      </div>
    </template>
  </div>
</template>
