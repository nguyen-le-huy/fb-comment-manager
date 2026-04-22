---
trigger: always_on
---

# FB COMMENT MANAGER — FRONTEND ARCHITECTURE & STANDARDS

## 1. Project Identity

**FB Comment Manager** là công cụ nội bộ (internal tool) cho Admin quản lý bình luận Facebook Fanpage qua một dashboard tập trung.

- **Architecture:** Standalone SPA — không có Admin app riêng biệt.
- **Core Stack:** Vue 3 + Vite + NestJS (MongoDB Atlas + Facebook Graph API).

---

## 2. Technology Stack (Frontend)

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Ghi chú** |
| --- | --- | --- |
| **Core Framework** | **Vue 3 (Vite 5.x)** | Composition API + `<script setup>`. Vite giúp build nhanh, HMR tức thì. |
| **Ngôn ngữ** | **TypeScript 5.x** | **Bắt buộc.** `strict: true`. Không viết JS thuần. Không dùng `any`. |
| **Routing** | **Vue Router 4.x** | Client-side routing + navigation guards. Tất cả auth check phải nằm ở guard, không nằm trong `onMounted`. |
| **Global State** | **Pinia 2.x** | Quản lý trạng thái xuyên component: auth token, fanpage đang chọn, unread counts. Không dùng cho local UI state. |
| **HTTP Client** | **Axios 1.x** | Instance tập trung tại `services/api.service.ts`. Không gọi `axios` thẳng trong View hay Component. |
| **Styling** | **TailwindCSS 3.x** | Utility-first. Không dùng inline `style=""`. Không dùng file CSS tuỳ chỉnh. Chỉ dùng Tailwind tokens. |
| **UI Components** | **shadcn-vue** | Button, Card, Input, Badge, Toast, Skeleton, ... Không tự xây base UI từ đầu. |
| **Realtime** | **socket.io-client 4.x** | Nhận events từ NestJS. Toàn bộ `socket.on()` tập trung trong `composables/useSocket.ts`. |
| **Testing** | **Vitest + Vue Test Utils** | Unit test cho composables và utils. |

---

## 3. Directory Structure (`frontend/src/`)

**Strategy:** View-first + Composable pattern. Mọi logic đều qua composable, View chỉ orchestrate.

```text
frontend/src/
│
├── views/                        # MỘT VIEW = MỘT ROUTE
│   ├── LoginView.vue             # Trigger đăng nhập Facebook OAuth
│   ├── PagesView.vue             # Chọn Fanpage muốn quản lý
│   ├── PostsView.vue             # Danh sách bài viết + badge unread
│   └── CommentsView.vue          # Comments + Reply + Realtime + Mark as read
│
├── composables/                  # TOÀN BỘ LOGIC & SIDE EFFECTS
│   ├── usePosts.ts               # Fetch danh sách bài viết
│   ├── useComments.ts            # Fetch comments, gửi reply, mark as read
│   └── useSocket.ts              # Kết nối socket.io, lắng nghe events — DUY NHẤT
│
├── stores/                       # PINIA — CHỈ DÙNG CHO GLOBAL STATE
│   ├── auth.store.ts             # user, JWT token, isAuthenticated (computed)
│   ├── page.store.ts             # Fanpage đang chọn (pageId, pageName)
│   └── comment.store.ts          # unreadCountByPost, incrementUnread, resetUnread
│
├── services/                     # AXIOS INSTANCE & RAW API CALLS
│   └── api.service.ts            # baseURL, auth interceptor, 401 interceptor
│
├── components/                   # PRESENTATIONAL COMPONENTS
│   ├── ui/                       # shadcn-vue auto-generated — KHÔNG SỬA THỦ CÔNG
│   ├── CommentCard.vue           # Hiển thị một comment, nút Reply
│   ├── ReplyForm.vue             # Textarea + submit reply
│   ├── PostCard.vue              # Tóm tắt bài viết + badge unread count
│   └── UnreadBadge.vue           # Badge hiển thị số comment chưa đọc
│
├── router/
│   └── index.ts                  # Route definitions, lazy-loading, navigation guards
│
├── types/                        # TYPESCRIPT INTERFACES
│   ├── auth.types.ts             # AuthUser, JwtPayload
│   ├── post.types.ts             # Post, PostListResponse
│   └── comment.types.ts          # Comment, CommentWithState, NewCommentPayload
│
├── config/
│   └── env.ts                    # Typed wrappers cho import.meta.env
│
└── main.ts                       # Bootstrap: createApp, Pinia, Router, mount
```

---

## 4. Architectural Patterns & Rules

### A. Layer Separation Rule

