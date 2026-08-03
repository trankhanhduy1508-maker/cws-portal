# CWS Worker — P0 Generic Job Claim + Security Fix (2026-08-03)

Task thực hiện theo uỷ quyền trực tiếp của Owner (2026-08-03): giải quyết
blocker P0 "Worker không claim được job MVP chung" và vá rủi ro bảo mật
`--enable-autoexec` cho file khách. Đây là 2 phát hiện nghiêm trọng nhất
trong `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` (mục
2.1 và 2.3), mà audit trước đó **chủ động không tự sửa** vì thiếu uỷ
quyền Owner rõ ràng — uỷ quyền đó nay đã có.

## 1. Vấn đề (nhắc lại, đã xác nhận lại bằng evidence mới)

`cws_worker_full.py` (`worker_loop()`) chỉ lặp qua `JOB_IDS_MULTI` — 6
job_id Owner tự tay cấu hình cho công việc kinh doanh riêng
("PhongNguRender5-10"). Nó **không bao giờ** thử claim bất kỳ job nào
khác, kể cả job MVP thật do khách tạo qua Portal.

Backend (`WorkerFleetGateway.createInternalJobWithProbeTask()`) **đã**
tạo đúng 1 row `jobs` + 1 row `tasks` (status `queued`) cho MỌI đơn
hàng Portal ngay khi khách tạo job — cơ chế backend-side đã hoàn chỉnh
từ trước. Vấn đề duy nhất là Worker không biết tới các job_id này.

**Evidence thật (truy vấn trực tiếp production Supabase
`ynhxlxetwuiyejcjypsi`, 2026-08-03):**

```
select id, blend_file, created_at from jobs
where id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-...-[0-9a-f]{12}$';
```

→ 6 job MVP thật (id dạng UUID sinh bởi `randomUUID()`, `blend_file` là
link Google Drive khách thật), mỗi job có đúng 1 task `queued` (probe
task frame 1-1), **nằm chờ liên tục từ 2026-07-27 đến 2026-07-31** (3-7
ngày) mà không Worker nào từng claim. Đối chiếu 100%: mọi job Owner tự
tay tạo (`CWS-JOB2/3/5`, `CWS-JOB4-PHONG5..10`, `CWS-CHUNKLIVE`,
`CWS-TEST50MAY`) đều dùng id dạng tên người đọc được, **không có ngoại
lệ nào trùng định dạng UUID** — xác nhận ranh giới UUID-vs-tên-tay là
đặc điểm cấu trúc thật, không phải suy đoán.

## 2. Giải pháp đã triển khai

### 2.1 Migration 014 — RPC mới `claim_next_generic_task` (CHỈ THÊM, không sửa `claim_task()`)

File: `worker_migrations/014_claim_next_generic_mvp_task.sql`, đã **áp
dụng lên production thật** qua Supabase MCP (`apply_migration`, thành
công).

- Logic giống hệt `claim_task()` (2 tầng ưu tiên, fencing qua
  `generation`, tôn trọng `QUARANTINED`/`DRAINING`), chỉ khác: claim
  bất kỳ task `queued` nào có `job_id` khớp regex UUID, thay vì 1
  `job_id` cụ thể truyền vào.
- Vì phân biệt bằng **đặc điểm cấu trúc id** (UUID vs tên tay), **không
  cần danh sách loại trừ nào cả** — Owner đổi `JOB_IDS_MULTI` bao nhiêu
  lần trong tương lai cũng không cần sửa lại RPC này.
- Hoàn toàn additive: không `ALTER`/`DROP` bất kỳ object nào đang dùng
  thật, `claim_task()` giữ nguyên 100%, JOB_IDS_MULTI của Owner tiếp
  tục hoạt động y hệt trước giờ, không đổi hành vi.

**Evidence runtime thật (2026-08-03, chạy trực tiếp trên production,
không phải giả lập):**

```sql
select * from claim_next_generic_task('TEST-VERIFY-014', 8000);
-- {"task_id":773,"out_job_id":"00189232-...","out_frame_start":1,
--  "out_frame_end":1,"out_generation":1}
```

RPC claim đúng 1 task thật của 1 job MVP thật đang chờ. Sau khi xác
nhận, đã **revert thủ công** task 773 về `queued`/`worker_id=null` để
không làm xáo trộn dữ liệu khách thật, và xác nhận không có row rác
nào bị tạo ở bảng `workers`. Test dùng transaction `BEGIN/ROLLBACK`
riêng cũng xác nhận: sau rollback, cả 6 task MVP vẫn `queued` (không
mutation nào sống sót ngoài ý muốn).

### 2.2 `cws_worker_full.py` — Worker thử `claim_next_generic_task()` SAU KHI hết `JOB_IDS_MULTI`

`worker_loop()`: giữ nguyên 100% vòng lặp `JOB_IDS_MULTI` (Owner luôn
được ưu tiên claim trước, không đổi hành vi Fleet hiện tại). **CHỈ khi**
không còn task nào trong `JOB_IDS_MULTI`, Worker mới gọi
`claim_next_generic_task()` — nếu claim được, đánh dấu
`is_generic_job = True`.

### 2.3 Vá `--enable-autoexec` — gắn liền với 2.2, không phải fix riêng

`render_single_frame()`/`render_frame_range()` nhận thêm tham số
`enable_autoexec` (mặc định `True` — **không đổi hành vi cho job
Owner**). Lời gọi thật trong `worker_loop()` truyền
`enable_autoexec=not is_generic_job`:

- Job từ `JOB_IDS_MULTI` (Owner tự chọn) → **vẫn bật** `--enable-autoexec`
  y hệt trước giờ (nhiều file phụ thuộc Driver Python, tắt mù quáng sẽ
  phá render thật đang chạy — đúng cảnh báo trong audit 2.3).
