# Thanh toán Job bằng USDC trên Arc

> **Trạng thái (2026-10-12): đã triển khai. Testnet: `0xDCbD230Ee76458993cf2624c94530681e79BbC63` (block 66756024). Mainnet: `0xe69C9077b3F12939EFCd673171A4489f0f1370da` (block 25527141).** Đi kèm với thanh toán PayPal ([payments.md](payments.md)), không thay thế. Người thuê chọn một trong hai khi bấm Hire. **Contract chưa audit** (§11).
>
> | Phần | File |
> |---|---|
> | Contract + test (Foundry) + script deploy | [`contracts/`](../contracts) (`src/ShortWorksEscrow.sol`, `test/`, `script/Deploy.s.sol`) |
> | ABI dùng trong app | `src/data/arcEscrowAbi.json` (`cd contracts && npm run export-abi`) |
> | Mạng (testnet / mainnet) | `src/data/arc.js` |
> | Gọi chain (server) | `src/lib/arc.js` |
> | Luồng tiền (server) | `src/lib/arcPayments.js`; nối vào job ở `src/lib/jobs.js` |
> | MetaMask (trình duyệt) | `src/lib/metamask.js` |
> | API | `POST /api/proposals/{id}/arc-checkout`, `GET/POST/DELETE /api/arc/wallet` |
> | Giao diện | `HireWithArc.jsx`, `JobActions.jsx`, `ArcWallet.jsx`, khối Payment trên `/jobs/{id}`, `/terms#arc` |
> | Database | `db/012_arc_payments.sql` |

**Tóm tắt:** dùng **một smart contract escrow** (ký quỹ) trên Arc, đóng vai trò giống "authorize / capture / void" của PayPal:

| PayPal | Arc |
|---|---|
| Authorize: PayPal giữ tiền trên tài khoản người thuê | `fund`: USDC chuyển từ ví người thuê vào contract escrow |
| Capture: tiền về freelancer, phí sàn về ShortWorks | `release`: contract chuyển phần freelancer và phí sàn cùng lúc |
| Void: giải phóng khoản giữ | `refund`: contract trả toàn bộ USDC về ví người thuê |
| Authorization hết hạn sau 29 ngày | Không có giới hạn của PayPal. Chỉ có một mốc an toàn (`expiresAt`) do ShortWorks đặt, xem §5 |

ShortWorks **không cầm tiền**: USDC nằm trong contract, và code của contract quy định tiền chỉ được đi tới đúng ví freelancer, ví người thuê hoặc ví phí sàn.

---

## 1. Phải tạo bao nhiêu smart contract?

**ShortWorks chỉ cần viết và deploy 1 smart contract: `ShortWorksEscrow`.**

| Contract | Ai tạo | Tác dụng |
|---|---|---|
| **`ShortWorksEscrow`** | **ShortWorks viết và deploy** | Giữ USDC của từng job, rồi trả cho freelancer (kèm phí sàn) hoặc hoàn lại cho người thuê. Chi tiết ở §2 |
| USDC (`0x3600000000000000000000000000000000000000`) | Có sẵn trên Arc (Circle) | Đồng tiền dùng để thanh toán. Contract escrow chỉ gọi `transferFrom` / `transfer` / `permit` của nó. **Không tạo mới** |
| Thư viện OpenZeppelin (`SafeERC20`, `AccessControl`, `Pausable`, `ReentrancyGuard`, `EIP712`, `ECDSA`) | Có sẵn | Được biên dịch **vào bên trong** `ShortWorksEscrow`, không deploy riêng |
| Ví multisig (Safe) cho quyền admin và ví nhận phí | Có sẵn (nếu Safe đã hỗ trợ Arc) | Không phải contract của ShortWorks. Nếu Safe chưa có trên Arc thì dùng ví phần cứng (hardware wallet) |

### Vì sao không cần thêm contract

