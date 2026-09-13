# Hello World — SvelteKit starter

Starter project dùng SvelteKit, Tailwind CSS 4 và Drizzle ORM.

## Trạng thái triển khai

Ứng dụng hiện bao gồm authentication, PostgreSQL persistence, Note permission, sharing, audit/revision, recycle bin, rich text editor, block attribution, local lexical RAG, AI summary/local chat/global search và Docker healthcheck.

## Chạy local

```bash
npm install
npm run dev
```

Trong Docker:

```bash
docker compose up -d --build
npm run smoke
```

Mở `http://localhost:3000/login`. Tài khoản development mặc định là `admin / admin123`; hãy đổi hoặc xóa tài khoản này trước production.

SQLite là mặc định (`DATABASE_URL=file:./local.db`). Tạo migration bằng:

```bash
npm run db:generate
npm run db:migrate
```

Để dùng PostgreSQL, đặt `DATABASE_URL` thành chuỗi kết nối PostgreSQL rồi chạy lại `npm run db:generate` và `npm run db:migrate`.

Production HTTPS cần đặt `COOKIE_SECURE=true`. Local HTTP Docker dùng `COOKIE_SECURE=false`.

AI Vertex AI cần `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_MODEL` và Application Default Credentials. Nếu chưa cấu hình, các tính năng AI trả lỗi `AI unavailable` nhưng Note core vẫn hoạt động.

Các lệnh hữu ích:

- `npm run check` — kiểm tra Svelte/TypeScript
- `npm run build` — build production
- `npm run db:push` — đồng bộ schema nhanh trong development
- `npm run smoke` — kiểm tra health, unauthorized request, login và Notes API

Các trang chính:

- `/login` — đăng nhập
- `/` — Note workspace
- `/admin` — quản lý user (ADMIN)
- `/trash` — Recycle Bin
- `/audit` — Audit Q&A
- `/api/health` — healthcheck app/database
