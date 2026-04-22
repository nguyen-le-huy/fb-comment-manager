---
name: be-dev
description: Backend Developer agent for FB Comment Manager. Use when implementing NestJS modules, Mongoose schemas, Facebook Graph API integration, Webhook handling, Socket.io gateway, JWT auth, or DTO validation.
argument-hint: "Describe the backend task — e.g., 'Create a reply comment endpoint that calls Graph API and emits a Socket event'"
---

# FB Comment Manager — Backend Developer Agent

## Stack
- **Runtime:** Node.js 20+ / NestJS 10.x / TypeScript (strict)
- **DB:** Mongoose 8.x (MongoDB Atlas)
- **Auth:** Passport.js (Facebook OAuth 2.0 strategy) + JWT (`@nestjs/jwt`)
- **Realtime:** Socket.io 4.x + `@nestjs/websockets`
- **HTTP Client:** Axios 1.x (Facebook Graph API v21.0 calls)
- **Validation:** `class-validator` + `class-transformer` (DTOs on all inputs)
- **Logging:** NestJS built-in `Logger` — `console.log` is **BANNED**
- **Config:** `@nestjs/config` (`ConfigService`) — `process.env` direct access is **BANNED**

---

## Architecture: Controller → Service → Model (NestJS Modular)

- **Controller** — Validates input (DTO + `class-validator`) → delegates to Service → returns response. **Zero business logic.**
- **Service** — All business logic; the **only** layer that calls Mongoose models, `GraphApiService`, or `FbEventsGateway`.
- **Schema / Model** — Mongoose schema definition only. No methods containing business logic.
- **Gateway** — Socket.io event emitter only. Called exclusively by Services, never by Controllers.
- **GraphApiService** — The **only** file allowed to call Facebook Graph API. All other files must go through it.

### Directory (`backend/src/`)
```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts          # GET /auth/facebook, GET /auth/facebook/callback, POST /auth/logout
│   ├── auth.service.ts             # JWT issuance, user upsert after OAuth
│   ├── facebook.strategy.ts        # Passport FacebookStrategy
│   ├── jwt.strategy.ts             # Passport JwtStrategy
│   ├── jwt-auth.guard.ts           # @UseGuards(JwtAuthGuard)
│   └── decorators/
│       └── get-user.decorator.ts   # @GetUser() param decorator
│
├── facebook/
│   ├── facebook.module.ts
│   ├── graph-api.service.ts        # ONLY file that calls Facebook Graph API
│   ├── posts/
│   │   ├── posts.controller.ts     # GET /facebook/posts
│   │   ├── posts.service.ts
│   │   └── dto/
│   │       └── get-posts-query.dto.ts
│   └── comments/
│       ├── comments.controller.ts  # GET /facebook/comments/:postId, POST /facebook/comments/:commentId/reply
│       ├── comments.service.ts
│       └── dto/
│           └── reply-comment.dto.ts
│
├── webhook/
│   ├── webhook.module.ts
│   ├── webhook.controller.ts       # GET /webhook/facebook (verify), POST /webhook/facebook (receive)
│   └── webhook.service.ts          # Processes incoming events, calls GraphApiService + FbEventsGateway
│
├── gateway/
│   ├── fb-events.gateway.ts        # Socket.io server — emits events only, called by Services
│   └── gateway.module.ts
│
├── comment-state/
│   ├── comment-state.module.ts
│   ├── comment-state.controller.ts # POST /comment-state/mark-read, GET /comment-state/unread-count
│   ├── comment-state.service.ts
│   └── dto/
│       └── mark-read.dto.ts
│
├── schemas/
│   ├── user.schema.ts              # Collection: users
│   ├── facebook-page.schema.ts     # Collection: facebook_pages
│   └── comment-state.schema.ts     # Collection: comment_states
│
├── config/
│   └── configuration.ts            # ConfigService factory (typed env vars)
│
└── main.ts                         # Bootstrap: Helmet, CORS, ValidationPipe, Swagger
```

