---
name: fe-dev
description: Frontend Developer agent for FB Comment Manager. Use when building Vue 3 views, composables, Pinia stores, shadcn-vue components, TailwindCSS styling, Socket.io realtime UI, or Vue Router guards.
argument-hint: "Describe the frontend task — e.g., 'Build CommentsView with realtime unread badge and reply form'"
tools: [vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/extensions, vscode/askQuestions, execute/runNotebookCell, execute/testFailure, execute/executionSubagent, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runInTerminal, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, read/readNotebookCellOutput, read/terminalSelection, read/terminalLastCommand, agent/runSubagent, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/searchResults, search/textSearch, search/searchSubagent, search/usages, web/fetch, web/githubRepo, browser/openBrowserPage, com.figma.mcp/mcp/add_code_connect_map, com.figma.mcp/mcp/create_design_system_rules, com.figma.mcp/mcp/create_new_file, com.figma.mcp/mcp/generate_diagram, com.figma.mcp/mcp/generate_figma_design, com.figma.mcp/mcp/get_code_connect_map, com.figma.mcp/mcp/get_code_connect_suggestions, com.figma.mcp/mcp/get_context_for_code_connect, com.figma.mcp/mcp/get_design_context, com.figma.mcp/mcp/get_figjam, com.figma.mcp/mcp/get_metadata, com.figma.mcp/mcp/get_screenshot, com.figma.mcp/mcp/get_variable_defs, com.figma.mcp/mcp/search_design_system, com.figma.mcp/mcp/send_code_connect_mappings, com.figma.mcp/mcp/use_figma, com.figma.mcp/mcp/whoami, vscode.mermaid-chat-features/renderMermaidDiagram, todo]
---

# FB Comment Manager — Frontend Developer Agent

## Stack
- **Framework:** Vue 3 (Composition API, `<script setup>`) / TypeScript (strict)
- **Build Tool:** Vite 5.x
- **Routing:** Vue Router 4.x (lazy-loaded routes + navigation guards)
- **Global State:** Pinia 2.x (auth, page selection, unread counts)
- **HTTP:** Axios 1.x — centralized instance via `services/api.service.ts`
- **Styling:** TailwindCSS 3.x (utility classes only — no inline styles, no custom CSS files)
- **UI Components:** shadcn-vue (Button, Card, Input, Badge, Toast, etc.)
- **Realtime:** socket.io-client 4.x — listeners managed exclusively in `useSocket.ts`
- **Testing:** Vitest + Vue Test Utils

---

## Architecture: View → Composable → Store / Service

- **View** (`views/`) — Orchestrates composables and stores. **No direct API calls** in `<script setup>`.
- **Composable** (`composables/`) — Owns all data-fetching, side-effect logic, and async operations.
- **Store** (`stores/`) — Pinia: cross-component/global state only (JWT, selected page, unread counts).
- **Service** (`services/`) — Axios instance + raw API call functions. Called only from composables.
- **Component** (`components/`) — Presentational. Emits events up; receives data via props.
- **Router** (`router/`) — All auth checks in navigation guards. Never in `onMounted`.

### Directory (`frontend/src/`)
```
src/
├── views/
│   ├── LoginView.vue             # Facebook OAuth redirect trigger
│   ├── PagesView.vue             # Fanpage selection
│   ├── PostsView.vue             # Post list with unread badges
│   └── CommentsView.vue          # Comments + Reply + Realtime + Mark as read
│
├── composables/
│   ├── usePosts.ts               # Fetch post list, manage loading state
│   ├── useComments.ts            # Fetch comments, send reply, mark as read
│   └── useSocket.ts             # socket.io-client — ONLY place for socket.on()
│
├── stores/
│   ├── auth.store.ts             # Pinia: user profile, JWT token, isAuthenticated
│   ├── page.store.ts             # Pinia: selected Fanpage (pageId, pageName, token)
│   └── comment.store.ts          # Pinia: unreadCountByPost, new comment append
│
├── services/
│   └── api.service.ts            # Axios instance: baseURL, auth interceptor, error interceptor
│
├── components/
│   ├── ui/                       # shadcn-vue auto-generated — DO NOT edit manually
│   ├── CommentCard.vue           # Displays a single comment with reply button
│   ├── ReplyForm.vue             # Reply textarea + submit button
│   ├── UnreadBadge.vue           # Badge showing unread count per post
│   └── PostCard.vue              # Displays a post summary card
│
├── router/
│   └── index.ts                  # Route definitions, navigation guards, lazy-loading
│
├── types/
│   ├── auth.types.ts             # AuthUser, JwtPayload
│   ├── post.types.ts             # Post, PostListResponse
│   └── comment.types.ts          # Comment, CommentWithState, NewCommentPayload
│
├── config/
│   └── env.ts                    # Typed env var access (import.meta.env wrappers)
│
└── main.ts                       # App bootstrap: createApp, Pinia, Router, mount
```

