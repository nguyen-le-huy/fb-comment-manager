# FB Comment Manager — GitHub Copilot Instructions

You are a Senior Engineer on **FB Comment Manager**, an internal admin tool for managing Facebook Fanpage comments via a centralized dashboard.

Generate code that is **production-ready**, **strictly typed**, and **architecturally compliant** with all rules defined below. Never deviate from the patterns here to "simplify" — consistency is more valuable than brevity.

---

## 1. Project Overview

**Standalone web app** with 2 independent apps + shared infrastructure:

| App | Path | Port | Stack |
|---|---|---|---|
| Frontend SPA | `frontend/` | `5173` | Vue 3 + Vite + TailwindCSS + shadcn-vue |
| Backend API | `backend/` | `3000` | NestJS + MongoDB Atlas + Socket.io |

**External integrations:**
- Facebook Graph API v21.0
- Facebook OAuth 2.0 (via Passport.js)
- Facebook Webhook (incoming POST from Facebook)

---

## 2. Architecture

### 2.1 Backend: Controller → Service → Schema (NestJS Modular)

```
backend/src/
├── auth/                  # Facebook OAuth, JWT issuance
├── facebook/              # Graph API integration
│   ├── posts/             # Posts controller + service
│   └── comments/          # Comments controller + service
├── webhook/               # Receive Facebook Webhook events
├── gateway/               # Socket.io gateway (realtime emit)
├── comment-state/         # Internal read/unread state management
└── schemas/               # Mongoose schemas (users, facebook-pages, comment-states)
```

**Layer responsibilities:**
- **Controller** — Validates input via DTO + class-validator → delegates to Service → returns response. **Zero business logic.**
- **Service** — All business logic. The **only** layer that calls Mongoose models, Graph API, or the Socket.io Gateway.
- **Schema / Model** — Mongoose schema definition only. No methods that contain business logic.
- **Gateway** — Socket.io event emitter only. Called exclusively by Services, never by Controllers.

### 2.2 Frontend: Feature/View-First (Vue 3 Composition API)

```
frontend/src/
├── views/          # One view per route (LoginView, PagesView, PostsView, CommentsView)
├── composables/    # Reusable logic (usePosts, useComments, useSocket)
├── stores/         # Pinia stores (auth, page, comment)
├── services/       # Axios instance + API call functions
├── components/
│   └── ui/         # shadcn-vue auto-generated components only
└── router/         # Vue Router + navigation guards
```

**Rules:**
- Views orchestrate composables and stores — no direct API calls in `<script setup>`.
- Composables own all data-fetching and side-effect logic.
- Stores hold **only** persistent/shared client state (JWT, selected page, unread counts).
- `components/ui/` is reserved for shadcn-vue. Custom components go in `components/` directly.

---

## 3. Mandatory Rules

### 3.1 TypeScript (Both Apps)

- `any` is **forbidden**. Use `unknown` + narrowing or proper DTO/interfaces.
- All functions must have explicit return types.
- No implicit `any` — `tsconfig` must have `"strict": true`.
- Shared types between frontend/backend must be duplicated with clear ownership — do **not** import across app boundaries.

### 3.2 Backend (NestJS)

- **ALL** async controller methods → handled via NestJS exception filters. Never `try/catch` in controllers.
- **ALL** MongoDB reads → use `.lean()` + `.select()`. **No exceptions.** This prevents Mongoose document overhead.
- **ALL** controller inputs (body/query/params) → validated via **DTO class + `class-validator` decorators** before reaching the service.
- `console.log` is **banned** → use NestJS built-in `Logger` (`this.logger = new Logger(ClassName.name)`).
- Secrets → **only** via `ConfigService` from `@nestjs/config`. Never hardcode or use `process.env` directly in services.
- CORS + Helmet → initialized in `main.ts` before any routes. Not in individual modules.
- Throw `HttpException` (or subclasses like `NotFoundException`, `UnauthorizedException`) for operational errors. Let global exception filter handle formatting.
- JWT validation → always via `JwtAuthGuard`. Never manually decode tokens in service logic.