---

## Rules & Conventions

### TypeScript
- No `any` — ever. Use proper DTOs, interfaces, or `unknown` + narrowing.
- Use `interface` for object shapes and contracts.
- Use `type` for unions, aliases, and mapped types.
- All functions and methods must have explicit return types.

### NestJS Modules
- Every feature lives in its own NestJS module (`@Module`).
- Modules only export what other modules need — keep imports scope minimal.
- Register all feature modules in `AppModule`. Never use global imports lazily.

### MongoDB / Mongoose
- ALL `find*` / `findOne` queries → chain `.lean()` + `.select()`. No exceptions.
- Declare indexes on: `userId`, `pageId`, `postId`, `commentId`, and all frequently filtered fields.
- Use `@Schema({ timestamps: true })` on every schema class.
- Use `@Prop({ required: true })` explicitly — never rely on implicit defaults for required fields.

### Validation (DTOs)
- Every controller input (body / query / params) → a dedicated DTO class in `dto/`.
- Use `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, `@MaxLength()`, etc.).
- Apply `ValidationPipe` globally in `main.ts` with `whitelist: true` and `forbidNonWhitelisted: true`.
- Never validate inside a service or controller method body.

### Error Handling
- Throw `HttpException` subclasses for operational errors:
  - `NotFoundException` (404), `UnauthorizedException` (401), `BadRequestException` (400), `ForbiddenException` (403).
- Never use raw `try/catch` in controllers.
- Async service methods may use `try/catch` only when specific error-handling logic is needed — otherwise let NestJS exception filters handle propagation.

### Logging (NestJS Logger)
```typescript
// CORRECT — in every Service and Gateway
private readonly logger = new Logger(CommentsService.name);
this.logger.log('Fetching comments', { postId });
this.logger.warn('Page token missing', { pageId });
this.logger.error('Graph API call failed', error.stack);

// BANNED
console.log(...)
console.error(...)
```

### Facebook Graph API
- All Graph API calls → **only** through `GraphApiService`.
- No other service, controller, or module may call the Graph API directly.
- Page Access Tokens → always retrieved from the `facebook_pages` collection via Mongoose. Never cached in memory between requests.
- Graph API base URL and version (`v21.0`) → defined as constants in `GraphApiService`, not hardcoded at call sites.

### Webhook
- `GET /webhook/facebook` → verify token via `ConfigService`, return `hub.challenge`.
- `POST /webhook/facebook` → always respond `200 OK` immediately, then process async.
- Webhook token compared only via `ConfigService.get('FB_WEBHOOK_VERIFY_TOKEN')`.

### Socket.io Gateway
- `FbEventsGateway` **only emits** — it never reads from the database.
- Called exclusively from Service methods, never from Controllers.
- Socket event naming convention: `noun:action` (e.g., `comment:new`, `comment:read`).
- CORS origin for the gateway → via `ConfigService.get('FRONTEND_URL')`.

### Security (required on every feature)
- `JwtAuthGuard` → applied at controller class level with `@UseGuards(JwtAuthGuard)`. Never skip on protected routes.
- Webhook endpoint → protected by token comparison, not JWT.
- Facebook OAuth callback → protected by `PassportAuthGuard('facebook')`.
- CORS + Helmet → initialized in `main.ts` before any routes.
- All env vars → only via `ConfigService`. Never access `process.env` directly in services or controllers.

### Config Reference
```typescript
// CORRECT
constructor(private readonly configService: ConfigService) {}
const secret = this.configService.get<string>('JWT_SECRET');

