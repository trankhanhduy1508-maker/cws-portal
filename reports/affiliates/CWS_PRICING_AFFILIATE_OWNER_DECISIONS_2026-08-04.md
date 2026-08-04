# CWS — Pricing + Affiliate: Quyết định Owner cho MVP

Ngày: 2026-08-04

## Mục đích

Tài liệu này chuyển các phát hiện trong báo cáo nghiên cứu Pricing + Unit Economics + Affiliate thành các quyết định có thể chốt cho MVP.

Nguyên tắc:

- Không bán dưới expected variable cost.
- Giữ công thức đơn giản để triển khai và đối soát.
- Tách số đã có bằng chứng khỏi giả định.
- Không gọi contribution margin là net profit.
- Không đưa thuế 20% vào pricing engine khi chưa xác định entity và phương pháp thuế.

## 1. Phân loại cơ sở dữ liệu

### Đã có cơ sở trực tiếp

- Code hiện dùng Host rate 6.000đ/Worker-hour.
- Code hiện dùng hệ số 2.
- Code hiện tính runtime thực tế và startup theo Worker.
- Repo chưa có affiliate implementation.
- B2 Worker đã được audit theo prefix renders/; chưa có cơ chế delete/cleanup hoàn chỉnh.
- SePay/direct bank không có căn cứ để mặc định 15.000đ/job.
- B2 không có căn cứ để mặc định 1.000đ/job.
- Chưa có Full E2E khách thật hoàn chỉnh.

### Chỉ là giả định hoặc baseline cần kiểm chứng

- 6.000đ có đủ hấp dẫn Host hay không.
- Markup 1,8x hoặc 2,0x có đủ để CWS sống được hay không.
- Contingency/retry reserve 5%.
- Affiliate 10%, 12% hoặc 15%.
- B2 cost bình quân mỗi Job.
- Payment allocation bình quân mỗi Job.
- Absolute floor bằng VND.
- Target contribution margin.
- Thời gian hold affiliate, cửa sổ attribution, mức discount.
- Thuế và cách xử lý VAT/hóa đơn.

## 2. Quyết định Host payout

### Lựa chọn

A. Giữ 6.000đ/Worker-hour cho pilot.

B. Trả theo GPU/performance tier ngay.

C. Trả theo benchmark performance unit sau giai đoạn đo.

### Ưu và nhược điểm

| Lựa chọn | Ưu điểm | Nhược điểm/rủi ro |
|---|---|---|
| A | Đơn giản, khớp code hiện tại, dễ giải thích | PC nhanh/chậm được trả giống nhau; có thể thiếu hấp dẫn hoặc trả quá cao |
| B | Công bằng hơn theo năng lực | Cần benchmark, tier, VRAM/RAM và policy lỗi; phức tạp sớm |
| C | Có đường nâng cấp dựa trên dữ liệu | Cần thời gian đo và chuẩn hóa benchmark |

### Khuyến nghị MVP

**Chọn A cho pilot có giới hạn**, nhưng ghi rõ đây là baseline tạm thời, không phải giá production vĩnh viễn.

Khi đã có dữ liệu runtime, success rate và benchmark Blender thật, chuyển sang C. Không nên chọn B ngay nếu chưa có benchmark lặp lại.

### Cần Owner chốt

- 6.000đ có được phép dùng trong pilot không.
- Có trả startup/setup không.
- Retry do lỗi Host/CWS/khách được phân bổ thế nào.
- Có minimum billable time không.

Khuyến nghị chuyên môn: chỉ trả thời gian hợp lệ đã render hoặc setup được quy định rõ; không trả idle gap và không trả retry do lỗi Host nếu CWS có thể xác định lỗi đó.

## 3. Quyết định startup và runtime billing

### Lựa chọn

A. Giữ đúng logic code hiện tại: runtime thực tế cộng startup 10 phút/Worker.

B. Chỉ tính runtime render, không tính startup.

C. Dùng startup grace cố định khác theo Worker roadmap.

### Đánh giá

A đơn giản và đã có test, nhưng giá estimate có thể tăng bởi startup. B dễ giải thích nhưng có thể làm CWS chịu chi phí cho Job nhỏ. C cần sửa logic và hiện chưa có dữ liệu chứng minh.

### Khuyến nghị MVP

**Tạm giữ A cho internal/pilot**, nhưng phải công khai startup component trong breakdown và thống nhất một policy. Không được để roadmap và pricing service dùng hai quy tắc khác nhau.

Owner nên chốt một trong hai:

- startup là chi phí có thể thu;
- hoặc startup là chi phí CWS chịu, nhưng phải đưa vào variable cost/floor.

