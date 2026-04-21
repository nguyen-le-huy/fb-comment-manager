import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Comment, CommentReply } from '@/types/comment.types'

export const useInboxStore = defineStore('inbox', () => {
  const comments = ref<Comment[]>([])
  const selectedCommentId = ref<string | null>(null)
  const unreadCount = ref(0)
  const pageUnreadCounts = ref<Record<string, number>>({})

  const selectedComment = computed(() => {
    if (!selectedCommentId.value) return null
    return comments.value.find(c => c.commentId === selectedCommentId.value) || null
  })

  function setComments(newComments: Comment[]): void {
    comments.value = newComments
    updateUnreadCounts()
  }

  function updateUnreadCounts(): void {
    unreadCount.value = comments.value.filter(c => !c.isRead).length
    const counts: Record<string, number> = {}
    comments.value.forEach(c => {
      counts[c.pageId] = (counts[c.pageId] ?? 0) + (c.isRead ? 0 : 1)
    })
    pageUnreadCounts.value = counts
  }

  function addCommentToTop(comment: Comment): void {
    comments.value.unshift(comment)
    updateUnreadCounts()
  }

  function selectComment(commentId: string): void {
    selectedCommentId.value = commentId
    const comment = comments.value.find(c => c.commentId === commentId)
    if (comment && !comment.isRead) {
      comment.isRead = true
      updateUnreadCounts()
    }
  }

  function markCommentAsRead(commentId: string): void {
    const comment = comments.value.find(c => c.commentId === commentId)
    if (comment) {
      comment.isRead = true
      comment.readAt = new Date().toISOString()
      updateUnreadCounts()
    }
  }

  function updateCommentReplies(commentId: string, newReply: CommentReply): void {
    const comment = comments.value.find(c => c.commentId === commentId)
    if (!comment) return

    const existingIndex = comment.replies.findIndex(reply => reply.replyId === newReply.replyId)
    if (existingIndex !== -1) {
      comment.replies[existingIndex] = { ...comment.replies[existingIndex], ...newReply }
      return
    }

    comment.replies.push(newReply)
  }

  function clearSelection(): void {
    selectedCommentId.value = null
  }

  return {
    comments,
    selectedCommentId,
    selectedComment,
    unreadCount,
    pageUnreadCounts,
    setComments,
    updateUnreadCounts,
    addCommentToTop,
    selectComment,
    markCommentAsRead,
    updateCommentReplies,
    clearSelection,
  }
})
