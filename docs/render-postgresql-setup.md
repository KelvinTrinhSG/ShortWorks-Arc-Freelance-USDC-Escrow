# Hướng dẫn tạo PostgreSQL database trên Render

Tài liệu này hướng dẫn tạo database PostgreSQL trên [Render](https://render.com), tạo bảng người dùng cho tính năng Sign in / Join, và viết backend bằng **Route Handler của Next.js** để kết nối tới database.

> **Vì sao dùng PostgreSQL mà không dùng SQL Server (Microsoft)?** Render chỉ có sẵn database PostgreSQL do Render tự quản lý. Muốn chạy SQL Server trên Render thì phải tự dựng bằng Docker, tốn tiền hơn và phải tự lo backup.

## Kiến trúc

```
Trình duyệt ──► Next.js trên Vercel
                 ├─ Giao diện (/login, /register, ...)
                 └─ Backend: Route Handler (/api/register, /api/login)
                        │  DATABASE_URL (External URL, bật SSL)
                        ▼
                 PostgreSQL trên Render
```

- **Render chỉ dùng cho database.** Không cần tạo Web Service hay backend riêng.
- Backend nằm ngay trong dự án Next.js, ở thư mục `src/app/api/`. Code trong đó chạy phía server, trình duyệt không thấy được, và được deploy cùng frontend lên Vercel.
- Frontend gọi API cùng domain (`fetch("/api/...")`) nên không phải cấu hình CORS.

---

## Bước 1 — Tạo database

1. Đăng nhập https://dashboard.render.com.
2. Bấm **New +** → **Postgres**.
3. Điền thông tin:

   | Trường | Giá trị gợi ý |
   |---|---|
   | Name | `shortworks-db` |
   | Database | `shortworks` |
   | User | `shortworks` |
   | Region | **Singapore**, gần người dùng Việt Nam. Ở Bước 6 sẽ đặt Function Region của Vercel ở cùng khu vực. |
   | PostgreSQL Version | Bản mới nhất mặc định |
   | Plan | **Free** để thử nghiệm, gói trả phí khi chạy thật |

4. Bấm **Create Database** và chờ trạng thái chuyển thành **Available** (khoảng 1–3 phút).

> ⚠️ **Gói Free:** database **hết hạn sau 30 ngày**, sau đó bị xoá nếu không nâng cấp. Gói này cũng không có backup. Chỉ nên dùng để phát triển, không dùng cho dữ liệu thật.

## Bước 2 — Lấy chuỗi kết nối

Vào database vừa tạo, bấm **Connect** (góc trên bên phải). Render đưa ra 3 loại:

| Loại | Dùng cho dự án này? |
|---|---|
| **Internal Database URL** | ❌ Chỉ dùng được cho service chạy trên Render. Vercel nằm ngoài Render nên không dùng được. |
| **External Database URL** | ✅ **Dùng loại này** cho `DATABASE_URL`, cả ở máy local lẫn trên Vercel. |
| **PSQL Command** | Lệnh `psql` dán vào terminal là vào được ngay, dùng ở Bước 3. |

Định dạng của External URL:

```
postgresql://USER:PASSWORD@HOST.singapore-postgres.render.com/DATABASE
```

> 🔒 Chuỗi này **chứa mật khẩu**. Không commit lên git. Chỉ để trong `.env.local` (file này đã có trong `.gitignore`) và phần Environment Variables trên Vercel.

**Access Control (tab Info):** để nguyên mặc định là cho phép mọi IP (`0.0.0.0/0`). IP của Vercel thay đổi liên tục nên không giới hạn được. Database vẫn được bảo vệ bằng mật khẩu và SSL.

## Bước 3 — Tạo bảng

Kết nối bằng một trong các cách sau:

- **psql:** dán lệnh **PSQL Command** vào terminal (cần cài PostgreSQL client trước).
- **Công cụ có giao diện** (DBeaver, pgAdmin, TablePlus): dùng External URL và bật **SSL = require**.

Chạy đoạn SQL sau (có sẵn trong file [`db/001_users.sql`](../db/001_users.sql)). Các cột khớp với form Join hiện có (Display Name, Username, Email, Password):

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    display_name  VARCHAR(100) NOT NULL,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

> Không bao giờ lưu mật khẩu dạng chữ thường. Chỉ lưu bản đã băm (hash) bằng `bcrypt`, như phần backend bên dưới.

Kiểm tra lại: gõ `\dt` trong psql, phải thấy bảng `users`.

## Bước 4 — Viết backend trong Next.js

### 4.1. Cài thư viện

```bash
npm install pg bcryptjs
```

### 4.2. Biến môi trường ở máy local

Tạo file `.env.local` ở thư mục gốc dự án:

```
DATABASE_URL=<External Database URL>
```

Biến này **không có** tiền tố `NEXT_PUBLIC_`, nên chỉ code phía server đọc được và nó không bao giờ bị gửi xuống trình duyệt. Sau khi tạo file, khởi động lại `npm run dev`.

### 4.3. Kết nối database — `src/lib/db.js`

```js
import pg from "pg";

// Dùng chung một pool cho mọi request. Giữ `max` nhỏ vì Vercel có thể mở
// nhiều instance cùng lúc, mà gói Free của Render giới hạn số kết nối.
const globalForPg = globalThis;

const pool =
  globalForPg.pgPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // External URL bắt buộc dùng SSL
    max: 3,
  });

// Tránh tạo pool mới mỗi lần hot-reload khi chạy `npm run dev`.
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export default pool;
```

### 4.4. API đăng ký — `src/app/api/register/route.js`

```js
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(request) {
  const { displayName, username, email, password } = await request.json();

  if (!displayName || !username || !email || !password) {
    return Response.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (display_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, display_name, username, email`,
      [displayName, username, email, hash],
    );
    return Response.json(rows[0], { status: 201 });
  } catch (err) {
    // 23505 = vi phạm UNIQUE (email hoặc username đã có)
    if (err.code === "23505") {
      return Response.json(
        { error: "Email hoặc username đã tồn tại" },
        { status: 409 },
      );
    }
    throw err;
  }
}
```

### 4.5. API đăng nhập — `src/app/api/login/route.js`

```js
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(request) {
  const { email, password } = await request.json();

  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json(
      { error: "Sai email hoặc mật khẩu" },
      { status: 401 },
    );
  }

  return Response.json({
    id: user.id,
    displayName: user.display_name,
    username: user.username,
    email: user.email,
  });
}
```

### 4.6. Kiểm tra kết nối — `src/app/api/health/route.js`

```js
import pool from "@/lib/db";

