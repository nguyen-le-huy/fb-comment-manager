export interface CommentAuthor {
  id: string
  name: string
  avatar?: string
}

export interface FacebookPage {
  id: string
  name: string
  logo?: string
}

export interface SourcePost {
  id: string
  content: string
  permalink?: string
  picture?: string
  video?: string
  title?: string
}

export interface Comment {
  commentId: string
  pageId: string
  postId: string
  author: CommentAuthor
  page: FacebookPage
  post: SourcePost
  message: string
  createdTime: string
  isRead: boolean
  readAt?: string
  replies: CommentReply[]
}

export interface CommentReply {
  replyId: string
  author: CommentAuthor
  message: string
  createdTime: string
}

export interface CommentWithState extends Comment {
  isRead: boolean
}

export interface InboxFilters {
  status: 'all' | 'unread' | 'read'
  pageId?: string
  timeRange: 'today' | '7days' | '30days'
  sortBy: 'newest' | 'oldest'
  searchText?: string
}

export interface NewCommentPayload {
  commentId: string
  postId: string
  pageId: string
  author: CommentAuthor
  message: string
  createdTime: string
}