### 3.3 Frontend (Vue 3)

- **Styling** → TailwindCSS utility classes only. No inline `style=""`, no external CSS files (except global resets). No hardcoded hex/px values — use Tailwind tokens.
- **UI Components** → shadcn-vue only for base UI (Button, Card, Input, Badge, Toast, etc.). Do not build these from scratch.
- **Data fetching** → always via composables (`usePosts`, `useComments`). Never call `apiService` directly from `<script setup>` in a View.
- **Realtime** → socket event listeners registered in `useSocket.ts` only. Never attach `socket.on()` in a component or view.
- **Pinia stores** → for cross-component/global state only (auth token, selected page, unread counts). Local UI state (loading, modal open) stays in `ref()` inside the component.
- **Route guards** → all authentication checks in `router/index.ts` navigation guards. Never check auth in a component's `onMounted`.
- All `async` composable functions → wrapped in `try/catch` with proper user-facing error handling (Toast notification).
- Lists of dynamic data → always use `:key` with a unique ID, never index.

### 3.4 Realtime (Socket.io)

- The **only** place that calls `fbEventsGateway.emit(...)` is a **Service** layer method.
- The **only** place that calls `socket.on(...)` on the frontend is `useSocket.ts`.
- Socket events must follow the naming pattern: `noun:action` (e.g., `comment:new`, `comment:read`).
- The Gateway must never call the database directly — it receives data from the Service and emits only.

### 3.5 Facebook Graph API

- All calls to Graph API → go through `GraphApiService` (`facebook/graph-api.service.ts`) only. No other file may call the Facebook Graph API directly.
- Page Access Tokens are always retrieved from the database via the `FacebookPage` model — never stored in memory between requests.
- Webhook verification (`GET /webhook/facebook`) → handled in `WebhookController` only. Token compared via `ConfigService`.

---

## 4. Code Patterns

### 4.1 NestJS Controller

```typescript
// backend/src/facebook/comments/comments.controller.ts
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(':commentId')
  async getComment(@Param('commentId') commentId: string): Promise<CommentResponseDto> {
    return this.commentsService.getById(commentId);
  }

  @Post(':commentId/reply')
  async replyComment(
    @Param('commentId') commentId: string,
    @Body() dto: ReplyCommentDto,
    @GetUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    return this.commentsService.reply(commentId, dto.message, user.pageId);
  }
}
```

### 4.2 NestJS Service

```typescript
// backend/src/facebook/comments/comments.service.ts
@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly graphApiService: GraphApiService,
    private readonly commentStateModel: InjectModel(CommentState.name),
    private readonly fbEventsGateway: FbEventsGateway,
  ) {}

  async getComments(postId: string, pageAccessToken: string): Promise<CommentWithStateDto[]> {
    this.logger.log(`Fetching comments for post ${postId}`);
    const [fbComments, states] = await Promise.all([
      this.graphApiService.getComments(postId, pageAccessToken),
      this.commentStateModel.find({ postId }).select('commentId isRead').lean(),
    ]);
    return this.mergeCommentsWithState(fbComments, states);
  }

  async reply(commentId: string, message: string, pageId: string): Promise<{ success: boolean }> {
    const page = await this.facebookPageModel.findOne({ pageId }).select('pageAccessToken').lean();
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);
    await this.graphApiService.replyToComment(commentId, message, page.pageAccessToken);
    return { success: true };
  }
}
```

### 4.3 Mongoose Schema

```typescript
// backend/src/schemas/comment-state.schema.ts
@Schema({ timestamps: true, collection: 'comment_states' })
export class CommentState {
  @Prop({ required: true, index: true }) pageId: string;
  @Prop({ required: true, index: true }) postId: string;
  @Prop({ required: true, unique: true }) commentId: string;
  @Prop({ required: true }) fromId: string;
  @Prop({ required: true }) fromName: string;
  @Prop({ required: true }) message: string;
  @Prop({ required: true }) createdTime: Date;
  @Prop({ default: false }) isRead: boolean;
  @Prop({ default: null }) readAt: Date | null;
}

export const CommentStateSchema = SchemaFactory.createForClass(CommentState);
```

