---
trigger: always_on
---

# FB COMMENT MANAGER — BACKEND ARCHITECTURE & STANDARDS

## 1. Technology Stack

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Ghi chú** |
| --- | --- | --- |
| **Runtime** | **Node.js 20+** | Môi trường chạy JavaScript hiệu năng cao. |
| **Framework** | **NestJS 10.x** | Framework modular, có sẵn DI container, Guards, Interceptors, Pipes. Không viết Express thuần. |
| **Ngôn ngữ** | **TypeScript 5.x** | **Bắt buộc.** `strict: true`. Không viết JS thuần. Không dùng `any`. |
| **API Docs** | **Swagger (`@nestjs/swagger`)** | Tự động sinh tài liệu tại `/api`. Controller và DTO phải có decorator đầy đủ. |
| **Database ORM** | **Mongoose 8.x (MongoDB Atlas)** | Quản lý Schema MongoDB chặt chẽ qua `@Schema`, `@Prop`. |
| **Auth** | **Passport.js + JWT** | Facebook OAuth 2.0 (strategy) để lấy User Token và Page Token. JWT để xác thực phiên giữa Vue và NestJS. |
| **HTTP Client** | **Axios 1.x** | Gọi Facebook Graph API v21.0. Tập trung duy nhất trong `GraphApiService`. |
| **Realtime** | **Socket.io 4.x** | WebSocket server — emit events realtime xuống frontend khi có comment mới. |
| **Validation** | **class-validator + class-transformer** | Validate DTO trên toàn bộ controller input. Apply qua `ValidationPipe` global. |
| **Logging** | **NestJS Logger** | `new Logger(ClassName.name)` trong mọi Service và Gateway. `console.log` bị **cấm tuyệt đối**. |
| **Config** | **@nestjs/config (ConfigService)** | Truy cập env vars. `process.env` trực tiếp bị **cấm** trong Service/Controller. |

---

## 2. Directory Structure (`backend/src/`)

```text
src/
├── auth/                             # AUTHENTICATION MODULE
│   ├── auth.module.ts
│   ├── auth.controller.ts            # GET /auth/facebook, /auth/facebook/callback, POST /auth/logout
│   ├── auth.service.ts               # JWT issuance, user upsert sau OAuth
│   ├── facebook.strategy.ts          # Passport FacebookStrategy
│   ├── jwt.strategy.ts               # Passport JwtStrategy
│   ├── jwt-auth.guard.ts             # @UseGuards(JwtAuthGuard)
│   └── decorators/
│       └── get-user.decorator.ts     # @GetUser() param decorator
│
├── facebook/                         # FACEBOOK INTEGRATION MODULE
│   ├── facebook.module.ts
│   ├── graph-api.service.ts          # DUY NHẤT được gọi Facebook Graph API
│   ├── posts/
│   │   ├── posts.controller.ts       # GET /facebook/posts
│   │   ├── posts.service.ts
│   │   └── dto/
│   │       └── get-posts-query.dto.ts
│   └── comments/
│       ├── comments.controller.ts    # GET /facebook/comments/:postId, POST /facebook/comments/:commentId/reply
│       ├── comments.service.ts
│       └── dto/
│           └── reply-comment.dto.ts
│
├── webhook/                          # FACEBOOK WEBHOOK MODULE
│   ├── webhook.module.ts
│   ├── webhook.controller.ts         # GET /webhook/facebook (verify), POST /webhook/facebook (receive)
│   └── webhook.service.ts            # Xử lý event, gọi GraphApiService + FbEventsGateway
│
├── gateway/                          # SOCKET.IO REALTIME MODULE
│   ├── fb-events.gateway.ts          # Emit events — chỉ được gọi từ Service layer
│   └── gateway.module.ts
│
├── comment-state/                    # INTERNAL READ/UNREAD STATE MODULE
│   ├── comment-state.module.ts
│   ├── comment-state.controller.ts   # POST /comment-state/mark-read, GET /comment-state/unread-count
│   ├── comment-state.service.ts
│   └── dto/
│       └── mark-read.dto.ts
│
├── schemas/                          # MONGOOSE SCHEMAS (DATA MODELS)
│   ├── user.schema.ts                # Collection: users
│   ├── facebook-page.schema.ts       # Collection: facebook_pages
│   └── comment-state.schema.ts       # Collection: comment_states
│
├── config/
│   └── configuration.ts              # ConfigService factory — typed env vars
│
└── main.ts                           # Bootstrap: Helmet, CORS, ValidationPipe toàn cục, Swagger
```

---

## 3. Architectural Patterns & Rules

### A. Layer Separation Rule

