# Hello World — SvelteKit starter

Starter project dùng SvelteKit, Tailwind CSS 4 và Drizzle ORM.

## Trạng thái triển khai

Ứng dụng hiện bao gồm authentication, PostgreSQL persistence, Note permission, sharing, audit/revision, recycle bin, rich text editor, block attribution, local lexical RAG, AI summary/local chat/global search và Docker healthcheck.

## Triển khai Docker từng bước

Hướng dẫn dưới đây dành cho Windows PowerShell. Docker Desktop phải đang chạy.

### 1. Chuẩn bị mã nguồn và Docker

```powershell
git clone https://github.com/linhlgdev1124007/note_ai.git
cd note_ai
docker compose version
```

### 2. Đăng nhập Google Cloud cho tính năng AI

Ứng dụng gọi Gemini qua Vertex AI bằng Application Default Credentials (ADC). Cài Google Cloud CLI, đăng nhập tài khoản có quyền trên Google Cloud project, sau đó tạo ADC:

```powershell
gcloud auth login
gcloud auth application-default login
gcloud auth application-default print-access-token
```

Lệnh cuối phải trả về access token. Tài khoản cần có role `roles/aiplatform.user` trên project để gọi model. Nếu Vertex AI API chưa bật, owner/admin của project phải chạy:

```powershell
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

### 3. Tạo `.env`

Sao chép mẫu và thay các giá trị phù hợp. Không commit file `.env` hoặc file ADC vào Git.

```powershell
Copy-Item .env.example .env
notepad .env
```

Ví dụ cấu hình Vertex AI trên Windows:

```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_ADC_HOST_PATH=C:/Users/your-user/AppData/Roaming/gcloud/application_default_credentials.json
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
```

`GOOGLE_ADC_HOST_PATH` là đường dẫn trên máy host. Docker sẽ mount file này vào container ở chế độ chỉ đọc.

### 4. Build và chạy services

```powershell
docker compose up -d --build
docker compose ps
```

Ba service cần chạy là `app`, `db` và `realtime`. Đợi `app` có trạng thái `healthy`, sau đó kiểm tra:

```powershell
curl.exe http://localhost:3000/api/health
```

Kết quả mong đợi:

```json
{"status":"ok","database":"ok"}
```

Mở `http://localhost:3000/login`. Tài khoản development mặc định là `admin / admin123`; hãy đổi hoặc xóa tài khoản này trước production.

### 5. Kiểm tra ADC trong container (tuỳ chọn)

Nếu AI báo lỗi credential, kiểm tra file ADC được mount:

```powershell
docker compose exec app sh -lc 'test -r "$GOOGLE_APPLICATION_CREDENTIALS" && echo ADC-mounted'
```

Sau khi chạy lại `gcloud auth application-default login`, recreate app để Docker nhận file ADC mới:

```powershell
docker compose up -d --no-build --force-recreate app
```

### 6. Cập nhật phiên bản mới

```powershell
git pull origin main
docker compose up -d --build
docker compose ps
```

### 7. Dừng hoặc xem log

```powershell
docker compose logs -f app
docker compose down
```

`docker compose down` giữ lại PostgreSQL volume. Chỉ dùng `docker compose down -v` khi bạn muốn xoá toàn bộ dữ liệu database.

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