- Job từ `claim_next_generic_task()` (khách tự upload qua Portal) →
  **tắt** `--enable-autoexec` — đúng khuyến nghị audit: input không
  đáng tin cậy không nên cho phép thực thi Python script tuỳ ý từ file
  `.blend`.

Đây chính là cách migration 014 (ranh giới UUID) giải quyết ĐỒNG THỜI
cả 2 phát hiện P0 — không cần danh sách loại trừ trùng lặp giữa 2 nơi.

### 2.4 B2 credential — chuyển sang đọc từ biến môi trường (une fix một phần)

`B2_KEY_ID`/`B2_APP_KEY` nay đọc qua
`os.environ.get("CWS_B2_KEY_ID"/"CWS_B2_APP_KEY", <giá trị cũ>)` —
cùng pattern đã dùng cho `CWS_DIR`. Không đổi hành vi (`.bat` hiện tại
chưa set 2 biến này nên vẫn dùng đúng giá trị cũ).

**CHƯA hoàn thành rotate sang key giới hạn quyền** — xem mục 3 (Blocker).

## 3. Blocker thật — cần Owner (không tự làm tiếp được)

**Đã thử tạo B2 Application Key mới giới hạn quyền (chỉ prefix
`renders/`) bằng chính key hardcode hiện có** (không cần thêm secret
nào từ Owner, vì key hiện tại lẽ ra đủ quyền để tự tạo key con). Gọi
thật `b2_authorize_account` (Backblaze B2 native API, HTTPS thật, xác
nhận mạng ra ngoài hoạt động bình thường qua test độc lập tới
github.com) với đúng `B2_KEY_ID`/`B2_APP_KEY` hardcode trong file →
**HTTP 401 Unauthorized thật**.

**Kết luận (evidence, không suy đoán):** key hardcode hiện tại trong
git repo **không còn hợp lệ** với chính Backblaze — nhiều khả năng đã
bị Owner tự rotate ở nơi khác (Fleet thật có thể đang tải bản
`cws_worker_full.py` khác trực tiếp từ B2 `worker-releases/`, không
qua git repo này) hoặc đã bị revoke. **Không tự đoán/tự thay giá trị**
— cần Owner xác nhận:

1. B2 Key ID + Application Key **đang chạy thật** trên Fleet hiện tại
   là gì (không nhất thiết trùng giá trị trong git).
2. Owner tạo (hoặc uỷ quyền tôi tạo, nếu cung cấp key hợp lệ) 1 B2
   Application Key mới, quyền `readFiles`+`writeFiles`, giới hạn
   `namePrefix=renders/`, không quyền `deleteFiles`/quản lý bucket.
3. Set `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` trên môi trường thật của Fleet
   (biến môi trường trước khi chạy `.bat`, hoặc sửa `.bat`) — code đã
   sẵn sàng đọc 2 biến này, không cần sửa code thêm khi Owner rotate.

## 4. Test / Evidence — tóm tắt

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Migration 014 áp dụng | PASS | `apply_migration` trả `{"success":true}` trên project thật `ynhxlxetwuiyejcjypsi` |
| RPC claim đúng job MVP thật | PASS | Claim thật task 773 (job `00189232-...`), sau đó revert sạch, xác nhận qua SELECT |
| RPC không đụng job Owner | PASS | Đối chiếu 100% id trong `jobs`: không job Owner nào khớp regex UUID |
| Không có side-effect rác | PASS | Không có row `workers`/`tasks` rác nào còn lại sau test (đã SELECT xác nhận) |
| Cú pháp Python (`cws_worker_full.py`) | **CODE VERIFIED, RUNTIME NOT VERIFIED** | Không có Python interpreter nào trong môi trường agent (đã thử `python`/`python3`/`py` qua Bash và PowerShell, không thấy) — đã tự rà soát thủ công toàn bộ đoạn diff (indentation, ngoặc, docstring) thay cho `py_compile`; **KHÔNG chạy được trên máy Windows+Blender thật** |
| B2 key rotate | **BLOCKED — cần Owner** | Xem mục 3 |

## 5. Source-of-Truth cần đồng bộ (đã cập nhật cùng lúc, xem các file liên quan)

- `CWS_ROADMAP_MVP_V1.md` Giai đoạn 3 (Render): cập nhật lý do
  `NEEDS_VERIFICATION` — không còn "Worker không claim job MVP chung"
  (đã fix code + evidence DB thật), chỉ còn "chưa có máy Windows+Blender
  thật để chạy runtime" + "B2 key cần Owner rotate".
- `CURRENT_STATUS.md`: cập nhật Current Task/Next.
- `DECISIONS.md`: không có quyết định kiến trúc mới mâu thuẫn quyết
  định cũ nào — chỉ bổ sung implementation, không cần entry mới.

## 6. Rõ ràng về giới hạn của fix này

- Chưa có 1 job MVP thật nào **thực sự render xong** qua đường mới —
  vì vẫn không có máy Worker Windows+Python+Blender thật trong môi
  trường agent để chạy `cws_worker_full.py`. Đây là **CODE VERIFIED +
  DB EVIDENCE VERIFIED**, **KHÔNG PHẢI end-to-end runtime verified**.
- File `.bat` chưa hề bị đụng tới (không cần, vì 2 biến môi trường mới
  đều optional).
- Không có thay đổi nào ảnh hưởng tới 6 job Owner đang chạy thật —
  toàn bộ logic `JOB_IDS_MULTI` giữ nguyên, chỉ THÊM đường đi mới, có
  thể rollback độc lập (xoá hàm SQL `claim_next_generic_task` + revert
  diff Python) mà không ảnh hưởng phần còn lại.
