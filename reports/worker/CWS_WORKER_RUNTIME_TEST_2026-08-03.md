# CWS Worker - Runtime Test (Python + Blender THẬT) - 2026-08-03

## Bối cảnh

Từ 2026-08-02/03, `CURRENT_STATUS.md` liệt kê blocker: "Worker
không claim job MVP chung, `--enable-autoexec` không an toàn cho khách"
đã fix ở mức CODE, nhưng "CODE VERIFIED / RUNTIME NOT VERIFIED vì
không có máy Blender thật" - môi trường agent trước đó không có
Python/Node/Blender.

Phiên này chạy trên một máy Windows THẬT (không phải Fleet vật lý của
đối tác) có PowerShell + mạng - lần đầu tiên tự động hoá được việc
chuẩn bị runtime Python/Blender và verify các hàm sản xuất thật của
`cws_worker_full.py` mà không cần cài tay/không cần thao tác installer.

## Version dùng - lấy từ Source of Truth trong code, KHÔNG đoán

| Thành phần | Version | Nguồn |
|---|---|---|
| Python | 3.12.7 (embeddable amd64) | `cws_worker.bat` dòng `set "PYTHON_VERSION=3.12.7"` |
| Blender | 5.2.0 LTS portable | `cws_worker_full.py` dòng `BLENDER_VERSION = "5.2.0"` |
| pip packages | requests, boto3, Pillow (không pin version - đúng thiết kế gốc, xem `ensure_package_installed()`) | `cws_worker_full.py` |

## Script tự động (idempotent, chạy lại được 1 lệnh)

`reports/worker/setup_worker_runtime_test.ps1` - tự đọc 2 version ở
trên trực tiếp từ code (regex trên `cws_worker.bat`/`cws_worker_full.py`,
không hardcode version thứ 2 nơi khác để tránh lệch), tự tải từ nguồn
chính thức (python.org, download.blender.org), cấu hình pip cho bản
Python Embeddable, rồi verify. Cài vào `C:\CWS_Worker_Test` - **CỐ Ý
KHÔNG dùng `G:\CWS_Render`** (đường dẫn Fleet thật của đối tác anh
Thong) để không nhầm lẫn với máy Fleet đang hoạt động.

Chạy lại: `powershell -ExecutionPolicy Bypass -File
reports\worker\setup_worker_runtime_test.ps1`

## Ranh giới an toàn (chủ đích, theo đúng yêu cầu không ảnh hưởng Fleet)

Script **KHÔNG BAO GIỜ** gọi `worker_loop()`, `claim_task()`, hay
`claim_next_generic_task()` - các hàm này claim TASK THẬT trên Supabase
production, ảnh hưởng trực tiếp tới Fleet đang hoạt động (job thật của
khách/Owner). Cũng không set `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` nên mọi
thao tác B2 tự nhiên bị vô hiệu hoá (đúng hành vi "warn, không crash"
đã thiết kế sẵn trong code) - không hardcode/commit secret nào.

Những gì script CÓ gọi trực tiếp: `get_worker_id()` (local-only, ghi
file trong `C:\CWS_Worker_Test`), `check_for_newer_version()` (GET
read-only, không mutate), và `render_frame_range()` (hàm render sản
xuất thật, thuần local - không upload/không claim) trên một scene
`.blend` tự tạo bằng chính Blender (scene mặc định, không phải file
khách/Owner).

## Kết quả - PASS toàn bộ

Bằng chứng máy: `reports/worker/WORKER_RUNTIME_TEST_EVIDENCE_2026-08-03.json`

- `python --version` → `Python 3.12.7` ✅
- `blender -b --version` → `Blender 5.2.0 LTS (hash fbe6228777e7 built 2026-07-14 01:35:40)` ✅
- Blender headless render smoke test (`-b -f 1` trên scene mặc định) → PNG 1,174,909 bytes ✅
- Import `cws_worker_full.py` thành công (requests/boto3/Pillow load
  được, không lỗi cú pháp/dependency) ✅
- `get_worker_id()` chạy được, tạo `WORKER-B9F12476` (local, không đăng
  ký với Fleet thật nào) ✅
- `check_for_newer_version()` (read-only) chạy không lỗi ✅
- **E2E thật**: gọi thẳng `render_frame_range(blend_path, 1, 1,
  out_dir, enable_autoexec=True)` - đúng hàm + đúng cách Blender được
  gọi (`-b`, `--enable-autoexec`, `-o`, `-F PNG`, `-s`/`-e`/`-a`) như
  production dùng - render THẬT 1 frame trong 1.8 giây, PNG được
  `validate_rendered_image()` xác nhận hợp lệ (không đen/trắng toàn
  phần, không corrupt) → `RENDER_FRAME_RANGE_RESULT valid_count=1
  error=None` ✅

## Vẫn CHƯA verify (nằm ngoài phạm vi an toàn của lần test này)

1. **`claim_task()`/`claim_next_generic_task()` (RPC Supabase thật)** -
   chưa gọi, vì sẽ claim task thật trên Fleet production. Cần Owner
   quyết định thời điểm/hình thức test có kiểm soát (vd 1 job test
   riêng, không phải job MVP thật đang chờ khách).
2. **Upload B2 thật (`upload_single_frame`)** - chưa test vì cần
   `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` thật; hiện repo confirm key cũ trả
   401 (xem `CWS_P0_SECURITY_FIX_2026-08-03.md`), đang chờ Owner
   rotate.
3. **Máy Fleet vật lý thật** (GPU thật, driver thật, diskless
   BootROM) - máy dùng để test này KHÔNG phải máy Fleet, chỉ xác nhận
   pipeline code đúng, không thay thế được test trên phần cứng vật lý
   của đối tác.
4. File `.blend` sản xuất thật (vd Titan Station, PhongNguRender5-10) -
   chưa render, chỉ dùng scene mặc định Blender để giữ an toàn/không
   phụ thuộc Google Drive/asset thật.

## Kết luận

Runtime Python 3.12.7 + Blender 5.2.0 của Worker chạy đúng như code
khai báo, và pipeline render lõi (`render_frame_range` +
`validate_rendered_image`) hoạt động đúng thật trên máy Windows thật -
khác với trạng thái "CODE VERIFIED / RUNTIME NOT VERIFIED" trước đây.
Phần còn lại (claim task thật + upload B2 thật trên Fleet vật lý) vẫn
cần Owner xác nhận/thực hiện vì đụng tới dữ liệu production thật.
