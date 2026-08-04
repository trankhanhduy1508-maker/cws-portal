# CWS — Nghiên cứu Pricing, Unit Economics và Affiliate cho MVP

Ngày kiểm tra: 2026-08-04. Phạm vi: chỉ tạo báo cáo nghiên cứu; không sửa source, database, secrets, production pricing, deploy hoặc dữ liệu production.

## Tóm tắt

Repo hiện có pricing service dùng 6.000đ/Worker-hour, hệ số 2 và runtime thực tế cộng startup theo Worker. Giá cuối đang tính sau render; roadmap và customer research xác định còn thiếu estimate, breakdown và price cap trước render. Chưa có affiliate implementation.

Kết luận: 6.000đ/PC-hour chỉ là baseline pilot; markup 1,8x chưa chứng minh CWS sống được; contingency 5% chỉ là reserve tạm thời; B2/payment phải tính theo usage/invoice; affiliate MVP nên thử 10% eligible net collected revenue có floor; không hard-code thuế 20%.

## Audit repo

pricing.service.ts có VND_PER_WORKER_HOUR = 6000, FINAL_PRICE_MULTIPLIER = 2 và startup hiện code 10 phút cho mỗi Worker. Tests đã kiểm tra runtime, idle gap và startup nhiều Worker. Migration 011 lưu final_price_vnd và worker_runtime_seconds.

B2 audit xác nhận Worker render dùng prefix renders/ và credential không cần delete toàn bucket; Worker chưa gọi delete nên cleanup vẫn là gap vận hành. SePay sandbox có bằng chứng, nhưng payment live/recovery/refund phụ thuộc Owner. Customer research ghi rõ chưa có khách thật đi hết Upload → Render → Preview → Payment → Download.

Nguồn repo: [pricing service](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/backend/src/jobs/services/pricing.service.ts), [pricing tests](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/backend/src/jobs/services/pricing.service.spec.ts), [migration](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/backend/migrations/011_final_price_and_worker_runtime.sql), [Roadmap V2](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/CWS_ROADMAP_MVP_V2.md), [CURRENT_STATUS](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/CURRENT_STATUS.md).

## Unit economics

| Chỉ tiêu | Định nghĩa |
|---|---|
| Revenue | Tiền khách bị tính/thu, tách gross, collected, refund/chargeback và thuế thu hộ |
| Variable Cost | Host + B2 + payment + retry/failure + chi phí Job biến đổi |
| Gross Margin | Revenue trừ direct COGS |
| Contribution Margin | Revenue trừ toàn bộ variable cost, gồm affiliate |
| Operating Profit | Contribution margin trừ fixed OpEx |
| Net Profit | Operating profit sau thuế và khoản ngoài hoạt động |

Contribution margin không phải net profit.

## Host payout: 6.000đ/PC-hour

Không tìm thấy benchmark công khai đủ tin cậy về payout render Host Việt Nam. 6.000đ có thể dùng làm baseline pilot, nhưng cần tính điện, nhiệt, internet, depreciation, bảo trì, downtime và chi phí cơ hội.

EVN công bố khung giá điện bình quân trước VAT theo Quyết định 07/2025/QĐ-TTg là 1.826,22–2.444,09đ/kWh. Đây chỉ là tham chiếu điện, không phải cost PC. Máy 0,3–0,6 kW là ví dụ minh họa tương đương khoảng 548–1.466đ/giờ tiền điện trong khung này.

Nên chuyển dần sang performance tier:

    performance_units = benchmark_score / reference_score
    host_payout = eligible_billable_seconds / 3600
                   × performance_units × rate_per_unit

Benchmark nên là scene Blender chuẩn; cần chốt VRAM/RAM, reliability, startup, idle gap và attribution khi lỗi.

## Markup và contingency

Nếu giá bằng 1,8 lần cost, margin trước affiliate là 44,44%. Sau affiliate trên 10% revenue còn 34,44%; 12% còn 32,44%; 15% còn 29,44%. Với 2,0 lần, các mức sau affiliate là 40%, 38% và 35%.

Đây là trước fixed OpEx, thuế, refund và support. Vì vậy markup 1,8 chưa đủ cơ sở để kết luận CWS sống được.