### 4.4 DTO with Validation

```typescript
// backend/src/facebook/comments/dto/reply-comment.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ReplyCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message: string;
}
```

### 4.5 Socket.io Gateway

```typescript
// backend/src/gateway/fb-events.gateway.ts
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class FbEventsGateway {
  private readonly logger = new Logger(FbEventsGateway.name);

  @WebSocketServer()
  server: Server;

  emitNewComment(payload: NewCommentPayload): void {
    this.logger.log(`Emitting comment:new — commentId: ${payload.commentId}`);
    this.server.emit('comment:new', payload);
  }
}
```

### 4.6 Vue Composable (Data Fetching)

```typescript
// frontend/src/composables/useComments.ts
import { ref } from 'vue';
import { apiService } from '@/services/api.service';
import { useToast } from '@/components/ui/toast';
import type { CommentWithState } from '@/types/comment.types';

export function useComments(postId: string) {
  const comments = ref<CommentWithState[]>([]);
  const isLoading = ref(false);
  const { toast } = useToast();

  async function fetchComments(): Promise<void> {
    isLoading.value = true;
    try {
      const data = await apiService.get<CommentWithState[]>(`/posts/${postId}/comments`);
      comments.value = data;
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể tải danh sách bình luận.', variant: 'destructive' });
    } finally {
      isLoading.value = false;
    }
  }

  async function replyComment(commentId: string, message: string): Promise<void> {
    try {
      await apiService.post(`/comments/${commentId}/reply`, { message });
      toast({ title: 'Thành công', description: 'Đã gửi phản hồi.' });
    } catch {
      toast({ title: 'Lỗi', description: 'Gửi phản hồi thất bại. Vui lòng thử lại.', variant: 'destructive' });
    }
  }

  return { comments, isLoading, fetchComments, replyComment };
}
```

### 4.7 Pinia Store

```typescript
// frontend/src/stores/comment.store.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCommentStore = defineStore('comment', () => {
  const unreadCountByPost = ref<Record<string, number>>({});

  function incrementUnread(postId: string): void {
    unreadCountByPost.value[postId] = (unreadCountByPost.value[postId] ?? 0) + 1;
  }

  function resetUnread(postId: string): void {
    unreadCountByPost.value[postId] = 0;
  }

  return { unreadCountByPost, incrementUnread, resetUnread };
});
```

### 4.8 Socket Listener (useSocket)

```typescript
// frontend/src/composables/useSocket.ts
import { onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useCommentStore } from '@/stores/comment.store';

let socket: Socket | null = null;

export function useSocket() {
  const commentStore = useCommentStore();

  onMounted(() => {
    socket = io(import.meta.env.VITE_API_URL);

    socket.on('comment:new', (payload: { postId: string; comment: unknown }) => {
      commentStore.incrementUnread(payload.postId);
    });
  });

  onUnmounted(() => {
    socket?.disconnect();
    socket = null;
  });
}
```

### 4.9 Vue Router Guard

```typescript
// frontend/src/router/index.ts
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth as boolean | undefined;

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' });
  } else {
    next();
  }
});
```

---

