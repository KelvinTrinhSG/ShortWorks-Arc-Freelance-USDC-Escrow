# Thông báo (nút chuông 🔔)

Nút chuông xuất hiện ở 2 nơi, cả hai dùng chung component `src/components/header/NotificationBell.jsx`:

- **Header trang công khai** (Home, Projects, Talents…): nằm bên trái avatar, chỉ hiện khi đã đăng nhập. Gắn trong `HeaderAuthLinks.jsx`, nên mọi trang dùng `Header1`, `Header2` hoặc `Header20` đều có.
- **Header dashboard** (`DashboardHeader.jsx`): thay cho dropdown thông báo giả của template, và hiện cả trên điện thoại.

## Khi nào có thông báo

| Sự kiện | Ai nhận | Nội dung | Bấm vào mở |
|---|---|---|---|
| Người thuê mời freelancer | Freelancer | "{Client} invited you to send a proposal for "{project}"" | `/project-single/{id}` |
| Freelancer từ chối lời mời | Người thuê | "{Freelancer} declined your invitation to "{project}"" | `/project-single/{id}` |
| Freelancer gửi proposal | Người thuê | "{Freelancer} sent a proposal for "{project}"" | `/project-single/{id}` |
| Người thuê Accept | Freelancer | "{Client} accepted your proposal for "{project}"" | `/manage-jobs/{proposalId}` |
| Người thuê Decline | Freelancer | "{Client} declined your proposal for "{project}"" | `/project-single/{id}` |

**Khi sự kiện bị hoàn tác, thông báo cũng bị xoá**, để chuông không báo điều không còn đúng:

- Huỷ lời mời → xoá thông báo "invited".
- Freelancer rút proposal → xoá thông báo "sent a proposal" (qua `proposal_id ON DELETE CASCADE`).
- Undo hoặc đổi quyết định Accept/Decline → thông báo quyết định cũ được thay bằng thông báo mới, hoặc bị xoá nếu trở về `pending`.
- Mời lại người đã mời không tạo thông báo trùng.

Thông báo được ghi ngay trong các hàm của `lib/projects.js` (`createProposal`, `setProposalStatus`) và `lib/invitations.js` (`createInvitation`, `deleteInvitation`). Khi thêm sự kiện mới, chỉ cần viết thêm hàm `notify…` trong `src/lib/notifications.js` và thêm một mục vào `MESSAGES`.

## Đã đọc / chưa đọc

- Số màu đỏ trên chuông là số thông báo chưa đọc. Lớn hơn 9 thì hiện "9+".
- **Mở chuông là mọi thông báo được đánh dấu đã đọc.** Các thông báo mới vẫn được tô nền xanh nhạt cho tới khi đóng chuông.
- Danh sách tải lại khi mở trang, khi quay lại tab và khi mở chuông. Hiện chưa cập nhật theo thời gian thực.
- Mỗi lần hiện 20 thông báo mới nhất.

## Database — `db/007_notifications.sql`

| Cột | Ý nghĩa |
|---|---|
| `user_id` | Người nhận |
| `actor_id` | Người gây ra sự kiện (hiện avatar và tên của người này) |
| `type` | `invited` · `proposal_received` · `proposal_accepted` · `proposal_declined` |
| `project_id`, `proposal_id` | Đối tượng liên quan, `ON DELETE CASCADE` |
| `read_at` | `NULL` = chưa đọc |

Nội dung chữ được ghép lúc đọc từ `type` và tên dự án hiện tại, nên đổi tên dự án thì thông báo cũ cũng đổi theo.

## API — `/api/notifications`

| Method | Việc làm |
|---|---|
| `GET` | `{ notifications: [{ id, text, href, actor, createdAt, read }], unread }` |
| `POST` | Đánh dấu tất cả đã đọc |

Khách chưa đăng nhập nhận 401.

## Đã kiểm tra (curl, tài khoản test đã xoá)

Khách nhận 401 · mời (2 lần) → 1 thông báo · huỷ mời → mất · gửi proposal → người thuê có thông báo · Accept → freelancer có thông báo dẫn tới job · Undo → mất · Decline → có thông báo · mở chuông → `unread` về 0 · rút proposal → thông báo của người thuê mất.

## Chưa làm

- Cập nhật theo thời gian thực (polling hoặc WebSocket), email thông báo.
- Trang xem toàn bộ thông báo. Hiện chỉ có 20 thông báo mới nhất trong chuông.
- Nút thư ✉️ và tim ♡ trong dashboard vẫn là giao diện mẫu.
