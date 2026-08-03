# Audit: B2 scope tối thiểu cho credential Worker (2026-08-03)

Theo yêu cầu Owner: audit chính xác `cws_worker_full.py` + toàn bộ repo
để xác định B2 Application Key của Worker thực sự cần quyền gì —
**không đoán**, chỉ báo cáo dựa trên grep/đọc code thật.

## Phương pháp

```
grep -n "get_b2_client()\|client\.\(upload_file\|download_file\|list_objects\|...\)\|B2_BUCKET\|renders/\|worker-releases" cws_worker_full.py
```

Xác nhận `get_b2_client()` (dòng 656) là **nơi DUY NHẤT** trong toàn bộ
file tạo `boto3.client("s3", ...)` — grep riêng `boto3\.` xác nhận
không có client thứ 2 nào với credential khác.

## Kết quả — mọi thao tác dùng `get_b2_client()`

| Dòng | Hàm | boto3 call | Prefix thật |
|---|---|---|---|
| 461-464 | `upload_single_frame` | `upload_file` | `renders/{job_id}/task_{task_id}/{file}` |
| 696-699 | `get_existing_frames_on_b2` | `list_objects_v2` | `renders/{job_id}/task_{task_id}/` |
| 723-728 | `validate_existing_frame_on_b2` | `download_file` | `renders/{job_id}/task_{task_id}/frame_{n}.png` |
| 748-754 | `upload_results_to_b2` | `upload_file` | `renders/{job_id}/task_{task_id}/{file}` |
| 1300-1319 | (tải toàn bộ frame để ghép video) | `list_objects_v2` + `download_file` | `renders/{job_id}/` |
| 1467-1469 | (upload video ghép) | `upload_file` | `renders/{job_id}/merged/{job_id}.mp4` |

**100% thao tác nằm dưới prefix `renders/`.** Không có `delete_object`/
`delete_objects` nào trong toàn file — Worker không bao giờ xoá gì
trên B2 (khớp đúng finding "GAP thật" đã ghi ở audit trước: Worker
không dọn dẹp, không phải vì thiếu quyền mà vì code chưa từng gọi xoá).

## `worker-releases/` — xác nhận KHÔNG liên quan tới credential này

`cws_worker.bat` (dòng 60-67) có **1 credential HOÀN TOÀN KHÁC**,
hardcode sẵn từ 22/07/2026, biến `.bat` dùng tên `B2_KEY_ID`/
`B2_APP_KEY` (KHÁC tên với `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` mà
`cws_worker_full.py` đọc — không trùng, không xung đột), đã giới hạn
Read-Only + prefix `worker-releases/`, dùng để `.bat` tự tải bản
`cws_worker_full.py` mới. Comment gốc trong `.bat` đã giải thích rõ lý
do tách riêng: *"KHONG dung chung key chinh cua Worker - key do co
quyen qua rong: doc/ghi toan bo bucket, bao gom du lieu render cua
khach hang"*. Credential đang audit (dùng cho render) không cần và
không nên có quyền trên `worker-releases/`.

## Kết luận — scope tối thiểu

- **Bucket**: `MTEB90`
- **File name prefix**: `renders/`
- **Type of Access**: Read and Write (`listFiles` + `readFiles` + `writeFiles`)
- **KHÔNG cần**: `deleteFiles`, `listBuckets`/`writeBuckets`, bucket
  lifecycle/encryption/logging/replication/notifications, `shareFiles`

Owner đã tạo key mới đúng scope này (bucket `MTEB90`, prefix
`renders/`, xác nhận qua trao đổi 2026-08-03).

## Code đã sửa (cws_worker_full.py, chưa commit tại thời điểm audit này viết)

`B2_KEY_ID`/`B2_APP_KEY` không còn giá trị hardcode nào (kể cả làm
fallback) — bắt buộc đọc `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` từ biến môi
trường, set cục bộ trong `cws_worker.bat` trên từng máy (không qua git,
không qua kênh auto-update `.py`). Nếu thiếu, in cảnh báo to nhưng
KHÔNG crash toàn bộ tiến trình (giữ triết lý "warn, không crash mù
quáng" đã dùng cho `CWS_DIR`) — các lệnh gọi B2 sẽ tự thất bại rõ ràng
qua try/except sẵn có, không âm thầm dùng sai key.

**CHƯA test được với key thật** (Owner chủ động không gửi secret vào
chat, đúng thực hành bảo mật) — CODE VERIFIED (đọc/audit thủ công),
RUNTIME NOT VERIFIED. Owner tự set 2 biến môi trường theo hướng dẫn đã
gửi, tự xác nhận Worker chạy được sau khi cập nhật `.bat` cục bộ + đẩy
bản `.py` mới lên B2 `worker-releases/`.
