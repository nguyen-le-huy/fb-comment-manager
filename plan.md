# Plan: Reply Comment

> **Mục tiêu:** Cho phép Admin phản hồi comment trực tiếp từ `CommentDetail` bằng cách gọi Facebook Graph API qua BE.
>
> **Phạm vi:** Reply từ `ReplyForm` → API → Graph API → emit `comment:replied` socket event → FE cập nhật replies list trong `inboxStore`.

---

## Phân tích hiện trạng

### Backend — Đã có ✅ / Còn thiếu ❌

| File | Trạng thái | Ghi chú |
|---|---|---|
| `graph-api.service.ts` | ✅ `replyToComment(commentId, message, pageAccessToken)` | Gọi `POST /{commentId}/comments` |
| `comments/comments.service.ts` | ✅ `replyToComment(pageId, commentId, message)` | Lấy token từ DB rồi gọi GraphApi |
| `comments/comments.controller.ts` | ✅ `POST /facebook/comments/:pageId/:commentId/reply` | Route đã map đúng |
| `comments/dto/reply-comment.dto.ts` | ✅ `ReplyCommentDto { message }` | Có `@IsString`, `@IsNotEmpty`, `@MaxLength(8000)` |
| `gateway/fb-events.gateway.ts` | ❌ Chưa có `emitCommentReplied()` | Cần emit `comment:replied` sau khi reply thành công |
| `comments/comments.service.ts` | ❌ `replyToComment()` chưa emit socket event | Cần gọi `fbEventsGateway.emitCommentReplied()` |
| `comments/dto/reply-comment.dto.ts` | ❌ Thiếu `commentId` trong response | BE cần trả `{ id, commentId, pageId }` để FE làm giàu data |

### Frontend — Đã có ✅ / Còn thiếu ❌

| File | Trạng thái | Ghi chú |
|---|---|---|
| `components/ReplyForm.vue` | ✅ Có UI textarea + nút submit + emit `submit` | Đã render trong `CommentDetail.vue` |
| `components/CommentDetail.vue` | ✅ `handleReplySubmit(message)` gọi `replyComment(commentId, message)` | Có UI replies list |
| `composables/useInboxComments.ts` | ❌ `replyComment()` vẫn dùng **mock data** | Cần thay bằng `apiService.post()` thực |
| `composables/useInboxComments.ts` | ❌ Thiếu `pageId` khi gọi reply | Comment đã có `comment.pageId` trong store — cần truyền vào |
| `stores/inbox.store.ts` | ✅ `updateCommentReplies(commentId, newReply)` | Đã có, cần được gọi sau reply thành công |
| `composables/useSocket.ts` | ❌ Chưa lắng nghe `comment:replied` | Cần thêm listener để sync replies realtime |
| `types/comment.types.ts` | ❌ Chưa có `CommentReply` đủ fields từ API | Mock reply dùng `id: 'admin_1'` hardcode |

---

## Kiến trúc dữ liệu

### Reply request (FE → BE)

```
POST /api/facebook/comments/:pageId/:commentId/reply
Authorization: Bearer <jwt>
Body: { "message": "Cảm ơn bạn đã phản hồi!" }
```

### Reply response (BE → FE)

```typescript
// BE trả về sau khi Graph API thành công:
interface ReplyResponse {
  id: string;       // Graph API trả về ID của comment reply vừa tạo
  commentId: string; // comment gốc được reply
  pageId: string;
}
```

### Socket event `comment:replied` (BE → FE)

```typescript
// BE emit sau reply thành công:
{
  commentId: string;   // ID của comment gốc
  pageId: string;
  reply: {
    replyId: string;   // ID của reply vừa tạo (từ Graph API)
    author: {
      id: string;      // pageId đóng vai Page
      name: string;    // pageName
    };
    message: string;
    createdTime: string; // ISO string
  }
}
```

---

## Luồng xử lý

