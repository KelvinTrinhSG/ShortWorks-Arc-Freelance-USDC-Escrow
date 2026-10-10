# Tính năng Sign in & Join

> Tài khoản được lưu trong PostgreSQL trên Render (xem [render-postgresql-setup.md](./render-postgresql-setup.md)). Mật khẩu được băm (hash) bằng `bcrypt`. Phiên đăng nhập là một **cookie httpOnly `session`** chứa JWT ký bằng `SESSION_SECRET`, hết hạn sau 7 ngày. JavaScript trên trình duyệt không đọc hay sửa được cookie này.

## Tổng quan

| Thành phần | Route / File | Vai trò |
|---|---|---|
| Trang Sign in | `/login` · `src/app/(auth)/login/page.jsx` | Khung trang, chứa `LoginForm` |
| Trang Join | `/register` · `src/app/(auth)/register/page.jsx` | Khung trang, chứa `RegisterForm` |
| Form đăng nhập | `src/components/auth/LoginForm.jsx` | Gọi `POST /api/login` |
| Form đăng ký | `src/components/auth/RegisterForm.jsx` | Gọi `POST /api/register` |
| API đăng nhập | `src/app/api/login/route.js` | Kiểm tra email + mật khẩu với database |
| API đăng ký | `src/app/api/register/route.js` | Tạo user, băm mật khẩu |
| API đăng xuất | `src/app/api/logout/route.js` | Xoá cookie phiên |
| API người dùng hiện tại | `src/app/api/me/route.js` | Trả user đang đăng nhập hoặc `{ user: null }` |
| API kiểm tra | `src/app/api/health/route.js` | Trả `{ ok: true }` nếu kết nối được database |
| Phiên đăng nhập | `src/lib/session.js` | Tạo, đọc, xoá cookie `session` (JWT, thư viện `jose`) |
| Chặn trang | `src/proxy.js` | Khách mở trang dashboard → chuyển về `/login?next=...` |
| Kết nối DB | `src/lib/db.js` | Pool `pg` dùng chung (SSL, `max: 3`) |
| Schema | `db/schema.sql` | Bảng `users` |
| Store | `src/store/authStore.js` | Phản chiếu trạng thái đăng nhập cho UI (lấy từ `/api/me`) |
| Link header (desktop) | `src/components/header/HeaderAuthLinks.jsx` | Hiện "Sign in"/"Join" hoặc avatar + "Dashboard" |
| Link header (mobile) | `src/components/header/SignInLink.jsx` | Hiện "Sign in"/"Join" hoặc "Dashboard" |

## Luồng người dùng

```
Khách ──► Header: [Sign in] [Join]
            │          │
            ▼          ▼
         /login     /register
            │          │
  POST /api/login   POST /api/register
            │          │
       lỗi? ──► hiện thông báo dưới form, ở lại trang
            └────┬─────┘ thành công
                 ▼
   Server đặt cookie httpOnly "session"
   Client: login() → isLoggedIn = true
                 ▼
   router.push(next hoặc "/")
                 ▼
Header: [avatar → /my-profile] [Dashboard → /dashboard]
                 │
     Dashboard ▸ "Logout" → POST /api/logout (xoá cookie), về /login
```

**Chặn trang dashboard:** `src/proxy.js` chạy trước mọi request vào các route trong `src/app/(dashboard)` (`/dashboard`, `/my-profile`, `/saved`, ...). Nếu cookie không có, hết hạn hoặc bị sửa, người dùng bị chuyển về `/login?next=<trang đang mở>`. Đăng nhập xong sẽ quay lại đúng trang đó. `next` chỉ nhận đường dẫn nội bộ bắt đầu bằng `/`, để không bị lợi dụng chuyển hướng sang domain khác.

> Khi thêm route mới vào `(dashboard)`, nhớ thêm route đó vào `matcher` trong `src/proxy.js`.

## API

| Endpoint | Body | Thành công | Lỗi |
|---|---|---|---|
| `POST /api/register` | `{ displayName, username, email, password }` | `201` + `{ id, displayName, username, email }` | `400` thiếu trường · `409` email/username đã tồn tại |
| `POST /api/login` | `{ email, password }` | `200` + `{ id, displayName, username, email }` | `400` thiếu trường · `401` sai email hoặc mật khẩu |
| `POST /api/logout` | — | `{ ok: true }`, xoá cookie | — |
| `GET /api/me` | — | `{ user: {...} }` hoặc `{ user: null }` | — |
| `GET /api/health` | — | `{ ok: true }` | `500` không kết nối được database |

- `register` và `login` đặt cookie phiên ngay khi thành công. Đăng ký xong là đã đăng nhập.
- Email được chuyển về chữ thường trước khi lưu và trước khi tìm, nên `A@x.com` và `a@x.com` được coi là một.
- Username **không phân biệt hoa thường** khi kiểm tra trùng (`KelvinCOD` = `kelvincod`), nhờ unique index trên `LOWER(username)`, nhưng vẫn lưu và hiển thị đúng cách người dùng viết.
- `GET /api/check-availability?username=...&email=...` trả `{ username: true/false, email: true/false }`. Form Join gọi API này 400ms sau khi người dùng ngừng gõ, báo lỗi ngay dưới ô và khoá nút **Create Account** nếu đã có người dùng.
- Mật khẩu không bao giờ được trả về trong response.