## 4. Quyết định markup

### Lựa chọn

A. 1,8x.

B. 2,0x.

C. Markup động theo Job risk/size.

### Phân tích

1,8x tạo margin trước affiliate khoảng 44,44%. Nếu affiliate 10% revenue, còn khoảng 34,44% trước fixed cost và thuế.

2,0x tạo margin trước affiliate 50%; sau affiliate 10% còn 40%.

C bảo vệ economics tốt hơn nhưng khó giải thích và khó test khi chưa có dữ liệu.

### Khuyến nghị MVP

**Không chốt 1,8x là giá chính thức.** Dùng 2,0x như baseline bảo thủ trong mô hình thử nghiệm, nhưng vẫn phải qua price floor và price cap.

Lý do:

- CWS chưa có dữ liệu fixed cost, utilization, retry, refund và support.
- 2,0x có biên an toàn lớn hơn khi affiliate 10% và chi phí biến đổi chưa hoàn chỉnh.
- Đây vẫn là giả định, không phải số đã được chứng minh.

Không được nhân markup nhiều lần ở các màn hình khác nhau.

## 5. Quyết định contingency/retry reserve

### Lựa chọn

A. Reserve cố định 5%.

B. Không reserve; tính đúng cost thực tế.

C. Expected value theo loại lỗi sau khi có dữ liệu.

### Khuyến nghị MVP

**Chọn A tạm thời**, chỉ khi CWS ghi rõ 5% là forecast/retry reserve và không đồng thời cộng lại cùng một retry cost trong Variable Cost.

Sau khi có dữ liệu, chuyển sang C. Review sau cohort Job thật đầu tiên hoặc sau số lượng Job Owner chọn.

Rủi ro của 5%:

- quá thấp nếu failure rate cao;
- quá cao nếu Job ổn định;
- che giấu lỗi Worker hoặc upload;
- double count với Expected Retry/Failure.

## 6. Quyết định B2 allocation

### Lựa chọn

A. B2 = mức cố định/job.

B. Phân bổ theo usage và retention.

C. B2 miễn phí cho khách, CWS chịu toàn bộ.

### Khuyến nghị MVP

**Chọn B.** Công thức tối giản:

    B2 allocation =
      storage GB-month × account rate
      + billable egress
      + paid transaction allocation
      + multipart/versioning allocation

Mỗi loại file có retention riêng: source, preview, final. Không hard-code 1.000đ/job.

Nếu dữ liệu B2 thực tế chưa đủ, dùng một estimate bảo thủ nội bộ để kiểm tra floor, nhưng không trình bày đó là giá cố định đã xác minh.

## 7. Quyết định payment allocation

### Lựa chọn

A. 0đ/job khi dùng direct bank/SePay trong quota.

B. Gán một phí cố định, ví dụ 15.000đ/job.

C. Phân bổ subscription/overage/ops theo paid Job.

### Khuyến nghị MVP

**Chọn C**, với component transaction có thể bằng 0 nếu account thực tế không thu transaction fee:

    Payment allocation =
      (monthly provider plan + overage + bank fees
       + reconciliation/refund operations) / paid Jobs

Không dùng 15.000đ/job khi chưa có invoice hoặc policy nhà cung cấp chứng minh.

## 8. Quyết định affiliate rate và basis

### Lựa chọn rate

A. 10% eligible net collected revenue.

B. 12% eligible net collected revenue.

C. 15% eligible net collected revenue.

D. Phần trăm contribution margin.

E. Coupon/credit thay vì tiền mặt.

### Đánh giá

- 10%: dễ hiểu, gần ví dụ cloud compute đáng tin, rủi ro margin thấp nhất trong các rate đề xuất.
- 12%: acquisition mạnh hơn, nhưng ăn thêm margin chưa được chứng minh.
- 15%: rủi ro cao với Job nhỏ, discount và retry.
- Contribution margin: bảo vệ CWS nhưng khó cho Affiliate kiểm chứng.
- Coupon/credit: giảm cash out, nhưng có thể khó hiểu và ít hấp dẫn.

### Khuyến nghị MVP

**Chọn A: 10% eligible net collected revenue.**

Điều kiện:

- chỉ trả trên tiền đã thu;
- trừ refund, chargeback và phần thuế thu hộ nếu có;
- không trả cho Job unpaid, failed hoặc cancelled;
- có hold period;
- có reversal nếu refund sau payout;
- price floor được kiểm tra trước khi áp commission;
- nên giới hạn Job đầu tiên hoặc cửa sổ ngắn ở giai đoạn pilot.

Không chọn 12–15% cho đến khi CWS có dữ liệu contribution margin và repeat rate.