---

## Rules & Conventions

### TypeScript
- No `any` — ever. Define explicit `interface` for all props, API responses, and store shapes.
- Use `interface` for object shapes; `type` for unions and aliases.
- All composable functions must have explicit return types.
- Shared types live in `types/` — never define types inline inside `.vue` files.

### Views
- A View file **only** calls composables and reads from stores.
- No `apiService` imports allowed in View files.
- No `socket.on()` calls in View files — that belongs to `useSocket.ts`.
- No auth token checks in `onMounted` — use router navigation guards instead.

### Composables
- Every async composable function → wrapped in `try/catch` with a Toast error notification.
- Always manage a local `isLoading` ref for async operations.
- Composables that mutate Pinia state must import and use the store directly — no prop drilling.
- Always use `:key` with a unique `id` on `v-for` — never use the loop index.

```typescript
// CORRECT
<CommentCard v-for="comment in comments" :key="comment.commentId" :comment="comment" />

// BANNED
<CommentCard v-for="(comment, index) in comments" :key="index" />
```

### Pinia Stores
- Stores hold **only** persistent/shared client state:
  - `auth.store.ts` → user object, JWT, `isAuthenticated` computed
  - `page.store.ts` → selected Fanpage info
  - `comment.store.ts` → `unreadCountByPost`, `incrementUnread`, `resetUnread`
- Local UI state (modal open, form loading, tab active) → stays as `ref()` inside the component.
- Never store server response data directly in a Pinia store (that belongs in composable refs).

### API Service
- A single Axios instance in `services/api.service.ts`:
  - `baseURL` → from `import.meta.env.VITE_API_URL`
  - Request interceptor → attaches `Authorization: Bearer <token>` from `authStore`
  - Response interceptor → handles 401 (clear store, redirect to login)
- Composables call `apiService.get<T>()` / `apiService.post<T>()` — never `axios.get()` directly.

### Socket.io (`useSocket.ts`)
- `socket.on()` → **only** inside `useSocket.ts`. Never in a View or Component.
- Register listeners in `onMounted`, clean up in `onUnmounted` → always `socket?.disconnect()`.
- On `comment:new` event → call `commentStore.incrementUnread(postId)`.
- On `comment:read` event → call `commentStore.resetUnread(postId)`.

### Styling (TailwindCSS)
- Tailwind utility classes only — no inline `style=""`, no custom `.css` files (except global reset).
- Never hardcode hex colors or pixel values — use Tailwind tokens (`text-sm`, `gap-4`, `text-muted-foreground`).
- `components/ui/` → shadcn-vue components only. Never edit these files manually.
- Custom components use shadcn-vue primitives as building blocks.

### Vue Router
- All routes → lazy-loaded via `() => import(...)`.
- Auth check → only in `router.beforeEach` navigation guard using `authStore.isAuthenticated`.
- Routes requiring auth → marked with `meta: { requiresAuth: true }`.
- After OAuth callback → redirect to `/pages` (Fanpage selection), not directly to posts.

### Error Handling (UX)
- Every failed async operation → show a `toast` with `variant: 'destructive'` and a human-readable Vietnamese message.
- Never expose raw error messages or stack traces to the UI.
- Loading states → always reflected via `isLoading` ref bound to a skeleton or spinner.

---

## Code Patterns

### View (`<script setup>`)
```typescript
// frontend/src/views/CommentsView.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useComments } from '@/composables/useComments'
import { usePageStore } from '@/stores/page.store'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageStore = usePageStore()
const postId = route.params.postId as string

const { comments, isLoading, fetchComments, replyComment } = useComments(postId)

onMounted(() => {
  fetchComments()
})
</script>
```

### Composable (Data Fetching)
```typescript
// frontend/src/composables/useComments.ts
import { ref } from 'vue'
import { apiService } from '@/services/api.service'
import { useToast } from '@/components/ui/toast'
import { useCommentStore } from '@/stores/comment.store'
import type { CommentWithState } from '@/types/comment.types'

export function useComments(postId: string) {
  const comments = ref<CommentWithState[]>([])
  const isLoading = ref(false)
  const { toast } = useToast()
  const commentStore = useCommentStore()

  async function fetchComments(): Promise<void> {
    isLoading.value = true
    try {
      const data = await apiService.get<CommentWithState[]>(`/posts/${postId}/comments`)
      comments.value = data
      commentStore.resetUnread(postId)
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể tải danh sách bình luận.', variant: 'destructive' })
    } finally {
      isLoading.value = false
    }
  }

  async function replyComment(commentId: string, message: string): Promise<void> {
    try {
      await apiService.post(`/comments/${commentId}/reply`, { message })
      toast({ title: 'Thành công', description: 'Đã gửi phản hồi.' })
    } catch {
      toast({ title: 'Lỗi', description: 'Gửi phản hồi thất bại. Vui lòng thử lại.', variant: 'destructive' })
    }
  }

  return { comments, isLoading, fetchComments, replyComment }
}
```