```
Admin nhập reply trong ReplyForm
→ CommentDetail.handleReplySubmit(message)
→ useInboxComments.replyComment(commentId, pageId, message)
→ apiService.post('/facebook/comments/:pageId/:commentId/reply', { message })
  → BE: CommentsController.replyToComment(pageId, commentId, { message })
     → CommentsService.replyToComment(pageId, commentId, message)
        → pageModel.findOne({ pageId }).select('pageAccessToken pageName').lean()
        → graphApiService.replyToComment(commentId, message, pageAccessToken)
           → POST /v21.0/{commentId}/comments?access_token=<token>
           → Facebook trả { id: "<new_reply_id>" }
        → fbEventsGateway.emitCommentReplied({ commentId, pageId, reply: {...} })
           → socket.emit('comment:replied', payload) [broadcast toàn bộ clients]
        → return { id, commentId, pageId }
  → FE nhận response { id, commentId, pageId }
→ inboxStore.updateCommentReplies(commentId, newReply) [optimistic update]
→ ReplyForm reset + ẩn
→ CommentDetail hiển thị reply mới trong danh sách

REALTIME (các client khác):
← socket.on('comment:replied')
→ useSocket.ts handler
→ inboxStore.updateCommentReplies(commentId, reply)
→ Nếu comment đang được select → CommentDetail tự cập nhật qua computed
```

---

## Phases

---

### PHASE 1 — Backend: Wire Reply + Emit Socket Event (be-dev agent)

**Mục tiêu:** Sau khi reply thành công, emit `comment:replied` socket event. Trả về đủ data cho FE.

**Điều kiện bắt đầu:** Code base hiện tại (route + service đã có).

#### 1.1 — Sửa `CommentsService.replyToComment()` — thêm emit + đủ data

**File:** `backend/src/facebook/comments/comments.service.ts`

Hiện tại trả `{ id: string }`. Cần:
1. Inject `FbEventsGateway` vào `CommentsService`.
2. Lấy thêm `pageName` từ DB (ngoài `pageAccessToken`).
3. Sau khi Graph API thành công → emit `comment:replied`.
4. Trả về `{ id, commentId, pageId }`.

```typescript
// Sửa constructor — inject FbEventsGateway
constructor(
  @InjectModel(FacebookPage.name) private readonly pageModel: Model<FacebookPageDocument>,
  @InjectModel(CommentState.name) private readonly commentStateModel: Model<CommentStateDocument>,
  private readonly graphApiService: GraphApiService,
  private readonly fbEventsGateway: FbEventsGateway,  // ← THÊM
) {}

// Sửa replyToComment()
async replyToComment(
  pageId: string,
  commentId: string,
  message: string,
): Promise<{ id: string; commentId: string; pageId: string }> {
  this.logger.log('Replying to comment', { pageId, commentId });

  const page = await this.pageModel
    .findOne({ pageId })
    .select('pageAccessToken pageName')   // ← thêm pageName
    .lean();

  if (!page) {
    throw new NotFoundException(`Page ${pageId} not found`);
  }

  const result = await this.graphApiService.replyToComment(commentId, message, page.pageAccessToken);

  const now = new Date().toISOString();
  this.fbEventsGateway.emitCommentReplied({
    commentId,
    pageId,
    reply: {
      replyId: result.id,
      author: {
        id: pageId,
        name: page.pageName,
      },
      message,
      createdTime: now,
    },
  });

  return { id: result.id, commentId, pageId };
}
```

#### 1.2 — Thêm `emitCommentReplied()` vào `FbEventsGateway`

**File:** `backend/src/gateway/fb-events.gateway.ts`

Thêm interface và method mới:

```typescript
interface CommentRepliedPayload {
  commentId: string;
  pageId: string;
  reply: {
    replyId: string;
    author: { id: string; name: string };
    message: string;
    createdTime: string;
  };
}

// Thêm method vào class FbEventsGateway:
emitCommentReplied(payload: CommentRepliedPayload): void {
  this.logger.log(`Emitting comment:replied — commentId: ${payload.commentId}`);
  this.server.emit('comment:replied', payload);
}
```

#### 1.3 — Sửa `CommentsController.replyToComment()` — cập nhật return type

**File:** `backend/src/facebook/comments/comments.controller.ts`