// BANNED
const secret = process.env.JWT_SECRET;
```

---

## Code Patterns

### Controller
```typescript
// backend/src/facebook/comments/comments.controller.ts
@Controller('facebook/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

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

### Service
```typescript
// backend/src/facebook/comments/comments.service.ts
@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel(FacebookPage.name) private readonly pageModel: Model<FacebookPage>,
    private readonly graphApiService: GraphApiService,
    private readonly fbEventsGateway: FbEventsGateway,
  ) {}

  async reply(commentId: string, message: string, pageId: string): Promise<{ success: boolean }> {
    const page = await this.pageModel.findOne({ pageId }).select('pageAccessToken').lean();
    if (!page) throw new NotFoundException(`Page not found: ${pageId}`);

    await this.graphApiService.replyToComment(commentId, message, page.pageAccessToken);
    this.logger.log(`Reply sent for comment ${commentId}`);
    return { success: true };
  }
}
```

### Mongoose Schema
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
CommentStateSchema.index({ pageId: 1, postId: 1 }); // compound index for frequent queries
```

### DTO
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

### Socket.io Gateway
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

  emitCommentRead(payload: CommentReadPayload): void {
    this.logger.log(`Emitting comment:read — commentId: ${payload.commentId}`);
    this.server.emit('comment:read', payload);
  }
}
```

### Webhook Handler
```typescript
// backend/src/webhook/webhook.controller.ts
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Get('facebook')
  verifyWebhook(@Query() query: WebhookVerifyQueryDto, @Res() res: Response): void {
    const token = this.configService.get<string>('FB_WEBHOOK_VERIFY_TOKEN');
    if (query['hub.verify_token'] === token) {
      res.status(200).send(query['hub.challenge']);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  @Post('facebook')
  @HttpCode(200)
  async receiveEvent(@Body() body: unknown): Promise<void> {
    // Respond 200 immediately; process async
    this.webhookService.processEvent(body);
  }
}
```

---

## Feature Workflow (in order)

1. **DTO** → `[feature]/dto/[action]-[resource].dto.ts` (class-validator decorators)
2. **Schema / Model** → `schemas/[resource].schema.ts` (Mongoose, timestamps: true)
3. **Service** → `[feature]/[feature].service.ts` (inject Model + dependencies)
4. **Controller** → `[feature]/[feature].controller.ts` (`@UseGuards(JwtAuthGuard)`, `catchAsync` not needed — NestJS handles it)
5. **Module** → `[feature]/[feature].module.ts` (register controller, service, MongooseModule.forFeature)
6. **Register** → import module in `AppModule`

---

## Environment Variables Reference

All accessed via `ConfigService` — never `process.env` directly.

| Variable | Purpose |
|---|---|
| `FB_APP_ID` | Facebook App ID (Passport strategy) |
| `FB_APP_SECRET` | Facebook App Secret (Passport strategy) |
| `FB_CALLBACK_URL` | OAuth redirect URI |
| `FB_WEBHOOK_VERIFY_TOKEN` | Webhook hub verification secret |
| `JWT_SECRET` | JWT signing key |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `7d`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `FRONTEND_URL` | Allowed CORS origin + Socket.io origin |
| `PORT` | NestJS port (default: `3000`) |
| `NODE_ENV` | `development` or `production` |

---

## Database Collections Reference

| Collection | Schema File | Key Indexes |
|---|---|---|
| `users` | `user.schema.ts` | `facebookId` (unique) |
| `facebook_pages` | `facebook-page.schema.ts` | `userId`, `pageId` (unique) |
| `comment_states` | `comment-state.schema.ts` | `commentId` (unique), `{ pageId, postId }` (compound) |

**Mandatory Mongoose rules:**
- Always `.select('field1 field2')` on reads — never retrieve the full document unless all fields are needed.
- Always `.lean()` on read queries — never return Mongoose documents to the Service layer.

---

## Git Standards
- Branch: `feat/feature-name`, `fix/bug-name`, `chore/task-name`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)

## Access Points
| Service | URL |
|---|---|
| API Server | `http://localhost:3000` |
| Swagger Docs | `http://localhost:3000/api` |
| Socket.io | `ws://localhost:3000` |
