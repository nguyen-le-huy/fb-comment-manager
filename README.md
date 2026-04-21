# FB Comment Manager

An internal admin tool for managing Facebook Fanpage comments through a centralized dashboard, replacing the need to operate directly on Facebook.

## Overview

FB Comment Manager is a standalone web application with a Vue 3 frontend and a NestJS backend. It integrates with the Facebook Graph API v21.0 for reading and replying to comments, Facebook OAuth 2.0 for authentication, and Facebook Webhook + Socket.io for realtime updates.

## Features

- Facebook OAuth 2.0 login and Fanpage selection
- View all posts and comments from a managed Fanpage
- Reply to comments directly from the dashboard
- Realtime comment updates via Facebook Webhook and Socket.io
- Internal read/unread state tracking per comment

## Tech Stack

**Frontend:** Vue 3, Vite, Pinia, Vue Router, Axios, TailwindCSS, shadcn-vue, socket.io-client, TypeScript

**Backend:** NestJS, Passport.js, JWT, Axios, Mongoose, MongoDB Atlas, Socket.io, TypeScript

**Infrastructure:** Docker, Docker Compose, Cloudflare Tunnel

## Project Structure

```
fb-comment-manager/
├── frontend/    # Vue 3 + Vite SPA
├── backend/     # NestJS API server
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas cluster
- Facebook App with `pages_show_list`, `pages_read_engagement`, `pages_manage_engagement` permissions
- Cloudflare Tunnel (for OAuth callback and Webhook in development)

### Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory and fill in the required values:

```env
FB_APP_ID=
FB_APP_SECRET=
FB_CALLBACK_URL=
FB_WEBHOOK_VERIFY_TOKEN=
JWT_SECRET=
JWT_EXPIRES_IN=7d
MONGODB_URI=
FRONTEND_URL=
PORT=3000
NODE_ENV=development
```

Copy `.env.example` to `.env` in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3000
```

### Running with Docker

```bash
docker compose up --build
```

### Running Locally

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

## Access

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/api |

## Facebook Permissions Required

| Permission | Purpose |
|---|---|
| `pages_show_list` | List managed Fanpages |
| `pages_read_engagement` | Read post comments |
| `pages_manage_engagement` | Reply to comments |

In Development Mode, these permissions are available to Admin accounts and Test Users without App Review.