## Header

### Desktop — `HeaderAuthLinks`
Dùng trong `Header1` và `Header2`. Nhận 2 prop class để khớp style từng header: `signInClassName`, `joinClassName`.

- **Chưa đăng nhập:**
  - `Sign in` → `/login` (thêm class `ui-active` khi đang ở `/login`)
  - `Join` → `/register`
- **Đã đăng nhập:**
  - Avatar tròn 44×44 (`/images/resource/default-avatar.svg`) → `/my-profile`
  - Nút `Dashboard` (dùng cùng style với `Join`) → `/dashboard`

### Mobile — `SignInLink`
Dùng trong `MobileNavigation1` và `MobileNavigation2`.

- **Chưa đăng nhập:** `Sign in` → `/login`, `Join` → `/register`
- **Đã đăng nhập:** `Dashboard` → `/dashboard`

## Trang Sign in (`/login`)

| Trường | Kiểu input | Ghi chú |
|---|---|---|
| Email Address | `email` | Bắt buộc |
| Password | `password` | Bắt buộc |
| Remember me | checkbox | Mặc định tích, chưa có tác dụng |
| Lost your password? | link | Chưa có `href` |

- Nút **Log In** gọi API. Trong lúc chờ, nút đổi thành "Logging in..." và bị khoá.
- Link "Sign Up!" → `/register`.
- Các nút **Continue Facebook / Google / Apple**: chỉ là giao diện, chưa có xử lý.

## Trang Join (`/register`)

| Trường | Kiểu input |
|---|---|
| Display Name | `text` (bắt buộc) |
| Username | `text` (bắt buộc) |
| Email | `email` (bắt buộc) |
| Password | `password` (bắt buộc) |

- Nút **Create Account** gọi API. Đăng ký thành công thì đăng nhập luôn và chuyển về `/`.
- Link "Log In!" → `/login`.
- Nút mạng xã hội giống trang Sign in, chưa có xử lý.

## Store — `authStore.js`

```js
{ isLoggedIn: false, checked: false, login(), logout() }
```

- **Không còn lưu vào `localStorage`.** Store chỉ phản chiếu cookie phiên để header hiển thị đúng.
- Hook **`useIsLoggedIn()`** gọi `GET /api/me` một lần mỗi lần tải trang. Lần render đầu luôn trả `false` (giống nhau ở server và client nên không bị hydration mismatch), rồi cập nhật khi có kết quả. Vì vậy với người đã đăng nhập, header có thể hiện "Sign in" trong tích tắc rồi mới đổi sang "Dashboard".
- `login()` chỉ cập nhật UI, còn cookie đã được API đặt sẵn. `logout()` gọi `POST /api/logout` để xoá cookie.
- Thông tin user mà API trả về **chưa được lưu** vào store.

## Logout

Mục **Logout** trong menu dashboard (`src/data/dashboard.js`, `path: "/login"`) gọi `logout()` trong:
- `DashboardSidebar.jsx`
- `DashboardNavigation.jsx`
- `DashboardHeader.jsx`

## Hạn chế hiện tại

- `proxy.js` chỉ là lớp chặn đầu tiên. Khi dashboard bắt đầu lấy dữ liệu thật từ database, **mỗi API/Server Component trả dữ liệu riêng tư phải tự gọi `getSession()`** để kiểm tra lại.
- Cookie JWT không thu hồi được trước hạn: đổi mật khẩu không làm các phiên cũ bị đăng xuất. Muốn đăng xuất mọi thiết bị thì phải đổi `SESSION_SECRET`, và việc này đăng xuất tất cả người dùng.
- Người đã đăng nhập vẫn mở được `/login` và `/register`, chưa tự chuyển sang `/dashboard`.
- Chưa giới hạn số lần đăng nhập sai, chưa kiểm tra độ mạnh của mật khẩu hay định dạng username.
- Đăng nhập mạng xã hội, "Remember me", "Lost your password?" chưa hoạt động.
- Chỉ `Header1`, `Header2`, `MobileNavigation1`, `MobileNavigation2` dùng component có nhận biết trạng thái đăng nhập. Các header khác vẫn là link tĩnh của template.

## Kiểm thử nhanh

1. Tạo `.env.local` có `DATABASE_URL` và `SESSION_SECRET`, chạy `npm run dev`.
2. Khi chưa đăng nhập, mở http://localhost:3000/dashboard → bị chuyển về `/login?next=%2Fdashboard`.
3. Mở http://localhost:3000/api/health, phải thấy `{"ok":true}`.
4. Bấm **Join** → điền form → **Create Account** → về trang chủ, header hiện avatar + **Dashboard**. Trong DevTools → Application → Cookies có cookie `session` được đánh dấu HttpOnly.
5. Đăng ký lại bằng cùng email → hiện lỗi "Email or username is already taken."
6. Vào Dashboard → **Logout** → về `/login`. Mở lại `/dashboard` → bị chặn.
7. Đăng nhập bằng mật khẩu sai → hiện "Incorrect email or password." Nhập đúng mật khẩu → quay lại trang đang định mở.