## 9. Quyết định attribution affiliate

### Lựa chọn

A. Last eligible click trong 30 ngày.

B. First click trong 30 ngày.

C. Chia hoa hồng nhiều Affiliate.

### Khuyến nghị MVP

**Chọn A.** Last click dễ giải thích và dễ xây ledger. Một Job chỉ có một Affiliate được ghi nhận. Chặn self-referral, duplicate account và gian lận.

Lưu tối thiểu:

- affiliate ID;
- referral/click ID;
- timestamp;
- customer/order ID nội bộ;
- eligible revenue;
- commission rate/version;
- pending/approved/paid/reversed;
- hold/reversal reason.

Affiliate không được thấy file, email, thông tin Host, payment reference nhạy cảm hoặc dữ liệu Customer khác.

## 10. Quyết định hold và payout affiliate

### Lựa chọn

A. Trả ngay sau webhook PAID.

B. Trả sau PAID/COMPLETED và thời gian hold.

C. Trả hàng tháng sau đối soát.

### Khuyến nghị MVP

**Chọn C**, với commission chuyển pending sau PAID/COMPLETED, sau đó approved theo kỳ đối soát hàng tháng. Hold cụ thể là Owner decision; khuyến nghị tối thiểu đủ để xử lý refund/reversal.

Ưu điểm: giảm gian lận và không trả tiền cho Job bị refund. Nhược điểm: Affiliate chờ lâu hơn.

## 11. Quyết định price floor và contribution margin

### Lựa chọn

A. Chỉ dùng cost multiplier.

B. Dùng absolute floor cố định.

C. Dùng floor theo variable cost và target CM, cộng absolute floor cho Job nhỏ.

### Khuyến nghị MVP

**Chọn C.**

    V = Host + B2 + Payment
        + Retry/Failure + other variable cost

    floor = max(
      absolute minimum,
      V / (1 - affiliate rate - target CM after affiliate)
    )

Discount, coupon và affiliate đều phải qua kiểm tra floor server-side. Con số absolute floor và target CM hiện chưa có cơ sở dữ liệu; Owner phải chốt sau khi xem pilot economics.

## 12. Quyết định estimate, final price và cap

### Lựa chọn

A. Chỉ báo giá cuối sau render.

B. Estimate trước render, final không giới hạn.

C. Estimate + breakdown + cap; vượt cap phải re-approve.

### Khuyến nghị MVP

**Chọn C.** Đây là yêu cầu quan trọng từ roadmap/customer research.

Estimate cần hiển thị:

- Host component;
- B2/storage component;
- payment component nếu phân bổ;
- retry/reserve;
- affiliate không nên hiển thị như cost khách nếu đây là acquisition cost;
- khoảng giá hoặc cap;
- điều kiện làm giá thay đổi.

Không được dùng final price sau render làm bất ngờ cho khách.

## 13. Quyết định discount

### Lựa chọn

A. Discount phần trăm tự do.

B. Coupon fixed amount.

C. Volume/commitment discount sau khi kiểm tra floor.

### Khuyến nghị MVP

**Chọn C, nhưng triển khai đơn giản:** chỉ có một hoặc hai tier do Owner chốt, áp dụng khi volume/commitment được xác minh. Coupon fixed amount có thể dùng cho referral nhưng vẫn phải qua floor.

Không discount theo doanh thu danh nghĩa nếu storage, retry hoặc runtime làm Job tăng cost.

## 14. Quyết định thuế

### Lựa chọn

A. Hard-code 20%.

B. Bỏ thuế khỏi mô hình hoàn toàn.

C. Để tax regime là input ngoài pricing engine, chờ Owner/kế toán xác nhận.

### Khuyến nghị MVP

**Chọn C.**

Thuế phụ thuộc entity, revenue, VAT/invoice method, phân loại Host/Affiliate và chi phí được khấu trừ. Luật Thuế TNDN 67/2025/QH15 và Nghị định 117/2025/NĐ-CP là nguồn pháp lý cần đối chiếu, nhưng không đủ để tự kết luận mức áp dụng cho CWS.

## 15. Các quyết định đã được giảm khỏi danh sách Owner

Không cần Owner chốt lại các điểm sau nếu chấp nhận khuyến nghị:

- B2 không dùng mức cố định 1.000đ/job.
- Payment không dùng mặc định 15.000đ/job.
- Affiliate không tính trên gross invoice.
- Contribution margin không gọi là net profit.
- Không trả Affiliate ngay khi webhook chỉ mới ghi nhận PAID nếu chưa xử lý hold/reversal.
- Không cho discount vượt price floor.
- Không cấp B2 delete toàn bucket cho Worker.
- Không chọn 15% affiliate trong pilot.

