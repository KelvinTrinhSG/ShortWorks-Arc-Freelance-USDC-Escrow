# Dự án & Proposal

Luồng: **người thuê đăng dự án** (`/create-projects`) → **freelancer tìm dự án** (`/project-1`) → **xem chi tiết và gửi proposal** (`/project-single/{id}`) → **người thuê xem các proposal** trên cùng trang chi tiết.

## Database — `db/004_projects.sql`

| Bảng | Cột chính |
|---|---|
| `projects` | `client_id`, `title`, `platforms[]`, `work_type`, `video_count`, `video_length`, `brief`, `deadline`, `budget_per_video`, `status` (`open`/`closed`), `created_at` |
| `project_references` | `project_id`, `url`, `platform`, `sort_order` (tối đa 3 video tham khảo) |
| `proposals` | `project_id`, `freelancer_id`, `price_per_video`, `delivery_date`, `cover_letter`, `sample_url`, `status` (`pending`/`accepted`/`declined`). Mỗi freelancer chỉ gửi **1 proposal cho mỗi dự án** (ràng buộc `UNIQUE`). |

Các bảng con dùng `ON DELETE CASCADE`: xoá tài khoản là xoá luôn dự án, video tham khảo và proposal liên quan.

## API

| Method | Endpoint | Ai gọi được | Việc làm |
|---|---|---|---|
| `GET` | `/api/projects` | Mọi người | Danh sách dự án **đang mở** (chưa đóng và chưa quá hạn chót). Tham số: `q`, `platform`, `workType`, `length` (nhiều giá trị cách nhau bằng dấu phẩy), `minBudget`, `sort` (`newest` · `budget-desc` · `total-desc` · `deadline-asc`), `page`. 10 dự án mỗi trang. |
| `POST` | `/api/projects` | Chỉ tài khoản `client` | Đăng dự án. Hạn chót phải sau hôm nay. Link tham khảo được kiểm tra bằng `parseVideoUrl()`. |
| `POST` | `/api/projects/{id}/proposals` | Chỉ tài khoản `freelancer` | Gửi proposal. Bị từ chối nếu là dự án của chính mình, dự án đã đóng, hoặc đã gửi rồi (409). Ngày giao phải từ hôm nay đến hạn chót. |
| `PATCH` | `/api/projects/{id}` | Chủ dự án | Gửi `{ status: "open" \| "closed" }` để đóng hoặc mở lại (không mở lại được khi đã quá hạn chót, phải sửa hạn chót trước). Gửi đủ các trường như khi tạo để **sửa** dự án. |
| `DELETE` | `/api/projects/{id}` | Chủ dự án | Xoá dự án, kèm video tham khảo và proposal |
| `PATCH` | `/api/proposals/{id}` | Chủ dự án **hoặc** freelancer gửi proposal | Chủ dự án: `{ status: "accepted" \| "declined" \| "pending" }` để chấp nhận, từ chối hoặc hoàn tác. Freelancer: gửi lại các trường để **sửa** proposal, chỉ khi proposal còn `pending` và dự án còn mở. |
| `DELETE` | `/api/proposals/{id}` | Freelancer gửi proposal | **Rút** proposal, chỉ khi còn `pending`. Sau khi rút có thể gửi lại. |

Toàn bộ logic nằm trong `src/lib/projects.js`. `src/lib/viewer.js` dùng để lấy người đang xem kèm loại tài khoản; file này tách riêng khỏi `session.js` vì `proxy.js` không được phép tải thư viện `pg`.

## Trang danh sách `/project-1`

- Banner và ô tìm kiếm theo tiêu đề hoặc mô tả.
- Bộ lọc: **Platform · Type of work · Video length · Budget** (từ $25/$50/$100/$200 mỗi video). Có nút Clear all.
- Sắp xếp: Mới nhất · Ngân sách/video cao nhất · Tổng ngân sách cao nhất · Hạn chót gần nhất.
- Phân trang thật. Bộ lọc được giữ trên URL.
- Mỗi thẻ (`ProjectCard`) hiện: tiêu đề, người đăng, đăng bao lâu trước, số proposal, công việc, nền tảng, số video × độ dài, ngân sách (kèm tổng), hạn chót, số video tham khảo, 2 dòng đầu của mô tả, và nút **View & Send Proposal**.

