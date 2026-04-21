<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useInboxComments } from '@/composables/useInboxComments'
import { useSocket } from '@/composables/useSocket'
import { useInboxStore } from '@/stores/inbox.store'
import CommentList from './CommentList.vue'
import CommentDetail from './CommentDetail.vue'

const inboxStore = useInboxStore()
const { fetchComments, isLoading } = useInboxComments()
const showDetail = ref(false)

useSocket()

onMounted(() => {
  fetchComments()
})

// Called by CommentList's select event to trigger mobile panel switch
function onCommentSelected(commentId: string): void {
  inboxStore.selectComment(commentId)
  showDetail.value = true
}
</script>

<template>
  <!-- Full-height 3-column inbox layout -->
  <div class="flex h-full overflow-hidden">
    <!-- Middle: Comment List -->
    <div
      :class="[
        'flex-1 flex flex-col overflow-hidden border-r border-slate-200',
        'md:max-w-xs lg:max-w-sm xl:max-w-md',
        showDetail ? 'hidden md:flex' : 'flex',
      ]"
    >
      <CommentList :is-loading="isLoading" @comment-selected="onCommentSelected" />
    </div>

    <!-- Right: Comment Detail -->
    <div
      :class="[
        'flex-1 flex flex-col overflow-hidden',
        showDetail ? 'flex' : 'hidden md:flex',
      ]"
    >
      <CommentDetail @back="showDetail = false" />
    </div>
  </div>
</template>