export async function GET() {
  await pool.query("SELECT 1");
  return Response.json({ ok: true });
}
```

Chạy `npm run dev` rồi kiểm tra:

```bash
curl http://localhost:3000/api/health
# {"ok":true}

curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test","username":"test","email":"test@example.com","password":"123456"}'
```

> Đây là bản tối thiểu để kết nối thông suốt từ đầu đến cuối. Muốn chạy thật cần thêm phiên đăng nhập (JWT hoặc cookie httpOnly), giới hạn số lần đăng nhập sai, và kiểm tra định dạng email/mật khẩu.

## Bước 5 — Nối form `/login` và `/register` với API

Hiện tại hai form chỉ là giao diện. Nút submit (`LoginButton`) chỉ đặt cờ `isLoggedIn = true` mà không gửi dữ liệu đi đâu (xem [sign-in-join.md](./sign-in-join.md)). Cần sửa như sau:

1. Chuyển form thành client component (`"use client"`) và dùng `useState` cho các ô nhập.
2. Đổi `type="text"` thành `type="password"` cho ô mật khẩu.
3. Khi submit, gọi API cùng domain:

   ```js
   const res = await fetch("/api/register", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ displayName, username, email, password }),
   });
   const data = await res.json();

   if (!res.ok) {
     setError(data.error);
     return;
   }

   login(); // từ authStore, như hiện tại
   router.push("/");
   ```

4. Trang `/login` làm tương tự với `/api/login`, gửi `{ email, password }`.

## Bước 6 — Deploy lên Vercel

1. **Thêm biến môi trường:** Vercel → Project → **Settings → Environment Variables**. Chọn cả 3 môi trường Production, Preview, Development:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | External Database URL |
   | `SESSION_SECRET` | Chuỗi ngẫu nhiên dùng để ký cookie đăng nhập. Tạo bằng `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Nên tạo giá trị mới cho production, không dùng lại giá trị ở máy local. |
2. **Đặt Function Region gần database:** **Settings → Functions → Function Region** → chọn **Singapore (`sin1`)**. Mặc định Vercel chạy function ở Mỹ, nên mỗi truy vấn sẽ phải đi vòng Mỹ → Singapore → Mỹ và chậm hơn nhiều.
3. **Redeploy** để áp dụng biến môi trường mới.
4. Mở `https://<domain>.vercel.app/api/health`, phải thấy `{"ok":true}`.

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân / Cách sửa |
|---|---|
| `getaddrinfo ENOTFOUND dpg-...` | Đang dùng **Internal URL**. Đổi sang External URL. |
| `SSL/TLS required` / `no pg_hba.conf entry` | Chưa bật SSL. Kiểm tra `ssl` trong `src/lib/db.js`. |
| `SESSION_SECRET is not set` | Thiếu `SESSION_SECRET` trong `.env.local` hoặc trên Vercel. |
| `DATABASE_URL` bị `undefined` ở local | Chưa tạo `.env.local`, hoặc chưa khởi động lại `npm run dev` sau khi tạo. |
| Chạy được ở local nhưng lỗi 500 trên Vercel | Chưa thêm `DATABASE_URL` trên Vercel, hoặc thêm xong chưa redeploy. |
| Kết nối bị từ chối | Access Control trên Render đang giới hạn IP. Để lại `0.0.0.0/0`. |
| `too many clients already` | Có quá nhiều kết nối mở cùng lúc. Giảm `max` trong pool. |
| `relation "users" does not exist` | Chưa chạy SQL ở Bước 3, hoặc đang kết nối nhầm database. |
| API phản hồi chậm | Function Region của Vercel khác region database (xem Bước 6). |
| Database biến mất | Database gói Free đã hết hạn 30 ngày. |
