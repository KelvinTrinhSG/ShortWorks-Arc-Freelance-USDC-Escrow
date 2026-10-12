# Trang Create Project (`/projects/new`)

> **Trạng thái:** ✅ Frontend + backend xong. **Publish Project** lưu dự án và chuyển sang trang chi tiết `/projects/{id}`. Xem [projects.md](./projects.md) cho danh sách dự án, trang chi tiết và proposal.

Form 8 trường, đủ để freelancer đọc là hiểu ngay **scope · time · cost · quality**.

| # | Trường | Bắt buộc | Kiểu nhập | Thuộc yếu tố |
|---|---|---|---|---|
| 1 | Project title | ✅ | text, tối đa 70 ký tự | Scope |
| 2 | Platforms | ✅ | chọn nhiều: TikTok · Instagram Reels · YouTube Shorts · Facebook Reels | Scope |
| 3 | Type of work | ✅ | chọn 1: Video editing · UGC filming · Motion graphics | Scope |
| 4 | Video length | ✅ | độ dài (≤15s · 15–30s · 30–60s · 60–90s · 1,5–3 phút). **1 dự án = 1 video** (`PROJECT_VIDEO_COUNT`), không còn ô nhập số video, để freelancer giao xong 1 video là được trả tiền cho video đó. Dự án đăng trước quy định này (và đơn đặt từ Service) giữ nguyên số video cũ khi sửa | Scope |
| 5 | Brief | ✅ | tối đa 1000 ký tự. Dưới ô có gợi ý cần ghi gì: sản phẩm, mục tiêu, thông điệp, ai cung cấp footage, phụ đề/nhạc/lồng tiếng, ngôn ngữ, link tài liệu | Scope + Quality |
| 6 | Deadline | ✅ | chọn ngày, từ ngày mai trở đi | Time |
| 7 | Budget | ✅ | số (USD) cho 1 video. Dự án cũ nhiều video hiện "Budget per video" kèm dòng tổng tiền | Cost |
| 8 | Reference videos | — | 0–3 link TikTok/Reels/Shorts/Facebook, xem trước dạng khung dọc 9:16 | Quality |

## Giao diện

- **Cột trái:** 3 khối, gồm "What do you need?" (trường 1–5), "Deadline & budget" (6–7) và "Reference videos" (8).
- **Cột phải (luôn hiện khi cuộn):** khung "How freelancers will see it" xem trước **thẻ dự án** và cập nhật ngay khi gõ, cùng nút **Publish Project**.
- Bấm Publish khi còn thiếu: lỗi hiện dưới từng ô.
- **Tài khoản freelancer** mở trang này thì không thấy form, mà thấy thông báo "Projects are posted by clients" kèm link sang My Profile.

## File

| File | Vai trò |
|---|---|
| `src/data/projectOptions.js` | Danh sách lựa chọn và giới hạn (độ dài tiêu đề, mô tả, số video…). Backend sẽ dùng lại để kiểm tra dữ liệu. |
| `src/components/dashboard/project/CreateProjectForm.jsx` | Form, kiểm tra dữ liệu, xem trước |
| `src/components/project/ProjectCard.jsx` | Thẻ dự án. Dùng cho phần xem trước, và sau này cho trang danh sách dự án. |
| `src/components/dashboard/section/CreateProjectInfo.jsx` | Khung trang |

Đã xoá `BasicInformation2.jsx` và `UploadAttachment.jsx` (form cũ của template, không trang nào khác dùng).

## Backend

Đã làm: bảng `projects` + `project_references` (`db/004_projects.sql`) và `POST /api/projects` (chỉ tài khoản `client`). Chi tiết ở [projects.md](./projects.md).
