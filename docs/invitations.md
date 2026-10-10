# Mời freelancer gửi proposal

Luồng: **chủ dự án** bấm **Find & invite freelancers** trên `/project-single/{id}` → danh sách talent ở **chế độ mời** (`/freelancer-1?invite={id}`) → bấm **Invite to project** trên từng thẻ → **freelancer** thấy lời mời ở `/invitations` và trên trang dự án → gửi proposal như bình thường.

## Database — `db/006_project_invitations.sql`

| Bảng | Cột |
|---|---|
| `project_invitations` | `project_id`, `freelancer_id`, `created_at`. `UNIQUE (project_id, freelancer_id)`: mỗi freelancer chỉ được mời 1 lần cho mỗi dự án. |

- Lời mời **không có cột trạng thái riêng**. Lời mời được tính là đã trả lời khi freelancer đó có proposal trên dự án.
- Xoá dự án hoặc tài khoản thì lời mời cũng bị xoá theo (`ON DELETE CASCADE`).

## API — `/api/projects/{id}/invitations`

| Method | Body | Ai gọi được | Việc làm |
|---|---|---|---|
| `POST` | `{ username }` | Chủ dự án | Mời freelancer. Chỉ mời được khi dự án đang **Open**, nếu không sẽ nhận 409. Mời lại người đã mời không báo lỗi. |
| `DELETE` | `{ username }` | Chủ dự án | Huỷ lời mời |

- Khách nhận 401. Người khác (kể cả freelancer) nhận 403.
- Username không tồn tại, hoặc là tài khoản client, nhận 404.
- Logic nằm trong `src/lib/invitations.js`.

## Chủ dự án

- **Trang dự án, cột phải** (chỉ khi dự án đang Open): nút **Find & invite freelancers**. Dưới nút là dòng "n invited · m sent a proposal".
- Khi chưa có proposal, câu "No proposals yet…" cũng có link mời.
- **Chế độ mời** `/freelancer-1?invite={id}`:
  - Mở ra là thấy **toàn bộ freelancer**, không lọc sẵn. Người thuê tự dùng bộ lọc nếu cần.
  - Banner đổi thành "Invite freelancers to {tên dự án}", có link **← Back to project** và số người đã mời.
  - Mỗi thẻ có nút **Invite to project**. Mời xong nút đổi thành **Invited ✓** kèm **Cancel invite**. Người đã gửi proposal hiện **Proposal received ✓**.
  - Chế độ mời chỉ bật khi người xem là chủ dự án và dự án đang Open. Người khác mở link này chỉ thấy danh sách talent bình thường.
- **Mục "Invited (n)"** nằm trên phần Proposals: avatar, tên (dẫn tới trang talent), headline, và trạng thái "Invited 2 hours ago" hoặc "Sent a proposal ✓".
  - Người chưa gửi proposal có nút **Cancel invite**. Nút hỏi xác nhận trước, rồi xoá lời mời cùng thông báo của freelancer (`components/project/CancelInviteButton.jsx`).
  - Người đã gửi proposal thì không huỷ được nữa.

- **Trang profile `/talents/{username}`** (chỉ khi người xem là người thuê): cột phải có khung **Invite to a project**.
  - Khung liệt kê các dự án đang mở của người thuê, mỗi dự án có nút Invite riêng (Invited ✓ / Cancel invite / Proposal received ✓ / Declined your invite).
  - Mời xong thì chuyển sang trang dự án đó.
  - Nếu người thuê vào từ chế độ mời (`?invite={id}`, do link View Profile trên thẻ gắn thêm), dự án đó được xếp lên đầu và nút cuối trang thành **Back to invite list**.
  - Chưa có dự án nào đang mở: hiện nút **Create Project**.
- **Chỉ mời được freelancer đang "Available for work"** (`users.availability = 'available'`):
  - API trả 409 nếu freelancer đang bận hoặc tạm nghỉ.
  - Thẻ và trang profile hiện nút mờ "Not available for work".
  - Lời mời đã gửi từ trước vẫn giữ nguyên và vẫn huỷ được.

## Freelancer

