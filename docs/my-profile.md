# Trang My Profile (`/my-profile`) — hiện trạng & đề xuất

> **Trạng thái: ✅ Đã triển khai đầy đủ** (database + API + frontend). Xem phần [Triển khai](#triển-khai) ngay bên dưới.
> Các phần "Hiện trạng" và "Đề xuất" phía sau là tài liệu lúc khảo sát và thiết kế, giữ lại để tham khảo. Chỗ nào khác với phần Triển khai thì **phần Triển khai là đúng**.

## Triển khai

### Database — `db/002_profile.sql`

Chạy bằng `npm run db:migrate`. Lệnh này chạy lần lượt mọi file `db/*.sql`, và chạy lại nhiều lần vẫn an toàn.

| Bảng | Nội dung |
|---|---|
| `users` *(thêm cột)* | `headline`, `bio`, `roles[]`, `country`, `timezone`, `languages[]`, `availability`, `platforms[]`, `niches[]`, `tools[]`, `starting_price`, `turnaround_hours`, `free_revisions` (`-1` = không giới hạn, `NULL` = chưa chọn), `phone`, `paypal_email`, `avatar_updated_at`, `updated_at` |
| `portfolio_videos` | `user_id`, `url`, `platform`, `niche`, `role`, `result`, `sort_order` |
| `user_avatars` | `user_id`, `data` (bytea), `mime_type`, `updated_at` |

Các bảng con dùng `ON DELETE CASCADE`: đóng tài khoản là xoá luôn video và ảnh.

**Ảnh đại diện lưu trong PostgreSQL**, không dùng Vercel Blob hay Cloudinary. Trình duyệt cắt ảnh thành hình vuông và thu nhỏ về **256×256 JPEG (khoảng 30KB)** trước khi tải lên, nên database không bị phình to và không cần đăng ký thêm dịch vụ nào. Nếu sau này cần ảnh lớn hơn hoặc cho phép upload video, nên chuyển sang dịch vụ lưu file riêng.

### API

Mọi route (trừ `GET /api/avatar/:id`) lấy `userId` từ cookie phiên qua `requireUser()`, không bao giờ nhận `userId` từ body hay URL. Kiểm tra dữ liệu nằm trong `src/lib/profile.js` và dùng chung danh sách lựa chọn `src/data/talentOptions.js` với frontend.

| Method | Endpoint | Việc làm |
|---|---|---|
| `GET` | `/api/profile` | `{ profile, videos }` của chính mình, gồm cả thông tin riêng tư |
| `PATCH` | `/api/profile` | Cập nhật bất kỳ trường nào gửi lên. Trả về `400` kèm `errors` theo từng trường nếu sai. Username và email **không** sửa được ở đây. |
| `PUT` | `/api/profile/videos` | Ghi đè **toàn bộ** danh sách video theo đúng thứ tự gửi lên (tối đa 6, trong một transaction). `platform` được server tự xác định từ link, không tin giá trị client gửi. |
| `POST` | `/api/profile/avatar` | Body là dữ liệu ảnh thô. Tối đa 300KB. Server kiểm tra các byte đầu của file để chắc chắn là PNG/JPEG thật. |
| `DELETE` | `/api/profile/avatar` | Xoá ảnh |
| `GET` | `/api/avatar/:id` | Trả ảnh công khai. URL có `?v=<thời điểm upload>` nên được cache lâu dài. |
| `POST` | `/api/account/password` | `{ currentPassword, newPassword }`, mật khẩu mới tối thiểu 8 ký tự |
| `DELETE` | `/api/account` | `{ password }`. Xoá tài khoản và cookie phiên. |
| `GET` | `/api/me` · `POST /api/login` · `POST /api/register` | Giờ trả thêm `avatarUrl` |

So với đề xuất: video dùng **một** endpoint `PUT` thay cho thêm/sửa/xoá từng video, vì form gửi cả danh sách khi bấm Save. Profile công khai và danh sách talent: xem [talent-directory.md](./talent-directory.md).

### Frontend

- `TalentProfile.jsx` gọi `GET /api/profile` **mỗi lần mở trang**, nên đăng xuất rồi đăng nhập lại (kể cả trên máy khác) vẫn thấy đúng dữ liệu đã lưu.
- **Save Profile** gửi `PATCH /api/profile` rồi `PUT /api/profile/videos`, sau đó hiện "Saved." hoặc lỗi trả về từ server.
- **Ảnh đại diện** được tải lên ngay khi chọn ảnh (không cần bấm Save). Avatar ở header trang chủ và header dashboard đổi theo ngay.
- `authStore` giờ lưu `user` (`displayName`, `avatarUrl`, ...) thay vì chỉ cờ đăng nhập. Dùng `useCurrentUser()` để đọc thông tin này.
- **Change password** và **Close account** đã gọi API thật. Close account hỏi xác nhận trước, rồi đăng xuất và về trang chủ.

### Đã kiểm tra

- Toàn bộ API được test bằng curl, gồm cả các trường hợp lỗi: sai lựa chọn, vượt giới hạn, link video lạ, file giả làm ảnh, chưa đăng nhập.
- Một kịch bản chạy trên trình duyệt Edge thật: đăng ký → điền đủ profile, upload ảnh, thêm 3 video → Save (10/10) → đăng xuất → đăng nhập lại → mọi dữ liệu hiện đúng → đổi mật khẩu → đóng tài khoản.

### Còn lại

- Cookie JWT không thu hồi được: đổi mật khẩu không đăng xuất các thiết bị khác.
- Form Join chưa yêu cầu mật khẩu tối thiểu 8 ký tự như form đổi mật khẩu.
- Profile công khai `/freelancers/{username}` và danh sách `/freelancers` đã làm, xem [talent-directory.md](./talent-directory.md). Mọi tài khoản đều được hiện, profile hoàn chỉnh chỉ được xếp lên đầu.

- Route: `src/app/(dashboard)/my-profile/page.jsx` (đã được `src/proxy.js` chặn, phải đăng nhập mới vào được)
- Nội dung trang: `src/components/dashboard/section/MyProfileInfo.jsx`, gồm 7 khối:

| # | Khối | File | Số trường nhập | Lưu backend? |
|---|---|---|---|---|
| 1 | Profile Details | `ProfileDetails.jsx` | 14 | ❌ |
| 2 | Skills | `Skill.jsx` | 6 | ❌ |
| 3 | Education | `Education.jsx` | 0 (chỉ có dữ liệu mẫu cố định) | ❌ |
| 4 | Work & Experience | `WorkExperience.jsx` | 0 (chỉ có dữ liệu mẫu cố định) | ❌ |
| 5 | Awards | `Award.jsx` | 0 (chỉ có dữ liệu mẫu cố định) | ❌ |
| 6 | Change password | `ChangePassword.jsx` | 3 | ❌ |
| 7 | Close account | `ConfirmPassword.jsx` | 1 | ❌ |
| | **Tổng** | | **24 trường hiện có** | **0 trường được lưu** |

Education, Work & Experience và Awards hiện chưa có ô nhập nào.

👉 Đề xuất **thu gọn còn 14 trường** cho phù hợp với nền tảng thuê người làm video ngắn: xem phần [Đề xuất](#đề-xuất-profile-cho-talent-làm-video-ngắn) ở cuối file.

---

## 1. Profile Details — 14 trường

| # | Trường | Loại | Lựa chọn hiện có | Ghi chú |
|---|---|---|---|---|
| 1 | Ảnh đại diện | Upload file `.png/.jpg/.jpeg` | — | Chỉ xem trước bằng `URL.createObjectURL`, không upload đi đâu. Ghi "Max 1MB" nhưng code không kiểm tra. Ảnh mặc định `/images/team/fl-1.png`. |
| 2 | Username | text | — | Trùng với `users.username` đã có trong DB nhưng **không hiển thị sẵn** giá trị đó |
| 3 | Email Address | email | — | Trùng với `users.email`, cũng không hiển thị sẵn |
| 4 | Phone Number | text | — | |
| 5 | Tagline | text | — | |
| 6 | Hourly Rate | select | $50 · $60 · $70 · $80 · $90 · $100 | |
| 7 | Gender | select | Male · Female · Other | |
| 8 | Specialization | select | Male · Female · Other | ⚠️ **Lỗi template:** danh sách bị chép từ Gender |
| 9 | Type | select | Type 1 · Type 2 · Type 3 | Giá trị mẫu, chưa rõ ý nghĩa |
| 10 | Country | select | US · Canada · UK · Australia · Germany · Japan | Không có Việt Nam |
| 11 | City | select | New York · Toronto · London · Sydney · Berlin · Tokyo | Không phụ thuộc vào Country đã chọn |
| 12 | Language | select | English · French · German · Japanese | Chỉ chọn được 1 ngôn ngữ |
| 13 | Languages Level | select | Beginner · Intermediate · Advanced · Fluent | |
| 14 | Introduce Yourself | textarea | — | |

**Nút Save:** là `<Link href="/contact">`. Bấm vào chỉ **chuyển sang trang Contact**, không gửi dữ liệu. Các ô text không gắn với state nào, còn các ô select chỉ lưu trong state của component nên mất khi tải lại trang.

Display Name (đã nhập lúc Join, lưu trong `users.display_name`) **không có** trên trang này, nên người dùng không sửa được.

## 2. Skills — 6 trường

| Trường | Lựa chọn | Giá trị mặc định |
|---|---|---|
| Skills 1 / Point | Designer, UI/UX / 80, 90 | Designer / 80 |
| Skills 2 / Point | Developer, Programmer / 70, 80 | Developer / 70 |
| Skills 3 / Point | Video Editor, Programmer / 75, 80 | Video Editor / 75 |

- Cố định đúng 3 kỹ năng, không thêm hay bớt được. Mỗi kỹ năng chỉ có 2 lựa chọn.
- Nút **Save** cũng là link sang `/contact`.

## 3–5. Education · Work & Experience · Awards — 0 trường

Ba khối có cùng cấu trúc: hiển thị 2 mục **viết cứng trong code**, ví dụ:

| Khối | Mục mẫu |
|---|---|
| Education | "Bachlors in Fine Arts – Modern College (2012–2014)", "Computer Science – Harvartd University (2008–2012)" |
| Work & Experience | "UX Designer – Dropbox", "Art Director – amazon" |
| Awards | "UI UX Design – Udemy", "App Design – Google" |

- Các nút **Add**, **Edit** (bút chì), **Delete** (thùng rác) và **Save** đều là thẻ `<a>` không có xử lý, bấm không có tác dụng.
- Chữ "Add Aducation" bị sai chính tả, và tên trong dữ liệu mẫu cũng sai ("Bachlors", "Harvartd").
- Cả 3 khối dùng chung `id="edit"` / `id="delete"`, nên trên trang có 6 phần tử trùng `id`. Tooltip có thể hiện sai chỗ.

## 6. Change password — 3 trường

| Trường | Loại input |
|---|---|
| Old Password | `text` ⚠️ không ẩn ký tự |
| New Password | `text` ⚠️ |
| Confirm New Password | `text` ⚠️ |

Nút **Change Password** là link sang `/contact`.

## 7. Close account — 1 trường

| Trường | Loại input |
|---|---|
| Enter Password | `text` ⚠️ |

- ⚠️ Tiêu đề khối ghi **"Change password"** và nút ghi **"Change Password"**, dù chức năng thật là đóng tài khoản. Dễ khiến người dùng hiểu nhầm.
- Câu cảnh báo nhắc tới "5 courses", là nội dung thừa từ template khác.
- Nút cũng là link sang `/contact`.

---

## Tóm tắt các vấn đề

1. **Không có gì được lưu.** Không có API nào cho profile. Bảng `users` chỉ có `display_name`, `username`, `email`, `password_hash`.
2. **Không hiển thị dữ liệu thật.** Username và Email không được điền sẵn từ tài khoản đang đăng nhập.
3. Các nút **Save** đều dẫn sang `/contact`, nên người dùng tưởng đã lưu nhưng thực ra không.
4. Ô mật khẩu ở 2 khối cuối dùng `type="text"`.
5. Lỗi nội dung của template: Specialization lấy nhầm danh sách của Gender; tiêu đề và nút của khối Close account bị ghi sai; một số lỗi chính tả.
6. Ảnh đại diện chỉ xem trước trên máy, còn sót `console.log(event)` trong `handleImageChange`.

---

## Đề xuất: profile cho talent làm video ngắn

ShortWorks chỉ tập trung vào việc thuê người làm **video ngắn** (TikTok, Reels, Shorts). Profile nên trả lời được 4 câu hỏi của người thuê trong khoảng 30 giây:

1. Video người này làm **có đẹp không?** → Portfolio
2. Có **hợp ngách** của tôi không? → Nền tảng, Ngách, Vai trò
3. **Giá** bao nhiêu? → Giá khởi điểm
4. Giao **nhanh hay chậm**? → Thời gian giao, Trạng thái nhận việc

Kết quả: **14 trường, trong đó 10 trường bắt buộc (\*)**, giảm từ 24 trường của template.

### Các trường người dùng điền

#### A. Thẻ nhận diện (phần đầu profile)

| # | Trường | Bắt buộc | Kiểu nhập | Ví dụ | Vì sao cần |
|---|---|---|---|---|---|
| 1 | Ảnh đại diện | \* | Upload ≤ 1MB, png/jpg | | Tạo cảm giác tin cậy |
| 2 | Display Name | \* | text | Kelvin Trinh | Đã có từ lúc Join |
| 3 | Headline | \* | text, tối đa 70 ký tự | "TikTok editor cho thương hiệu F&B, tăng retention" | Thay cho Tagline, là câu chào hàng 1 dòng |
| 4 | Vai trò chính | \* | chọn 1–3 | Video Editor · UGC Creator · Scriptwriter · Motion Designer | Để lọc và tìm kiếm |
| 5 | Quốc gia + múi giờ | \* | 2 select | Việt Nam · GMT+7 | Biết giờ làm việc và giờ có thể liên lạc |
| 6 | Ngôn ngữ | | chọn nhiều | Tiếng Việt, English | Quan trọng với UGC hoặc video có lời thoại |
| 7 | Trạng thái nhận việc | | 3 lựa chọn | 🟢 Đang nhận việc · 🟡 Bận · ⚪ Tạm nghỉ | Người thuê không phải nhắn hỏi |

#### B. Portfolio \* — phần quan trọng nhất

| # | Trường | Bắt buộc | Ghi chú |
|---|---|---|---|
| 8 | Video mẫu | \* | **Tối thiểu 3, tối đa 6 video.** Mỗi video gồm các thông tin bên dưới. |

Mỗi video:

| Thông tin | Bắt buộc | Ghi chú |
|---|---|---|
| Link video | \* | Chỉ nhận link TikTok, Instagram Reels, YouTube Shorts (hoặc upload trực tiếp ở giai đoạn sau). Hiển thị dạng khung dọc 9:16. |
| Ngách | \* | Chọn 1 ngách trong danh sách ngách |
| Vai trò trong video | | Dựng · Quay · Viết kịch bản · Diễn (UGC) · Motion |
| Số view / kết quả | | Ví dụ "1,2M views" hoặc "CTR 4%". Đây là thông tin người dùng tự khai. |

#### C. Chuyên môn

| # | Trường | Bắt buộc | Lựa chọn |
|---|---|---|---|
| 9 | Nền tảng | \* | TikTok · Instagram Reels · YouTube Shorts · Facebook Reels |
| 10 | Ngách | \* | Tối đa 5: Beauty · F&B · Tech · Gaming · Education · Fashion · Real estate · Travel · Fitness · Finance |
| 11 | Phần mềm | | CapCut · Premiere Pro · After Effects · DaVinci Resolve · Final Cut Pro · Canva |

#### D. Giá & giao hàng

| # | Trường | Bắt buộc | Ví dụ |
|---|---|---|---|
| 12 | Giá khởi điểm / video | \* | Từ $25 / video dưới 60 giây (đơn vị USD vì thanh toán qua PayPal) |
| 13 | Thời gian giao | \* | 24 giờ · 48 giờ · 3 ngày · 5 ngày · 7 ngày |
| 14 | Số lần sửa miễn phí | | 0 · 1 · 2 · 3 · Không giới hạn |

#### E. Giới thiệu ngắn
Tối đa 300 ký tự, gộp chung vào form của mục A. Ngắn để người thuê đọc lướt được. Không tính vào 14 trường vì thay cho "Introduce Yourself" đã có.

### Do hệ thống tự hiển thị — người dùng không phải điền

| Thông tin | Nguồn (sẽ có khi làm tính năng thuê và đánh giá) |
|---|---|
| Điểm đánh giá ⭐ và số review | Bảng `reviews` |
| Số job đã hoàn thành | Bảng `orders` / `jobs` |
| Thời gian phản hồi trung bình | Tin nhắn |
| Ngày tham gia | `users.created_at` (đã có) |

Đây là những thông tin người thuê tin hơn so với lời tự giới thiệu.

### Thông tin riêng tư — không hiện công khai

| Trường | Ghi chú |
|---|---|
| Email | Đã có. Dùng để đăng nhập và nhận thông báo. |
| Số điện thoại | Không bắt buộc |
| Email PayPal | Dùng để nhận tiền. Bắt buộc trước khi nhận job đầu tiên, không bắt buộc lúc tạo profile. |

### So với trang hiện tại

| Trường hiện có | Đề xuất | Lý do |
|---|---|---|
| Avatar | ✅ Giữ | |
| Username, Email, Phone | ✅ Giữ (Email, Phone thành thông tin riêng tư) | |
| Tagline | 🔄 Đổi thành **Headline** (≤ 70 ký tự) | |
| Introduce Yourself | 🔄 Đổi thành **Giới thiệu ngắn** (≤ 300 ký tự) | |
| Language + Languages Level | 🔄 **Ngôn ngữ** cho chọn nhiều, bỏ mức độ | Ít ảnh hưởng tới quyết định thuê |
| Country | 🔄 Thêm **múi giờ** | |
| Hourly Rate | 🔄 Đổi thành **giá theo video** | Loại việc này thường tính tiền theo sản phẩm |
| Type, Specialization | 🔄 Thay bằng **Vai trò chính** + **Ngách** | Danh sách hiện tại vô nghĩa hoặc sai |
| Work & Experience | 🔄 Thay bằng **Portfolio** | Video đã làm thuyết phục hơn mô tả |
| Gender | ❌ Bỏ | Không ảnh hưởng tới việc chọn người, và dễ dẫn tới phân biệt đối xử |
| City | ❌ Bỏ | Quốc gia và múi giờ là đủ |
| Skills chấm điểm % | ❌ Bỏ | Người thuê không tin điểm tự chấm |
| Education | ❌ Bỏ | Không liên quan đến việc thuê người làm video ngắn |
| Awards | ❌ Bỏ | Nếu có, ghi vào phần giới thiệu ngắn |
| Change password, Close account | 📦 Chuyển sang trang **Settings** riêng | Không phải thông tin profile |
| *(chưa có)* | ➕ Thêm **Nền tảng, Phần mềm, Thời gian giao, Số lần sửa, Trạng thái nhận việc, Email PayPal** | |

---

## Database đề xuất

Thêm cột vào bảng `users` cho các trường chỉ có một giá trị. Các trường chọn nhiều dùng **mảng của PostgreSQL** (`TEXT[]`), để lọc nhanh mà không cần thêm nhiều bảng phụ. Portfolio có nhiều thông tin cho mỗi video nên tách thành bảng riêng.

```sql
ALTER TABLE users
  ADD COLUMN avatar_url       TEXT,
  ADD COLUMN headline         VARCHAR(70),
  ADD COLUMN bio              VARCHAR(300),
  ADD COLUMN roles            TEXT[]  NOT NULL DEFAULT '{}',   -- 1–3
  ADD COLUMN country          VARCHAR(2),                      -- mã ISO, ví dụ 'VN'
  ADD COLUMN timezone         VARCHAR(50),                     -- ví dụ 'Asia/Ho_Chi_Minh'
  ADD COLUMN languages        TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN availability     VARCHAR(20) NOT NULL DEFAULT 'available', -- available | busy | away
  ADD COLUMN platforms        TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN niches           TEXT[]  NOT NULL DEFAULT '{}',   -- tối đa 5
  ADD COLUMN tools            TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN starting_price   NUMERIC(10, 2),                  -- USD / video
  ADD COLUMN turnaround_hours INTEGER,                         -- 24, 48, 72, 120, 168
  ADD COLUMN free_revisions   INTEGER,                         -- NULL = không giới hạn
  ADD COLUMN phone            VARCHAR(30),                     -- riêng tư
  ADD COLUMN paypal_email     VARCHAR(255);                    -- riêng tư

CREATE TABLE portfolio_videos (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        TEXT        NOT NULL,
    platform   VARCHAR(20) NOT NULL,  -- tiktok | reels | shorts | upload
    niche      VARCHAR(30) NOT NULL,
    role       VARCHAR(30),
    result     VARCHAR(60),           -- "1,2M views", tự khai
    sort_order INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lọc talent theo ngách/nền tảng ở trang tìm kiếm
CREATE INDEX users_niches_idx    ON users USING GIN (niches);
CREATE INDEX users_platforms_idx ON users USING GIN (platforms);
```

- **Danh sách lựa chọn** (vai trò, nền tảng, ngách, phần mềm, ngôn ngữ) đặt trong một file hằng số dùng chung, ví dụ `src/data/talentOptions.js`. Frontend dùng file này để hiển thị lựa chọn, API dùng nó để kiểm tra giá trị gửi lên hợp lệ.
- `ON DELETE CASCADE`: khi đóng tài khoản, video portfolio tự bị xoá theo.

## API đề xuất

Mọi route sửa dữ liệu đều phải gọi `getSession()` để lấy `userId`. **Không bao giờ** nhận `userId` từ body hay URL, vì người dùng chỉ được sửa profile của chính mình.

| Method | Endpoint | Việc làm |
|---|---|---|
| `GET` | `/api/profile` | Profile của chính mình, gồm cả thông tin riêng tư, để điền sẵn vào form |
| `PATCH` | `/api/profile` | Cập nhật mục A, C, D, E. Đổi username/email thì kiểm tra trùng như form Join. |
| `GET` | `/api/profile/videos` | Danh sách video portfolio |
| `POST` | `/api/profile/videos` | Thêm video. Chặn nếu đã đủ 6. |
| `PATCH` | `/api/profile/videos/:id` | Sửa thông tin hoặc thứ tự của một video |
| `DELETE` | `/api/profile/videos/:id` | Xoá video. Cảnh báo nếu còn dưới 3 video. |
| `POST` | `/api/profile/avatar` | Upload ảnh đại diện |
| `GET` | `/api/talents/:username` | **Profile công khai** cho người thuê xem. Không trả email, phone, paypal_email. |
| `POST` | `/api/account/password` | Đổi mật khẩu (trang Settings) |
| `DELETE` | `/api/account` | Đóng tài khoản (trang Settings) |

### Kiểm tra dữ liệu ở server

| Trường | Quy tắc |
|---|---|
| Headline | 1–70 ký tự |
| Giới thiệu ngắn | ≤ 300 ký tự |
| Vai trò | 1–3 giá trị, phải nằm trong danh sách |
| Ngách | 1–5 giá trị, phải nằm trong danh sách |
| Nền tảng | ≥ 1 giá trị, phải nằm trong danh sách |
| Giá khởi điểm | > 0 |
| Link video | Phải thuộc domain `tiktok.com`, `instagram.com`, `youtube.com`, `youtu.be`, `facebook.com` hoặc `fb.watch`. Dùng lại `parseVideoUrl()` trong `src/components/dashboard/profile/videoUrl.js`. |
| Avatar | ≤ 1MB, đúng định dạng png/jpg |

### "Profile hoàn chỉnh"

Chỉ hiển thị talent trong trang tìm kiếm khi đã điền đủ **10 mục bắt buộc** (trong đó có **≥ 3 video**). Thanh tiến độ "Profile completion x/10" đã có ở đầu trang My Profile. Danh sách 10 mục nằm trong hàm `requiredChecks()` của `TalentProfile.jsx`, và backend nên dùng đúng danh sách này.

### Ảnh đại diện (và video upload sau này)

Vercel không lưu file lâu dài: file ghi lên server sẽ mất sau mỗi lần deploy. Còn lưu ảnh thẳng vào PostgreSQL thì làm database phình to nhanh. Nên dùng một dịch vụ lưu file riêng, ví dụ **Vercel Blob** hoặc **Cloudinary**, rồi chỉ lưu URL vào `users.avatar_url`. Giai đoạn đầu, portfolio chỉ nhận **link** video nên chưa cần lưu file video.

## Thứ tự làm gợi ý

1. **Thông tin cơ bản + giá** (mục A trừ avatar, C, D, E): migration database, `GET`/`PATCH /api/profile`, viết lại form trên `/my-profile` với dữ liệu thật.
2. **Portfolio**: bảng `portfolio_videos`, API, giao diện thêm/sửa/xoá và xem trước video dạng 9:16.
3. **Ảnh đại diện**: chọn Vercel Blob hoặc Cloudinary trước.
4. **Trang Settings**: chuyển Change password và Close account sang đây, rồi làm backend cho hai chức năng này.
5. **Profile công khai** `/freelancers/:username` và thanh tiến độ "Profile hoàn chỉnh".
6. Xoá các khối không dùng nữa: Skills, Education, Work & Experience, Awards.

Sửa kèm trong lúc làm: ô mật khẩu dùng `type="password"`, bỏ `id` trùng, bỏ `console.log`.