| Phương án thêm contract | Lý do không chọn |
|---|---|
| Factory, mỗi job một contract riêng | Tốn gas deploy cho từng job, khó theo dõi. Một contract giữ nhiều job (map theo `jobId`) là đủ, và mỗi job vẫn tách bạch số dư |
| Contract riêng để gom phí sàn (fee vault) | Phí chuyển thẳng vào một **địa chỉ ví** `treasury`, không cần logic gì thêm |
| Contract riêng xử lý khiếu nại | Khiếu nại xử lý ngoài chuỗi (trang admin như PayPal). On-chain chỉ cần 2 quyết định `release` / `refund` mà `ShortWorksEscrow` đã có |
| Proxy để nâng cấp (upgradeable) | Thêm 1 contract và thêm rủi ro: ai giữ quyền nâng cấp thì có thể đổi luật giữ tiền. Muốn đổi luật thì deploy bản mới. Job cũ chạy hết trên contract cũ, vì mỗi khoản thanh toán lưu địa chỉ escrow của nó |
| Token riêng của ShortWorks | Không cần. Thanh toán bằng USDC |

---

## 2. `ShortWorksEscrow`: thiết kế chi tiết

### Dữ liệu mỗi job

```solidity
enum Status { None, Funded, Released, Refunded }

struct Job {
    address client;      // ví người thuê (người gửi USDC)
    address freelancer;  // ví nhận tiền, chốt lúc fund
    uint128 amount;      // tổng USDC (6 số lẻ), = giá × số video
    uint128 fee;         // phí sàn, chốt lúc fund (10% hiện nay)
    uint64  expiresAt;   // mốc an toàn: sau mốc này người thuê tự lấy lại được (§5)
    bool    frozen;      // đang khiếu nại: dừng đồng hồ expiresAt
    Status  status;
}

mapping(uint256 => Job) public jobs;   // jobId = job_arc_payments.escrow_job_id (không phải proposals.id)
```

**Vì sao `jobId` không phải `proposals.id`:** mỗi `jobId` chỉ fund được **một lần**. Nếu người thuê Undo hire (escrow `Refunded`) rồi thuê lại cùng proposal bằng Arc, contract sẽ báo `AlreadyFunded`. Vì vậy mỗi lần thanh toán lấy một số mới từ sequence `job_arc_escrow_job_id_seq`. Server còn đọc `jobs(id)` trên chain để chắc id chưa dùng, phòng trường hợp hai database (dev, prod) dùng chung một escrow testnet.

Bản triển khai thêm vào `Job` hai trường: `frozenAt` (thay cho `bool frozen`, để biết đã đóng băng bao lâu) và `treasury` (ví nhận phí, **chốt lúc fund**: đổi `treasury` sau đó không ảnh hưởng job đã fund).

### Hàm

| Hàm | Ai gọi | Tác dụng | Tương đương PayPal |
|---|---|---|---|
| `fundWithPermit(terms, serverSig, permit)` | Người thuê | Kiểm tra `serverSig` (ShortWorks đã ký điều khoản), dùng `permit` để được phép rút USDC rồi `transferFrom` vào contract. Job sang `Funded` | Authorize |
| `fund(terms, serverSig)` | Người thuê | Như trên nhưng người thuê `approve` USDC trước (2 giao dịch). Dự phòng cho ví không ký được `permit` | Authorize |
| `release(jobId)` | Người thuê, hoặc `OPERATOR` | Chuyển `amount − fee` cho freelancer, `fee` cho `treasury`. Job sang `Released` | Capture |
| `refund(jobId)` | `OPERATOR`, hoặc freelancer (tự nguyện trả lại) | Chuyển toàn bộ `amount` về người thuê. Job sang `Refunded` | Void |
| `reclaim(jobId)` | Người thuê | Chỉ khi đã quá `expiresAt` và job không bị `frozen`: tự lấy lại tiền, không cần ShortWorks | Hết hạn authorization |
| `setFrozen(jobId, bool)` | `OPERATOR` | Bật / tắt khi mở / rút khiếu nại. Lúc mở khiếu nại, đồng hồ `expiresAt` được lùi lại tương ứng | Khiếu nại giữ nguyên khoản authorize |
| `pause()` / `unpause()` | `ADMIN` | Chặn **fund mới** khi có sự cố. `release`, `refund`, `reclaim` **vẫn chạy**, để tiền đang giữ không bị kẹt | — |
| `setTreasury`, `setSigner`, quản lý role | `ADMIN` | Đổi ví nhận phí, khoá ký điều khoản, người vận hành | — |