- **Trang dự án:** nếu được mời mà chưa gửi proposal:
  - Phía trên form hiện khung "{Client} invited you to this project".
  - Dưới nút Send Proposal có nút **Decline invitation**. Nút hỏi xác nhận trước, từ chối xong thì chuyển về `/project-1`. Khi rê chuột vào, nút chuyển sang màu đỏ (class `btn-decline` trong `globals.css`).
  - Người không được mời thì không thấy nút này.
- **Khi Decline** (`POST /api/projects/{id}/invitations/decline`, cột `project_invitations.declined_at`, file `db/008_invitation_declined.sql`):
  - Người thuê nhận thông báo "{Freelancer} declined your invitation to "{project}"".
  - Thông báo "invited" của freelancer bị xoá.
  - Trang dự án của người thuê: dòng của freelancer đó hiện **Declined …** màu đỏ và không còn nút Cancel invite. Dòng tổng kết thêm "· n declined".
  - Thẻ trong chế độ mời hiện "Declined your invite".
  - Trang `/invitations` của freelancer hiện "Declined".
  - Freelancer vẫn gửi được proposal nếu đổi ý. Khi đó trang dự án hiện dòng "You declined this invitation…".
  - API trả 401 cho khách, 403 cho người không được mời, 409 nếu đã từ chối rồi hoặc đã gửi proposal.
  - Người thuê huỷ một lời mời đã bị từ chối thì thông báo "declined" cũng bị xoá.
- **`/invitations`** (menu dashboard, mục **Invitations**, ẩn với client): bảng các dự án đã được mời. Mỗi dòng có tên dự án, người thuê, số video × độ dài, thời điểm mời, ngân sách, hạn chót và nút:
  - **Send proposal** khi dự án còn mở
  - **Proposal sent ✓** khi đã gửi
  - "No longer open" khi dự án đã đóng, đã thuê hoặc quá hạn
- Đầu trang ghi số lời mời đang chờ trả lời.

## File

| File | Vai trò |
|---|---|
| `src/lib/invitations.js` | Truy vấn và ghi lời mời |
| `src/app/api/projects/[id]/invitations/route.js` | API mời và huỷ |
| `src/app/(freelancer)/freelancer-1/page.jsx` | Đọc `?invite=` và kiểm tra quyền chủ dự án |
| `src/components/talent/TalentDirectory.jsx` | Banner chế độ mời, giữ `invite` trên URL |
| `src/components/talent/InviteButton.jsx` | Nút Invite, Invited, Cancel |
| `src/components/talent/TalentCard.jsx` | Prop `action` (ô điều khiển phụ dưới View Profile) |
| `src/app/(project)/project-single/[id]/page.jsx` | Nút mời, mục Invited, khung "invited you" |
| `src/app/(dashboard)/invitations/page.jsx` · `components/dashboard/section/InvitationsInfo.jsx` | Trang Invitations |

> Menu dashboard (`src/data/dashboard.js`) được cắt theo vị trí trong `DashboardSidebar`, `DashboardNavigation` và `DashboardHeader`. Mục Invitations được chèn sau Manage Jobs, nên các đoạn cắt đổi thành `slice(8, 14)` và `slice(14, 16)`. Khi thêm mục mới, phải sửa cả 3 file.

## Đã kiểm tra (curl, với tài khoản test đã xoá sau khi thử)

- Khách nhận 401. Người thuê khác và freelancer nhận 403.
- Mời username của client hoặc username không tồn tại nhận 404. Mời 2 lần không lỗi.
- Trang dự án của chủ: có nút mời, có "Invited (1)" và "1 invited · 0 sent a proposal". Người thuê khác không thấy nút.
- Freelancer được mời thấy khung "invited you". `/invitations` hiện dự án, nút Send proposal và dòng "1 waiting for your answer".
- Người thuê mở `/invitations` thấy thông báo dành cho freelancer. Khách bị chuyển về `/login`.
- Sau khi freelancer gửi proposal: chủ thấy "Sent a proposal ✓". Freelancer thấy "Proposal sent ✓". Thẻ trong chế độ mời có trạng thái `proposed`.
- Huỷ lời mời thì mục Invited biến mất. Dự án đã đóng: mời nhận 409 và nút mời bị ẩn.

## Chưa làm

- Email cho freelancer khi được mời. Thông báo trong web đã có ở nút chuông (xem notifications.md).
- Lời nhắn riêng kèm lời mời.
- Nút mời trên trang profile công khai `/talents/{username}`.
