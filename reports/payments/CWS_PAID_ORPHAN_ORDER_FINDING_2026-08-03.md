# Phát hiện: 1 order `payment_status='paid'` không có payment record thật (2026-08-03)

Trong lúc rà soát "payment/refund safety" theo yêu cầu Owner, truy vấn
trực tiếp production Supabase (`ynhxlxetwuiyejcjypsi`) phát hiện:

```sql
select status, payment_status, count(*) from render_orders group by 1,2;
-- searching_workers | paid   | 1   <-- bất thường
-- searching_workers | unpaid | 1
-- cancelled         | unpaid | 4
```

1 order duy nhất có `payment_status='paid'` nhưng `status` vẫn dừng ở
`searching_workers` (chưa từng render/preview/finish):

```
id: 00189232-5400-4c14-9ba0-1d6d9c8ff267
storage_code: null
final_price_vnd: null
internal_job_id: 00189232-5400-4c14-9ba0-1d6d9c8ff267 (trùng id — đây
  chính là 1 trong 6 job MVP thật nằm chờ Worker claim từ 2026-07-27,
  xem reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md)
created_at: 2026-07-27 11:29:17
```

**Kiểm tra bảng `payments` (nguồn sự thật thật sự cho giao dịch):**

```sql
select * from payments where job_id = '00189232-...';
-- [] (KHÔNG có row nào)
```

## Đánh giá (không suy đoán quá xa, không tự sửa)

`render_orders.payment_status='paid'` **không có payment record tương
ứng nào** trong bảng `payments` — nghĩa là giá trị này **không đến từ
luồng thanh toán thật** (webhook SePay luôn ghi `payments` trước khi
set `paid` trên order, xem `PaymentsService`). Khả năng cao đây là dữ
liệu **fixture còn sót lại** từ đợt verify thủ công trước đó (đúng
pattern đã ghi trong `CURRENT_STATUS.md` lịch sử: *"PAID → B2 Signed
URL → Download (HTTP thật tới production)"* được verify bằng cách
**insert `render_orders`/`payments` trực tiếp**, không phải 1 giao
dịch ngân hàng thật) — **KHÔNG có bằng chứng đây là khách hàng thật đã
mất tiền mà không nhận được file.**

**Không tự xoá/sửa row này** — đây là dữ liệu production, có thể vẫn
đang được dùng làm bằng chứng cho báo cáo verify trước đó
(`reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`).
Quyết định dọn dẹp hay giữ lại cần Owner xác nhận.

## Rủi ro hệ thống thật đứng sau phát hiện này (đáng chú ý hơn bản thân row)

Việc `render_orders.payment_status` có thể lệch khỏi bảng `payments`
(bằng cách insert trực tiếp, dù chỉ để test) xác nhận đúng rủi ro đã
ghi trong `docs/MVP_GAP_REPORT.md`: **hệ thống hiện không có cơ chế tự
động đối chiếu định kỳ `render_orders.payment_status` với `payments`**
để phát hiện lệch pha (dù nguyên nhân là bug hay do thao tác thủ công).
Đây là ứng viên tốt cho 1 fix nhỏ trong tương lai (query đối chiếu định
kỳ hoặc route Admin) — **CHƯA làm trong lần này** vì môi trường agent
hiện tại không có Node.js/npm để build/test an toàn thay đổi backend
TypeScript mới (xem `CURRENT_STATUS.md`).

## Checklist cho Owner

1. Xác nhận order `00189232-5400-4c14-9ba0-1d6d9c8ff267` có phải dữ
   liệu test còn sót hay không (kiểm tra email/tài khoản khách gắn với
   order này, nếu có).
2. Nếu là test fixture: có thể set lại `payment_status='unpaid'` hoặc
   xoá hẳn (tuỳ Owner) để không gây nhiễu số liệu thật sau này.
3. Nếu KHÔNG phải test (có khách thật đứng sau): cần điều tra thêm vì
   không có payment record — có thể là bug nghiêm trọng hơn cần xử lý
   ngay.