| Layer | Trách nhiệm | Được phép gọi |
| --- | --- | --- |
| **Controller** | Nhận HTTP request, delegate sang Service, trả response | Service |
| **Service** | Toàn bộ business logic | Mongoose Model, GraphApiService, FbEventsGateway |
| **GraphApiService** | Gọi Facebook Graph API | Facebook Graph API (Axios) |
| **FbEventsGateway** | Emit Socket.io event | Không gọi gì — chỉ nhận data từ Service và emit |
| **Schema / Model** | Định nghĩa Mongoose schema | Không chứa business logic |

**Controller không được chứa business logic.** Nếu logic dài hơn 3 dòng → chuyển vào Service.

**GraphApiService là entry point duy nhất** của mọi call tới Facebook Graph API. Không file nào khác được gọi Graph API trực tiếp.

**FbEventsGateway không được đọc database.** Nó chỉ nhận payload đã chuẩn bị từ Service và emit xuống client.

### B. Validation & Security Strategy

1. **DTO + class-validator**: Tất cả input (body / query / params) phải qua DTO class với decorator validation. Không validate inline trong controller.
2. **ValidationPipe global** với `whitelist: true`, `forbidNonWhitelisted: true` — khai báo trong `main.ts`.
3. **Security First**: Helmet + CORS phải được khởi tạo trong `main.ts` trước khi mount bất kỳ route nào.
4. **Strict Types**: Không dùng `any`. Dùng generic hoặc interface rõ ràng.
5. **JwtAuthGuard**: Apply ở cấp controller class cho toàn bộ route được bảo vệ. Không bỏ sót.

### C. Realtime Rule

- `FbEventsGateway.emit*()` chỉ được gọi từ **Service layer**.
- Đặt tên Socket event theo pattern `noun:action` (ví dụ: `comment:new`, `comment:read`).
- CORS origin của Gateway lấy từ `ConfigService.get('FRONTEND_URL')`.
- Webhook endpoint (`POST /webhook/facebook`) phải trả `200 OK` ngay lập tức, xử lý async sau.

---

## 4. Coding Standards

### Logging (NestJS Logger)

```typescript
// ĐÚNG — khai báo trong mọi Service và Gateway
private readonly logger = new Logger(CommentsService.name);

this.logger.log('Fetching comments', { postId });
this.logger.warn('Page not found', { pageId });
this.logger.error('Graph API call failed', error.stack);

// CẤM TUYỆT ĐỐI
console.log(...)
console.error(...)
```

### Mongoose Query Rules

- Mọi query đọc dữ liệu → bắt buộc chain `.lean()` + `.select('field1 field2')`.
- KHÔNG trả Mongoose Document lên Service layer — chỉ trả plain object (`.lean()`).
- Khai báo index compound `{ pageId: 1, postId: 1 }` trên collection `comment_states`.
- Mọi schema phải có `@Schema({ timestamps: true })`.

```typescript
// ĐÚNG
const page = await this.pageModel.findOne({ pageId }).select('pageAccessToken').lean();

// SAI — thiếu .lean() và .select()
const page = await this.pageModel.findOne({ pageId });
```

### Error Handling

- Ném `HttpException` subclass cho operational errors: `NotFoundException`, `UnauthorizedException`, `BadRequestException`, `ForbiddenException`.
- Không dùng raw `try/catch` trong Controller.
- Service có thể dùng `try/catch` khi cần xử lý lỗi cụ thể — ngoài ra để NestJS exception filter xử lý.

### Config / Secrets

```typescript
// ĐÚNG
constructor(private readonly configService: ConfigService) {}
const secret = this.configService.get<string>('JWT_SECRET');

// CẤM — không truy cập process.env trực tiếp trong Service/Controller
const secret = process.env.JWT_SECRET;
```

---

## 5. Workflow: Thêm một Feature mới

1. **DTO** → `[feature]/dto/[action]-[resource].dto.ts` (class-validator decorators)
2. **Schema** → `schemas/[resource].schema.ts` (`@Schema`, `@Prop`, `timestamps: true`, indexes)
3. **Service** → `[feature]/[feature].service.ts` (inject Model + các dependency cần thiết)
4. **Controller** → `[feature]/[feature].controller.ts` (`@UseGuards(JwtAuthGuard)`, delegate sang Service)
5. **Module** → `[feature]/[feature].module.ts` (register controller, service, `MongooseModule.forFeature`)
6. **AppModule** → Import module mới vào `AppModule`
7. **Swagger** → Thêm `@ApiTags`, `@ApiOperation`, `@ApiResponse` vào controller

*Last Updated: 2026-04-21*
