# Job (`/job-1`, `/job-single/{id}`, `/manage-jobs`)

**Job** = proposal đã được người thuê **chấp nhận**. Id của job chính là id của proposal. Dự án được Accept thì rời trang Projects (`/project-1`) và được quản lý dưới dạng job.

## Trạng thái job

```
Hired → IN PROGRESS ──Submit──▶ SUBMITTED ──Approve & Complete──▶ COMPLETED
             ▲                     │
             └── Request changes ──┘
  IN PROGRESS / SUBMITTED ──Open dispute──▶ DISPUTED ──Withdraw──▶ quay lại trạng thái trước đó
```

| Trạng thái | Ý nghĩa | Ai làm gì |
|---|---|---|
| **In progress** | Freelancer đang làm. Quá ngày giao thì hiện nhãn **Overdue** (không lưu riêng). | Freelancer: **Submit** link video (1 link/video, tối đa bằng số video) + ghi chú |
| **Submitted** | Đã giao, chờ người thuê duyệt | Người thuê: **Approve & Complete**, hoặc **Request changes** (bắt buộc ghi rõ cần sửa gì) → quay lại In progress |
| **Completed** | Người thuê đã duyệt. Số tiền thành "Due to the freelancer". | — |
| **Disputed** | Một bên mở khiếu nại (chọn lý do + mô tả). Job tạm dừng. | Chỉ bên mở khiếu nại được **Withdraw**; job quay lại trạng thái trước khi khiếu nại |

- Mỗi bước gửi thông báo (chuông) cho bên còn lại, dẫn tới `/job-single/{id}`.
- Sau khi freelancer đã giao lần đầu (hoặc có khiếu nại), người thuê **không Undo** việc Accept được nữa (API trả 409).
- Hai người bấm cùng lúc: điều kiện `job_status` trong câu `UPDATE` đảm bảo chỉ một bước được ghi, bên kia nhận 409.

## Trang Jobs `/job-1` (menu **Jobs**)

| Người xem | Thấy gì |
|---|---|
| Freelancer | Job mình được thuê |
| Người thuê | Các freelancer mình đã thuê (dự án thuê 2 người thì có 2 job) |
| Khách | Nút **Log in** (quay lại `/job-1` sau khi đăng nhập) |

- Mỗi thẻ có nhãn trạng thái và nút **Manage Job** → `/job-single/{id}`.
- Banner cùng kiểu với trang Services, ô tìm kiếm theo tiêu đề hoặc brief.
- Bộ lọc: **Status** (In progress · Overdue · Submitted · Completed · Disputed) · **Platform** · **Type of work** · **Video length** · **Price** (từ $25/$50/$100/$200 mỗi video, theo giá đã chốt). Có nút Clear all.
- Sắp xếp:
  - **Priority** (mặc định): Disputed → Overdue → Submitted → In progress → Completed. Trong mỗi nhóm, ngày giao gần hơn nằm trên; nhóm Completed thì job vừa hoàn thành nằm trên.
  - Mới thuê gần đây · Tổng tiền cao nhất. Với mọi kiểu sắp xếp, job **Completed luôn nằm dưới cùng**.
- Phân trang 10 job/trang, bộ lọc giữ trên URL.
- API: `GET /api/jobs` (khách nhận 401).

## Trang job `/job-single/{id}`

Chỉ **người thuê** và **freelancer được thuê** mở được; người khác nhận 404, khách bị `proxy.js` chuyển sang trang login. `/manage-jobs/{id}` cũ chuyển hướng sang đây.

| Khối | Nội dung |
|---|---|
| Đầu trang | Tên dự án, nhãn trạng thái, ai thuê ai và từ ngày nào, số ngày còn lại / đã trễ |
| Next step | Nút hành động theo vai trò và trạng thái (bảng trên), link **Open a dispute** |
| **Scope** | Số video × độ dài, loại công việc, nền tảng, 9:16, Brief, video tham khảo, link về dự án gốc |
| **Time** | Ngày gửi proposal, ngày thuê, ngày giao đã chốt, hạn chót dự án, ngày giao bài, ngày hoàn thành |
| **Cost** | Giá đã chốt × số video = tổng; so với ngân sách gốc của người thuê |
| **Quality** | Số lần giao, số lần yêu cầu sửa, từng lần giao (link + ghi chú, mới nhất trên cùng), proposal và video mẫu |
| Activity | Mọi sự kiện theo thời gian, kèm ghi chú |
| Cột phải | **Status** (Hired → In progress → Submitted → Completed), **Payment** (số tiền, trạng thái thanh toán), thẻ của bên còn lại |

**Thanh toán:** chưa nối PayPal. Trang chỉ hiện số tiền và trạng thái (Due when the client approves → Due to the freelancer, hoặc On hold khi có khiếu nại), kèm dòng "Payment through PayPal is coming soon."

**Khiếu nại:** chưa có trang admin để xử lý. Khiếu nại chỉ dừng job lại; người mở có thể rút lại.

## Danh sách `/manage-jobs` (dashboard freelancer)

- 3 tab: **Active** (In progress chưa trễ, Submitted, Disputed), **Overdue**, **Completed**. Bấm vào job mở `/job-single/{id}`.

## Database

- `db/005_proposal_accepted_at.sql`: `proposals.accepted_at`, thời điểm Accept (xoá về `NULL` khi Undo hoặc Decline).
- `db/009_job_workflow.sql`: `proposals.job_status` (mặc định `in_progress`), `proposals.status_before_dispute`, `proposals.completed_at`, và bảng `job_events` (`proposal_id`, `actor_id`, `type`, `note`, `links[]`, `reason`, `created_at`), là nguồn cho phần Quality và Activity.

## API

| Method | Endpoint | Việc làm |
|---|---|---|
| `GET` | `/api/jobs` | Danh sách job của người đang đăng nhập, kèm bộ lọc |
| `POST` | `/api/jobs/{id}` | `{ action: "submit", links, note }` · `{ action: "revision", note }` · `{ action: "approve" }` · `{ action: "dispute", reason, note }` · `{ action: "withdraw_dispute" }` |

## File

| File | Vai trò |
|---|---|
| `src/lib/jobs.js` | `searchJobs()`, `getFreelancerJobs()`, `getJob()`, `runJobAction()`, `canUndoAcceptance()` |
| `src/app/(job)/job-single/[id]/page.jsx` | Trang job |
| `src/components/project/JobActions.jsx` | Khối Next step và các form |
| `src/components/project/JobCard.jsx` | Thẻ job, `JobStatusBadge`, `jobStage()` |
| `src/components/project/JobDirectory.jsx` | Trang `/job-1` |
| `src/components/dashboard/section/ManageJobInfo.jsx` | Bảng `/manage-jobs` |

---

## Đề xuất ban đầu

Submit, Request changes, Approve và khiếu nại đã làm theo luồng ở trên. Phần còn lại chưa làm: gia hạn, xin huỷ, tự động hoàn thành sau 3 ngày, đánh giá, thanh toán PayPal, nhắn tin.

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
