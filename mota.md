## I. Giới Thiệu

**FB Comment Manager** là một ứng dụng web nội bộ cho phép Admin quản lý bình luận trên Facebook Fanpage thông qua một giao diện tập trung, thay thế việc thao tác thủ công trực tiếp trên Facebook.

Ứng dụng được xây dựng như một **standalone web app** độc lập, gồm hai phần: Frontend SPA viết bằng Vue 3 và Backend API viết bằng NestJS. Hệ thống tương tác với Facebook thông qua **Facebook Graph API v21.0**, sử dụng cơ chế xác thực OAuth 2.0 để lấy quyền truy cập vào Fanpage. Tính năng quản lý bình luận theo **thời gian thực** được triển khai qua Facebook Webhook kết hợp [Socket.io](http://socket.io/).

---

## II. Mục Đích

**Ứng dụng được xây dựng nhằm:**

- Cung cấp một giao diện tập trung để Admin đọc và phản hồi bình luận trên Facebook Fanpage mà không cần đăng nhập vào Facebook trực tiếp.
- Cập nhật bình luận mới theo thời gian thực, giúp Admin theo dõi tương tác ngay khi có người dùng mới bình luận trên Fanpage.
- Hỗ trợ phân biệt bình luận đã đọc và chưa đọc bằng cơ chế quản lý trạng thái nội bộ của hệ thống.
- Giảm thời gian xử lý bình luận bằng cách hiển thị toàn bộ danh sách comment của từng bài viết trong một dashboard gọn gàng.
- Làm nền tảng thực hành tích hợp Facebook Graph API với kiến trúc Vue 3 + NestJS theo chuẩn enterprise.

---

## III. Đối Tượng Sử Dụng

| Vai trò | Mô tả |
| --- | --- |
| Admin / Page Manager | Người sở hữu hoặc được cấp quyền quản lý Facebook Fanpage, sử dụng app để đọc và reply comment hàng ngày |
| Developer / Intern | Người phát triển và demo ứng dụng trong môi trường staging/production |

Ứng dụng **không dành cho người dùng cuối (end user)** — đây là công cụ nội bộ (internal tool).

---

## IV. Chức Năng Chính

### 4.1 Xác Thực (Authentication)

- Đăng nhập bằng Facebook OAuth 2.0
- Sau khi đăng nhập, hệ thống lấy danh sách các Fanpage mà tài khoản đang quản lý
- Admin chọn Fanpage muốn làm việc, hệ thống tự động lưu Page Access Token
- Đăng xuất, xóa token khỏi hệ thống

### 4.2 Quản Lý Bài Viết (Posts)

- Hiển thị danh sách bài viết (feed) của Fanpage đã chọn
- Mỗi bài viết hiển thị: nội dung tóm tắt, thời gian đăng, số lượng comment
- Nhấn vào bài viết để xem danh sách comment bên dưới

### 4.3 Quản Lý Bình Luận (Comments)

- Hiển thị toàn bộ danh sách comment của một bài viết
- Mỗi comment hiển thị: tên người dùng, nội dung, thời gian đăng
- Reply comment trực tiếp từ dashboard, không cần vào Facebook
- Hiển thị trạng thái reply: đang gửi / thành công / thất bại

### 4.4 Bình Luận Chưa Đọc

- Hệ thống tự quản lý trạng thái comment chưa đọc và đã đọc
- Khi có comment mới, comment được đánh dấu là chưa đọc
- Admin mở danh sách comment của bài viết sẽ có thể đánh dấu comment là đã đọc
- Hiển thị số lượng comment chưa đọc theo bài viết hoặc theo Fanpage

### 4.5 Cập Nhật Thời Gian Thực (Realtime)

- Khi có comment mới trên Fanpage, hệ thống nhận event qua Facebook Webhook
- NestJS phát sự kiện realtime xuống frontend qua [Socket.io](http://socket.io/)
- Dashboard tự động cập nhật danh sách comment và bộ đếm chưa đọc mà không cần tải lại trang

---

## V. Công Nghệ Sử Dụng

### 5.1 Frontend

| Công nghệ | Phiên bản | Vai trò |
| --- | --- | --- |
| Vue 3 | 3.x | UI framework, Composition API |
| Vite | 5.x | Build tool, dev server |
| Vue Router | 4.x | Client-side routing |
| Pinia | 2.x | State management (auth, page, posts, unread counts) |
| Axios | 1.x | HTTP client gọi NestJS API |
| TailwindCSS | 3.x | Utility-first CSS styling |
| shadcn-vue | latest | Component library (Button, Card, Input, Toast, Badge, ...) |
| socket.io-client | 4.x | Nhận realtime events từ NestJS |
| TypeScript | 5.x | Static typing toàn bộ codebase |

### 5.2 Backend

| Công nghệ | Phiên bản | Vai trò |
| --- | --- | --- |
| NestJS | 10.x | Backend framework, modular architecture |
| TypeScript | 5.x | Static typing toàn bộ codebase |
| Passport.js | — | Facebook OAuth 2.0 strategy |
| Axios | 1.x | Gọi Facebook Graph API |
| JWT | — | Xác thực session giữa Vue và NestJS |
| Mongoose | 8.x | ODM, kết nối MongoDB Atlas |
| MongoDB Atlas | cloud | Lưu trữ user, page token, comment state |
| [socket.io](http://socket.io/) | 4.x | WebSocket server, phát realtime events |
| @nestjs/websockets | — | WebSocket module cho NestJS |

### 5.3 Hạ Tầng & DevOps

| Công nghệ | Vai trò |
| --- | --- |
| Docker + Docker Compose | Containerize frontend và backend |
| Cloudflare Tunnel | Public server Linux ra internet, cung cấp HTTPS cho Facebook OAuth và Webhook |
| Linux Server (self-hosted) | Môi trường deploy production |

### 5.4 External API

| Service | Vai trò |
| --- | --- |
| Facebook Graph API v21.0 | Lấy danh sách posts, comments; reply comment |
| Facebook OAuth 2.0 | Xác thực người dùng và lấy Page Access Token |
| Facebook Webhook | Nhận event realtime khi có comment mới trên Fanpage |

---

## VI. Kiến Trúc Dự Án

### 6.1 Cấu Trúc Thư Mục

```bash
fb-comment-manager/
|
+-- frontend/                        # Vue 3 + Vite
|   +-- src/
|   |   +-- views/
|   |   |   +-- LoginView.vue        # Đăng nhập Facebook OAuth
|   |   |   +-- PagesView.vue        # Chọn Fanpage
|   |   |   +-- PostsView.vue        # Danh sách bài viết
|   |   |   +-- CommentsView.vue     # Comment + Reply + Unread + Realtime
|   |   +-- composables/
|   |   |   +-- usePosts.ts          # Lấy danh sách posts
|   |   |   +-- useComments.ts       # Lấy comment, gửi reply, đánh dấu đã đọc
|   |   |   +-- useSocket.ts         # Kết nối và lắng nghe [Socket.io](http://socket.io/)
|   |   +-- stores/
|   |   |   +-- auth.store.ts        # Pinia: user, JWT token
|   |   |   +-- page.store.ts        # Pinia: fanpage đang chọn
|   |   |   +-- comment.store.ts     # Pinia: unread counts, comment states
|   |   +-- services/
|   |   |   +-- api.service.ts       # Axios instance, interceptors
|   |   +-- components/
|   |   |   +-- ui/                  # shadcn-vue auto-generated components
|   |   +-- router/
|   |       +-- index.ts             # Vue Router + route guards
|   +-- index.html
|   +-- package.json
|
+-- backend/                         # NestJS
|   +-- src/
|   |   +-- auth/
|   |   |   +-- auth.module.ts
|   |   |   +-- auth.controller.ts
|   |   |   +-- auth.service.ts
|   |   |   +-- facebook.strategy.ts
|   |   +-- facebook/
|   |   |   +-- facebook.module.ts
|   |   |   +-- graph-api.service.ts
|   |   |   +-- posts/
|   |   |   |   +-- posts.service.ts
|   |   |   |   +-- posts.controller.ts
|   |   |   +-- comments/
|   |   |       +-- comments.service.ts
|   |   |       +-- comments.controller.ts
|   |   +-- webhook/
|   |   |   +-- webhook.module.ts
|   |   |   +-- webhook.controller.ts   # Nhận events từ Facebook
|   |   +-- gateway/
|   |   |   +-- fb-events.gateway.ts    # [Socket.io](http://socket.io/) emit realtime
|   |   +-- comment-state/
|   |   |   +-- comment-state.module.ts
|   |   |   +-- comment-state.service.ts
|   |   |   +-- comment-state.controller.ts
|   |   +-- schemas/
|   |   |   +-- user.schema.ts
|   |   |   +-- facebook-page.schema.ts
|   |   |   +-- comment-state.schema.ts
|   |   +-- main.ts
|   +-- package.json
|
+-- docker-compose.yml
+-- .env.example
```

### 6.2 Luồng Xử Lý Chính

```bash
LOGIN FLOW
User → [Vue] Click "Đăng nhập Facebook"
→ [NestJS] Redirect sang Facebook OAuth
→ [Facebook] User cấp quyền
→ [NestJS] Nhận code, đổi lấy User Token
→ [NestJS] Lấy danh sách Pages, lưu Page Token vào DB
→ [NestJS] Trả về JWT cho Vue
→ [Vue] Lưu JWT vào Pinia, chuyển sang /pages
```

```bash
GET COMMENTS FLOW
User → [Vue] Chọn bài viết
→ [Vue] GET /api/posts/:postId/comments
→ [NestJS] CommentsService.getComments(postId, pageToken)
→ [Facebook Graph API] GET /{postId}/comments
→ [NestJS] Kết hợp dữ liệu comment với comment_state trong DB
→ [NestJS] Trả về danh sách comment kèm trạng thái đã đọc/chưa đọc
→ [Vue] Hiển thị comment
```

```bash
REPLY FLOW
User → [Vue] Nhập nội dung reply, bấm Gửi
→ [Vue] POST /api/comments/:commentId/reply
→ [NestJS] CommentsService.replyComment(commentId, message, pageToken)
→ [Facebook Graph API] POST /{commentId}/comments
→ [NestJS] Trả về { success: true }
→ [Vue] Hiển thị reply thành công
```

```bash
REALTIME FLOW
Người dùng Facebook → Comment lên Fanpage
→ [Facebook] Gửi event đến Webhook URL
→ [NestJS] WebhookController nhận POST /webhook/facebook
→ [NestJS] Lấy chi tiết comment từ Graph API
→ [NestJS] Tạo hoặc cập nhật comment_state với isRead = false
→ [NestJS] FbEventsGateway emit "new:comment"
→ [Vue] useSocket lắng nghe "new:comment"
→ [Vue] Tự động thêm comment mới vào danh sách và tăng unread count
```

```bash
MARK AS READ FLOW
User → [Vue] Mở màn hình comment hoặc bấm "Đánh dấu đã đọc"
→ [Vue] POST /api/comment-state/mark-read
→ [NestJS] Cập nhật comment_state.isRead = true
→ [NestJS] Trả về kết quả thành công
→ [Vue] Cập nhật lại badge unread
```

---

## VII. Permissions Facebook Cần Thiết

| Permission | Mục đích | Ghi chú |
| --- | --- | --- |
| `pages_show_list` | Lấy danh sách Fanpage của user | Cần App Review |
| `pages_read_engagement` | Đọc danh sách comment | Cần App Review |
| `pages_manage_engagement` | Reply comment | Cần App Review |

Trong **Development Mode**, ba permissions này đã có thể dùng được với tài khoản Admin và Test Users mà không cần submit App Review.

---

## VIII. Môi Trường Triển Khai

| Môi trường | Mô tả |
| --- | --- |
| Development | Chạy local, dùng Cloudflare Tunnel để test OAuth callback và Webhook |
| Production | Deploy trên Linux server, public qua Cloudflare Tunnel với HTTPS |

### Biến Môi Trường (.env)

```
# Facebook App
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_CALLBACK_URL=https://your-domain.com/auth/facebook/callback
FB_WEBHOOK_VERIFY_TOKEN=your_random_verify_token

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/fb_manager

# App
FRONTEND_URL=https://your-domain.com
PORT=3000
NODE_ENV=production
```

---

## IX. Database

### Collection 1: users

Lưu thông tin Admin đăng nhập qua Facebook OAuth.

```bash
{
_id: ObjectId,
facebookId: string,
name: string,
email: string,
avatar: string,
createdAt: Date,
updatedAt: Date
}
```

### Collection 2: facebook_pages

Lưu thông tin Fanpage và Page Access Token.

```bash
{
_id: ObjectId,
userId: ObjectId,
pageId: string,
pageName: string,
pageAccessToken: string,
category: string,
createdAt: Date,
updatedAt: Date
}
```

### Collection 3: comment_states

Lưu trạng thái comment nội bộ để hỗ trợ unread/read.

```bash
{
_id: ObjectId,
pageId: string,
postId: string,
commentId: string,
fromId: string,
fromName: string,
message: string,
createdTime: Date,
isRead: boolean,
readAt: Date | null,
createdAt: Date,
updatedAt: Date
}
```