**Điều khoản do ShortWorks ký (EIP-712), người thuê không sửa được:**

```solidity
struct Terms {
    uint256 jobId;
    address client;      // chỉ đúng ví này mới fund được
    address freelancer;  // ví freelancer đã lưu trên tài khoản (§4)
    uint128 amount;
    uint128 fee;
    uint64  expiresAt;
    uint64  signatureDeadline; // chữ ký chỉ dùng được trong 30 phút
}
```

Giống bài học PayPal "số tiền và phí do backend quyết định" (payments.md §1): trình duyệt chỉ chuyển tiếp chữ ký. Contract tự kiểm tra `msg.sender == terms.client`, chữ ký đúng `signer`, chưa quá `signatureDeadline`, và `jobs[jobId].status == None` (một job chỉ fund được một lần, nên không dùng lại chữ ký được).

### Role

| Role | Giữ bởi | Được làm |
|---|---|---|
| `ADMIN` | Multisig / ví phần cứng | Pause, đổi treasury, signer, cấp / thu role. **Không** rút được tiền của job |
| `OPERATOR` | Ví server của ShortWorks (khoá trong biến môi trường) | `release` khi tự Approve sau 48 giờ hoặc xử khiếu nại cho freelancer; `refund` khi Undo hire hoặc xử khiếu nại cho người thuê; `setFrozen` |
| `signer` | Khoá riêng của server (khác OPERATOR) | Chỉ ký `Terms`. Không gửi giao dịch |
| `treasury` | Ví nhận phí sàn | Chỉ nhận tiền |

**Giới hạn quan trọng:** dù là ADMIN hay OPERATOR, tiền của một job **chỉ đi được tới 3 địa chỉ đã chốt lúc fund**: `client`, `freelancer`, `treasury` (phần `fee`). Lộ khoá OPERATOR thì kẻ xấu chỉ có thể trả tiền sớm hoặc hoàn tiền sai, không lấy được tiền về ví mình.

### Event (backend đọc để đồng bộ database)

```solidity
event Funded(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount, uint256 fee, uint64 expiresAt);
event Released(uint256 indexed jobId, uint256 toFreelancer, uint256 fee, address by);
event Refunded(uint256 indexed jobId, uint256 amount, address by);
event Frozen(uint256 indexed jobId, bool frozen);
```

### Bảo mật trong code

- `SafeERC20` cho mọi lần chuyển USDC; `ReentrancyGuard` + đổi `status` **trước** khi chuyển tiền (checks-effects-interactions).
- Dùng **giao diện ERC-20 của USDC (6 số lẻ)**, không nhận USDC native qua `msg.value` (18 số lẻ). Contract không có hàm `payable`.
- `fee <= amount * MAX_FEE_BPS / 10000` (ví dụ tối đa 20%) để chữ ký sai không thể lấy phí quá mức.
- **Danh sách chặn của USDC:** Circle có thể chặn một địa chỉ. Nếu ví freelancer bị chặn thì `release` sẽ revert, tiền nằm lại trong contract. Khi đó admin xử lý như khiếu nại (`refund` về người thuê), hoặc freelancer đổi ví trước khi có job mới.

---

## 3. Luồng tiền gắn vào luồng job

```
Proposal pending
   │  Người thuê bấm "Hire & pay with Arc"
   │  1. Server kiểm tra (như hireBlocker) và ký Terms
   │  2. MetaMask: chuyển sang Arc → ký permit → gửi fundWithPermit
   │  3. Server đọc receipt, thấy event Funded khớp Terms
   ▼
[Funded] USDC nằm trong escrow ── Job: IN PROGRESS ─────────────┐
   │                                                              │ Undo (chưa giao bài)
   │  Freelancer Submit → SUBMITTED                               ▼
   │  Người thuê Request changes → IN PROGRESS          OPERATOR refund → [Refunded]
   ▼
Người thuê "Approve & Complete" → release từ ví người thuê
   (hoặc OPERATOR release sau 48 giờ im lặng)
   ▼
[Released] Freelancer nhận amount − fee · treasury nhận fee
Job: COMPLETED

Khiếu nại: OPERATOR setFrozen(true). Admin quyết: release (freelancer) hoặc refund (người thuê).
```