## Trang chi tiết `/project-single/{id}`

**Phần chung:** tiêu đề, người đăng, 6 ô thông tin (Platforms · Type of work · Videos × length · Budget · Deadline · Proposals), Brief, video tham khảo dạng khung dọc 9:16. Cột phải có tổng ngân sách, hạn chót, số ngày còn lại, và thông tin người thuê.

**Phần cuối trang thay đổi theo người xem:**

| Người xem | Thấy gì |
|---|---|
| Chủ dự án | **Proposals (n):** từng freelancer (avatar, tên dẫn tới trang talent, headline), giá/video, tổng tiền, ngày giao, thư giới thiệu, video mẫu, trạng thái |
| Freelancer đã gửi | **Your proposal** |
| Freelancer chưa gửi | Form **Send your proposal** |
| Khách chưa đăng nhập | Nút **Log in** (quay lại đúng trang này sau khi đăng nhập) và **Join as a freelancer** |
| Người thuê khác | "Only freelancer accounts can send proposals." |
| Dự án đã đóng hoặc quá hạn | "This project is no longer accepting proposals." |

### Form Send Proposal

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Giá / video (USD) | ✅ | Điền sẵn bằng ngân sách của người thuê. Hiện tổng tiền, và cho biết đang cao hơn hay thấp hơn ngân sách bao nhiêu. |
| Ngày giao | ✅ | Từ hôm nay đến hạn chót |
| Thư giới thiệu | ✅ | Tối đa 1500 ký tự. Gợi ý: vì sao phù hợp · cách làm · cần gì từ người thuê |
| Video mẫu liên quan nhất | — | 1 link TikTok/Reels/Shorts/Facebook |

Profile công khai và portfolio của freelancer được **tự gắn kèm** qua link tới `/talents/{username}`.

Thay cho form cũ của template (Your hourly price · Estimated Hours · Cover Letter): đơn hàng video ngắn tính theo video và theo hạn giao, không tính theo giờ.

## Trạng thái dự án

| Trạng thái | Khi nào | Trên trang Projects | Nhận proposal mới |
|---|---|---|---|
| **Open** | Chưa đóng, chưa quá hạn chót, chưa chấp nhận ai | ✅ Hiện | ✅ |
| **Hired** | Người thuê đã **chấp nhận ít nhất 1 proposal** | ❌ Ẩn | ❌ Freelancer khác thấy "The client has already hired a freelancer for this project." Các proposal đang chờ cũng không sửa được nữa. |
| **Closed** | Người thuê bấm Close, hoặc đã quá hạn chót | ❌ Ẩn | ❌ |

- Bấm **Undo** để bỏ chấp nhận (hoặc chỉ Decline mà không Accept ai), dự án quay lại **Open** và hiện lại trên trang Projects.
- Logic này nằm trong `src/lib/projects.js`: biến `hired` / `isOpen` trong `toProject()`, điều kiện `NOT EXISTS … 'accepted'` trong `searchProjects()`, và `getProposalContext()`.

## Trang quản lý `/manage-projects` (người thuê)

- 3 tab **Open**, **Hired** và **Closed**. Mỗi dự án nằm trong đúng 1 tab. Tab Closed gồm dự án người thuê tự đóng và dự án đã quá hạn chót mà chưa chọn ai. Số trong ngoặc là số dự án.
- Bảng gồm các cột:
  - **Project:** tên dự án (bấm vào mở trang chi tiết), số video × độ dài, trạng thái.
  - **Budget:** /video và tổng.
  - **Deadline.**
  - **Proposals:** tổng số (bấm vào mở trang chi tiết), kèm số "new" là chưa xử lý và số "accepted".
  - **Actions:** Edit · Close/Reopen · Delete.
- Delete hỏi xác nhận trước, và báo rõ sẽ xoá bao nhiêu proposal.
- Tài khoản freelancer mở trang này thì thấy thông báo kèm link sang `/project-1`.

## Sửa dự án `/edit-project/{id}`

- Dùng lại form Create Project với dữ liệu điền sẵn. Nút đổi thành **Save Changes**, lưu xong chuyển về trang chi tiết.
- Chỉ chủ dự án mở được. Người khác nhận 404. Khách chưa đăng nhập bị `proxy.js` chuyển về trang login.
- Nếu đã có proposal, đầu trang nhắc rằng các freelancer đã gửi proposal dựa trên phiên bản cũ.

