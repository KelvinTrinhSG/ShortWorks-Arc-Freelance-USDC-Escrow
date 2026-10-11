# Services (`/service-4`, `/service-single/{id}`)

**Service** = gói làm sẵn của freelancer: **một giá cho mỗi video**, thời gian giao cho cả đơn. Client đặt và trả tiền ngay trên trang service; đơn hàng trở thành **job** như mọi job khác (Submit → Approve → thanh toán, khiếu nại…, xem `docs/jobs.md`, `docs/payments.md`).

## Database — `db/011_services.sql`

| Bảng / cột | Nội dung |
|---|---|
| `services` | `freelancer_id`, `title` (≤80), `work_type`, `platforms[]`, `video_length`, `description` (≤1500), `price_per_video`, `delivery_days` (1–25), `revisions` (-1 = không giới hạn), `max_videos` (1–50, mỗi đơn), `status` (`active` / `paused`) |
| `service_samples` | Tối đa 3 video mẫu (TikTok / Reels / Shorts / Facebook). Video đầu là ảnh bìa |
| `projects.service_id` | Đánh dấu project được tạo từ một đơn đặt service |

## Đặt hàng

```
Client chọn số video + viết brief ──POST /api/services/{id}/order──▶ project kín (status 'closed', service_id)
                                                                     + proposal của freelancer (pending, giá của service,
                                                                       ngày giao = hôm nay + delivery_days)
        ──PayPal (POST /api/proposals/{proposalId}/checkout)──▶ PayPal giữ tiền, proposal accepted ──▶ JOB
```

- Project của đơn hàng để `closed` nên **không hiện ở trang Projects** và không nhận proposal khác. Người thuê thấy nó trong Manage Projects.
- Client bỏ dở bước thanh toán rồi đặt lại cùng service: đơn cũ chưa trả được **cập nhật**, không tạo thêm.
- Chỉ đặt được khi: tài khoản client, service `active`, freelancer đã kết nối PayPal (`ready`). Số video 1–`max_videos`. Giới hạn 25 ngày giao giữ nguyên nhờ `delivery_days` ≤ 25.

## Trang

| Trang | Nội dung |
|---|---|
| `/service-4` | Banner + tìm kiếm (tiêu đề, mô tả, tên freelancer). Bộ lọc: **Type of work · Platform · Video length · Price** (tối đa $25/$50/$100/$200 mỗi video) **· Delivery** (24 giờ / 3 / 7 / 14 ngày). Sắp xếp: Newest · Lowest price · Highest price · Fastest delivery. 12 service/trang, bộ lọc giữ trên URL. Ô tìm kiếm ở trang chủ (`?category=&q=`) được chuyển thành bộ lọc Type of work |
| `/service-single/{id}` | 6 ô thông tin, mô tả, video mẫu, "How ordering works", hộp **đặt hàng** (số video, brief, ngày giao, tổng tiền → Continue → nút PayPal), thẻ freelancer. Service tạm dừng chỉ chủ của nó thấy |
| `/add-services` | Form tạo service, xem trước thẻ, ước tính "You receive ≈" |
| `/edit-service/{id}` | Sửa (chỉ chủ). Đơn đã đặt giữ nguyên giá và ngày giao |
| `/manage-services` | Bảng service: Edit · Pause/Resume · Delete (hỏi xác nhận). Xoá service không xoá đơn đã đặt |

| Hộp đặt hàng theo người xem | Thấy gì |
|---|---|
| Chủ service | "This is your service" + Edit |
| Khách | Log in to order · Join as a client |
| Freelancer khác | "Only client accounts can order services." |
| Client, freelancer chưa kết nối PayPal / service tạm dừng | Lý do, không đặt được |
| Client | Form đặt hàng → nút PayPal |

## API

| Method | Endpoint | Ai | Việc làm |
|---|---|---|---|
| `GET` | `/api/services` | Mọi người | Danh sách service `active`, có bộ lọc |
| `POST` | `/api/services` | Freelancer | Tạo service |
| `PATCH` | `/api/services/{id}` | Chủ service | `{ status }` để tạm dừng / mở lại, hoặc đủ các trường để sửa |
| `DELETE` | `/api/services/{id}` | Chủ service | Xoá |
| `POST` | `/api/services/{id}/order` | Client | `{ videoCount, brief }` → `{ proposalId, projectId, amount, deliveryDate }` |

## File

| File | Vai trò |
|---|---|
| `src/lib/services.js` | Kiểm tra dữ liệu, lưu, tìm kiếm, đọc, `createServiceOrder()` |
| `src/data/serviceOptions.js` | Giới hạn và lựa chọn (thời gian giao, bộ lọc giá / thời gian) |
| `src/components/service/` | `ServiceCard`, `ServiceDirectory`, `ServiceForm`, `ManageServices`, `ServiceOrderBox` |
| `src/components/project/HireAndPay.jsx` | Dùng lại cho bước thanh toán (thêm `autoOpen`, `label`) |

## Chưa làm

- Trang chủ `/` đã có **Popular Services** thật (`components/service/PopularServices.jsx`): 8 service, sắp xếp `popular` (nhiều đơn đã trả tiền nhất, rồi mới nhất), tab All · Video editing · UGC filming · Motion graphics, nút All Services → `/service-4` (giữ tab đang chọn). Các trang home mẫu (`/home-2`, `/home-9`, `/home-16`…), `/service-1…7`, `/service-single-v2/v3` vẫn dùng dữ liệu mẫu.
- Đánh giá (rating) cho service.