| Sự kiện ShortWorks | Trên chuỗi | Ai trả gas |
|---|---|---|
| Hire & pay with Arc | `fundWithPermit` | Người thuê |
| Undo hire (chưa giao bài) | `refund` | ShortWorks (OPERATOR) |
| Submit / Request changes | Không có | — |
| Approve & Complete | `release` từ ví người thuê | Người thuê |
| Tự Approve sau 48 giờ (cron, hoặc freelancer bấm Claim payment) | `release` | ShortWorks |
| Mở / rút khiếu nại | `setFrozen` | ShortWorks |
| Admin xử khiếu nại | `release` hoặc `refund` | ShortWorks |
| Quá `expiresAt`, không khiếu nại | `reclaim` | Người thuê |

**Gas trên Arc trả bằng USDC**, nên người thuê cần có thêm một ít USDC ngoài số tiền job, và ví OPERATOR cần được nạp USDC để trả gas. Trang Hire hiện rõ: "You need $X + a small network fee in USDC".

**Điểm mấu chốt giống PayPal:** proposal chỉ thành `accepted` **sau khi** server thấy event `Funded` khớp đúng Terms. Server không tin trình duyệt báo "đã trả": nó tự đọc receipt từ RPC Arc.

---

## 4. Ví của freelancer

- **Đã đổi so với thiết kế ban đầu (2026-10-12):** không ký tin nhắn nữa, vì MetaMask đôi khi lỗi. Trên `/pay-with-arc`, mọi tài khoản (freelancer và người thuê) có **một ví lưu trong `users.arc_wallet`**:
  - **Connect MetaMask thành công** thì lưu ngay địa chỉ đó, kể cả khi bước chuyển mạng của MetaMask bị lỗi (số dư do server đọc, không cần MetaMask).
  - **Đổi tài khoản trong MetaMask** khi đang kết nối thì lưu tài khoản mới.
  - **Nhập tay** thì lưu sau khi kiểm tra định dạng và **checksum EIP-55**: địa chỉ có chữ hoa/thường sai do gõ nhầm bị từ chối. Địa chỉ viết toàn chữ thường thì không có checksum để kiểm tra.
  - Mở lại trang thì ví đã lưu hiện ngay, kèm số dư. Có nút **Change wallet** (chọn ví khác) và **Remove** (xoá khỏi tài khoản).
  - `arc_wallet_verified_at` giờ có nghĩa là "lưu lúc".
- **Rủi ro chấp nhận:** không còn chứng minh ví là của freelancer. Nhập sai địa chỉ thì tiền tới ví sai, không lấy lại được. Ai chiếm được phiên đăng nhập cũng đổi được ví nhận tiền (job đã fund thì không bị ảnh hưởng). `/terms#arc` ghi rõ freelancer chịu trách nhiệm về địa chỉ.
- Giống "PayPal ready": freelancer chưa lưu ví thì nút "Hire & pay with Arc" bị khoá, kèm lời giải thích.
- Đổi ví chỉ ảnh hưởng job mới. Job đã fund vẫn trả về ví đã chốt trong contract.

---

## 5. Thời hạn

- Arc không có giới hạn 29 ngày như authorization của PayPal, nên về mặt kỹ thuật **có thể bỏ giới hạn 25 ngày** cho job trả bằng Arc. Bản đầu nên giữ chung 25 ngày cho cả hai cách trả, để luật trên `/terms` đơn giản.
- `expiresAt` = ngày giao + 48 giờ duyệt + 14 ngày dự phòng. Đây là **lưới an toàn khi ShortWorks ngừng hoạt động**: người thuê vẫn tự lấy lại tiền bằng `reclaim`, không phụ thuộc server.
- Cron hằng ngày cảnh báo job sắp tới `expiresAt` mà chưa xong, giống cảnh báo hết hạn của PayPal. Server luôn tự Approve (48 giờ) **trước** `expiresAt`, nên freelancer đã giao bài sẽ được trả trước khi người thuê có thể `reclaim`.
- Khi khiếu nại, `setFrozen(true)` dừng `reclaim`; rút hoặc xử xong khiếu nại thì gỡ.