### Pinia Store
```typescript
// frontend/src/stores/comment.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCommentStore = defineStore('comment', () => {
  const unreadCountByPost = ref<Record<string, number>>({})

  function incrementUnread(postId: string): void {
    unreadCountByPost.value[postId] = (unreadCountByPost.value[postId] ?? 0) + 1
  }

  function resetUnread(postId: string): void {
    unreadCountByPost.value[postId] = 0
  }

  return { unreadCountByPost, incrementUnread, resetUnread }
})
```

### Socket Composable
```typescript
// frontend/src/composables/useSocket.ts
import { onMounted, onUnmounted } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useCommentStore } from '@/stores/comment.store'
import type { NewCommentPayload } from '@/types/comment.types'

let socket: Socket | null = null

export function useSocket(): void {
  const commentStore = useCommentStore()

  onMounted(() => {
    socket = io(import.meta.env.VITE_API_URL as string)

    socket.on('comment:new', (payload: NewCommentPayload) => {
      commentStore.incrementUnread(payload.postId)
    })
  })

  onUnmounted(() => {
    socket?.disconnect()
    socket = null
  })
}
```

### Vue Router Guard
```typescript
// frontend/src/router/index.ts
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth as boolean | undefined

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Pages' })
  } else {
    next()
  }
})
```

### Axios Service
```typescript
// frontend/src/services/api.service.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth.store'
import router from '@/router'

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  withCredentials: false,
})

apiService.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

apiService.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore().clearAuth()
      router.push({ name: 'Login' })
    }
    return Promise.reject(error)
  },
)

export { apiService }
```

### Component (shadcn-vue)
```vue
<!-- frontend/src/components/CommentCard.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ReplyForm from './ReplyForm.vue'
import type { CommentWithState } from '@/types/comment.types'

interface Props {
  comment: CommentWithState
}

const props = defineProps<Props>()
const emit = defineEmits<{ reply: [commentId: string, message: string] }>()

const showReplyForm = ref(false)
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-2 pt-4">
      <div class="flex items-center justify-between">
        <span class="font-semibold text-sm">{{ comment.fromName }}</span>
        <Badge v-if="!comment.isRead" variant="secondary">Chưa đọc</Badge>
      </div>
      <p class="text-sm text-muted-foreground">{{ comment.message }}</p>
      <Button variant="ghost" size="sm" class="self-start" @click="showReplyForm = !showReplyForm">
        Phản hồi
      </Button>
      <ReplyForm
        v-if="showReplyForm"
        @submit="(msg) => emit('reply', comment.commentId, msg)"
      />
    </CardContent>
  </Card>
</template>
```

---

## Feature Workflow (in order)

1. **Types** → `types/[resource].types.ts`
2. **API Service** → add call function in `services/api.service.ts` or dedicated service if large
3. **Composable** → `composables/use[Resource].ts` (owns `ref`, `isLoading`, async functions)
4. **Store update** *(if needed)* → add action/state to the relevant Pinia store
5. **Components** → `components/[ComponentName].vue` (presentational, props + emits)
6. **View** → `views/[Feature]View.vue` (orchestrates composable + store, no API calls)
7. **Route** → register lazy route in `router/index.ts` with `meta: { requiresAuth: true }`

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| View files | `PascalCase` + `View` suffix | `CommentsView.vue`, `PostsView.vue` |
| Component files | `PascalCase` | `CommentCard.vue`, `UnreadBadge.vue` |
| Composables | `use[Domain][Action?]` | `useComments`, `useSocket`, `usePosts` |
| Pinia stores | `use[Domain]Store` | `useAuthStore`, `useCommentStore` |
| Store files | `[domain].store.ts` | `auth.store.ts`, `comment.store.ts` |
| Type files | `[domain].types.ts` | `comment.types.ts`, `auth.types.ts` |
| Interfaces | `PascalCase` | `CommentWithState`, `AuthUser` |
| Tailwind classes | standard utilities | `flex`, `gap-4`, `text-sm`, `font-semibold` |
| Socket events | `noun:action` | `comment:new`, `comment:read` |

---

## Environment Variables

Accessed only via `import.meta.env` — never hardcoded.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | NestJS backend base URL (e.g. `http://localhost:3000`) |

---

## Git Standards
- Branch: `feat/feature-name`, `fix/bug-name`, `chore/task-name`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)

## Access Points
| Service | URL |
|---|---|
| Frontend Dev Server | `http://localhost:5173` |
| Backend API | `http://localhost:3000` |
| Socket.io | `ws://localhost:3000` |
