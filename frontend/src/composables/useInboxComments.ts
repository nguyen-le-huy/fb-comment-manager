import { ref } from 'vue'
import { useToast } from '@/lib/toast'
import { useInboxStore } from '@/stores/inbox.store'
import type { Comment, CommentReply } from '@/types/comment.types'

// Mock data for UI - remove when API is ready
const MOCK_COMMENTS: Comment[] = [
  {
    commentId: 'c1',
    pageId: 'page_a',
    postId: 'post_1',
    author: {
      id: 'user_1',
      name: 'Nguyễn Văn A',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    page: {
      id: 'page_a',
      name: 'Page Thời Trang ABC',
      logo: 'https://images.unsplash.com/photo-1549439602-43ebca2327af?w=150&h=150&fit=crop'
    },
    post: {
      id: 'post_1',
      title: 'Bộ sưu tập mùa hè giá sốc',
      content: 'Áo mới về hôm nay, giảm 20% cho 100 khách hàng đầu tiên!',
      permalink: 'https://facebook.com',
      picture: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop'
    },
    message: 'Sản phẩm tốt lắm, mình đã mua 3 lần rồi!',
    createdTime: '2026-04-21T14:22:00Z',
    isRead: false,
    replies: [
      {
        replyId: 'reply_1',
        author: {
          id: 'admin_1',
          name: 'Admin Shop',
          avatar: 'https://i.pravatar.cc/150?img=2',
        },
        message: 'Cảm ơn bạn đã ủng hộ shop nhé! 💕',
        createdTime: '2026-04-21T14:30:00Z',
      },
    ],
  },
  {
    commentId: 'c2',
    pageId: 'page_b',
    postId: 'post_2',
    author: {
      id: 'user_2',
      name: 'Trần Thị B',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    page: {
      id: 'page_b',
      name: 'Shop Nước Hoa Nữ',
      logo: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=150&h=150&fit=crop'
    },
    post: {
      id: 'post_2',
      content: 'Tinh dầu hoa hồng nhập khẩu từ Bulgaria',
    },
    message: 'Bao giờ có hàng? Tôi rất quan tâm đến sản phẩm này.',
    createdTime: '2026-04-21T14:15:00Z',
    isRead: false,
    replies: [],
  },
  {
    commentId: 'c3',
    pageId: 'page_a',
    postId: 'post_3',
    author: {
      id: 'user_3',
      name: 'Phạm Văn C',
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
    page: {
      id: 'page_a',
      name: 'Page Thời Trang ABC',
      logo: 'https://images.unsplash.com/photo-1549439602-43ebca2327af?w=150&h=150&fit=crop'
    },
    post: {
      id: 'post_3',
      content: 'Mẫu quần mới, chất liệu cotton 100%',
    },
    message: 'Size L còn hàng không?',
    createdTime: '2026-04-21T14:05:00Z',
    isRead: true,
    readAt: '2026-04-21T14:30:00Z',
    replies: [],
  },
  {
    commentId: 'c4',
    pageId: 'page_c',
    postId: 'post_4',
    author: {
      id: 'user_4',
      name: 'Lê Thị D',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    page: {
      id: 'page_c',
      name: 'Kinh Tế Gia Đình',
      logo: 'https://plus.unsplash.com/premium_photo-1664391859117-39b8ac442b94?q=80&w=1352&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    },
    post: {
      id: 'post_4',
      content: 'Những mẹo tiết kiệm chi phí sinh hoạt',
    },
    message: 'Bài viết rất hữu ích, cảm ơn admin!',
    createdTime: '2026-04-20T10:00:00Z',
    isRead: true,
    readAt: '2026-04-20T10:30:00Z',
    replies: [],
  },
]

export function useInboxComments() {
  const inboxStore = useInboxStore()
  const isLoading = ref(false)
  const { toast } = useToast()

  async function fetchComments(): Promise<void> {
    isLoading.value = true
    try {
      // TODO: Replace with actual API call
      // const data = await apiService.get<Comment[]>('/comments/inbox')
      // inboxStore.setComments(data)

      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 500))
      inboxStore.setComments(MOCK_COMMENTS)
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

  async function replyComment(commentId: string, message: string): Promise<void> {
    try {
      // TODO: Replace with actual API call
      // await apiService.post(`/comments/${commentId}/reply`, { message })

      const newReply: CommentReply = {
        replyId: `reply_${Date.now()}`,
        author: {
          id: 'admin_1',
          name: 'Admin Shop',
          avatar: 'https://i.pravatar.cc/150?img=2',
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
      // TODO: Replace with actual API call
      // await apiService.post(`/comments/${commentId}/mark-read`)
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
