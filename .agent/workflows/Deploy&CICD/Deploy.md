# Hướng dẫn Deploy FB Comment Manager lên Production (Home Server + Cloudflare Tunnel)

> **`cloudflared` & domain `devenir.shop` đã cài sẵn từ dự án Devenir.**
> Chỉ cần tạo thêm tunnel `fb-comment` và thêm 2 subdomain mới vào `devenir.shop`.

**Subdomains sẽ dùng:**

| Service | URL |
|---------|-----|
| 🌐 Client | `https://fb.devenir.shop` |
| 🔌 API | `https://api-fb.devenir.shop` |

---

## 📋 Yêu cầu trước khi bắt đầu

- ✅ `cloudflared` đã cài (từ Devenir)
- ✅ Domain `devenir.shop` đã trỏ Cloudflare
- ✅ Docker & Docker Compose đã cài đặt
- ✅ Source code FB Comment Manager đã clone về server

---

## 🚀 Các bước thực hiện

### **Bước 1: Clone Source Code lên Server**

```bash
git clone <your-repo-url> ~/fb-comment-manager
cd ~/fb-comment-manager
```

---

### **Bước 2: Tạo Tunnel mới tên "fb-comment"**

```bash
# Tạo tunnel riêng (độc lập với các tunnel khác)
cloudflared tunnel create fb-comment
# → Ghi lại Tunnel UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

### **Bước 3: Map 2 Subdomain về Tunnel**

> **Lưu ý Quan Trọng:** Bắt buộc phải dùng `TUNNEL_UUID` kèm cờ `-f` để map đúng tunnel, tránh trỏ nhầm sang các dự án khác gây ra lỗi 404!

```bash
# Thay <TUNNEL_UUID> bằng UUID thật của tunnel fb-comment sinh ra ở bước 2

# Client
cloudflared tunnel route dns -f <TUNNEL_UUID> fb.devenir.shop

# API
cloudflared tunnel route dns -f <TUNNEL_UUID> api-fb.devenir.shop
```

---

### **Bước 4: Tạo Config File riêng cho FB Comment Manager**

Tạo `~/.cloudflared/fb-comment-config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /home/<username>/.cloudflared/<TUNNEL_UUID>.json

ingress:
  # Client → port 5180 (tránh đụng các port 80/5173/5176 của dự án khác)
  - hostname: fb.devenir.shop
    service: http://localhost:5180

  # API → port 3080 (NestJS + Socket.IO)
  - hostname: api-fb.devenir.shop
    service: http://localhost:3080
    originRequest:
      connectTimeout: 30s
      keepAliveConnections: 100
      keepAliveTimeout: 90s
      # Bắt buộc: HTTP/1.1 để WebSocket (Socket.IO) hoạt động đúng
      http2Origin: false

  # Catch-all (bắt buộc)
  - service: http_status:404
```

> Thay `<TUNNEL_UUID>` và `<username>` bằng giá trị thực tế của bạn.

---

### **Bước 5: Tạo Systemd Service riêng cho FB Comment Tunnel**

```bash
sudo nano /etc/systemd/system/cloudflared-fb-comment.service
```

Nội dung:

```ini
[Unit]
Description=Cloudflare Tunnel - FB Comment Manager
After=network.target

[Service]
Type=simple
User=<username>
ExecStart=/usr/bin/cloudflared tunnel --config /home/<username>/.cloudflared/fb-comment-config.yml run fb-comment
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
# Thay <username> bằng user thực tế (VD: ubuntu, root)
sudo systemctl daemon-reload
sudo systemctl start cloudflared-fb-comment
sudo systemctl enable cloudflared-fb-comment

# Kiểm tra
sudo systemctl status cloudflared-fb-comment
sudo journalctl -u cloudflared-fb-comment -f --no-pager
```

---

### **Bước 6: Cấu hình Environment Variables**

**`backend/.env.production`:**

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://fb.devenir.shop

MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
# Các thông số từ Facebook App
FB_APP_ID=...
FB_APP_SECRET=...
FB_CALLBACK_URL=https://api-fb.devenir.shop/api/auth/facebook/callback
FB_WEBHOOK_VERIFY_TOKEN=...
```

**Facebook App Console (Bắt buộc cập nhật cho OAuth & Webhook):**
1. Mở Meta for Developers → App của bạn.
2. Mục **Facebook Login**: Cập nhật Valid OAuth Redirect URIs thành `https://api-fb.devenir.shop/api/auth/facebook/callback`.
3. Mục **Webhooks**: Sửa đổi URL của Webhook thành `https://api-fb.devenir.shop/api/webhook/facebook` với Verify Token đã thiết lập.

**`frontend/.env.production`:**

```env
VITE_API_URL=https://api-fb.devenir.shop/api
```

*(Lưu ý: URL của Socket.io đã được cấu hình lấy tự động dựa vào `VITE_API_URL` ở Frontend, nên không cần định nghĩa `VITE_SOCKET_URL`)*

---

### **Bước 7: Update CORS trong Server (Nếu cần)**

Nếu bạn có đặt cấu hình CORS whitelist URL cụ thể bên trong backend, hãy nhớ bổ sung `https://fb.devenir.shop` vào danh sách. Nếu bạn đang lấy origin từ env `FRONTEND_URL` thì đã được xử lý ở Bước 6.

---

### **Bước 8: Cập nhật `docker-compose.prod.yml`**

Để chạy chung server với các app khác (Devenir, Unilish) mà không bị lỗi `port is already allocated`, hãy sửa mapping port ra bên ngoài của Client và Backend thành **5180** và **3080**:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      target: production
    container_name: fb-comment-frontend-prod
    ports:
      - "5180:80"
    restart: always

  backend:
    build:
      context: ./backend
      target: production
    container_name: fb-comment-backend-prod
    ports:
      - "3080:3000"
    env_file:
      - ./backend/.env.production
    environment:
      - NODE_ENV=production
    restart: always
```

---

### **Bước 9: Build & Start Docker Containers**

```bash
cd ~/fb-comment-manager

docker compose -f docker-compose.prod.yml up -d --build

# Verify — tất cả phải Up
docker compose -f docker-compose.prod.yml ps
```

Kết quả mong muốn:

```
NAME                         STATUS
fb-comment-frontend-prod     Up
fb-comment-backend-prod      Up
```

---

## ✅ Kết quả sau khi Deploy

| Service | URL |
|---------|-----|
| 🌐 **Client** | https://fb.devenir.shop |
| 🔌 **API** | https://api-fb.devenir.shop |

DNS Records mới sẽ tự động xuất hiện trong Cloudflare Dashboard cùng với các record của các app khác.

---

## 🔧 Quản lý Hệ thống

### Deploy update (khi có code mới)

```bash
cd ~/fb-comment-manager
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Logs & Debug

```bash
# Docker logs
docker compose -f docker-compose.prod.yml logs -f

# Tunnel logs
sudo journalctl -u cloudflared-fb-comment -f --no-pager
```

### Restart

```bash
# Docker
docker compose -f docker-compose.prod.yml restart

# Tunnel
sudo systemctl restart cloudflared-fb-comment
```

---

## 🔄 Auto-start sau khi Server reboot

```bash
sudo systemctl enable docker
sudo systemctl enable cloudflared-fb-comment  # Auto-start fb-comment tunnel
```

---

**Last Updated:** April 2026  
**Author:** FB Comment Manager Development Team
