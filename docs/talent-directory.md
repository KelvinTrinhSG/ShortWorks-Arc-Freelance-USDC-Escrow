# Danh sách talent (`/freelancer-1`) & profile công khai (`/talents/{username}`)

Trang `/freelancer-1` trước đây hiển thị 12 freelancer mẫu viết cứng trong `src/data/product.js`. Giờ trang lấy **talent thật từ database**.

## Ai được hiển thị?

**Mọi tài khoản freelancer** (chọn "Become a Freelancer" lúc đăng ký), kể cả người vừa đăng ký chưa điền gì. Tài khoản người thuê (`client`) không bao giờ hiện. **Trường nào chưa điền thì không hiện**, trên cả thẻ lẫn trang profile công khai. Ví dụ: chưa có avatar thì dùng avatar mặc định; chưa có giá thì không có dòng "From"; chưa có video thì không có khung Portfolio.

Profile **hoàn chỉnh** (đủ 10 mục bắt buộc của My Profile) chỉ được **xếp lên đầu** khi sắp xếp theo Recommended:

ảnh đại diện · tên · headline · vai trò · quốc gia + múi giờ · ≥ 3 video · nền tảng · ngách · giá khởi điểm · thời gian giao

Điều kiện này nằm trong biến `COMPLETE` của [src/lib/talents.js](../src/lib/talents.js). Khi sửa danh sách mục bắt buộc, phải sửa **cả hai nơi**: biến này và hàm `requiredChecks()` trong `TalentProfile.jsx`.

Khi sắp xếp theo giá hoặc thời gian giao, người chưa điền trường đó luôn nằm **cuối danh sách**. Khi lọc theo giá, thời gian giao, ngách…, người chưa điền trường đó sẽ không khớp nên không hiện.

## Trang danh sách `/freelancer-1`

| Phần | Hoạt động |
|---|---|
| Ô tìm kiếm | Tìm theo tên, headline hoặc username (không phân biệt hoa thường) |
| Bộ lọc chọn nhiều | **Role · Platform · Niche · Language**. Talent khớp **ít nhất một** giá trị đã chọn là được hiển thị. |
| Price | Giá khởi điểm ≤ $25 / $50 / $100 / $200 |
| Delivery | Thời gian giao ≤ 24 giờ … 7 ngày |
| Available now | Chỉ hiện talent đang nhận việc |
| Clear all | Xoá mọi bộ lọc và từ khoá tìm kiếm |
| Sort by | Recommended (profile hoàn chỉnh trước, rồi người đang nhận việc, rồi người mới cập nhật) · Giá thấp→cao · Giá cao→thấp · Giao nhanh nhất · Mới tham gia |
| Phân trang | 12 talent/trang, có số trang thật |
| URL | Bộ lọc được ghi vào URL (ví dụ `?niche=food&sort=price-asc`), nên có thể gửi link cho người khác hoặc lưu lại |

Mỗi thẻ có thể hiện: avatar, chấm trạng thái (🟢 đang nhận việc · 🟡 bận · ⚪ tạm nghỉ), tên, vai trò, headline, tối đa 3 ngách, nền tảng, quốc gia, giá từ $/video, thời gian giao, và nút **View Profile**. Mục nào trống thì bị ẩn. Nút View Profile luôn nằm ở đáy thẻ để các thẻ thẳng hàng.

Khi không có kết quả, trang hiện "No talents found".

## Trang profile công khai `/talents/{username}`

- Hiện: avatar, tên, vai trò, headline, trạng thái nhận việc, quốc gia, múi giờ, giá khởi điểm, portfolio (video nhúng dạng 9:16), giới thiệu, giá và thời gian giao, số lần sửa, ngày tham gia, nền tảng, ngách, phần mềm, ngôn ngữ.
- **Không bao giờ** hiện email, số điện thoại hay email PayPal.
- Mọi tài khoản đều có trang công khai, phần nào trống thì ẩn. Nếu chưa có giá và thời gian giao, khung "Pricing & delivery" đổi tên thành "Details" (chỉ còn ngày tham gia). Username không tồn tại trả về 404.
- Chính chủ thấy thêm một thông báo và link **Edit profile**. Nếu profile chưa hoàn chỉnh, thông báo nhắc điền nốt để được xếp lên đầu.
- Trang My Profile có link **View public profile ↗** để talent xem trước trang của mình.

## API

`GET /api/talents` (công khai)

| Tham số | Ví dụ |
|---|---|
| `q` | `q=tiktok` |
| `role`, `platform`, `niche`, `language`, `country` | Nhiều giá trị cách nhau bằng dấu phẩy: `role=editor,ugc` |
| `maxPrice` | `maxPrice=50` |
| `maxDelivery` | `maxDelivery=48` (giờ, phải là 24/48/72/120/168) |
| `available` | `available=1` |
| `sort` | `recommended` · `price-asc` · `price-desc` · `fastest` · `newest` |
| `page` | `page=2` |

Trả về `{ talents, total, page, pageSize }`. Giá trị không hợp lệ bị bỏ qua (dùng mặc định), không gây lỗi. Ký tự `%` và `_` trong `q` được hiểu theo đúng nghĩa đen, không phải ký tự đại diện.

## File

| File | Vai trò |
|---|---|
| `src/lib/talents.js` | Truy vấn danh sách, lọc, sắp xếp, profile công khai |
| `src/app/api/talents/route.js` | API danh sách |
| `src/components/talent/TalentDirectory.jsx` | Banner, tìm kiếm, bộ lọc, danh sách, phân trang |
| `src/components/talent/TalentCard.jsx` | Thẻ talent |
| `src/app/talents/[username]/page.jsx` | Trang profile công khai |
| `src/app/(freelancer)/freelancer-1/page.jsx` | Gắn `TalentDirectory` |

`Listing13.jsx` (danh sách mẫu cũ) đã bị xoá. Các trang mẫu khác như `/freelancer-2`, `/freelancer-single/...` vẫn dùng dữ liệu mẫu và không thay đổi.

## Đã kiểm tra

- Tạo 14 talent hoàn chỉnh qua API thật. Gọi API với từng bộ lọc, từng kiểu sắp xếp, phân trang, tìm kiếm, và tham số rác: tất cả đúng.
- Trên trình duyệt Edge: lọc Role, Clear all, tìm kiếm, sắp xếp, chuyển sang trang 2, mở link có sẵn bộ lọc, bấm View Profile.
- Dữ liệu trộn (2 profile hoàn chỉnh, 1 profile một phần, 1 tài khoản trống, cùng tài khoản thật): cả 5 đều hiện, profile hoàn chỉnh xếp đầu, người chưa có giá nằm cuối khi sắp xếp theo giá. Thẻ và trang công khai chỉ hiện trường đã điền. Username không tồn tại: 404.

Dữ liệu test đã được xoá sau khi kiểm tra.

## Chưa làm

- Nút liên hệ hoặc thuê talent trên trang profile công khai.
- Rating, số review, số job đã hoàn thành (cần làm tính năng đơn hàng và đánh giá trước).
- Các link trong menu và trang chủ vẫn trỏ tới `/freelancer-1`. Có thể đổi thành `/talents` cho dễ nhớ.
