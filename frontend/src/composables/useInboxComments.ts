import { ref, type Ref } from 'vue'
import { useToast } from '@/lib/toast'
import { useInboxStore } from '@/stores/inbox.store'
import { apiService } from '@/services/api.service'
import type { Comment, CommentReply, ReplyResponse } from '@/types/comment.types'

interface UseInboxCommentsResult {
  isLoading: Ref<boolean>
  fetchComments: () => Promise<void>
  replyComment: (commentId: string, pageId: string, message: string) => Promise<void>
  markAsRead: (commentId: string) => Promise<void>
}

export function useInboxComments(): UseInboxCommentsResult {
  const inboxStore = useInboxStore()
  const isLoading = ref(false)
  const { toast } = useToast()

  async function fetchComments(): Promise<void> {
    isLoading.value = true
    try {
      const data = await apiService.get<Comment[]>('/facebook/comments/inbox', { params: { limit: 20 } })
      inboxStore.setComments(data)
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách bình luận.',
        variant: 'destructive',
      })
    } finally {
      isLoading.value = false
    }
  }

  async function replyComment(commentId: string, pageId: string, message: string): Promise<void> {
    try {
      const response = await apiService.post<ReplyResponse>(
        `/facebook/comments/${pageId}/${commentId}/reply`,
        { message },
      )

      const currentComment = inboxStore.comments.find((comment) => comment.commentId === commentId)

      const newReply: CommentReply = {
        replyId: response.id,
        author: {
          id: pageId,
          name: currentComment?.page.name ?? 'Admin',
          avatar: currentComment?.page.logo,
        },
        message,
        createdTime: new Date().toISOString(),
      }

      inboxStore.updateCommentReplies(commentId, newReply)
      toast({
        title: 'Thành công',
        description: 'Đã gửi phản hồi.',
      })
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Gửi phản hồi thất bại. Vui lòng thử lại.',
        variant: 'destructive',
      })
    }
  }

  async function markAsRead(commentId: string): Promise<void> {
    try {
      await apiService.post<{ modifiedCount: number }>('/comment-state/mark-read', {
        commentIds: [commentId],
      })
      inboxStore.markCommentAsRead(commentId)
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể đánh dấu đã đọc.',
        variant: 'destructive',
      })
    }
  }

  return {
    isLoading,
    fetchComments,
    replyComment,
    markAsRead,
  }
}