---

## 6. Phí

| | Job $100 trả bằng PayPal | Job $100 trả bằng Arc |
|---|---|---|
| Người thuê trả | $100 | 100 USDC + gas (rất nhỏ) |
| Phí sàn 10% | −$10 | −10 USDC (`fee` trong Terms) |
| Phí cổng thanh toán | ≈ −$3.78 (PayPal) | 0 |
| **Freelancer nhận** | **≈ $86.22** | **90 USDC** |

Form proposal hiện "You receive ≈" cho cả hai cách trả.

---

## 7. Database: `db/012_arc_payments.sql` (đã chạy 2026-10-12)

Bản thật khác bản đề xuất dưới đây ở các cột: `chain_id`, `escrow_job_id` (§2), `signature_deadline`, `settled_by` (ai gửi release / refund: ví người thuê, freelancer hay operator), `last_error`. Trạng thái: `signed | funded | releasing | released | refunding | refunded`. Bản đề xuất ban đầu:

```sql
-- Ví Arc của tài khoản (bản đầu: xác minh bằng chữ ký; nay: lưu khi connect / nhập tay, §4)
ALTER TABLE users ADD COLUMN IF NOT EXISTS arc_wallet              VARCHAR(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS arc_wallet_verified_at  TIMESTAMPTZ;

-- Khoản thanh toán bằng Arc của mỗi job (song song với job_payments của PayPal)
CREATE TABLE IF NOT EXISTS job_arc_payments (
    id               SERIAL PRIMARY KEY,
    proposal_id      INTEGER       NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE RESTRICT,
    chain_id         INTEGER       NOT NULL,   -- 5042002 testnet | 5042 mainnet
    escrow_address   VARCHAR(42)   NOT NULL,   -- contract đã giữ tiền (bản deploy nào)
    client_wallet    VARCHAR(42)   NOT NULL,
    freelancer_wallet VARCHAR(42)  NOT NULL,
    amount           NUMERIC(12,6) NOT NULL,   -- USDC, 6 số lẻ
    fee              NUMERIC(12,6) NOT NULL,
    expires_at       TIMESTAMPTZ   NOT NULL,
    status           VARCHAR(20)   NOT NULL,   -- signed | funded | releasing | released | refunding | refunded
    fund_tx          VARCHAR(66),
    settle_tx        VARCHAR(66),              -- tx release / refund / reclaim
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

Mỗi job chỉ có **một** cách trả: khi tạo khoản này, server kiểm tra `job_payments` (PayPal) chưa có khoản đang giữ, và ngược lại. `hasLivePayment` / `clearDeadPayments` xét cả hai bảng.

---

## 8. Backend

| Phần | Việc làm |
|---|---|
| `src/lib/arc.js` (server-only, dùng thư viện `viem`) | Ký Terms (EIP-712); đọc receipt và event; gửi `release` / `refund` / `setFrozen` bằng ví OPERATOR; chống gửi trùng bằng khoá dòng trong database như `capturePayment` (`funded` → `releasing`) |
| `GET/POST/DELETE /api/arc/wallet` | Đọc / lưu (`{ address }`, kiểm tra checksum) / xoá ví của tài khoản |
| `POST /api/proposals/{id}/arc-checkout` | `{}` → kiểm tra (như `hireBlocker`) + trả Terms đã ký. `{ txHash }` → đọc receipt, khớp event `Funded` với Terms → proposal `accepted` |
| `runJobAction("approve")` | Job trả bằng Arc: người thuê gọi `release` từ ví, rồi gửi `txHash`; server xác minh event `Released` rồi mới `completed` |
| Undo / tự Approve / xử khiếu nại | Gọi hàm tương ứng bằng ví OPERATOR **trước**, thành công mới đổi trạng thái job (giống PayPal) |
| Cron hằng ngày | Đối chiếu event `Released` / `Refunded` trên chuỗi với database (bắt cả `reclaim` mà người thuê tự gọi), cảnh báo job gần `expiresAt` |

Biến môi trường mới:

Mạng (RPC, chain ID, explorer) đã nằm trong `src/data/arc.js` (`ARC_NETWORKS`, `getArc(network)`). Biến `NEXT_PUBLIC_ARC_NETWORK` chọn **mạng mặc định**:

| | `testnet` (mặc định) | `mainnet` |
|---|---|---|
| Tên mạng | Arc Testnet | Arc |
| Chain ID | 5042002 | 5042 |
| RPC | https://rpc.testnet.arc.network | https://rpc.mainnet.arc.io |
| Explorer | https://testnet.arcscan.app | https://explorer.arc.io |
| USDC | `0x3600…0000` (6 số lẻ) | `0x3600…0000` (6 số lẻ) |

Biến `NEXT_PUBLIC_` được gắn vào code lúc build: đổi xong phải chạy lại `npm run dev` hoặc redeploy.

**Hai tầng chọn mạng:**

| | Ai chọn | Dùng cho |
|---|---|---|
| Nút **Testnet / Mainnet** trên `/pay-with-arc` (đã làm) | Người dùng, lưu trong `localStorage` | Chỉ để **xem**: kết nối ví, xem số dư, thêm mạng vào MetaMask. `GET /api/arc/balance?network=testnet\|mainnet` |
| `NEXT_PUBLIC_ARC_NETWORK` | Server (biến môi trường) | **Mọi việc liên quan tới tiền**: ký Terms, xác minh `Funded` / `Released`, gửi `release` / `refund` |

Luồng thanh toán **không** nhận mạng từ trình duyệt: server luôn dùng mạng của biến môi trường và kiểm tra `eth_chainId` của MetaMask khớp mạng đó trước khi cho fund. Nếu không, người thuê có thể "trả" bằng USDC testnet cho một job thật. `job_arc_payments` nên lưu thêm `chain_id` để biết mỗi khoản thuộc mạng nào.

Mỗi mạng có contract escrow và khoá riêng, nên đặt các biến dưới đây theo đúng mạng đang chọn (trên Vercel: giá trị khác nhau cho Preview và Production).

```env
NEXT_PUBLIC_ARC_NETWORK=testnet   # testnet | mainnet
ARC_ESCROW_ADDRESS=
ARC_ESCROW_DEPLOY_BLOCK=          # ghi lại để tra event; app chưa dùng
ARC_SIGNER_PRIVATE_KEY=     # chỉ ký Terms
ARC_OPERATOR_PRIVATE_KEY=   # gửi release / refund / setFrozen, cần nạp USDC để trả gas
```

Thiếu `ARC_ESCROW_ADDRESS` hoặc một trong hai khoá thì app **tự ẩn** mọi nút Arc (`arcEnabled()`), PayPal chạy như cũ. Khoá ADMIN / deployer **không** nằm trong app: nó ở `contracts/.env` (testnet), và trên mainnet phải là multisig hoặc ví phần cứng (B4).

### Testnet và mainnet cùng lúc

| | Máy dev (`.env.local`) | Vercel Production (`.env.mainnet.local` là bản ghi) |
|---|---|---|
| `NEXT_PUBLIC_ARC_NETWORK` | `testnet` | `mainnet` |
| Escrow | `0xDCbD…bC63` | `0xe69C…70da` |
| Signer | khoá testnet | khoá **riêng** cho mainnet (`0xD6Bf…Fca70`) |
| Operator (trả gas) | ví testnet (`contracts/.env`) | ví gas `0xA24d…2E00` (`contracts/.env.mainnet`) |
| Admin + treasury (nhận phí) | ví testnet | `0xAe909F999CE1334eD02d40f0Afb883A967B03DEA` |

**Hai mạng dùng chung một database.** Mỗi khoản thanh toán lưu `chain_id`, và mỗi server **chỉ xử lý khoản thuộc mạng của mình** (`onThisNetwork` trong `arcPayments.js`). Cron chỉ đối chiếu các khoản cùng mạng; release / refund / freeze / approve trên một job của mạng kia trả lỗi "Manage it on the ShortWorks site that runs on that network". Thiếu chốt chặn này thì server mainnet sẽ đọc job testnet bằng RPC mainnet, thấy "không tồn tại" và gửi nhầm thông báo.

**Ví mainnet (2026-10-12):** khoá của ví gas `0xA24d…2E00` đã được gửi qua chat lúc thiết lập, nên quyền ADMIN và `treasury` đã chuyển sang `0xAe90…3DEA` (`grantRole`, `setTreasury`, rồi ví gas `renounceRole`). Ví gas giờ **chỉ là OPERATOR**: lộ khoá thì kẻ xấu chỉ release / refund sớm được (tiền vẫn chỉ tới client / freelancer / treasury), không pause, không đổi signer hay treasury. Chỉ để trong ví gas lượng USDC đủ trả gas. Muốn thay ví gas: admin `grantRole(OPERATOR_ROLE, <ví mới>)`, `revokeRole(OPERATOR_ROLE, 0xA24d…)`, đổi `ARC_OPERATOR_PRIVATE_KEY` trên Vercel.

### Deploy contract

```bash
cd contracts
npm install                     # OpenZeppelin, forge-std
forge test                      # 30 test
# contracts/.env: DEPLOYER_PRIVATE_KEY, ARC_ADMIN, ARC_OPERATOR, ARC_SIGNER, ARC_TREASURY (địa chỉ)
source .env && forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
npm run export-abi              # chỉ cần khi contract đổi
```

Rồi đặt `ARC_ESCROW_ADDRESS` (và `ARC_ESCROW_DEPLOY_BLOCK`) trong `.env.local` / Vercel, nạp USDC cho ví operator để trả gas. Faucet testnet: https://faucet.circle.com (chọn Arc Testnet).

### Những điểm bản triển khai bổ sung so với thiết kế

- **Approve không cần ví (dự phòng cho B3):** người thuê mất ví đã trả thì vẫn bấm được "Approve and let ShortWorks release it". Khi đó server release bằng ví OPERATOR. Mức tin cậy giống tự Approve sau 48 giờ.
- **Hai tab / bấm hai lần:** nếu Terms cũ còn hạn (≥ 5 phút) và cùng ví, cùng số tiền, server trả lại **đúng Terms cũ**, kèm cùng chữ ký (ký EIP-712 là tất định). Vì vậy chỉ một giao dịch fund thành công.
- **Đóng tab sau khi đã trả:** lần bấm Hire tiếp theo, hoặc cron hằng ngày, đọc `jobs(id)` trên chain. Thấy `Funded` thì hoàn tất việc thuê.
- **Freelancer đổi giá trong lúc người thuê đang trả:** tiền đã vào escrow nhưng không khớp giá mới, nên operator `refund` ngay. Giống PayPal.
- **Đổi ví thanh toán giữa chừng** (Terms mới, `jobId` mới): nếu Terms cũ vẫn được fund, database không còn giữ `jobId` đó. Người thuê vẫn lấy lại được bằng `reclaim` sau `expiresAt`. Hiếm gặp; chưa xử lý tự động.

---

## 9. Giao diện

| Trang | Thay đổi |
|---|---|
| `/pay-with-arc` | Nút chuyển Testnet / Mainnet (nhãn "Test USDC, no real value" / "Real USDC"; MetaMask tự chuyển mạng theo). Ví đã lưu hiện sẵn khi mở trang. Connect MetaMask hoặc nhập tay thì lưu ví vào tài khoản; **Change wallet**, **Remove** (§4) |
| Proposals (người thuê) | Hai nút: **Hire & pay with PayPal** và **Hire & pay … USDC on Arc**. Nút Arc khoá khi freelancer chưa lưu ví. Đặt dịch vụ (`/services/{id}`) cũng có hai cách trả |
| Hộp Hire with Arc | Kết nối MetaMask → chuyển sang Arc → kiểm tra số dư USDC đủ (job + gas) → ký permit → gửi giao dịch → "Holding the payment…" |
| Job: khối Payment | "100 USDC held in escrow" + link explorer tới contract và tx; sau `release`: "Paid 90 USDC to the freelancer · 10 USDC platform fee" |
| Approve & Complete | Job trả bằng Arc: MetaMask mở để gọi `release` |
| `/terms` | Thêm mục thanh toán bằng USDC trên Arc: escrow, phí, `reclaim` sau `expiresAt`, gas |

---

## 10. Kiểm thử

| # | Kịch bản | Kỳ vọng |
|---|---|---|
| A1 | Unit test contract (Foundry): fund / release / refund / reclaim / frozen / pause | Mọi nhánh đúng, kể cả gọi sai người, gọi 2 lần |
| A2 | Sửa `amount` hoặc `freelancer` trong Terms trên trình duyệt | `fund` revert (sai chữ ký) |
| A3 | Dùng lại chữ ký cũ / chữ ký quá hạn / ví khác gửi | Revert |
| A4 | Hire with Arc → Approve | Freelancer +90, treasury +10, người thuê −100 (−gas) |
| A5 | Hire → Undo trước khi giao bài | Người thuê nhận lại 100 |
| A6 | Bấm Approve 2 lần / server gửi release 2 lần | Chỉ 1 lần chuyển tiền |
| A7 | Khiếu nại rồi để quá `expiresAt` | `reclaim` bị chặn cho tới khi xử xong |
| A8 | Pause contract | Không fund được, nhưng release / refund / reclaim vẫn chạy |
| A9 | Người thuê tự gọi `reclaim` ngoài ShortWorks | Cron thấy event `Refunded`, job bị huỷ và hai bên được báo |

---

## 11. Tiến độ

1. ✅ `ShortWorksEscrow` + 30 unit test Foundry (A1–A3, A6–A8 ở mức contract).
2. ✅ Deploy lên **Arc Testnet** và **Arc Mainnet** (smoke test mainnet: fund 0.01 USDC bằng permit, freeze, refund; hết 0.0068 USDC gas). Smoke test trên chain thật bằng chính `src/lib/arc.js`: fundWithPermit, approve + fund, setFrozen, release, refund, Terms bị sửa thì revert.
3. ✅ Lưu ví trên `/pay-with-arc` (connect MetaMask hoặc nhập tay, §4) + migration `012`.
4. ✅ Hire & pay with Arc: Terms, permit (dự phòng approve + fund), xác minh receipt.
5. ✅ Approve (bằng ví hoặc nhờ server), Undo, tự Approve, khiếu nại (freeze), cron đối chiếu.
6. ✅ Khối Payment, `/terms#arc`. ⬜ Chạy A4–A9 bằng tay qua giao diện trên testnet (cần 2 tài khoản + MetaMask).
7. ⬜ **Audit contract** (thuê bên ngoài) trước khi deploy lên mainnet với tiền thật.

## 12. Câu hỏi cần chốt

| # | Câu hỏi | Đề xuất |
|---|---|---|
| B1 | Giữ giới hạn 25 ngày cho job trả bằng Arc? | Giữ ở bản đầu cho đồng nhất |
| B2 | Ai trả gas cho các lệnh của OPERATOR? | ShortWorks (rất nhỏ, trả bằng USDC) |
| B3 | Người thuê Approve bằng ví hay để server release? | Bằng ví (minh bạch, người thuê tự ký); server release khi tự Approve / xử khiếu nại, và khi người thuê chọn "Approve and let ShortWorks release it" (§8) |
| B4 | Ví ADMIN | Multisig nếu Safe hỗ trợ Arc, nếu không thì ví phần cứng |
| B5 | Có cần tư vấn pháp lý về thanh toán bằng stablecoin ở các nước của người dùng? | Có, trước khi lên mainnet |

Đã kiểm tra trên Arc mainnet (2026-10-12): chain ID `5042`; USDC ERC-20 tại `0x3600…0000`, 6 số lẻ, `name()` = "USDC", `version()` = "2", có `DOMAIN_SEPARATOR()` và `nonces()`, tức là hỗ trợ `permit` (EIP-2612).
