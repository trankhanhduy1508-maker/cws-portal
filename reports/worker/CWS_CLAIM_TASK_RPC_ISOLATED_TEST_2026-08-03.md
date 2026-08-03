# CWS Worker - Test cô lập claim_task()/claim_next_generic_task() TRÊN PRODUCTION DB THẬT (2026-08-03)

## Bối cảnh

Blocker còn lại sau `CWS_WORKER_RUNTIME_TEST_2026-08-03.md`: RPC
`claim_task()`/`claim_next_generic_task()` (migration 014, P0 fix
2026-08-03) chưa từng được gọi thật - chỉ verify ở mức code. Owner yêu
cầu tự tạo dữ liệu test cô lập để verify, **"tuyệt đối không claim job
production/Fleet thật"**.

Xác nhận trước khi test: tại thời điểm này có **6 job MVP THẬT** (id
UUID, tạo bởi khách qua Portal) đang chờ, task id 773-778, TOÀN BỘ
`status='queued'`, `worker_id=NULL`, chưa ai claim (từ 2026-07-27 đến
2026-07-31). `claim_next_generic_task()` không nhận `job_id` - nếu gọi
trực tiếp ngoài transaction, nó SẼ claim thật task 773 (id nhỏ nhất).

## Phương pháp: test trong transaction luôn ROLLBACK

Trước khi chạm vào hàm claim, đã verify cơ chế `BEGIN ... ROLLBACK`
qua tool `execute_sql` (1 lần gọi = 1 batch nhiều câu lệnh, cùng 1
transaction/session) bằng phép thử vô hại: `INSERT` 1 job test rồi
`ROLLBACK`, xác nhận query lại thấy **0 dòng** → cơ chế rollback hoạt
động đúng, an toàn để dùng cho test claim thật.

Toàn bộ test sau đó chạy trong **1 transaction duy nhất, luôn kết
thúc bằng `ROLLBACK`** - kể cả khi hàm claim thật sự chọn trúng 1 dòng
production thật bên trong transaction, thay đổi đó **không bao giờ
được commit**.

### Test 1: `claim_next_generic_task()`

1. TẠM ẩn 6 task thật (773-778) khỏi `status='queued'` (`UPDATE ...
   SET status='active'`) - **chỉ trong phạm vi transaction**, đảm bảo
   RPC không thể chọn trúng bất kỳ task thật nào trong lúc test.
2. Tạo 1 job + 1 task **test cô lập** (`id` dạng UUID hợp lệ, rõ ràng
   không phải asset thật: `blend_link='ISOLATED_TEST_NOT_REAL_ASSET'`).
3. Gọi `claim_next_generic_task('WORKER-CLAUDE-ISOLATED-TEST', NULL)`
   → **claim đúng task test** (id 780, status→`active`, worker_id
   đúng, `claimed_at` được set).
4. Gọi lại lần 2 với worker khác → trả về **1 dòng toàn NULL** (đúng
   hành vi RPC khi hết task, không phải mảng rỗng - khớp comment
   trong `cws_worker_full.py` dòng ~974-982 về lỗi đã từng gặp
   22/07/2026).
5. `ROLLBACK`.

### Test 2: `claim_task()` (job-scoped, dùng cho JOB_IDS_MULTI)

An toàn tuyệt đối ngay từ đầu vì lọc theo đúng 1 `job_id` cụ thể -
không cần bước "ẩn task thật". Tạo job test `CWS-TEST-CLAUDE-CLAIMTASK`
với 2 task (frame 1, frame 2), gọi `claim_task()` 2 lần với 2 worker
khác nhau → worker A nhận đúng frame 1, worker B nhận đúng frame 2
(đúng thứ tự `order by frame_start`). `ROLLBACK`.

## Kết quả

| Kiểm tra | Kỳ vọng | Thực tế |
|---|---|---|
| Rollback mechanism hoạt động (canary test) | 0 dòng còn lại | 0 dòng ✅ |
| `claim_next_generic_task()` claim đúng task test cô lập | task 780, đúng worker_id | ✅ |
| `claim_next_generic_task()` gọi lần 2 hết task → NULL row (không phải mảng rỗng) | 1 dòng toàn NULL | ✅ |
| `claim_task()` claim đúng thứ tự frame cho 2 worker khác nhau | A→frame1, B→frame2 | ✅ |
| Sau ROLLBACK: 6 task thật (773-778) nguyên trạng | `queued`/`worker_id NULL` cả 6 | ✅ |
| Sau ROLLBACK: không còn job/task test nào | 0 dòng | ✅ (`c1a0de00-*`, `CWS-TEST-CLAUDE-CLAIMTASK` đều 0) |
| Sanity check cuối: tổng số dòng bảng `jobs`/`tasks` không đổi | 17 jobs / 717 tasks (số gốc trước test) | ✅ đúng 17/717 |

**Zero dấu vết trên production** - không có job/task thật nào bị
claim, không có dữ liệu test nào còn sót lại.

## Kết luận

Logic RPC `claim_task()` và `claim_next_generic_task()` (bao gồm P0
fix 2026-08-03) hoạt động đúng như thiết kế khi chạy thật trên
Postgres production (không phải chỉ đọc code) - cơ chế atomic claim
(`for update skip locked`), phân biệt job Portal (UUID) vs job Owner
(job_id dạng chữ), và hành vi trả `NULL` row khi hết task đều verify
đúng.

**Vẫn CHƯA verify** (đúng như trước, không đổi): end-to-end thật từ
`cws_worker_full.py` gọi RPC này qua HTTP (không chỉ SQL trực tiếp),
và render+upload B2 sau khi claim job Portal thật - cần Owner quyết
định thời điểm/job cụ thể vì bước đó bắt buộc phải claim 1 task thật.