5% có thể là pilot reserve, không phải bảo đảm worst case. Dùng:

    retry_reserve = sum(probability_i × incremental_cost_i) + risk_buffer

Nếu Expected Retry/Failure đã nằm trong Variable Cost, contingency chỉ dành cho forecast error, tránh double count. Review sau cohort Job thật.

## B2

Công thức:

    B2_job = storage_bytes × monthly_rate × retention_days/30
             + billable_egress + paid_transactions
             + multipart/versioning/replication allocation

Tách source, temporary, preview, final, logs, retention và cleanup. Backblaze [pricing page](https://www.backblaze.com/cloud-storage/pricing) hiện nêu khoảng 6,95 USD/TB/tháng và egress miễn phí đến 3x average monthly storage; [transaction pricing](https://www.backblaze.com/cloud-storage/transaction-pricing) hiển thị upload không tính phí và một mức storage khác. Vì hai trang chính thức khác cách hiển thị, invoice/account pricing phải là source of truth. Không dùng mặc định 1.000đ/job.

## Payment

CWS dùng QR ngân hàng/MB Bank và SePay webhook. [SePay pricing](https://sepay.vn/bang-gia.html) mô tả cổng không tốn phí giao dịch trực tiếp, nhưng plan/quota/overage và chi phí vận hành vẫn có.

    payment_cost_per_job =
      (monthly_plan + overage + bank/provider fees
       + reconciliation/refund allocation) / qualified_paid_jobs

Nếu direct transfer nằm trong quota, transaction fee có thể là 0đ; không mặc định 15.000đ/job. Cần tính đối soát, webhook recovery, refund và payment chậm.

## Affiliate

Không có standard chung. [RunPod](https://www.runpod.io/blog/introducing-the-new-runpod-referral-affiliate-program) công bố 10% spend trong sáu tháng đầu; [Fox Renderfarm](https://www.foxrenderfarm.com/invite.html) dùng coupon 50% CPU render có giới hạn; [RenderStreet](https://support.render.st/portal/en/kb/articles/renderstreet-one-referral-program) dùng referral/điểm và anonymous ID. Đây là policy riêng của từng nhà cung cấp, không phải benchmark CWS.

Đánh giá: 10% phù hợp pilot; 12% chỉ nên dành cho tier/partner có chất lượng; 15% chưa nên mặc định khi chưa có data. Revenue basis dễ hiểu hơn, contribution-margin basis an toàn hơn nhưng khó kiểm chứng.

    eligible_net_revenue =
      cash_collected - refunds - chargebacks
      - taxes_collected_on_behalf - excluded_pass_through

    affiliate_commission = eligible_net_revenue × 10%

Chỉ approve sau PAID/COMPLETED và hold period. Lưu referral ID, attribution timestamp, order ID nội bộ, eligible amount, rate version và trạng thái pending/approved/paid/reversed. Affiliate chỉ thấy order ID ẩn danh, amount và status. Last eligible click 30 ngày là ứng viên, nhưng cần Owner chốt.

## Value pricing, discount và floor

Compute cost là floor. Thời gian workstation được giải phóng, reliability, support tiếng Việt và thanh toán VNĐ có thể tạo premium; tài liệu Remote Compute chỉ coi đây là hypothesis, chưa có willingness-to-pay evidence.

Discount phải kiểm tra server-side:

    floor = max(absolute_floor,
                expected_variable_cost
                / (1 - affiliate_rate - target_CM_after_affiliate))

Giá sau discount không được thấp hơn floor. Job nhỏ cần absolute floor vì payment/support/setup có thể lớn hơn compute. Job lớn cần cap và pre-approval.

## Stress test

Job tham chiếu:

    7 × 5,667 × 6.000 = 238.014đ

Từ Host cost בלבד: 1,8x = 428.425đ; 1,8x cộng 5% = khoảng 449.846đ; 2,0x cộng 5% = khoảng 499.829đ. Đây chưa phải giá an toàn vì chưa gồm B2, payment, retry, affiliate, fixed cost và thuế.

Bảng dưới là giả định minh họa:

| Price | B2 | Payment | Retry | Affiliate | Variable cost gồm Host | Contribution sau affiliate | CM |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 450.000 | 5.000 | 0 | 5% | 45.000 | 255.165 | 149.835 | 33,3% |
| 450.000 | 5.000 | 5.000 | 5% | 45.000 | 260.415 | 144.585 | 32,1% |
| 450.000 | 30.000 | 10.000 | 5% | 45.000 | 291.915 | 113.085 | 25,1% |
| 500.000 | 30.000 | 10.000 | 5% | 50.000 | 291.915 | 158.085 | 31,6% |

Small: 1 PC × 0,5 giờ có Host cost 3.000đ trước startup và cần floor. Medium: Job tham chiếu ở trên. Large: 20 PC × 20 giờ có Host cost 2.400.000đ và cần cap/pre-approval. Retry 15–30% không nên che bằng markup mặc định; phải phân loại lỗi.

## Trả lời 15 câu hỏi

1. 6.000đ/PC-hour: baseline pilot, chưa benchmark thị trường.
2. GPU/performance: nên tier theo benchmark, VRAM/RAM và reliability.
3. Markup 1,8: chưa chứng minh đủ sống.
4. Contingency 5%: dùng tạm, phải đo, không double count.
5. B2: usage, retention, egress, transactions, multipart/versioning.
6. Payment: có thể 0 transaction fee, nhưng có plan/ops.
7. Affiliate: bắt đầu 10%; 12–15% chưa có dữ liệu.
8. Basis: eligible net collected revenue dễ hiểu; CM basis an toàn hơn.
9. Verification: server-side attribution và payout ledger ẩn danh.
10. Discount: luôn giữ floor sau discount và affiliate.
11. Margin: tách sáu lớp tài chính như bảng trên.
12. Tax: không giả định 20%; cần entity/regime/accountant.
13. Stress: small cần floor, medium nhạy B2/payment, large cần cap.
14. Pricing: cost là floor; value/time saved cần test.
15. Floor: dùng target CM formula; số VND cụ thể cần Owner.

## ### ĐỀ XUẤT CHO MVP

### Customer Price Formula

    V = Host + B2_allocated + Payment_allocated
        + Expected_Retry_Failure + other_job_variable_cost

    floor = max(absolute_floor,
                V / (1 - affiliate_rate - target_CM_after_affiliate))

    estimate = max(floor,
                   round_to_increment(V × cost_markup × forecast_contingency))

    customer_price = max(estimate, floor)

Giá cuối phải nằm trong cap hoặc yêu cầu re-approval.

### Host Payout Formula

Pilot: host_payout = eligible_billable_hours × 6.000đ.

Sau benchmark: host_payout = eligible_billable_seconds / 3600 × performance_units × rate_per_unit.

### Affiliate Formula

eligible_net_revenue = cash_collected − refunds − chargebacks − taxes_collected_on_behalf − excluded_pass_through.

affiliate_commission = eligible_net_revenue × 10%.

Chỉ trả sau PAID/COMPLETED và hold period; có cap, fraud/self-referral rule và reversal.

### Minimum Margin/Floor

price >= max(absolute_floor, V / (1 − affiliate_rate − target_CM_after_affiliate)). Absolute floor và target CM là Owner decision.

### Retry/Failure Reserve

Pilot reserve 5% nếu chưa có dữ liệu tốt hơn; thay bằng expected value theo nguyên nhân sau khi có Job thật.

### B2 calculation

Phân bổ theo GB-month, retention, egress, paid transactions, multipart/versioning và account allocation; dùng invoice/account pricing làm source of truth.

### Payment calculation

Payment_allocated = (monthly_plan + overage + bank/provider fees + reconciliation/refund ops allocation) / qualified_paid_jobs.

## ### BẢNG QUYẾT ĐỊNH

| Vấn đề | Trạng thái |
|---|---|
| Giữ 6.000đ/PC-hour cho pilot | GIỮ |
| Dùng 6.000đ vĩnh viễn production | CHƯA ĐỦ DỮ LIỆU |
| Chuyển sang performance tier sau benchmark | SỬA |
| Giữ hệ số 2,0 như implementation tạm thời | GIỮ |
| Chốt markup 1,8 như business decision | CHƯA ĐỦ DỮ LIỆU |
| Contingency 5% pilot | GIỮ |
| B2 = 1.000đ/job | LOẠI |
| Payment = 15.000đ/job | LOẠI |
| Affiliate 10% eligible net revenue có floor | SỬA |
| Affiliate mặc định 12–15% | LOẠI |
| Affiliate trên gross invoice | LOẠI |
| Affiliate trên contribution margin | CHƯA ĐỦ DỮ LIỆU |
| Discount không qua floor | LOẠI |
| Hard-code thuế 20% | LOẠI |
| Final price không có cap/re-approval | LOẠI |
| Worker B2 cấp delete toàn bucket | LOẠI |
| Gọi contribution margin là net profit | LOẠI |
| Full E2E đã chứng minh economics | CHƯA ĐỦ DỮ LIỆU |

## ### CÁC QUYẾT ĐỊNH OWNER CẦN CHỐT

1. Entity, VAT, hóa đơn và phương pháp thuế; cần kế toán.
2. Host rate và PC-hour hay performance unit.
3. Startup/setup, idle gap, retry và lỗi thuộc Host/CWS/khách.
4. Markup hoặc target contribution margin sau affiliate.
5. Dùng 5% reserve tạm thời và lịch review.
6. Absolute floor và target CM sau affiliate.
7. B2 retention source/preview/final và cleanup allocation.
8. SePay plan/quota, bank fees, overage, reconciliation.
9. Affiliate rate, attribution window, hold, payout cycle, cap và fraud policy.
10. Affiliate chỉ Job đầu tiên hay cả repeat revenue.
11. Price cap, re-approval và refund/rework.
12. Discount/volume tier và commitment.
13. Floor VND cho Job nhỏ.
14. Xử lý thuế thu hộ/B2 pass-through trong affiliate base.

## Nguồn và độ tin cậy

Ngày kiểm tra web: 2026-08-04.

- [Backblaze Cloud Storage Pricing](https://www.backblaze.com/cloud-storage/pricing): provider pricing/egress; cao.
- [Backblaze Transaction Pricing](https://www.backblaze.com/cloud-storage/transaction-pricing): upload/storage/transactions; cao.
- [SePay Pricing](https://sepay.vn/bang-gia.html): plan/quota/API; cao cho SePay.
- [SePay Webhooks](https://developer.sepay.vn/en/sepay-webhooks): retry/log/replay; cao.
- [EVN official bulletin](https://evn.com.vn/userfile/User/tcdl/files/2025/4/BanTinEVNSo132025-20250408155728084.pdf): tariff reference; cao, không phải Host cost.
- [RunPod RTX 4090](https://www.runpod.io/gpu-models/rtx-4090): cloud comparator; cao, không phải benchmark Host VN.
- [RunPod affiliate](https://www.runpod.io/blog/introducing-the-new-runpod-referral-affiliate-program): ví dụ 10%; cao cho RunPod, không phải standard.
- [Fox Renderfarm referral](https://www.foxrenderfarm.com/invite.html): coupon/cap referral; cao cho Fox.
- [RenderStreet referral FAQ](https://support.render.st/portal/en/kb/articles/renderstreet-one-referral-program): anonymous reporting; cao cho RenderStreet.
- [Luật Thuế TNDN 67/2025/QH15](https://chinhphu.vn/?classid=1&docid=214607&pageid=27160&typegroupid=3) và [Nghị định 117/2025/NĐ-CP](https://chinhphu.vn/?classid=1&docid=213883&pageid=27160): nguồn pháp lý chính thức; cần kế toán.
- [B2 audit](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/reports/worker/CWS_B2_LEAST_PRIVILEGE_AUDIT_2026-08-03.md) và [customer research](https://github.com/trankhanhduy1508-maker/cws-portal/blob/agent/roadmap-mvp-v2/reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md): bằng chứng repo.

Giới hạn: chưa có benchmark Host VN, invoice B2/SePay thật của CWS hoặc Full E2E khách thật. Báo cáo không phải tư vấn thuế/pháp lý và không phải quyết định giá production.