```typescript
// Sửa return type trong @ApiResponse và method signature:
@Post(':pageId/:commentId/reply')
@ApiResponse({ status: 201, description: 'Reply posted — returns { id, commentId, pageId }' })
replyToComment(
  @Param('pageId') pageId: string,
  @Param('commentId') commentId: string,
  @Body() dto: ReplyCommentDto,
): Promise<{ id: string; commentId: string; pageId: string }> {
  return this.commentsService.replyToComment(pageId, commentId, dto.message);
}
```

#### 1.4 — Inject `FbEventsGateway` vào `FacebookModule`

**File:** `backend/src/facebook/facebook.module.ts`

Đảm bảo `GatewayModule` được import vào `FacebookModule` để `CommentsService` có thể inject `FbEventsGateway`.

```typescript
@Module({
  imports: [
    GatewayModule,  // ← THÊM nếu chưa có
    ...
  ],
})
export class FacebookModule {}
```

**Deliverable BE Phase 1:**
- `POST /api/facebook/comments/:pageId/:commentId/reply` trả `{ id, commentId, pageId }` ✅
- Sau reply → emit `comment:replied` socket event ✅
- Swagger documented ✅

---

### PHASE 2 — Frontend: Connect Reply UI to Real API (fe-dev agent)

**Mục tiêu:** Thay mock `replyComment()` bằng API thực, truyền đúng `pageId`, update replies trong store, lắng nghe `comment:replied` socket event.

**Điều kiện bắt đầu:** Phase 1 BE hoàn thành.

#### 2.1 — Cập nhật `comment.types.ts` — thêm type reply response

**File:** `frontend/src/types/comment.types.ts`

```typescript
// Thêm interface:
export interface ReplyResponse {
  id: string;
  commentId: string;
  pageId: string;
}

// Thêm interface cho socket event:
export interface CommentRepliedPayload {
  commentId: string;
  pageId: string;
  reply: {
    replyId: string;
    author: { id: string; name: string };
    message: string;
    createdTime: string;
  };
}
```

#### 2.2 — Sửa `useInboxComments.ts` — replace mock replyComment

**File:** `frontend/src/composables/useInboxComments.ts`

Xoá toàn bộ mock data trong `replyComment()`. Thay bằng API call thực:

```typescript
import type { Comment, CommentReply, ReplyResponse } from '@/types/comment.types'

async function replyComment(commentId: string, pageId: string, message: string): Promise<void> {
  try {
    const response = await apiService.post<ReplyResponse>(
      `/facebook/comments/${pageId}/${commentId}/reply`,
      { message },
    )

    const newReply: CommentReply = {
      replyId: response.id,
      author: {
        id: pageId,       // page đóng vai admin
        name: 'Admin',    // tạm — sẽ được overwrite bởi socket event
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

// Cập nhật interface return type:
interface UseInboxCommentsResult {
  isLoading: Ref<boolean>
  fetchComments: () => Promise<void>
  replyComment: (commentId: string, pageId: string, message: string) => Promise<void>  // ← thêm pageId
  markAsRead: (commentId: string) => Promise<void>
}
```

> ⚠️ **Lưu ý quan trọng:** `replyComment` signature thay đổi thêm tham số `pageId`. Cần cập nhật tất cả call sites.

#### 2.3 — Sửa `CommentDetail.vue` — truyền pageId vào replyComment

**File:** `frontend/src/components/CommentDetail.vue`

`comment.value.pageId` đã có sẵn trong `inboxStore.selectedComment`. Chỉ cần truyền vào:

```typescript
// Hiện tại (WRONG — thiếu pageId):
async function handleReplySubmit(message: string): Promise<void> {
  if (!comment.value) return
  await replyComment(comment.value.commentId, message)
  showReplyForm.value = false
}

// Sửa thành (CORRECT):
async function handleReplySubmit(message: string): Promise<void> {
  if (!comment.value) return
  await replyComment(comment.value.commentId, comment.value.pageId, message)
  showReplyForm.value = false
}
```

#### 2.4 — Thêm listener `comment:replied` vào `useSocket.ts`

**File:** `frontend/src/composables/useSocket.ts`

