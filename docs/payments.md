# Thanh toán PayPal cho Job

> **Trạng thái (2026-10-11): đã triển khai trên Sandbox**, chưa test hết luồng bằng trình duyệt (xem §13).

## 13. Đã triển khai

| Phần | File |
|---|---|
| Migration | `db/010_payments.sql` (đã chạy trên Render) |
| Gọi PayPal | `src/lib/paypal.js`: token, auth assertion, partner referral, order / authorize / capture / void, xác minh webhook. Có `PayPal-Request-Id` cố định và `Prefer: return=representation` |
| Nghiệp vụ | `src/lib/payments.js`: kết nối PayPal, Hire & pay, capture, void, webhook, chặn xoá |
| Luồng job | `src/lib/jobs.js`: Approve capture **trước** khi Completed; `autoApproveDueJobs()`; `resolveDispute()` (pay / release → `cancelled`); `getOpenDisputes()` |
| API | `/api/paypal/onboard`, `/onboard/return`, `/onboard/refresh`, `/api/proposals/{id}/checkout`, `/api/paypal/webhook`, `/api/cron/daily`, `/api/admin/jobs/{id}` |
| Giao diện | Thẻ **Connect PayPal** trên My Profile (thay ô PayPal email), `/paypal-connected`; nút **Hire & pay** (`HireAndPay.jsx`) thay Accept; khối Payment thật trên trang job; "You receive ≈" và giới hạn 25 ngày trong form proposal; trang **`/admin/disputes`**; trang **`/terms`** viết lại theo §12 |
| Cron | `vercel.json`: `/api/cron/daily` lúc 01:00 UTC mỗi ngày (gói Hobby, giờ chạy không chính xác) |

Quyết định khi triển khai:
- Dùng lại app **Platform Partner App** của demo (partner `59SRQD4T47KY4`). Credential chép vào `.env.local` của ShortWorks (không commit).
- Webhook sandbox `2J565532KN297751G` trỏ tới `https://pay-pal-short-work-project.vercel.app/api/paypal/webhook`, tạo bằng API.
- `ADMIN_EMAILS`: email của tài khoản kelvinClient (giá trị thật trong `.env.local` và trên Vercel).
- Phí sàn 5% (`PLATFORM_FEE_PERCENT`, trước 2026-10-12 là 10%; phí chốt lúc thuê nên job cũ giữ 10%), 25 ngày, 48 giờ duyệt (`AUTO_APPROVE_HOURS`), 48 giờ xử khiếu nại và công thức ước tính phí PayPal (3.49% + $0.29, khớp $0.64 cho $10 trên Sandbox) là **hằng số trong `src/data/projectOptions.js`**, không phải biến môi trường, vì form proposal (chạy trên trình duyệt) cũng cần.
- Đã xoá 2 job test cũ (proposal 3 và 22) vì không có thanh toán.
- Project / tài khoản đã có tiền giữ hoặc đã trả **không xoá được** (409), chỉ Close.

Sửa sau khi rà soát (2026-10-12):
- **Khoản giữ mất ngoài ShortWorks → job bị huỷ.** Webhook `PAYMENT.AUTHORIZATION.VOIDED` mà ShortWorks không tự void, hoặc cron thấy authorization `EXPIRED` / `VOIDED` / `DENIED`: `cancelJobForLostPayment()` (`lib/jobs.js`) chuyển job sang `cancelled`, ghi sự kiện `payment_voided` / `payment_expired` và báo cả hai bên. Trước đây job vẫn chạy và chỉ lỗi lúc Approve.
- **Undo hire:** `undoHire()` đổi proposal về `pending` / `declined` trước (cùng câu lệnh với điều kiện "chưa giao bài"), rồi mới void; void lỗi thì trả lại `accepted`.
- **Tạo order có `PayPal-Request-Id`:** cố định theo proposal + số tiền + freelancer + giờ hiện tại (lần thử sau một lần thất bại / đã void thì id mới). Bấm 2 lần hoặc mở 2 tab nhận cùng một order.
- **Refund:** webhook `PAYMENT.CAPTURE.REFUNDED` hỏi lại capture trên PayPal và lưu `refunded` / `partially_refunded`. Không cần migration (cột `status` là VARCHAR). Webhook sandbox đã đăng ký sẵn event này (kiểm tra 2026-10-12).

---

# Đề xuất ban đầu