| Layer | Trách nhiệm | Được phép gọi |
| --- | --- | --- |
| **View** | Orchestrate composables + stores, render template | Composables, Stores |
| **Composable** | Fetch data, side effects, business logic UI | `api.service.ts`, Stores |
| **Store (Pinia)** | Global/shared client state | Không gọi API trực tiếp |
| **Service** | Axios instance, raw HTTP call | Axios |
| **Component** | Presentational — nhận props, emit events | Không gọi API, không import store |

**View không được import `apiService` trực tiếp.** Mọi call API phải qua composable.

**Composable không được có business logic UI trong template** — logic thuộc composable, render thuộc View/Component.

**Component không được import Pinia store trực tiếp** — nhận data qua props, truyền action qua emit.

### B. State Management Rules

1. **Global State (Pinia):** Dùng cho `auth`, `page`, `unreadCountByPost` — data cần chia sẻ xuyên nhiều View.
2. **Local UI State:** `ref()` / `reactive()` bên trong composable hoặc component — không đẩy lên store.
3. **Server Data:** Không lưu response API thẳng vào Pinia — lưu vào `ref()` trong composable.

### C. Realtime Rule

- Toàn bộ `socket.on()` → **chỉ trong `useSocket.ts`**. Không gọi socket listener trong View hay Component.
- Đăng ký listener trong `onMounted`, dọn dẹp trong `onUnmounted` (luôn gọi `socket?.disconnect()`).
- Khi nhận `comment:new` → gọi `commentStore.incrementUnread(postId)`.
- Khi nhận `comment:read` → gọi `commentStore.resetUnread(postId)`.

### D. Validation & Security (Frontend)

- JWT được lưu trong `auth.store.ts` (memory/localStorage) — không lưu vào cookie JS.
- Axios request interceptor: tự động đính kèm `Authorization: Bearer <token>`.
- Axios response interceptor: nhận 401 → clear store → redirect sang `/login`.
- Auth check → **chỉ trong `router.beforeEach`**, không trong `onMounted`.

---

## 5. Coding Standards

### Styling (TailwindCSS)

```vue
<!-- ĐÚNG — dùng Tailwind utility classes -->
<div class="flex items-center gap-3 rounded-lg border p-4">

<!-- SAI — inline style hoặc hardcode giá trị -->
<div style="display: flex; gap: 12px; padding: 16px;">
```

- Dùng shadcn-vue tokens: `text-muted-foreground`, `bg-card`, `border`, `text-destructive`.
- Không tự tạo file `.css` tuỳ chỉnh. Không dùng `@apply` ngoài file Tailwind config.
- `components/ui/` là shadcn-vue — **không sửa thủ công**.

### v-for & :key

```vue
<!-- ĐÚNG -->
<CommentCard v-for="comment in comments" :key="comment.commentId" :comment="comment" />

<!-- SAI — không dùng index làm key -->
<CommentCard v-for="(comment, index) in comments" :key="index" />
```

### Async trong Composable

```typescript
// ĐÚNG — mọi async đều có try/catch + toast
async function fetchComments(): Promise<void> {
  isLoading.value = true
  try {
    comments.value = await apiService.get<CommentWithState[]>(`/posts/${postId}/comments`)
  } catch {
    toast({ title: 'Lỗi', description: 'Không thể tải danh sách bình luận.', variant: 'destructive' })
  } finally {
    isLoading.value = false
  }
}
```

### Pinia Store

```typescript
// ĐÚNG — dùng setup store style, explicit return
export const useCommentStore = defineStore('comment', () => {
  const unreadCountByPost = ref<Record<string, number>>({})
  function incrementUnread(postId: string): void {
    unreadCountByPost.value[postId] = (unreadCountByPost.value[postId] ?? 0) + 1
  }
  return { unreadCountByPost, incrementUnread }
})
```

### Vue Router Guard

```typescript
// ĐÚNG — auth check trong guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

// SAI — auth check trong onMounted của View
onMounted(() => {
  if (!authStore.isAuthenticated) router.push('/login') // CẤM
})
```

---

## 6. Workflow: Thêm một Feature mới

1. **Types** → `types/[domain].types.ts`
2. **API call** → thêm vào `services/api.service.ts` hoặc composable
3. **Composable** → `composables/use[Domain].ts` (`ref`, `isLoading`, async functions, try/catch)
4. **Store** *(nếu cần global state)* → thêm action/state vào Pinia store tương ứng
5. **Components** → `components/[ComponentName].vue` (presentational, props + emits)
6. **View** → `views/[Feature]View.vue` (orchestrate composable + store, không gọi API trực tiếp)
7. **Route** → đăng ký lazy route trong `router/index.ts` với `meta: { requiresAuth: true }`

*Last Updated: 2026-04-21*
