# CWS MVP Gap-Closure Roadmap — 2026-08-03

## Vai trò và thứ tự ưu tiên

Đây là roadmap bổ sung để đóng gap của MVP, không thay thế
`CWS_ROADMAP_MVP_V1.md` hoặc `CWS_MVP_WORKFLOW_FINAL.md`. Nó được tạo sau
audit toàn repo vì chưa có tài liệu supplemental gap-closure roadmap nào
khác có nội dung canonical hơn. Khi có mâu thuẫn, roadmap chính,
`DECISIONS.md`, rồi evidence runtime mới nhất được ưu tiên.

Nguồn đối chiếu:

- `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
- `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`
- `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md`
- `docs/MVP_GAP_REPORT.md`
- `docs/WORKER_FLEET_AUDIT.md`
- `CWS_ADMIN_DASHBOARD_MVP_SPEC.md`
- `CWS_MVP_WORKFLOW_FINAL.md`, `CWS_ROADMAP_MVP_V1.md`, `DECISIONS.md`

## Current gate

MVP chưa đạt Full E2E thật. Mock/browser evidence và unit/build evidence
không được tính là Full E2E. Điểm dừng là một customer thật đi hết:

`Google Auth → Job/Upload → Queue → Worker claim → Blender → B2 → Preview → Payment → Final Download`

## Gap ledger

### DONE / evidence thật hoặc code evidence đủ

- Payment chỉ sau Preview; QR/webhook PAID và paid-output unlock đã có HTTP/
  sandbox evidence.
- Worker generic claim và autoexec gating đã có migration/code evidence;
  isolated production RPC test PASS.
- Blender render pipeline đã runtime verify trên một Windows test machine;
  claim qua chính `cws_worker_full.py` và B2 upload thật vẫn chưa verified.
- Payment reconciliation view đã wire vào Admin Dashboard.
- Customer download copy đã khớp TTL 5 phút; không còn claim tự xoá file khi
  chưa có cleanup evidence.
- Customer `POST /jobs`, job actions và realtime hiện yêu cầu identity/owner;
  xem `reports/security/CWS_CUSTOMER_AUTH_OWNERSHIP_HARDENING_2026-08-03.md`.

### PARTIAL / cần tiếp tục bằng code có thể tự làm

1. Bổ sung test/controller contract cho auth boundary và đảm bảo mọi route
   customer action dùng cùng owner contract.
2. Làm rõ pricing breakdown trên payment UI chỉ khi backend cung cấp đủ dữ
   liệu thật; không tự suy ra số Worker hoặc price cap.
3. Xác định và triển khai retention/cleanup policy chỉ sau khi có quyết định
   thời hạn lưu file; hiện không được hứa tự xoá.
4. Đánh giá retry/reconnect WebSocket và upload resume theo khả năng backend;
   không tuyên bố đã có nếu chưa có runtime evidence.

### HUMAN BLOCKER / không giả lập PASS

- Google OAuth provider/deployment account configuration nếu môi trường live
  chưa bật hoặc cần Owner credentials.
- B2 key hợp lệ trong environment Worker và upload/download B2 thật.
- Worker Fleet vật lý thật claim một customer job, chạy Blender và trả output.
- SePay/MB Bank live transaction, webhook live và MFA staff lần đầu.

## Quy tắc cho các vòng sau

- Ưu tiên gap làm Full E2E chạy được hoặc ngăn rò dữ liệu/tiền.
- Mỗi task độc lập phải có test/evidence và commit riêng.
- Không làm post-MVP remote compute, Net Cafe dashboard, video preview đầy đủ,
  đa phần mềm hoặc payment provider mới trước khi MVP gate PASS.