Đề xuất đưa thanh toán thật vào luồng job của ShortWorks, dựa trên demo đã chạy trên PayPal Sandbox: [KelvinTrinhSG/Paypal-Hackathon-Test-01](https://github.com/KelvinTrinhSG/Paypal-Hackathon-Test-01), thư mục `paypal-contract-demo/` (bản v2 "Platform").

**Tóm tắt:** dùng mô hình **PayPal Multiparty (app Platform)**.
- Freelancer **kết nối tài khoản PayPal** một lần.
- Khi người thuê bấm **Hire**, PayPal **giữ tiền** (authorize) nhưng chưa thu.
- Khi người thuê bấm **Approve & Complete**, ShortWorks **capture**. PayPal chuyển tiền thẳng vào tài khoản freelancer và cắt **phí sàn** về tài khoản ShortWorks.
- Huỷ trước khi xong thì **void**: khoản giữ được giải phóng, không ai bị trừ tiền.

ShortWorks không bao giờ cầm tiền của người khác. Tiền đi thẳng từ người thuê sang freelancer, ShortWorks chỉ nhận phần phí sàn.

---

## 1. Demo đã chứng minh được gì

| Hạng mục | Kết quả trong demo | Nguồn |
|---|---|---|
| Lấy access token, tạo order `AUTHORIZE` | ✅ Chạy trên Sandbox | `lib/paypal.ts` |
| Authorize rồi capture (bản v1, tiền về nền tảng) | ✅ Đã capture thật (`COMPLETED`) | CHAT_LOG §9 |
| Onboarding freelancer bằng Partner Referrals | ✅ Tài khoản Business **VN** kết nối được, rủi ro khu vực không xảy ra trên Sandbox | CHAT_LOG §17 |
| Xác minh freelancer bằng Merchant Integrations (`payments_receivable`, `primary_email_confirmed`) | ✅ | `lib/freelancer.ts` |
| Authorize cho đúng freelancer (`payee.merchant_id` + `PayPal-Auth-Assertion`) | ✅ Sau khi sửa lỗi 404 (commit cuối `6c2da2a`) | CHAT_LOG §20 |
| **Capture có `platform_fees` (chia tiền thật), kịch bản F** | ✅ **Đã chạy ngày 2026-10-07** (xem bảng dưới) | `data/contracts.json` trong thư mục local, cùng `GET /v2/payments/captures/{id}` |
| Void (kịch bản G) và chặn sai luồng (kịch bản H) | ❓ Không có dấu vết trong `data/`: chưa có hợp đồng v2 nào bị void | — |

Kết quả kịch bản F, kiểm tra lại với PayPal Sandbox ngày 2026-10-11 bằng `GET /v2/payments/captures/32827723UX8248025` (chạy khi phí sàn còn 10%; với 5% hiện nay, $10 → phí sàn $0.50, freelancer nhận ≈ $8.86):

| | Số tiền | Ai nhận |
|---|---|---|
| Người thuê trả (gross) | **$10.00** | — |
| Phí PayPal | −$0.64 | PayPal |
| Phí sàn 10% | −$1.00 | Tài khoản nền tảng `59SRQD4T47KY4` (Business US) |
| **Freelancer thực nhận** | **$8.36** | Freelancer `QN499TC22RGYA` (Business **VN**) |

- Capture `COMPLETED`, `final_capture: true`, `disbursement_mode: INSTANT`. Authorization `91109262RU883092C` chuyển sang `CAPTURED`.
- Chiều tiền **US (nền tảng) ↔ VN (freelancer)** chạy được trên Sandbox. Live vẫn phải hỏi PayPal (R1 trong PLAN_PLATFORM).
- Phí PayPal **trừ vào phần freelancer**: $10 tiền làm, freelancer nhận $8.36 (83.6%). Cần hiện rõ con số này cho freelancer (xem Q1).

> **Lỗi trong demo cần sửa khi mang sang:** demo lưu `gross / paypal_fee / platform_fee / net` từ phản hồi capture, nhưng cả 4 trường đều trống trong `contracts.json`. Nguyên nhân: mặc định PayPal chỉ trả phản hồi rút gọn (`id`, `status`, `links`), nên không có `seller_receivable_breakdown`. Cách sửa: gửi header **`Prefer: return=representation`** khi capture, hoặc gọi `GET /v2/payments/captures/{id}` ngay sau đó.

### Bài học từ demo nên giữ nguyên

1. **Gửi `PayPal-Auth-Assertion` nhất quán ở mọi lệnh liên quan freelancer**, kể cả lúc *tạo order*. Order tạo mà thiếu header này thì lúc authorize sẽ bị 404 `RESOURCE_NOT_FOUND`.
2. **Không tin `return_url`.** PayPal thường không tự quay về `return_url` sau khi freelancer kết nối. Phải tra `tracking_id` bằng Merchant Integrations: mở popup, hỏi lại mỗi 3 giây, kèm nút "Kiểm tra lại".
3. **Số tiền và phí sàn do backend quyết định**, chốt lúc tạo order. Trình duyệt chỉ gửi id.
4. Tắt **Payment Review** trên tài khoản Personal sandbox, nếu không giao dịch sẽ bị treo ở `PENDING`.

### Phần của demo **không** mang sang được

| Demo | Lý do | ShortWorks dùng gì |
|---|---|---|
| Lưu dữ liệu vào file JSON trong `data/` | Vercel không giữ file | Postgres trên Render (đã có) |
| Admin đăng nhập bằng Basic Auth, tự bấm Capture | Ở ShortWorks, người thuê tự nghiệm thu | Capture tự động khi người thuê Approve. Chỉ khi có khiếu nại mới cần admin |
| Freelancer không đăng nhập, chọn danh tính bằng `localStorage` | ShortWorks đã có tài khoản | Dùng session hiện có |
| `PayPal-Request-Id` là UUID ngẫu nhiên mỗi lần gọi | Bấm 2 lần sẽ ra 2 id khác nhau, không chống trùng được | Id cố định theo job, ví dụ `sw-capture-{jobId}` (xem §6) |
| Số tiền cố định `$10` | — | Giá đã chốt trong proposal × số video |

---

## 2. Luồng tiền gắn vào luồng job hiện có

```
Proposal pending
   │  Người thuê bấm "Hire & pay $X" → nút PayPal → phê duyệt
   ▼
[authorize] Tiền được GIỮ ── Job: IN PROGRESS ────────────┐
   │                                                       │ Undo (chưa giao bài) / huỷ job
   │  Freelancer Submit → SUBMITTED                        ▼
   │  Người thuê Request changes → IN PROGRESS          [void] Giải phóng khoản giữ
   ▼
Người thuê "Approve & Complete"
   ▼
[capture + platform_fees] → Freelancer nhận (X − phí sàn − phí PayPal)
   │                         ShortWorks nhận phí sàn
   ▼
Job: COMPLETED · Payment: PAID

Khiếu nại (DISPUTED): giữ nguyên khoản authorize. Admin quyết định capture hoặc void.
```

| Sự kiện trong ShortWorks (đã có) | Gọi PayPal | Trạng thái thanh toán |
|---|---|---|
| Người thuê **Accept** proposal → đổi thành **Hire & pay** | `POST /v2/checkout/orders` (intent `AUTHORIZE`, `payee.merchant_id` = freelancer) → trình duyệt approve → `POST /orders/{id}/authorize` | `authorized` |
| **Undo** việc thuê (chỉ được khi chưa giao bài, `canUndoAcceptance()`) | `POST /v2/payments/authorizations/{id}/void` | `voided` |
| Freelancer **Submit** / người thuê **Request changes** | Không gọi | giữ `authorized` |
| Người thuê **Approve & Complete** | `POST /authorizations/{id}/capture` kèm `platform_fees` | `captured` (lưu gross / phí PayPal / phí sàn / net) |
| **Open dispute** | Không gọi, tiền vẫn bị giữ | `authorized` (on hold) |
| Admin xử lý khiếu nại | Capture (freelancer đúng) hoặc void (người thuê đúng) | `captured` / `voided` |

**Điểm mấu chốt:** Accept và trả tiền gộp thành **một bước**. Proposal chỉ thành `accepted` (tức job bắt đầu) **sau khi** authorize thành công. Nếu không, sẽ có job đang chạy mà không có tiền giữ.

---

## 3. Giới hạn thời gian của authorize (rủi ro lớn nhất)

- Một authorization **hết hạn sau 29 ngày**. Trong đó chỉ **3 ngày đầu** (honor period) là chắc chắn capture được. Sau 3 ngày, PayPal vẫn cố capture, nhưng có thể thất bại nếu tài khoản hay thẻ của người thuê không đủ tiền.
- Video ngắn thường giao trong vài ngày đến 2 tuần, nên phần lớn job nằm trong 29 ngày.

**Đã chốt cho bản đầu (Q2, Q3):**
1. **Ngày giao tối đa 25 ngày**, để còn 4 ngày dự phòng cho việc duyệt bài và tự Approve trước khi authorization hết hạn ở ngày 29.
   - Khi freelancer gửi hoặc sửa proposal: ngày giao phải ≤ hôm nay + 25 ngày (và vẫn ≤ hạn chót dự án như hiện nay). Thêm vào `validateProposal()` và hiện giới hạn ngay trên ô chọn ngày.
   - Khi người thuê bấm **Hire & pay**: kiểm tra lại ngày giao ≤ hôm nay + 25 ngày, vì proposal có thể đã nằm chờ nhiều ngày. Nếu vượt, nút bị khoá kèm lời nhắn "Ask the freelancer to update the delivery date". Proposal còn `pending` nên freelancer sửa được.
2. Lưu `expiration_time` và hiện cho cả hai bên ("Payment held until Nov 8").
3. Một tác vụ chạy hằng ngày (Vercel Cron) làm 2 việc:
   - **Tự Approve sau 48 giờ:** job ở **Submitted** mà người thuê không Approve hay Request changes trong **48 giờ** kể từ lần giao gần nhất → tự Approve và capture (freelancer bấm **Claim payment** trên trang job ngay khi hết 48 giờ, hoặc cron hằng ngày làm thay), ghi sự kiện `auto_approved` vào `job_events`, báo cho cả hai bên. Job đang **Disputed** thì không tự Approve. Trang job hiện đếm ngược cho người thuê: "Auto-approves in 2 days".
   - Authorization còn ≤ 3 ngày là hết hạn mà job chưa xong (ví dụ đang khiếu nại) → báo cho admin và cả hai bên.

**Bản sau, nếu cần job dài hơn 25 ngày:** chuyển sang **Delayed disbursement**.
- Cách làm: capture ngay khi Hire, nhưng PayPal giữ phần của freelancer lại. Khi người thuê Approve, ShortWorks giải ngân bằng `POST /v1/payments/referenced-payouts-items`.
- Ưu điểm: tiền đã chắc chắn được thu.
- Nhược điểm: PayPal **tự giải ngân sau 28 ngày** dù job chưa xong. Huỷ job phải **refund** (mất phí) thay vì void. Demo chưa thử cách này.

---

## 4. Database — đề xuất `db/010_payments.sql`

**Freelancer kết nối PayPal** (thay cho ô nhập `paypal_email` hiện tại trên trang profile):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_tracking_id     UUID;          -- gửi PayPal lúc onboarding
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_merchant_id     VARCHAR(32);   -- có sau khi kết nối
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_status          VARCHAR(20) NOT NULL DEFAULT 'not_connected';
                                                                                  -- not_connected | pending | ready | blocked
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_checked_at      TIMESTAMPTZ;
```

`ready` = có `paypal_merchant_id` **và** `payments_receivable` **và** `primary_email_confirmed`.

**Khoản thanh toán của mỗi job** (1 job = 1 proposal được thuê):

```sql
CREATE TABLE IF NOT EXISTS job_payments (
    id                 SERIAL PRIMARY KEY,
    proposal_id        INTEGER NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE RESTRICT,
    seller_merchant_id VARCHAR(32)   NOT NULL,       -- chốt lúc tạo order
    order_id           VARCHAR(40)   NOT NULL UNIQUE,
    authorization_id   VARCHAR(40),
    capture_id         VARCHAR(40),
    currency           CHAR(3)       NOT NULL DEFAULT 'USD',
    amount             NUMERIC(10,2) NOT NULL,       -- giá × số video, chốt lúc tạo order
    platform_fee       NUMERIC(10,2) NOT NULL,       -- chốt lúc tạo order
    status             VARCHAR(20)   NOT NULL,       -- created | authorized | captured | voided | expired | failed
    expires_at         TIMESTAMPTZ,                  -- expiration_time của authorization
    gross_amount       NUMERIC(10,2),                -- seller_receivable_breakdown sau capture
    paypal_fee         NUMERIC(10,2),
    net_to_freelancer  NUMERIC(10,2),
    last_debug_id      VARCHAR(40),                  -- debug_id của lỗi gần nhất, để hỏi PayPal
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

- `ON DELETE RESTRICT`: **không xoá được** dự án hay tài khoản khi còn khoản thanh toán. Hiện các bảng khác dùng `CASCADE`, nên xoá dự án sẽ xoá luôn lịch sử tiền. Cần sửa: dự án đã có người thuê thì chỉ cho đóng, không cho xoá.
- Bảng này thay cho `pending-orders.json` của demo. Bản ghi `created` là order đã tạo nhưng người thuê chưa phê duyệt.

---

## 5. Backend

### `src/lib/paypal.js` (server-only)

Chép từ `paypal-contract-demo/lib/paypal.ts`, đổi sang JavaScript:
- `getAccessToken()` (cache token)
- `buildAuthAssertion()`
- `paypalFetch()`
- `createPartnerReferral()`, `getMerchantIntegration()`, `findMerchantIdByTrackingId()`
- `createOrder()`, `authorizeOrder()`, `captureAuthorization()`, `voidAuthorization()`, `getAuthorization()`

Thay đổi so với demo:
- `createOrder({ sellerMerchantId, amount, referenceId })`: số tiền lấy từ proposal. `reference_id = "job-{proposalId}"`, thêm `description` là tên dự án để hiện trong popup PayPal.
- `paypalFetch(..., { requestId })`: id chống trùng **cố định** do bên gọi truyền vào (xem §6).
- Gửi `Prefer: return=representation` cho authorize và capture, để có `expiration_time` và `seller_receivable_breakdown` ngay trong phản hồi (demo bị thiếu, xem §1).

### API mới

| Method | Endpoint | Ai gọi | Việc làm |
|---|---|---|---|
| `POST` | `/api/paypal/onboard` | Freelancer | Tạo `paypal_tracking_id`, gọi Partner Referrals, trả `actionUrl` (mở popup) |
| `GET` | `/api/paypal/onboard/return` | PayPal chuyển hướng về | Tra lại theo `tracking_id`, cập nhật `paypal_status`, trả trang nhỏ báo kết quả cho cửa sổ chính |
| `POST` | `/api/paypal/onboard/refresh` | Freelancer | Hỏi lại PayPal (popup dừng giữa chừng, hoặc vừa xác nhận email) |
| `POST` | `/api/proposals/{id}/checkout` | Chủ dự án | Kiểm tra proposal còn `pending`, dự án còn mở, freelancer `ready` → tạo order → lưu `job_payments(created)` → trả `{ orderId }` |
| `POST` | `/api/proposals/{id}/checkout/authorize` | Chủ dự án | Authorize. Trong cùng transaction: `job_payments → authorized`, `proposals → accepted` (`accepted_at`), thông báo cho freelancer |
| `POST` | `/api/paypal/webhook` | PayPal | Xác minh chữ ký (`/v1/notifications/verify-webhook-signature`), đồng bộ trạng thái: `PAYMENT.AUTHORIZATION.VOIDED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `MERCHANT.ONBOARDING.COMPLETED` |

### Sửa code hiện có

| Chỗ | Thay đổi |
|---|---|
| `PATCH /api/proposals/{id}` `{status: "accepted"}` | **Không cho** Accept trực tiếp nữa: phải đi qua checkout. Decline vẫn giữ nguyên |
| `PATCH /api/proposals/{id}` Undo một proposal đã thuê | Void trước, thành công mới đổi về `pending` |
| `runJobAction("approve")` trong `lib/jobs.js` | Capture **trước**, thành công mới chuyển job sang `completed`. Capture lỗi thì job vẫn `submitted`, báo lỗi kèm `debug_id` |
| `getJob()` | Trả thêm `payment` cho khối Payment trên `/jobs/{id}` |

---

## 6. Chống trùng và thứ tự ghi

- **PayPal-Request-Id cố định theo việc:** `sw-order-{proposalId}-{n}`, `sw-auth-{orderId}`, `sw-capture-{jobId}`, `sw-void-{authId}`. Người dùng bấm 2 lần, hoặc server gửi lại khi bị timeout, thì PayPal trả **cùng một kết quả** thay vì capture 2 lần.
- **Khoá dòng khi đổi trạng thái:** dùng `UPDATE job_payments SET status = 'capturing' WHERE id = $1 AND status = 'authorized'`. Chỉ request nào đổi được trạng thái mới gọi PayPal, giống cách `runJobAction` đang khoá theo `job_status`.
- **Gọi PayPal xong mới ghi "đã xong".** Nếu PayPal thành công mà ghi database lỗi, webhook và nút "Làm mới từ PayPal" (`GET /authorizations/{id}`) sẽ đồng bộ lại.

---

## 7. Giao diện

| Trang | Thay đổi |
|---|---|
| **My Profile** (freelancer) | Thay ô "PayPal email" bằng thẻ **Connect PayPal**: chưa kết nối → nút mở popup; `ready` → "Ready to get paid · merchant …"; `blocked` → lý do (chưa xác nhận email…) và nút "Check again" |
| **Gửi proposal** | Freelancer chưa kết nối vẫn gửi được, nhưng có nhắc: "Connect PayPal so the client can hire you". Ngay dưới ô giá hiện bảng **ước tính** cập nhật theo giá đang nhập (Q1): "Client pays $10.00 · Platform fee (5%) −$0.50 · PayPal fee ≈ −$0.64 · **You receive ≈ $8.86**". Ô chọn ngày giao giới hạn tối đa hôm nay + 25 ngày (Q2) |
| **Proposals** (người thuê, trang dự án) | Nút **Accept** thành **Hire & pay $X**, mở hộp có nút PayPal (SDK tải theo `merchant-id` của freelancer; đổi freelancer thì tải lại SDK như demo). Freelancer chưa kết nối thì nút bị khoá kèm lời giải thích |
| **Job — khối Payment** | `authorized`: "**$X held by PayPal** · until {ngày}". `captured`: bảng **Gross / PayPal fee / Platform fee / You receive**. `voided`: "Released, nobody was charged". Bỏ dòng "Payment through PayPal is coming soon." |
| **Approve & Complete** | Hộp xác nhận (đã dùng `confirmDialog`) ghi rõ "$X will be paid to {freelancer}" |
| **Admin** (mới, tối thiểu) | Danh sách job đang **Disputed** và khoản sắp hết hạn, kèm nút Capture / Void và ô ghi lý do quyết định (lưu vào `job_events`, cả hai bên đều thấy). Quyền admin theo danh sách email trong biến môi trường `ADMIN_EMAILS` |
| **`/terms`** (Q4) | Thay nội dung mẫu của template bằng điều khoản thật (xem §12). Form Open dispute và hộp Hire & pay có link "How disputes work" trỏ tới mục tương ứng |

---

## 8. Biến môi trường (Vercel và `.env.local`)

```env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=      # app Platform (sandbox trước)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
PAYPAL_PARTNER_MERCHANT_ID=        # Account ID của tài khoản ShortWorks (demo: 59SRQD4T47KY4)
PAYPAL_BN_CODE=                    # bắt buộc khi lên Live
PAYPAL_WEBHOOK_ID=                 # để xác minh chữ ký webhook
PLATFORM_FEE_PERCENT=10
PAYPAL_FEE_ESTIMATE_PERCENT=       # chỉ dùng cho "You receive ≈" (Q1, §11); chốt sau khi đo thêm
PAYPAL_FEE_ESTIMATE_FIXED=
APP_BASE_URL=https://<domain vercel>
ADMIN_EMAILS=
CRON_SECRET=                       # Vercel Cron gửi kèm, để chỉ cron gọi được route tự Approve
```

`MAX_DELIVERY_DAYS = 25` và `AUTO_APPROVE_DAYS = 3` (Q2, Q3) là hằng số trong `src/data/projectOptions.js`, cạnh các giới hạn khác, không cần biến môi trường.

> Client Secret của app sandbox đã bị dán vào chat khi làm demo (PLAN.md §0). Ngoài ra, `.env.local` của demo còn giữ Client ID / Secret của app **v1 (Merchant)** dạng dòng comment. File này không được commit (`.gitignore` có `.env*`), nhưng **nên tạo Secret mới cho cả hai app** trước khi dùng cho ShortWorks.
>
> Giá trị đã biết từ demo: `PAYPAL_PARTNER_MERCHANT_ID=59SRQD4T47KY4` (Business US "Platform Partner App"), `PLATFORM_FEE_PERCENT=10`. `PAYPAL_BN_CODE` đang **để trống**: Sandbox chạy được, Live thì bắt buộc.

---

## 9. Kiểm thử (Sandbox, 3 tài khoản như demo)

| # | Kịch bản | Kỳ vọng |
|---|---|---|
| P1 | Freelancer Connect PayPal | `ready`; người thuê thấy nút Hire & pay được bật |
| P2 | Hire & pay $X | Personal bị **giữ** $X (chưa trừ); job In progress; Payment "held" |
| P3 | Submit → Approve & Complete | Freelancer nhận X − phí sàn − phí PayPal; ShortWorks nhận phí sàn; Personal bị trừ $X. Với $10: $8.86 / $0.50 / $0.64 (demo chạy lúc phí 10%: $8.36 / $1.00 / $0.64). Khối Payment hiện đủ 4 con số |
| P4 | Hire → Undo trước khi giao bài | Void; không ai bị trừ tiền |
| P5 | Bấm Approve 2 lần / 2 tab | Chỉ 1 lần capture (409 cho lần sau) |
| P6 | Sửa `amount` trong request | Bị bỏ qua, backend dùng giá proposal |
| P7 | Freelancer chưa kết nối | Không tạo được order (409) |
| P8 | Khiếu nại | Không capture được bằng Approve; trang job hiện "We'll decide by {ngày giờ}" (lúc mở + 48 giờ, kể cả cuối tuần và ngày lễ); admin chỉ có Pay freelancer (capture toàn bộ) hoặc Release to client (void) |
| P9 | Webhook giả (sai chữ ký) | Bị từ chối |
| P10 | Proposal có ngày giao hôm nay + 26 ngày | Không gửi được; proposal cũ vượt 25 ngày thì nút Hire & pay bị khoá |
| P11 | Submit rồi để yên 3 ngày (giả lập bằng cách lùi `created_at` của sự kiện `submitted`, rồi chạy cron bằng tay) | Tự Approve, capture, cả hai bên nhận thông báo; job đang Disputed thì không bị tự Approve |
| P12 | Gõ giá $10 trong form proposal | Hiện "You receive ≈ $8.86"; sau capture, khối Payment hiện số chính xác |

---

## 10. Thứ tự làm đề xuất

1. ~~Chạy kịch bản F của demo~~: **đã xong** (§1). Còn nên chạy nhanh kịch bản **G (void)** trong demo trước khi làm bước Undo. *(1 giờ)*
2. Migration `010_payments.sql` và `src/lib/paypal.js`. *(1 ngày)*
3. Onboarding freelancer: API và thẻ Connect PayPal trên My Profile. *(1 ngày)*
4. Proposal: giới hạn ngày giao 25 ngày và bảng ước tính "You receive". *(nửa ngày)*
5. Hire & pay: checkout, authorize, sửa Accept/Undo. *(1–2 ngày)*
6. Capture khi Approve, khối Payment thật trên trang job. *(1 ngày)*
7. Webhook, Vercel Cron (tự Approve sau 3 ngày, cảnh báo sắp hết hạn), trang admin tối thiểu cho khiếu nại. *(1–2 ngày)*
8. Trang `/terms` theo §12, link từ form khiếu nại và hộp Hire & pay. *(nửa ngày, cộng thời gian bạn duyệt nội dung)*
9. Chạy P1–P12, đối chiếu số dư 3 tài khoản Sandbox.

**Làm song song ngay từ bây giờ (Q5):** liên hệ PayPal để xin duyệt tài khoản Platform cho Live, cấp BN code, và hỏi về hỗ trợ freelancer khu vực VN cùng biểu phí thật.

---

## 11. Quyết định (đã chốt ngày 2026-10-11)

| # | Câu hỏi | Quyết định | Áp dụng ở |
|---|---|---|---|
| Q1 | Ai chịu phí sàn 5%? | **Trừ vào phần freelancer.** Người thuê trả đúng giá trong proposal. Freelancer chịu phí sàn 5% (trước 2026-10-12 là 10%) và phí PayPal ($10 → nhận ≈ $8.86). Form proposal hiện "You receive ≈ …" ngay khi nhập giá. Phí PayPal chỉ biết chính xác sau capture, nên lúc đó ghi là "khoảng" | §7 (Gửi proposal, Payment), §12 |
| Q2 | Giới hạn thời gian | **Ngày giao tối đa 25 ngày** cho bản đầu. Delayed disbursement để bản sau | §3, §9 P10 |
| Q3 | Tự Approve khi người thuê im lặng | **48 giờ** kể từ lần giao gần nhất (trước đây 3 ngày). Không áp dụng khi đang khiếu nại | §3, §9 P11 |
| Q4 | Ai xử lý khiếu nại | **Admin là đội ShortWorks**, theo điều khoản viết ở `/terms` | §7 (Admin, `/terms`), §12 |
| Q6 | Thời hạn xử lý khiếu nại | **2 ngày (48 giờ)** kể từ khi mở, **tính cả cuối tuần và ngày lễ** (đội làm việc mọi ngày) | §12 |
| Q7 | Chia một phần tiền khi khiếu nại? | **Không.** Trả hết cho một bên: capture toàn bộ hoặc void | §7 (Admin), §12 |
| Q5 | Lên Live | Đã nắm: cần PayPal duyệt tài khoản Platform và cấp BN code. Liên hệ PayPal song song với lúc làm | §10 |

### Ước tính "You receive" (Q1)

```
youReceive ≈ amount − round(amount × PLATFORM_FEE_PERCENT / 100, 2) − paypalFeeEstimate(amount)
```

- `paypalFeeEstimate` lấy từ 2 biến môi trường `PAYPAL_FEE_ESTIMATE_PERCENT` và `PAYPAL_FEE_ESTIMATE_FIXED`, không viết cứng trong code, vì phí thật phụ thuộc quốc gia của tài khoản freelancer và loại giao dịch.
- Sandbox thu **$0.64 cho $10**. Con số này khớp cả "2.9% + $0.35" lẫn "3.49% + $0.29", nên chưa đủ để suy ra công thức. Cần chạy thêm 1–2 giao dịch với số tiền khác (ví dụ $50, $100) trên Sandbox, và hỏi PayPal biểu phí Live cho tài khoản VN (Q5).
- Một job là **một giao dịch**, nên phần phí cố định chỉ tính 1 lần cho cả job, dù có nhiều video.

---

## 12. Nội dung cần có trên `/terms` (Q4)

Đây là dàn ý để viết điều khoản, **chưa phải văn bản pháp lý**. Nên nhờ người có chuyên môn xem lại trước khi lên Live.

1. **Phí:** người thuê trả đúng giá đã thoả thuận trong proposal. ShortWorks thu phí sàn 5%, trừ vào khoản freelancer nhận. Phí xử lý của PayPal cũng trừ vào khoản freelancer nhận.
2. **Giữ tiền:** khi thuê, PayPal giữ (authorize) toàn bộ số tiền trên tài khoản người thuê. Tiền chỉ bị thu khi công việc được duyệt, và được giải phóng nếu huỷ trước khi freelancer giao bài.
3. **Thời hạn:** ngày giao tối đa 25 ngày kể từ khi thuê. Người thuê có 48 giờ để duyệt hoặc yêu cầu sửa sau mỗi lần giao. Quá hạn đó, công việc được tự động duyệt và thanh toán.
4. **Yêu cầu sửa:** người thuê ghi rõ cần sửa gì. Yêu cầu phải nằm trong phạm vi brief ban đầu.
5. **Khiếu nại:**
   - Ai mở được và khi nào: cả hai bên, khi job đang In progress hoặc Submitted.
   - Cần cung cấp: lý do và mô tả. Bằng chứng là lịch sử trên trang job (brief, các lần giao, yêu cầu sửa, ghi chú).
   - Trong lúc khiếu nại: tiền vẫn bị giữ, không tự duyệt.
   - Đội ShortWorks xem xét và đưa ra quyết định trong **2 ngày (48 giờ)** kể từ khi khiếu nại được mở, **kể cả cuối tuần và ngày lễ**.
   - Quyết định chỉ có một trong hai: **thanh toán toàn bộ cho freelancer** (capture) hoặc **giải phóng toàn bộ cho người thuê** (void). **Không chia một phần.**
   - Bên mở khiếu nại có thể rút lại bất cứ lúc nào trước khi có quyết định.
6. **Giới hạn của ShortWorks:** ShortWorks không giữ tiền của người dùng. Tiền đi trực tiếp qua PayPal, và các tranh chấp thanh toán ngoài nền tảng tuân theo chính sách của PayPal.

**Đã chốt (2026-10-11):** xử lý khiếu nại trong **2 ngày (48 giờ), tính cả cuối tuần và ngày lễ**; trả hết cho một bên, **không chia một phần**.

Hệ quả cho phần làm:
- Trang admin chỉ cần 2 nút **Pay freelancer** (capture toàn bộ) và **Release to client** (void), không cần ô nhập số tiền.
- Mỗi khiếu nại có **hạn xử lý** = lúc mở + **48 giờ**. Không cần lịch ngày nghỉ hay ngày lễ: tính bằng `created_at + interval '48 hours'` của sự kiện `dispute_opened`. Trang admin sắp xếp theo hạn này và tô đỏ khiếu nại đã quá hạn. Cả hai bên thấy "We'll decide by {ngày giờ}" trên trang job.
- **Hết hạn authorization:** trường hợp xấu nhất là khiếu nại mở ở cuối thời gian duyệt (giao ngày 25 + 2 ngày duyệt = ngày 27). Cộng thêm 48 giờ là ngày 29, sát hạn ngày 29. Nếu authorization hết hạn trước khi admin quyết, tiền tự được giải phóng (người thuê thắng mặc định). Vì vậy, khi authorization còn **< 48 giờ**, hạn xử lý khiếu nại lấy theo hạn của authorization, cái nào sớm hơn thì dùng cái đó. Trang admin đưa những khiếu nại này lên đầu và ghi rõ "Payment hold expires {ngày giờ}".

## Tài liệu tham khảo

- Demo: `PLAN.md`, `PLAN_PLATFORM.md`, `CHAT_LOG.md`, `paypal-contract-demo/lib/paypal.ts` trong repo Paypal-Hackathon-Test-01
- Multiparty checkout: https://developer.paypal.com/docs/multiparty/checkout/standard/integrate/
- Seller onboarding: https://developer.paypal.com/docs/multiparty/seller-onboarding/before-payment/
- Authorize & capture: https://developer.paypal.com/docs/api/payments/v2/
- Delayed disbursement: https://developer.paypal.com/docs/multiparty/checkout/delayed-disbursement/
- Webhooks: https://developer.paypal.com/api/rest/webhooks/