## Quản lý ngay trên trang chi tiết

- **Chủ dự án:**
  - Dưới tiêu đề có Edit · Close/Reopen · Delete. Xoá xong chuyển về trang danh sách dự án `/project-1`.
  - Mỗi proposal có **Accept** · **Decline**. Sau khi chọn hiện "You accepted/declined this proposal" kèm nút **Undo**.
  - Có thể chấp nhận nhiều proposal, vì dự án nhiều video có thể chia cho nhiều freelancer.
- **Freelancer:**
  - Proposal của mình có **Edit** (mở lại form với dữ liệu cũ) và **Withdraw** (hỏi xác nhận).
  - Hai nút này chỉ hiện khi người thuê chưa phản hồi và dự án còn mở.
  - Khi đã được chấp nhận hoặc từ chối, proposal hiện thông báo tương ứng và không sửa hay rút được nữa.

| Component | Vai trò |
|---|---|
| `components/project/ProjectOwnerActions.jsx` | Edit · Close/Reopen · Delete (dùng ở bảng quản lý và trang chi tiết) |
| `components/project/ProposalCard.jsx` | Thẻ proposal (dùng chung cho cả server và client) |
| `components/project/ProposalDecision.jsx` | Accept · Decline · Undo |
| `components/project/MyProposal.jsx` | Proposal của freelancer kèm Edit · Withdraw |
| `components/project/ProposalForm.jsx` | Gửi mới, hoặc sửa khi truyền vào `existing` |
| `components/project/VideoFrame.jsx` | Khung video 9:16 |

## Đã kiểm tra

- **Quản lý (curl):**
  - Người thuê khác và freelancer không sửa, đóng hay xoá được dự án của người khác (403).
  - Sửa với dữ liệu sai bị từ chối (400). Dự án đã đóng không nhận proposal mới, và freelancer không sửa được proposal trên dự án đã đóng.
  - Mở lại dự án đã quá hạn chót bị từ chối (409).
  - Freelancer khác và người thuê khác không đụng được vào proposal (403). Trạng thái lạ bị từ chối.
  - Proposal đã được chấp nhận thì không sửa hay rút được (409). Hoàn tác xong thì rút được và gửi lại được.
  - Xoá dự án thì xoá luôn proposal. Trang chi tiết sau đó trả 404.
- **Quản lý (trình duyệt Edge):** bảng 2 tab, Close chuyển dự án sang tab Closed, Delete từ bảng, bấm tên dự án mở trang chi tiết, Accept/Undo, freelancer Edit (dữ liệu điền sẵn) và Withdraw, sửa dự án qua `/edit-project`, người thuê khác nhận 404, Delete từ trang chi tiết quay về `/manage-projects`.
- **API (curl):**
  - Khách và freelancer không đăng được dự án.
  - Hạn chót trong quá khứ và link lạ bị từ chối.
  - Người thuê không gửi được proposal.
  - Ngày giao sau hạn chót bị từ chối. Gửi trùng nhận 409. Dự án không tồn tại nhận 404.
- **Trình duyệt Edge:**
  - Người thuê đăng dự án và được chuyển sang trang chi tiết.
  - Khách lọc danh sách, mở chi tiết, thấy nút đăng nhập.
  - Freelancer: giá được điền sẵn, video mẫu sai bị từ chối, gửi proposal thành công.
  - Chủ dự án thấy Proposals (1).
  - Người thuê khác thấy thông báo đúng. Id không tồn tại hoặc không hợp lệ nhận 404.
  - Phân trang với 12 dự án.

## Chưa làm

- Nhắn tin giữa hai bên, thanh toán qua PayPal.
- Thông báo cho freelancer khi proposal được chấp nhận hoặc từ chối. Hiện freelancer chỉ thấy khi mở lại trang dự án.
- Trang "My Proposals" (`/proposal`) liệt kê mọi proposal của một freelancer. Hiện freelancer quản lý proposal trên từng trang dự án.
- Các trang mẫu `/project-2`, `/project-3`, `/project-4`, `/project-single-v2`, `/project-single-v3` vẫn dùng dữ liệu mẫu.