```typescript
import type { CommentRepliedPayload } from '@/types/comment.types'

// Trong onMounted(), thêm listener mới:
socket.on('comment:replied', (payload: CommentRepliedPayload) => {
  // Tránh duplicate nếu chính client này đã optimistic update
  const currentComment = inboxStore.comments.find(
    (c) => c.commentId === payload.commentId
  )
  if (!currentComment) return

  const alreadyExists = currentComment.replies.some(
    (r) => r.replyId === payload.reply.replyId
  )
  if (alreadyExists) return

  inboxStore.updateCommentReplies(payload.commentId, {
    replyId: payload.reply.replyId,
    author: payload.reply.author,
    message: payload.reply.message,
    createdTime: payload.reply.createdTime,
  })
})
```

> **Rule:** `socket.on('comment:replied')` **chỉ** được đặt trong `useSocket.ts`.

#### 2.5 — Thêm `isReplying` state vào `ReplyForm.vue` (loading UX)

**File:** `frontend/src/components/ReplyForm.vue`

Hiện tại `ReplyForm` không có loading state khi đang submit. Cần:
- Nhận prop `isLoading: boolean` từ parent.
- Disable nút submit + textarea khi `isLoading = true`.
- Hiển thị spinner hoặc text "Đang gửi..." khi loading.

```typescript
// CommentDetail.vue — thêm isReplying state:
const isReplying = ref(false)

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
```

```vue
<!-- CommentDetail.vue — truyền isLoading vào ReplyForm: -->
<ReplyForm
  v-else
  :key="comment.commentId"
  :is-loading="isReplying"
  @submit="handleReplySubmit"
  @cancel="showReplyForm = false"
/>
```

**Deliverable FE Phase 2:**
- Reply thực đăng lên Facebook thông qua BE ✅
- Replies list trong `CommentDetail` cập nhật ngay sau khi submit (optimistic) ✅
- Realtime sync `comment:replied` hoạt động trên tất cả client ✅
- Loading state trên nút submit ✅
- Error toast khi thất bại ✅

---

## Summary: Files cần thay đổi

### Backend (Phase 1 — be-dev agent)

| File | Action | Nội dung thay đổi |
|---|---|---|
| `facebook/comments/comments.service.ts` | **[MODIFY]** | Inject `FbEventsGateway`, lấy `pageName`, emit `comment:replied`, đổi return type |
| `gateway/fb-events.gateway.ts` | **[MODIFY]** | Thêm `CommentRepliedPayload` interface + `emitCommentReplied()` method |
| `facebook/comments/comments.controller.ts` | **[MODIFY]** | Cập nhật `@ApiResponse` + return type |
| `facebook/facebook.module.ts` | **[MODIFY]** | Import `GatewayModule` nếu chưa có |

### Frontend (Phase 2 — fe-dev agent)

| File | Action | Nội dung thay đổi |
|---|---|---|
| `types/comment.types.ts` | **[MODIFY]** | Thêm `ReplyResponse`, `CommentRepliedPayload` |
| `composables/useInboxComments.ts` | **[MODIFY]** | Thay mock bằng `apiService.post()`, thêm param `pageId` |
| `components/CommentDetail.vue` | **[MODIFY]** | Truyền `pageId` vào `replyComment()`, thêm `isReplying` state |
| `components/ReplyForm.vue` | **[MODIFY]** | Nhận prop `isLoading`, disable UI khi đang submit |
| `composables/useSocket.ts` | **[MODIFY]** | Thêm `socket.on('comment:replied')` handler |

---

## Thứ tự thực thi

```
Phase 1 (be-dev) → Phase 2 (fe-dev)
```

> Phase 2 FE **phải chờ** Phase 1 BE xong để test end-to-end.
> Phase 2 FE có thể làm các bước 2.1, 2.3, 2.4, 2.5 song song với Phase 1 BE — chỉ bước test thực cần BE xong.

---

## Endpoint & Socket Reference

| Method | Path | Guard | Body | Response |
|---|---|---|---|---|
| `POST` | `/api/facebook/comments/:pageId/:commentId/reply` | JWT | `{ message: string }` | `{ id, commentId, pageId }` |

| Socket Event | Direction | Payload |
|---|---|---|
| `comment:replied` | BE → FE | `{ commentId, pageId, reply: { replyId, author: { id, name }, message, createdTime } }` |

---

*Last Updated: 2026-04-21*
