import { onMounted, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useInboxStore } from '@/stores/inbox.store'
import { ENV } from '@/config/env'
import { apiService } from '@/services/api.service'
import type {
  Comment,
  NewCommentPayload,
  FacebookPage,
  SourcePost,
  CommentAttachment,
} from '@/types/comment.types'

interface CommentReadPayload {
  postId: string
  commentId: string
}

interface LegacyNewCommentPayload {
  commentId: string
  postId: string
  pageId: string
  fromName: string
  message: string
  createdTime: string
}

interface FbPageProjection {
  pageId: string
  pageName: string
  pageAvatar?: string
}

interface FbPostProjection {
  id: string
  message?: string
  story?: string
  permalink_url?: string
  full_picture?: string
}

interface FbPostsResponse {
  data: FbPostProjection[]
}

interface RealtimeLookupContext {
  page: FacebookPage
  post: SourcePost
}

function getSocketBaseUrl(): string {
  try {
    return new URL(ENV.API_URL).origin
  } catch {
    return ENV.API_URL
  }
}

function isNewCommentPayload(payload: unknown): payload is NewCommentPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.commentId === 'string' &&
    typeof candidate.postId === 'string' &&
    typeof candidate.pageId === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.createdTime === 'string' &&
    typeof candidate.author === 'object' &&
    candidate.author !== null
  )
}

function isLegacyNewCommentPayload(payload: unknown): payload is LegacyNewCommentPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return (
    typeof candidate.commentId === 'string' &&
    typeof candidate.postId === 'string' &&
    typeof candidate.pageId === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.createdTime === 'string' &&
    typeof candidate.fromName === 'string'
  )
}

function mapToComment(payload: NewCommentPayload | LegacyNewCommentPayload): Comment {
  const author = isNewCommentPayload(payload)
    ? payload.author
    : { id: '', name: payload.fromName }
  const attachment: CommentAttachment | undefined =
    isNewCommentPayload(payload) && payload.attachment
      ? {
          type: payload.attachment.type,
          imageUrl: payload.attachment.imageUrl,
          url: payload.attachment.url,
          title: payload.attachment.title,
          description: payload.attachment.description,
        }
      : undefined

  return {
    commentId: payload.commentId,
    pageId: payload.pageId,
    postId: payload.postId,
    author,
    page: {
      id: payload.pageId,
      name: '',
    },
    post: {
      id: payload.postId,
      content: '',
    },
    message: payload.message,
    attachment,
    createdTime: payload.createdTime,
    isRead: false,
    replies: [],
  }
}

function findKnownPageInfo(comments: Comment[], pageId: string): FacebookPage | null {
  const known = comments.find((comment) => comment.pageId === pageId && comment.page.name)
  if (!known) {
    return null
  }

  return {
    id: known.page.id,
    name: known.page.name,
    logo: known.page.logo,
  }
}

function findKnownPostInfo(comments: Comment[], postId: string): SourcePost | null {
  const known = comments.find((comment) => comment.postId === postId && comment.post.content)
  if (!known) {
    return null
  }

  return {
    id: known.post.id,
    content: known.post.content,
    permalink: known.post.permalink,
    picture: known.post.picture,
    video: known.post.video,
    title: known.post.title,
  }
}

async function fetchPageInfo(pageId: string): Promise<FacebookPage | null> {
  try {
    const pages = await apiService.get<FbPageProjection[]>('/facebook/pages')
    const page = pages.find((item) => item.pageId === pageId)

    if (!page) {
      return null
    }

    return {
      id: page.pageId,
      name: page.pageName,
      logo: page.pageAvatar,
    }
  } catch {
    return null
  }
}

async function fetchPostInfo(pageId: string, postId: string): Promise<SourcePost | null> {
  try {
    const response = await apiService.get<FbPostsResponse>(`/facebook/posts/${pageId}`, {
      params: { limit: 25 },
    })
    const post = response.data.find((item) => item.id === postId)

    if (!post) {
      return null
    }

    return {
      id: post.id,
      content: post.message ?? post.story ?? '',
      permalink: post.permalink_url,
      picture: post.full_picture,
    }
  } catch {
    return null
  }
}

async function resolveLookupContext(
  payload: NewCommentPayload | LegacyNewCommentPayload,
  comments: Comment[],
): Promise<RealtimeLookupContext> {
  const knownPage = findKnownPageInfo(comments, payload.pageId)
  const knownPost = findKnownPostInfo(comments, payload.postId)

  const page =
    knownPage ??
    (await fetchPageInfo(payload.pageId)) ?? {
      id: payload.pageId,
      name: payload.pageId,
    }

  const post =
    knownPost ??
    (await fetchPostInfo(payload.pageId, payload.postId)) ?? {
      id: payload.postId,
      content: payload.message,
    }

  return { page, post }
}

async function mapToHydratedComment(
  payload: NewCommentPayload | LegacyNewCommentPayload,
  comments: Comment[],
): Promise<Comment> {
  const base = mapToComment(payload)
  const context = await resolveLookupContext(payload, comments)

  return {
    ...base,
    page: context.page,
    post: context.post,
  }
}

export function useSocket(): void {
  const inboxStore = useInboxStore()
  let socket: Socket | null = null

  onMounted(() => {
    socket = io(getSocketBaseUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    socket.on('comment:new', (payload: unknown) => {
      if (!isNewCommentPayload(payload) && !isLegacyNewCommentPayload(payload)) {
        return
      }

      if (inboxStore.comments.some((comment) => comment.commentId === payload.commentId)) {
        return
      }

      void mapToHydratedComment(payload, inboxStore.comments).then((comment) => {
        inboxStore.addCommentToTop(comment)
      })
    })

    socket.on('comment:read', (payload: CommentReadPayload) => {
      inboxStore.markCommentAsRead(payload.commentId)
    })
  })

  onUnmounted(() => {
    socket?.disconnect()
    socket = null
  })
}