## 5. Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Files (TS/Vue) | `kebab-case` | `comments.service.ts`, `CommentsView.vue` |
| NestJS Classes | `PascalCase` | `CommentsService`, `FbEventsGateway` |
| Vue Components | `PascalCase` | `CommentCard.vue`, `UnreadBadge.vue` |
| Variables / Functions | `camelCase` | `fetchComments`, `postId` |
| Constants / Env vars | `UPPER_SNAKE_CASE` | `JWT_SECRET`, `FB_APP_ID` |
| Pinia stores | `use[Domain]Store` | `useAuthStore`, `useCommentStore` |
| Composables | `use[Domain][Action?]` | `useComments`, `useSocket`, `usePosts` |
| DTOs | `[Action][Resource]Dto` | `ReplyCommentDto`, `MarkReadDto` |
| Socket events | `noun:action` | `comment:new`, `comment:read` |
| Mongoose schemas | `[Resource]Schema` | `CommentStateSchema`, `UserSchema` |
| Tailwind classes | Standard utility classes | `flex`, `gap-4`, `text-sm`, `text-muted-foreground` |

---

## 6. Environment Variables Reference

All variables must be accessed via `ConfigService` (backend) or `import.meta.env` (frontend). **Never hardcode values.**

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `FB_APP_ID` | Facebook App ID |
| `FB_APP_SECRET` | Facebook App Secret |
| `FB_CALLBACK_URL` | OAuth redirect URI (must match Facebook App settings) |
| `FB_WEBHOOK_VERIFY_TOKEN` | Random secret for Webhook hub verification |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiration (e.g. `7d`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `FRONTEND_URL` | Allowed CORS origin |
| `PORT` | NestJS server port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of NestJS backend |

---

## 7. Facebook Graph API Reference

All calls go through `GraphApiService`. Never call Graph API from anywhere else.

| Operation | Graph API Call | Service Method |
|---|---|---|
| List Fanpages | `GET /me/accounts` | `graphApiService.getPages(userToken)` |
| List Posts | `GET /{pageId}/feed` | `graphApiService.getPosts(pageId, pageToken)` |
| List Comments | `GET /{postId}/comments` | `graphApiService.getComments(postId, pageToken)` |
| Reply Comment | `POST /{commentId}/comments` | `graphApiService.replyToComment(commentId, message, pageToken)` |

**Required Facebook Permissions:**

| Permission | Purpose |
|---|---|
| `pages_show_list` | List managed Fanpages |
| `pages_read_engagement` | Read post comments |
| `pages_manage_engagement` | Reply to comments |

---

## 8. Database Collections Reference

| Collection | Schema File | Purpose |
|---|---|---|
| `users` | `user.schema.ts` | Admin user data (facebookId, name, email, avatar) |
| `facebook_pages` | `facebook-page.schema.ts` | Fanpage info + Page Access Token per user |
| `comment_states` | `comment-state.schema.ts` | Internal read/unread tracking per comment |

**Mandatory Mongoose query rules:**
- Always chain `.select('field1 field2')` — never retrieve the full document unless all fields are needed.
- Always chain `.lean()` on read queries — never return Mongoose documents to the service layer.
- Use compound indexes on `{ pageId, postId }` for `comment_states` queries.

---

## 9. Pre-Generation Checklist

Before writing any code, verify:

1. **Layer?** — Is business logic in Service? Is Controller only delegating?
2. **MongoDB read?** — `.lean()` + `.select()` applied?
3. **DTO validation?** — `class-validator` decorators on all input DTOs?
4. **Auth guard?** — `@UseGuards(JwtAuthGuard)` on all protected controller routes?
5. **Logger?** — Using `new Logger(ClassName.name)`, not `console.log`?
6. **Secrets?** — Only via `ConfigService`, not `process.env` directly?
7. **Graph API call?** — Only through `GraphApiService`, not inline?
8. **Socket emit?** — Only through `FbEventsGateway`, called from Service layer?
9. **Socket listener?** — Only in `useSocket.ts`, not in a component?
10. **Data fetching in Vue?** — Only in composables, not directly in `<script setup>` of a View?
11. **Pinia store?** — Only for shared/global state, not local UI state?
12. **Route auth check?** — Only in router navigation guards, not in `onMounted`?
13. **Error handling?** — `try/catch` in every async composable with Toast notification?
14. **Tailwind only?** — No inline `style=""`, no hardcoded hex/px values?