# OWNER QUICK DECISION

1. Baseline Host pilot
   - A: Giữ 6.000đ/Worker-hour trong pilot.
   - B: Đổi ngay sang performance tier.
   - C: Tạm dừng payout để đo thêm.
   - Khuyến nghị: A.
   - Vì sao: đã có trong code/test và đơn giản nhất; ghi rõ là baseline tạm thời.

2. Startup billing
   - A: Tính runtime + startup 10 phút/Worker.
   - B: Chỉ tính runtime render.
   - C: Dùng startup grace khác.
   - Khuyến nghị: A tạm thời.
   - Vì sao: khớp logic hiện tại; cần công khai breakdown và thống nhất với roadmap.

3. Baseline markup
   - A: 1,8x.
   - B: 2,0x.
   - C: Markup động ngay từ đầu.
   - Khuyến nghị: B làm baseline bảo thủ, nhưng vẫn phải qua floor/cap.
   - Vì sao: chưa có fixed-cost và failure data; 2,0x có khoảng an toàn tốt hơn.

4. Retry/failure reserve
   - A: 5% tạm thời.
   - B: 0%.
   - C: Expected value theo dữ liệu Job.
   - Khuyến nghị: A trong pilot, sau đó chuyển C.
   - Vì sao: chưa có lịch sử đủ; 5% chỉ là reserve tạm và không được tính trùng.

5. Affiliate rate
   - A: 10% eligible net collected revenue.
   - B: 12%.
   - C: 15%.
   - Khuyến nghị: A.
   - Vì sao: dễ hiểu, rủi ro margin thấp nhất; chỉ trả sau PAID/COMPLETED, hold và reversal.

6. Affiliate attribution
   - A: Last eligible click 30 ngày.
   - B: First click 30 ngày.
   - C: Chia nhiều Affiliate.
   - Khuyến nghị: A.
   - Vì sao: đơn giản, một Job một Affiliate, dễ đối soát.

7. Affiliate payout timing
   - A: Trả ngay sau PAID.
   - B: Trả sau hold riêng từng Job.
   - C: Đối soát và trả hàng tháng.
   - Khuyến nghị: C, với commission pending trước khi approved.
   - Vì sao: giảm refund, chargeback và fraud risk.

8. Price floor
   - A: Chỉ dùng multiplier.
   - B: Chỉ dùng absolute floor.
   - C: Variable-cost floor + target CM + absolute floor cho Job nhỏ.
   - Khuyến nghị: C.
   - Vì sao: bảo vệ CWS trước cả cost tăng và Job quá nhỏ.
   - Owner cần chốt: absolute floor VND và target CM sau affiliate.

9. Price estimate/cap
   - A: Chỉ báo giá sau render.
   - B: Estimate không cap.
   - C: Estimate + breakdown + cap + re-approval.
   - Khuyến nghị: C.
   - Vì sao: giảm price shock và đúng yêu cầu MVP.

10. Discount
    - A: Phần trăm tự do.
    - B: Coupon fixed amount không floor.
    - C: Volume/commitment tier có floor.
    - Khuyến nghị: C.
    - Vì sao: giữ economics và đơn giản hơn dynamic pricing.

11. Tax treatment
    - A: Hard-code 20%.
    - B: Bỏ qua thuế.
    - C: Tax regime là input chờ Owner/kế toán.
    - Khuyến nghị: C.
    - Vì sao: chưa đủ căn cứ về entity, VAT, invoice và deductible cost.

12. B2 retention và payment plan
    - A: Owner cung cấp retention source/preview/final và plan/quota thực tế.
    - B: Dùng giả định cố định.
    - C: Không tính các khoản này.
    - Khuyến nghị: A.
    - Vì sao: đây là các đầu vào thực tế duy nhất còn thiếu để tính variable cost, nhưng không cần thay đổi công thức nền.

## Kết luận

Nếu Owner chấp nhận các khuyến nghị, MVP có bộ nguyên tắc tối giản:

- Host pilot 6.000đ/Worker-hour.
- Markup baseline 2,0x.
- Reserve tạm 5%, không double count.
- B2/payment phân bổ theo usage/plan thực tế.
- Affiliate 10% eligible net collected revenue, last click, pending → monthly approval/payout.
- Price floor luôn kiểm tra trước discount/affiliate.
- Estimate + breakdown + cap trước render.
- Thuế là input chờ kế toán, không hard-code 20%.

Báo cáo này không thay đổi pricing production, không triển khai Affiliate và không thay đổi database.
