# Job của freelancer (`/manage-jobs`)

**Job** = proposal đã được người thuê **chấp nhận**. Id của job chính là id của proposal.

## Đã làm

### Danh sách `/manage-jobs`

- 2 tab: **Active** (chưa tới ngày giao) và **Overdue** (đã quá ngày giao mà freelancer cam kết trong proposal).
- Mỗi dòng gồm: tên dự án (bấm vào mở trang job), người thuê, số video × độ dài, **số tiền nhận** (tổng và /video), ngày giao kèm trạng thái "6 days left" / "Due tomorrow" / "Due today" / "2 days overdue", và nút **Open**.
- Sắp xếp theo ngày giao gần nhất lên trước.
- Tài khoản người thuê mở trang này thì thấy thông báo kèm link sang Manage Projects.

### Trang job `/manage-jobs/{id}`

Chỉ freelancer sở hữu job mới mở được. Người khác, người thuê, hoặc khi người thuê đã bấm Undo, đều nhận 404.

| Khối | Nội dung |
|---|---|
| Đầu trang | Tên dự án, người thuê, nhãn **In progress**, số ngày còn lại hoặc số ngày đã trễ |
| What to deliver | Số video × độ dài, loại công việc, nền tảng, định dạng 9:16, Brief, video tham khảo |
| Your proposal | Thư giới thiệu, video mẫu đã gửi, link sang trang dự án |
| Progress | Dòng thời gian: Proposal sent ✓ → Proposal accepted ✓ → **In progress** → Delivered → Completed. Hai bước cuối thuộc luồng đề xuất bên dưới. |
| Agreed terms | Số tiền nhận, giá/video, ngày giao, hạn chót dự án, ngân sách gốc của người thuê |
| Client | Avatar, tên, quốc gia, ngày tham gia |

Trên trang dự án, proposal đã được chấp nhận có thêm nút **Open your job →**.

### Database — `db/005_proposal_accepted_at.sql`

Thêm cột `proposals.accepted_at`: ghi lại thời điểm người thuê bấm Accept, và xoá về `NULL` khi người thuê Undo hoặc Decline. Cột này dùng cho mốc "Proposal accepted" trên dòng thời gian.

### File

| File | Vai trò |
|---|---|
| `src/lib/jobs.js` | `getFreelancerJobs()`, `getJob()` (dùng lại `getProject()`) |
| `src/components/dashboard/section/ManageJobInfo.jsx` | Danh sách và 2 tab |
| `src/app/(dashboard)/manage-jobs/[id]/page.jsx` | Trang job |
| `src/components/project/ProjectCard.jsx` | Thêm `daysUntil()`, `dueLabel()` |

---

## Đề xuất luồng tiếp theo (chưa làm)

```
                ┌──────────── Xin gia hạn ─────────────┐
                ▼                                       │
  Accepted → IN PROGRESS ──Submit──▶ DELIVERED ──Approve──▶ COMPLETED → Đánh giá 2 chiều
                ▲                     │   │
                └── Request revision ─┘   └── Không phản hồi 3 ngày → tự động COMPLETED
                │
                └── Xin huỷ ──▶ CANCEL REQUESTED ──Đồng ý──▶ CANCELLED
                                       └──Từ chối──▶ quay lại IN PROGRESS
```

### Freelancer làm được gì

| Hành động | Khi nào | Nhập | Kết quả |
|---|---|---|---|
| **Submit delivery** | In progress | 1 link cho **mỗi video** (Google Drive, Dropbox, TikTok/YouTube để riêng tư), ghi chú cho người thuê | → **Delivered**. Người thuê có **3 ngày** để duyệt |
| **Gửi lại sau khi sửa** | Người thuê yêu cầu sửa | Link mới và ghi chú đã sửa gì | → Delivered lại. Mỗi lần sửa trừ vào **số lần sửa miễn phí** |
| **Xin gia hạn** | In progress, trước hoặc sau ngày giao | Ngày giao mới (không quá hạn chót dự án) và lý do | Người thuê đồng ý thì ngày giao được cập nhật, từ chối thì giữ nguyên |
| **Xin huỷ** | In progress | Lý do (chọn 1: brief thay đổi · không kịp hạn · người thuê không phản hồi · khác) và lời nhắn | → **Cancel requested**. Người thuê đồng ý thì **Cancelled** (không trả tiền). Từ chối thì quay lại In progress, kèm nút "Liên hệ hỗ trợ" |
| **Nhắn tin** | Mọi lúc khi job còn chạy | Tin nhắn | Cần làm trang Message thật |

### Người thuê làm được gì (cùng luồng, trên trang dự án)

- **Approve:** → Completed, thanh toán qua PayPal cho freelancer.
- **Request revision:** kèm ghi chú cần sửa gì → quay lại In progress.
- Đồng ý hoặc từ chối yêu cầu gia hạn và yêu cầu huỷ.
- Huỷ job khi freelancer trễ hạn quá **3 ngày** (không cần freelancer đồng ý).
- Sau khi Completed: **đánh giá** freelancer (1–5 sao và nhận xét). Điểm này hiện lên trang talent và thẻ trong danh sách talent.

### Quy tắc tự động

- Delivered mà người thuê không phản hồi sau 3 ngày → tự động **Completed**, để freelancer không bị treo tiền.
- Quá ngày giao → job tự sang tab **Overdue** (đã có). Trễ quá 3 ngày → người thuê được quyền huỷ.
- Xin huỷ mà không ai phản hồi sau 3 ngày → chuyển sang bộ phận hỗ trợ xử lý.

### Database đề xuất

| Bảng / cột | Nội dung |
|---|---|
| `proposals.job_status` | `in_progress` · `delivered` · `revision_requested` · `cancel_requested` · `completed` · `cancelled` |
| `proposals.revisions_included` | Lấy từ "Free revisions" trong profile freelancer tại thời điểm gửi proposal |
| `job_deliveries` | `proposal_id`, `links[]`, `note`, `created_at`. Mỗi lần giao hoặc giao lại thêm 1 dòng |
| `job_events` | `proposal_id`, `type` (submitted, revision_requested, extension_requested, cancel_requested, approved…), `actor_id`, `note`, `data` (json), `created_at`. Đây là **nguồn dữ liệu duy nhất cho dòng thời gian** |

### Gợi ý thứ tự làm

1. **Submit delivery + Approve / Request revision.** Đây là vòng chính, đủ để một job đi hết từ đầu đến cuối.
2. **Xin huỷ** và **Xin gia hạn**.
3. **Đánh giá** sau khi hoàn thành (cũng giúp điền phần rating còn trống trên trang talent).
4. **Thanh toán PayPal** (giữ tiền khi Accept, trả tiền khi Completed) và **nhắn tin**.
