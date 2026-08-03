# CWS — Customer Objection & Desire Research (300 Insights)

**Ngày:** 2026-08-03
**Vai trò:** Product Research Lead
**Mục tiêu:** Không phải bài brainstorm cho đủ số lượng. Mục tiêu là tìm ra những thứ CWS
thực sự phải sửa/làm để khách hàng chịu thử, trả tiền, và quay lại.

## Phương pháp & nhãn

Mỗi insight gắn 1 trong 3 nhãn:

- **[EVIDENCE]** — có bằng chứng trực tiếp: trích dẫn file:dòng cụ thể trong repo `cws-portal`,
  hoặc URL nguồn thật tìm được qua web research (review, forum, bài báo).
- **[INFERENCE]** — suy luận hợp lý, có căn cứ, từ cơ chế/kiến trúc CWS thật đã xác nhận trong
  code/docs (không phải bịa, nhưng chưa có ai xác nhận cảm nhận này từ 1 khách hàng CWS thật).
- **[HYPOTHESIS]** — giả thuyết hợp lý dựa trên pattern thị trường/tâm lý người dùng nói chung,
  **cần phỏng vấn/test với khách hàng thật của CWS để xác nhận**. Không được coi là fact.

Mỗi mục Phần C còn có thêm nhãn Kano: `MUST HAVE` / `WANT` / `DELIGHTER` / `BAD IDEA`.

**Sự thật quan trọng nhất cần biết trước khi đọc:** CWS **CHƯA có 1 khách hàng thật nào đi hết
toàn bộ chuỗi Upload → Render → Preview → Thanh toán → Nhận file** (xác nhận:
`reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md:13` — *"Kết luận: CHƯA ĐẠT ĐIỂM DỪNG"*). Vì vậy
**không có insight nào trong tài liệu này có thể là bằng chứng trực tiếp về phản ứng của khách
hàng CWS thật** — phần lớn Phần B và một phần Phần A/C ở mức INFERENCE/HYPOTHESIS. Đây chính là
rủi ro lớn nhất: CWS chưa biết vấn đề thật sự nghiêm trọng nhất nằm ở đâu.

---

## 0. CWS đang thực sự làm gì (tóm tắt source-of-truth, đọc toàn văn repo + code)

**Customer journey thật:**

0. Vào trang — chưa cần đăng nhập.
1. Chọn nguồn file: upload trực tiếp (chỉ `.blend`, tối đa **2GB**,
   `backend/src/files/files.controller.ts:19-20`) HOẶC dán link (Google Drive/OneDrive/Dropbox/
   Direct Link) — nhưng **chỉ Google Drive được xác minh thật qua API**, các nguồn khác chỉ được
   kiểm tra cú pháp URL (`backend/src/files/google-drive.service.ts:45-79`).
2. Đăng nhập Google **bắt buộc tại thời điểm bấm "Bắt đầu render"** (không phải ngay từ đầu),
   redirect toàn trang qua Supabase OAuth (`src/App.jsx:172-206`). **Không có phương thức đăng
   nhập nào khác** (không email/password, không OTP, không Zalo — `DECISIONS.md:5,9-16`).
3. Job tạo ngay, **miễn phí**, có ước tính hàng đợi/giá hiển thị nhưng chính code ghi chú đây
   "KHÔNG phải công thức thật cuối cùng" (`backend/src/jobs/jobs.service.ts:43-46,80-95`).
4. Worker (máy PC vật lý của đối tác — "Fleet Anh Thông") render. **Gap nghiêm trọng đã xác
   nhận bằng code**: Worker hiện KHÔNG claim job MVP bất kỳ — chỉ lặp qua 1 danh sách job_id
   hardcode riêng của Owner (`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md:56-85`).
5. Preview: 3-5 ảnh tĩnh, watermark chéo phủ toàn ảnh, **không có preview video**
   (`backend/src/storage/preview.service.ts:19-62`).
6. Duyệt → thanh toán **giá thật tính SAU render** (6.000đ/giờ-Worker × hệ số 2 + 10 phút khởi
   động/Worker — `backend/src/jobs/services/pricing.service.ts:4-6,82-87`), khác ước tính ban
   đầu. QR VietQR/MB Bank qua SePay, đối soát **khớp tuyệt đối** số tiền, không dung sai
   (`reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md:112-113`). Không có đồng hồ đếm ngược. Nút
   "Hủy job" hiện nhưng backend **chặn hủy** từ bước này trở đi (`jobs.service.ts:253-273`).
7. Tải file cuối: B2 presigned URL, **TTL chỉ 300 giây (5 phút)**
   (`jobs.service.ts:37,470-488`; `b2-storage.service.ts:65-68`).

**Không có kênh support** (chat/hotline/email) nào tìm thấy trong code — "Yêu cầu chỉnh sửa"
chỉ hiện thông báo tĩnh, không định nghĩa kênh liên hệ cụ thể (`src/pages/ReviewScreen.jsx:105`).
**Không có refund flow tự động** — hoàn toàn thủ công (`SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md:116`).
**2 rủi ro bảo mật nghiêm trọng chưa sửa**: (a) B2 Application Key toàn quyền hardcode plaintext
trong file Worker phân phối tới mọi máy vật lý; (b) `--enable-autoexec` trên Blender Worker —
an toàn hiện tại chỉ vì Owner tự chọn file thủ công, sẽ là lỗ hổng thực thi mã tuỳ ý nếu khách lạ
tự upload đại trà (`CWS_WORKER_READINESS_AUDIT_2026-08-02.md:103-174`). Không có chính sách xoá
file sau khi hoàn thành — file lưu vô thời hạn trên B2.

*(Báo cáo đầy đủ, trích dẫn chi tiết hơn: xem phụ lục cuối tài liệu.)*

## Nguồn research bên ngoài đã dùng

Trustpilot (rebusfarm.net, ranchcomputing.com), Reviews.io (RebusFarm), Blender Artists forum
(3 thread khác nhau), forums.chaos.com (Chaos Cloud cost guide), plainlyvideos.com (so sánh
render farm cho After Effects), superrendersfarm.com, irendering.net (bảo mật render farm),
garagefarm.net/blog, g2.com/products/renderday, findrenderfarm.com, renderfarms.vn, sourceforge.net
(free trial render farm), foxrenderfarm.com, radarrender.com, cùng 3 báo/cổng thông tin Việt Nam
về lừa đảo QR chuyển khoản (tienphong.vn, cafef.vn, công an Lai Châu). Reddit không truy cập được
trực tiếp trong môi trường research — không có insight nào gán nguồn Reddit.

---

# PHẦN A — 100 nguyên nhân khách biết CWS nhưng KHÔNG THỬ

*Câu hỏi: "Tôi biết CWS tồn tại nhưng tại sao tôi vẫn không sử dụng?"*

## A1. Không tin thương hiệu mới (10)

1. [INFERENCE] CWS chưa có khách hàng thật nào hoàn thành job — không có review, case study, số
   liệu "đã render X job" để trấn an người mới. (`MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md:13`)
2. [INFERENCE] Không có trang "Về chúng tôi"/thông tin pháp nhân, địa chỉ, mã số thuế công khai —
   khách không biết ai đứng sau CWS.
3. [HYPOTHESIS] Thương hiệu "CWS" chưa từng xuất hiện trên Google/mạng xã hội trước đó, dễ bị
   nghi là dịch vụ tự phát/không nghiêm túc.
4. [EVIDENCE] Ngành render farm quốc tế vẫn ưu tiên thương hiệu lâu năm (RebusFarm, Chaos) —
   thương hiệu mới luôn bất lợi hơn về niềm tin ban đầu. (forums.chaos.com, reviews.io)
5. [HYPOTHESIS] Không có testimonial của studio/artist Việt Nam cụ thể — khách trong cộng đồng
   (group Blender VN...) không có ai "bảo chứng" trước.
6. [INFERENCE] Trang không hiển thị số liệu vận hành thật (số Worker online, uptime) — khách
   không có cách tự đánh giá độ tin cậy trước khi thử.
7. [HYPOTHESIS] Không thấy Điều khoản dịch vụ/Chính sách bảo mật công khai dễ tìm — khách
   doanh nghiệp coi đây là dấu hiệu thiếu chuyên nghiệp.
8. [INFERENCE] Worker chạy trên máy vật lý cá nhân (đối tác "Fleet Anh Thông"), không phải data
   center — nếu khách biết, cảm giác "không chuyên nghiệp bằng cloud thật" có thể giảm niềm tin.
   (`docs/WORKER_FLEET_AUDIT.md`)
9. [HYPOTHESIS] Không có kênh mạng xã hội hoạt động thường xuyên để khách "rình" trước khi quyết
   định thử.
10. [HYPOTHESIS] Giá nếu rẻ bất thường so với thị trường có thể bị hiểu là "quá tốt để là thật"
    thay vì lợi thế cạnh tranh.

## A2. Sợ mất/lộ file, IP, asset bị đánh cắp (10)

1. [EVIDENCE] Nỗi lo phổ biến toàn ngành: "liệu nhân viên render farm có xem file của tôi khi
   troubleshoot không" — CWS chưa có tuyên bố công khai trả lời câu hỏi này. (irendering.net)
2. [INFERENCE] Không có chính sách xoá file sau khi hoàn thành — thực tế file lưu vô thời hạn
   trên B2 (không có route xoá trong code) — khách sẽ lo file "ở lại mãi mãi" trên hệ thống lạ.
3. [HYPOTHESIS] Khách làm dự án có NDA mặc định coi mọi dịch vụ render thuê ngoài chưa có hợp
   đồng bảo mật là rủi ro không chấp nhận được.
4. [HYPOTHESIS] Lo sợ asset/texture/model bản quyền bị người vận hành Worker (chủ máy quán net)
   sao chép lại và dùng/bán lại.
5. [INFERENCE] Preview có watermark chéo toàn ảnh — thực ra trấn an một phần, nhưng khách chưa
   thấy trước khi thử nên không biết để yên tâm.
6. [HYPOTHESIS] "Máy chạy Worker là máy cá nhân của ai đó" nghe rủi ro hơn "server đám mây" dù
   logic bảo mật dữ liệu chưa chắc kém hơn.
7. [EVIDENCE] Mô hình free/peer-to-peer (SheepIt) từng bị chê vì người render thấy thumbnail của
   nhau — nếu khách liên tưởng CWS tới mô hình này, sẽ thừa hưởng nỗi lo tương tự. (superrendersfarm.com)
8. [HYPOTHESIS] Không có cam kết hợp đồng bồi thường nếu rò rỉ dữ liệu — doanh nghiệp lớn coi
   đây là điều kiện tiên quyết trước khi gửi file.
9. [INFERENCE] Backend dùng 1 B2 Application Key toàn quyền hardcode plaintext trong Worker —
   nếu từng rò rỉ ra ngoài, sẽ củng cố đúng nỗi sợ "asset không an toàn". (`cws_worker_full.py`)
10. [HYPOTHESIS] Khách coi file .blend chứa cả quy trình làm việc (rig, node setup) là "bí quyết
    nghề nghiệp" — sợ mất còn hơn sợ mất thành phẩm.

## A3. Giới hạn kỹ thuật/định dạng không khớp nhu cầu thật (10)

1. [EVIDENCE] Chỉ chấp nhận `.blend`, tối đa 2GB (`files.controller.ts:19-20`) — dự án 3D thật
   thường có texture/asset ngoài file .blend, vượt xa giới hạn này.
2. [INFERENCE] Dự án phim ngắn/animation nhiều file liên kết thường không đóng gói gọn trong 1
   file .blend dưới 2GB — nhóm khách này gần như chắc chắn không dùng được CWS hiện tại.
3. [EVIDENCE] Người dùng Blender Artists xác nhận "transfer toàn bộ project lên farm là bất khả
   thi" với project phức tạp — cùng vấn đề CWS sẽ gặp. (blenderartists.org)
4. [INFERENCE] OneDrive/Dropbox/Direct Link được UI chấp nhận nhưng backend chỉ xác minh cú
   pháp URL — khách dùng các nguồn này tưởng đã gửi thành công nhưng job có thể không bao giờ
   chạy được. (`google-drive.service.ts`)
5. [INFERENCE] Không hỗ trợ Cinema 4D, Maya, After Effects, 3ds Max — chỉ Blender — loại bỏ toàn
   bộ khách dùng phần mềm khác (đa số studio VFX/motion design chuyên nghiệp).
6. [HYPOTHESIS] Không rõ hỗ trợ render engine nào (Cycles/Eevee) và version Blender nào — khách
   sợ file không tương thích, mất công convert.
7. [HYPOTHESIS] Không rõ addon/plugin bên thứ 3 có được hỗ trợ trên máy Worker không — nhiều
   scene phụ thuộc addon.
8. [INFERENCE] Không giới hạn công khai số job đồng thời/khách — khách studio cần render nhiều
   shot cùng lúc không biết có bị nghẽn không.
9. [HYPOTHESIS] Không có API/CLI để tích hợp pipeline tự động của studio — chỉ có UI web.
10. [INFERENCE] 4 "Render Profile" (Economy...Turbo) chỉ là hệ số hiển thị, chưa xác nhận có
    backend ưu tiên tài nguyên thật — khách trả thêm cho "Turbo" có thể không nhận tốc độ tương xứng.

## A4. Rào cản đăng nhập/tài khoản (10)

1. [EVIDENCE] Chỉ hỗ trợ đăng nhập Google, không email/password, không OTP, không Zalo Login
   (`DECISIONS.md:5,9-16`) — khách không muốn dùng Gmail cho công việc bị chặn hoàn toàn.
2. [HYPOTHESIS] Studio dùng email doanh nghiệp riêng ngại liên kết tài khoản Google cá nhân cho
   việc công ty.
3. [INFERENCE] Đăng nhập redirect toàn trang qua Supabase OAuth, không phải popup — gián đoạn
   luồng đang thao tác, có thể khiến khách bỏ giữa chừng. (`src/App.jsx`)
4. [HYPOTHESIS] Khách lo cấp quyền Google đồng nghĩa CWS truy cập được Drive/dữ liệu Google khác.
5. [HYPOTHESIS] Không có lựa chọn "dùng thử không cần đăng nhập" để xem giao diện/luồng trước.
6. [INFERENCE] Đăng nhập chỉ yêu cầu SAU khi đã chọn file/link — khách bỏ công chọn file rồi mới
   bị chặn, cảm giác bị "gài", có thể bỏ cuộc ngay lúc đó.
7. [HYPOTHESIS] Nhân viên agency dùng máy công ty có chính sách chặn đăng nhập Google cá nhân.
8. [HYPOTHESIS] Không rõ dữ liệu tài khoản Google được CWS lưu/sử dụng thế nào — thiếu minh bạch.
9. [INFERENCE] Khách có nhiều tài khoản Google, chọn nhầm tài khoản lúc redirect có thể gây job
   gắn sai tài khoản.
10. [HYPOTHESIS] Người ít quen web app hiện đại thấy quy trình OAuth phức tạp hơn "điền form
    thường".

## A5. Upload/mạng/tệp nặng (10)

1. [EVIDENCE] Artist quốc tế từng than upload nhiều GB file trước khi phát hiện lỗi — cùng rủi
   ro áp dụng khi khách CWS upload file .blend nặng. (blenderartists.org)
2. [HYPOTHESIS] Mạng internet ở nhiều khu vực Việt Nam ngoài thành phố lớn có tốc độ upload
   thấp, đủ để khách bỏ cuộc giữa chừng khi gửi file gần 2GB.
3. [INFERENCE] Không tìm thấy cơ chế resume upload khi mất kết nối — khách mạng chập chờn phải
   upload lại từ đầu.
4. [EVIDENCE] RebusFarm phải làm hẳn 1 trang FAQ riêng "Upload and Download Problems" — cho thấy
   đây là điểm ma sát phổ biến toàn ngành. (rebusfarm.net/upload-and-download-problems)
5. [HYPOTHESIS] Mạng công ty giới hạn băng thông upload khiến quá trình gửi file chậm hơn kỳ vọng.
6. [INFERENCE] Google Drive link cần chế độ chia sẻ đúng ("ai có link") mới xác minh được — lỗi
   ngay bước kiểm tra nếu sai, khách mới có thể không hiểu tại sao.
7. [HYPOTHESIS] Khách quen dùng FTP/WeTransfer cho file lớn thấy upload qua trình duyệt kém tin
   cậy hơn.
8. [HYPOTHESIS] Lo sợ đóng/refresh tab giữa lúc upload sẽ mất toàn bộ tiến trình.
9. [INFERENCE] Giới hạn 2GB chặn cứng ở tầng multer — khách không được cảnh báo trước cho tới
   khi upload thất bại, trải nghiệm lỗi xảy ra muộn.
10. [HYPOTHESIS] Thiết bị/laptop cấu hình thấp ngại mở file .blend nặng để chọn file upload.

## A6. Giá không rõ ràng (10)

1. [EVIDENCE] Không có bảng giá cố định công khai — giá hiển thị lúc chọn tốc độ chỉ là ước tính
   heuristic, code tự ghi chú "KHÔNG phải công thức thật cuối cùng". (`jobs.service.ts:43-46`)
2. [INFERENCE] Giá cuối chỉ tính SAU khi render xong — khách phải "cam kết" duyệt trước khi biết
   chính xác phải trả bao nhiêu.
3. [EVIDENCE] Ngành từng bị chỉ trích vì thiếu "cost calculator" rõ ràng (Chaos Cloud) — khách
   phải đoán chi phí trước khi cam kết. (forums.chaos.com)
4. [HYPOTHESIS] Khách so sánh với "tự render miễn phí trên máy nhà", thấy bất kỳ chi phí nào
   cũng là phát sinh không cần thiết nếu chưa cấp bách.
5. [HYPOTHESIS] Không có gói giá cố định/tháng cho khách render thường xuyên — mỗi lần đều là
   "ẩn số", khó lập ngân sách dự án.
6. [INFERENCE] Công thức giá dựa trên số Worker tham gia job (+10 phút khởi động/Worker) là
   logic nội bộ khách không thể tự kiểm tra. (`pricing.service.ts:82-87`)
7. [HYPOTHESIS] Khách e ngại "giá rẻ ban đầu" là chiêu dụ, sợ phụ phí ẩn kiểu point/credit.
8. [EVIDENCE] Giá cùng loại job từng "tăng gấp 3 lần không giải thích rõ" ở RebusFarm — nỗi sợ
   khách mang theo từ trải nghiệm ngành dù CWS chưa có tiền lệ này. (reviews.io)
9. [HYPOTHESIS] Không có ví dụ "job mẫu — giá thật đã trả" công khai để khách tự ước lượng trước.
10. [INFERENCE] Ước tính dựa trên dung lượng file không phản ánh độ phức tạp scene (sample,
    simulation) — scene nhẹ dung lượng nhưng nặng tính toán sẽ lệch ước tính nhiều.

## A7. Thanh toán QR ngân hàng — tâm lý sợ lừa đảo (10)

1. [EVIDENCE] Lừa đảo qua mã QR chuyển khoản đang được cảnh báo rộng rãi trên báo chí Việt Nam —
   bối cảnh khiến khách ngại chuyển khoản QR cho thương hiệu mới, chưa quen biết. (tienphong.vn, cafef.vn)
2. [INFERENCE] Không có cổng thẻ quốc tế/ví điện tử (Momo, ZaloPay) — chỉ QR MB Bank, giới hạn
   lựa chọn với khách quen thanh toán qua ví.
3. [HYPOTHESIS] Khách chưa từng nghe tên CWS coi "chuyển khoản trước, nhận hàng sau" là rủi ro
   cổ điển của lừa đảo online.
4. [INFERENCE] Nội dung chuyển khoản phải khớp CHÍNH XÁC, không dung sai — khách gõ/copy sai bị
   từ chối mà không cảnh báo trước. (`SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md:112-113`)
5. [EVIDENCE] Mô hình "gửi file → báo giá → đặt cọc → nhận file" đã phổ biến trong ngành render
   Việt Nam — rào cản trả trước khách mang theo sẵn, không phải CWS phát minh. (renderfarms.vn)
6. [HYPOTHESIS] Khách công ty cần hoá đơn VAT/chứng từ kế toán — chuyển khoản QR cá nhân/không
   rõ pháp nhân không đáp ứng yêu cầu nội bộ doanh nghiệp.
7. [INFERENCE] Không có đồng hồ đếm ngược trên màn thanh toán — khách không biết còn bao lâu để
   hoàn tất. (`PaymentScreen.jsx`)
8. [INFERENCE] Nút "Hủy job" hiển thị dù backend chặn hủy từ bước này — khách bấm thử thấy lỗi sẽ
   nghi ngờ cả hệ thống. (`jobs.service.ts:253-260`)
9. [HYPOTHESIS] Khách sợ chuyển khoản xong nhưng webhook xác nhận chậm/lỗi, không ai xác nhận
   theo thời gian thực.
10. [EVIDENCE] Team tự ghi nhận rủi ro: khách bấm Hủy đúng lúc webhook sắp xác nhận có thể mất
    tiền mà không nhận file — hoàn tiền vẫn hoàn toàn thủ công. (`docs/MVP_GAP_REPORT.md:334-359`)

## A8. Không hiểu quy trình/workflow (10)

1. [HYPOTHESIS] Không có video demo/hướng dẫn từng bước trên landing page — khách mới không
   hình dung được hành trình trước khi bắt đầu.
2. [INFERENCE] Nhiều bước rời rạc nhưng không rõ có thanh tiến trình tổng thể "bạn đang ở bước
   mấy" cho khách mới.
3. [HYPOTHESIS] Khách không quen khái niệm "duyệt preview trước khi thanh toán" — nghĩ nhầm phải
   trả tiền ngay từ đầu, gây do dự.
4. [HYPOTHESIS] Thuật ngữ "Render Profile: Economy/Standard/Priority/Turbo" mang tính kỹ thuật,
   khách không chuyên không hiểu chọn cái nào phù hợp.
5. [INFERENCE] Không có FAQ công khai trả lời câu hỏi cơ bản (mất bao lâu, cần chuẩn bị gì) —
   khách phải tự thử mới biết.
6. [HYPOTHESIS] Khách không rõ "Yêu cầu chỉnh sửa" có miễn phí không, giới hạn số lần không.
7. [INFERENCE] Ước tính hàng đợi chỉ hiển thị con số thô, không giải thích lý do (bao nhiêu
   Worker online) — khách không hiểu vì sao phải chờ lâu/ngắn.
8. [HYPOTHESIS] Không có ví dụ trực quan "trước/sau" để khách hình dung chất lượng đầu ra thực tế.
9. [HYPOTHESIS] Khách quen desktop app chuyên dụng cảm thấy quy trình qua trình duyệt "không đủ
   nghiêm túc" cho công việc chuyên nghiệp.
10. [INFERENCE] Landing page hiển thị đồng thời nhiều lựa chọn mà không dẫn dắt tuần tự rõ ràng —
    khách mới có thể không biết bắt đầu từ đâu. (`reports/AUTH_GOOGLE_MIGRATION_REPORT.md:52-58`)

## A9. Không có cách thử trước / pre-sales support thiếu (10)

1. [EVIDENCE] Ngành coi free trial/test credit là chuẩn bắt buộc để khách verify trước khi trả
   tiền lớn — CWS chưa có cơ chế này. (sourceforge.net, foxrenderfarm.com)
2. [INFERENCE] Không có cách hỏi trước (chat/hotline) xem file có tương thích không, trước khi
   bỏ công upload.
3. [HYPOTHESIS] Khách lo scene phức tạp (particle, simulation nặng) sẽ render lỗi/treo mà không
   biết trước, vì không có công cụ kiểm tra sơ bộ.
4. [INFERENCE] Nguồn khác ngoài Drive không có cách nào biết trước file có thực sự đọc được
   không (chỉ Drive được xác minh thật).
5. [HYPOTHESIS] Không có sandbox/demo public để khách "chơi thử" giao diện mà không cần file/tài
   khoản thật.
6. [HYPOTHESIS] Khách B2B muốn trao đổi trực tiếp với người thật trước khi chọn nhà cung cấp
   mới, nhưng CWS không có kênh này.
7. [INFERENCE] Không có kênh hỏi đáp công khai (cộng đồng, group) để khách tiềm năng đọc câu hỏi/
   trả lời của người dùng trước.
8. [HYPOTHESIS] Không có demo video 2-3 phút để khách quyết định trong lần ghé thăm đầu tiên.
9. [HYPOTHESIS] Thiếu chatbot trả lời tự động ngay trên landing page khi khách đang phân vân.
10. [INFERENCE] Không có gói "test nhỏ" tách biệt job thật — khách phải cam kết cả quy trình đầy
    đủ (kể cả rủi ro thanh toán) ngay từ lần thử đầu.

## A10. Đã có lựa chọn khác / rào cản doanh nghiệp (10)

1. [HYPOTHESIS] Khách quen dùng máy/GPU riêng, coi việc gửi file cho người khác render là bước
   thừa, mất kiểm soát không cần thiết.
2. [EVIDENCE] Cộng đồng Blender Artists khuyên nhau tự dựng máy render thay vì thuê ngoài vì farm
   "quá đắt" — tâm lý này áp dụng cả với CWS. (blenderartists.org)
3. [HYPOTHESIS] Studio đã có gói trả trước với farm quốc tế quen thuộc, chi phí chuyển đổi không
   đáng để thử CWS.
4. [HYPOTHESIS] Freelancer đã tự thuê VPS/GPU cloud riêng, quen kiểm soát toàn bộ quy trình.
5. [INFERENCE] Không có tính năng xuất hoá đơn/chứng từ cho doanh nghiệp — công ty cần hạch toán
   chi phí không thể dùng CWS làm nhà cung cấp chính thức.
6. [HYPOTHESIS] Không có SLA hợp đồng — dự án có deadline khách hàng cuối không dám giao phó cho
   dịch vụ chưa có cam kết ràng buộc.
7. [HYPOTHESIS] Agency lớn có quy trình duyệt nhà cung cấp mới nghiêm ngặt, dịch vụ nhỏ như CWS
   khó vượt qua vòng xét duyệt nội bộ.
8. [INFERENCE] Không có ToS/chính sách bảo mật dữ liệu công khai để bộ phận pháp lý khách hàng
   doanh nghiệp xem xét trước.
9. [HYPOTHESIS] Khách nước ngoài hợp tác với studio Việt Nam yêu cầu dùng công cụ đã được họ phê
   duyệt sẵn.
10. [HYPOTHESIS] Người dùng cá nhân không thấy đủ động lực tài chính để trả tiền render khi có
    thể chờ máy nhà tự render qua đêm.

---

# PHẦN B — 100 lý do khách đã thử nhưng KHÔNG MUỐN dùng tiếp

## B1. Preview experience thất vọng (10)

1. [EVIDENCE] Preview chỉ có 3-5 khung hình tĩnh, watermark chéo phủ toàn ảnh — khó đánh giá đầy
   đủ chất lượng trước khi trả tiền. (`preview.service.ts:19-62`)
2. [INFERENCE] Không có preview video dù sản phẩm cuối là video — khách chỉ đoán qua vài khung
   hình tĩnh, không thấy chuyển động/hiệu ứng theo thời gian.
3. [HYPOTHESIS] Watermark dày đặc khiến khách khó nhìn rõ chi tiết (màu sắc, độ nét, artifact)
   để tự tin quyết định trả tiền.
4. [INFERENCE] Frame preview chọn đều nhau theo thuật toán, không phải khách tự chọn — có thể
   bỏ lỡ đúng đoạn khách quan tâm nhất.
5. [HYPOTHESIS] Khách không biết trước chỉ nhận 3-5 ảnh preview — cảm giác "hớ" khi thấy quá ít.
6. [INFERENCE] "Yêu cầu chỉnh sửa" chỉ gửi thông báo tĩnh, không có timeline phản hồi rõ — khách
   không biết bao lâu sẽ được xử lý. (`jobs.service.ts:419-446`)
7. [HYPOTHESIS] Không có cách so sánh preview với scene gốc ngay trên giao diện.
8. [HYPOTHESIS] Preview có thể bị nén/giảm chất lượng để tiết kiệm băng thông — gây hiểu nhầm về
   chất lượng thật.
9. [INFERENCE] Không có cơ chế zoom preview để kiểm tra chi tiết nhỏ trước khi duyệt.
10. [HYPOTHESIS] Nếu preview đẹp nhưng bản final khác (lỗi hệ thống/khác Worker render), khách
    mất niềm tin ngay lần đầu.

## B2. Giá cuối khác ước tính / sốc giá (10)

1. [EVIDENCE] Giá thật tính sau render (runtime Worker + phí khởi động/Worker) khác ước tính ban
   đầu — khách có thể trả nhiều hơn dự tính khi đã "trót" đi đến bước duyệt. (`pricing.service.ts`)
2. [INFERENCE] Nếu job được nhiều Worker cùng xử lý, chi phí tăng theo yếu tố khách không kiểm
   soát được (mỗi Worker +10 phút phí khởi động).
3. [EVIDENCE] Mô hình tương tự từng gây phẫn nộ ở RebusFarm — chi phí tăng bất ngờ không giải
   thích rõ. (reviews.io)
4. [HYPOTHESIS] Khách cảm thấy bị "gài" vì phải duyệt/thanh toán mới biết giá cuối, lúc đó đã
   đầu tư thời gian chờ render (sunk cost), khó rút lui.
5. [HYPOTHESIS] Không có breakdown chi tiết "giá này gồm những gì" khi thấy số tiền cuối — cảm
   giác mù mờ, khó khiếu nại nếu thấy vô lý.
6. [INFERENCE] Phí khởi động cộng dồn theo SỐ WORKER tham gia có thể phạt oan khách có job bị hệ
   thống tự động chia nhỏ cho nhiều máy.
7. [HYPOTHESIS] Chênh lệch dù nhỏ giữa ước tính và giá cuối cũng đủ để nghi ngờ tính minh bạch
   của toàn bộ hệ thống định giá.
8. [HYPOTHESIS] Không có mức trần giá tối đa cam kết trước — khách lo "không biết điểm dừng".
9. [INFERENCE] Giá không cố định khiến khách khó so sánh trực tiếp với đối thủ có bảng giá rõ.
10. [HYPOTHESIS] Sau lần đầu bị giá cuối cao hơn ước tính, khách mất niềm tin vào con số ước
    tính cho các job sau, phải tự trừ hao tâm lý mỗi lần dùng.

## B3. Thanh toán ma sát sau khi đã quyết định mua (10)

1. [EVIDENCE] Nội dung chuyển khoản phải khớp chính xác tuyệt đối — sai một ký tự bị từ chối ghi
   nhận. (`SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md:112-113`)
2. [INFERENCE] Không có đồng hồ đếm ngược trên màn thanh toán — khách không biết còn bao lâu để
   hoàn tất trước khi hết hạn. (`PaymentScreen.jsx`)
3. [INFERENCE] Nút "Hủy job" hiển thị nhưng backend từ chối hủy từ bước `AWAITING_PAYMENT` — bấm
   thử sẽ gặp lỗi bất ngờ, cảm giác bị "mắc kẹt". (`jobs.service.ts:253-273`)
4. [HYPOTHESIS] Khách chuyển khoản xong không thấy xác nhận realtime rõ ràng, không biết chờ bao
   lâu là bình thường.
5. [EVIDENCE] Rủi ro thật team tự ghi nhận: bấm Hủy đúng lúc webhook sắp xác nhận có thể mất
   tiền mà không nhận file, hoàn tiền hoàn toàn thủ công. (`docs/MVP_GAP_REPORT.md:334-359`)
6. [HYPOTHESIS] Khách phải tự copy đúng nội dung chuyển khoản định dạng đặc biệt trên app ngân
   hàng — dễ sai sót với người không quen.
7. [HYPOTHESIS] Không hỗ trợ thanh toán ngoài quét QR VietQR chuẩn — khách chỉ có ví điện tử
   phải tìm cách khác, gây gián đoạn.
8. [INFERENCE] Nếu thanh toán thừa/thiếu do làm tròn ngân hàng, hệ thống không tự đối soát —
   khách phải tự liên hệ xử lý thủ công, không có kênh hỗ trợ tức thời.
9. [HYPOTHESIS] Không có email/thông báo xác nhận "đã nhận tiền, đang xử lý" độc lập với việc tự
   refresh trang.
10. [HYPOTHESIS] Không có lưu phương thức thanh toán cho lần dùng tiếp theo — mỗi lần đều thao
    tác lại từ đầu.

## B4. Tốc độ/độ tin cậy render thực tế (10)

1. [EVIDENCE] Ước tính hàng đợi có thể lên tới 1 giờ nếu 0 Worker online — khách chờ lâu hơn kỳ
   vọng ban đầu. (`jobs.service.ts:80-95`)
2. [INFERENCE] Hàm render chính không có timeout cho 1 frame — nếu treo, Worker đứng yên vô thời
   hạn, khách chờ mãi mà job không hoàn thành. (worker audit — quyết định chủ đích, chưa sửa)
3. [HYPOTHESIS] Khách không được thông báo chủ động khi job gặp sự cố — phải tự vào kiểm tra.
4. [INFERENCE] Số Worker thực tế phục vụ khách MVP hiện rất hạn chế (đội chính phục vụ việc riêng
   của Owner) — thời gian chờ có thể thất thường giữa các lần dùng.
5. [HYPOTHESIS] Chất lượng render khác nhau tuỳ Worker vật lý nào nhận job — kết quả có thể
   không nhất quán giữa các lần.
6. [HYPOTHESIS] Không có cơ chế ưu tiên rõ ràng cho gói "Turbo" — nếu tốc độ thực tế không khác
   biệt, khách cảm thấy bị lừa khi chọn gói đắt.
7. [INFERENCE] Không có thông báo tiến độ chi tiết trong lúc render — khách không biết job có
   đang tiến triển hay bị kẹt.
8. [HYPOTHESIS] Thời gian chờ có thể khác nhau đáng kể theo giờ trong ngày (Worker là máy quán
   net dùng chung mục đích khác) — không dự đoán được.
9. [HYPOTHESIS] Không có SLA về thời gian hoàn thành tối đa — khách deadline gấp không dám phụ
   thuộc CWS cho việc quan trọng lần sau.
10. [INFERENCE] Dùng nhiều Worker để tăng tốc kéo theo phí cộng dồn (mục B2) — khách phải đánh
    đổi "nhanh hơn" và "đắt hơn" do hệ thống tự quyết định.

## B5. Download/output gây khó chịu (10)

1. [EVIDENCE] Link tải chỉ hiệu lực 5 phút (300 giây) — khách phải tải ngay, không có thời gian
   xử lý khác trước khi hết hạn. (`jobs.service.ts:37,470-488`)
2. [HYPOTHESIS] Khách mạng chậm không tải kịp file lớn trong 5 phút, phải xin cấp link mới nhiều
   lần.
3. [HYPOTHESIS] Khách không biết trước link chỉ 5 phút, không chuẩn bị sẵn trước khi bấm tải.
4. [INFERENCE] Không giới hạn số lần tải lại trong code, nhưng khách không được thông báo rõ —
   có thể lo "chỉ được tải 1 lần" và tải vội trong hoảng loạn.
5. [HYPOTHESIS] Không có cách tải trực tiếp về Google Drive/lưu trữ khác — phải tải về máy rồi
   tự upload lại nơi khác.
6. [INFERENCE] Không có email thông báo khi file sẵn sàng — khách phải tự quay lại kiểm tra.
7. [HYPOTHESIS] Khách làm việc nhóm muốn chia sẻ link tải cho đồng nghiệp không làm được vì link
   cá nhân hoá và hết hạn quá nhanh.
8. [HYPOTHESIS] Không rõ định dạng/độ nén file cuối có giữ nguyên chất lượng gốc như đã duyệt.
9. [INFERENCE] File không bị xoá sau khi tải — khách lo dữ liệu vẫn "nằm đâu đó" vô thời hạn.
10. [HYPOTHESIS] Không có xem trước nhanh file cuối trên web trước khi tải — tốn thời gian nếu
    file có vấn đề.

## B6. Thiếu support sau khi trả tiền (10)

1. [EVIDENCE] Không tìm thấy kênh chat/hotline/email hỗ trợ chủ động nào trong frontend — khách
   gặp vấn đề sau khi trả tiền không có nơi liên hệ ngay. (grep toàn bộ `src/`)
2. [INFERENCE] "Yêu cầu chỉnh sửa" chỉ hiện thông báo tĩnh, không định nghĩa kênh liên hệ cụ thể.
   (`ReviewScreen.jsx:105`)
3. [EVIDENCE] Ngành coi phản hồi live chat 2-15 phút là chuẩn tối thiểu — CWS chưa có kênh phản
   hồi tức thời nào để so sánh. (superrendersfarm.com, radarrender.com)
4. [HYPOTHESIS] Khách đã trả tiền nhưng job lỗi không có cách yêu cầu hỗ trợ khẩn cấp.
5. [EVIDENCE] Complaint điển hình ở RebusFarm: quảng cáo 24/7 support nhưng "phone line doesn't
   work" — rủi ro tương tự nếu CWS truyền thông có support nhưng chưa xây kênh nào. (reviews.io)
6. [HYPOTHESIS] Không có số điện thoại/Zalo OA chính thức phù hợp thói quen liên hệ của khách VN.
7. [INFERENCE] Admin Portal có khả năng can thiệp job nhưng chưa xác nhận map đúng với job MVP
   của khách thật.
8. [HYPOTHESIS] Không có FAQ tự phục vụ để khách tự tra cứu trước khi cần liên hệ người thật.
9. [HYPOTHESIS] Khách không biết CWS có hỗ trợ ngoài giờ hành chính Việt Nam không.
10. [INFERENCE] Không có cơ chế theo dõi trạng thái yêu cầu hỗ trợ (mã ticket) — khách gửi yêu
    cầu xong không có cách kiểm tra tiến độ.

## B7. Không có cơ chế sửa/hoàn tiền khi có vấn đề (10)

1. [EVIDENCE] Hoàn tiền hoàn toàn thủ công, không có quy trình tự động cho double payment/lỗi
   thanh toán. (`SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md:116`)
2. [INFERENCE] "Yêu cầu chỉnh sửa" không tự trigger re-render — không rõ khách có phải trả thêm
   cho lần render lại, sự mơ hồ này khiến khách ngại yêu cầu sửa.
3. [EVIDENCE] Đối thủ (RenderDay) chủ động quảng bá cam kết hoàn tiền 100% nếu render fail — sự
   vắng mặt cam kết tương tự ở CWS là bất lợi rõ rệt. (g2.com/products/renderday)
4. [HYPOTHESIS] Khách không hài lòng với kết quả (không phải lỗi hệ thống) không có kênh khiếu
   nại chính thức.
5. [HYPOTHESIS] Không có chính sách hoàn tiền công khai — khách phải "hy vọng" xử lý công bằng.
6. [INFERENCE] Vì giá cuối chỉ biết sau render, hoàn tiền một phần khi job lỗi giữa chừng chưa có
   công thức rõ ràng trong code.
7. [HYPOTHESIS] Khách mất niềm tin ngay cả khi được hoàn tiền, nếu quy trình chậm/không minh
   bạch. (bài học từ trustpilot.com/review/rebusfarm.net)
8. [HYPOTHESIS] Không có cơ chế escrow (giữ tiền trung gian) — mô hình hiện tại "trả tiền là
   xong", rủi ro dồn hết về khách.
9. [HYPOTHESIS] Doanh nghiệp nhỏ cần chứng từ hoàn tiền cho kế toán mà quy trình thủ công khó tạo
   minh bạch.
10. [INFERENCE] Không có cảnh báo tự động cho Admin khi giao dịch bất thường (kẹt ở
    `processing` vĩnh viễn nếu backend crash). (`SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md:120`)

## B8. Thiếu tính năng so với farm quen thuộc (10)

1. [HYPOTHESIS] Không hỗ trợ nhiều phần mềm (chỉ Blender) khiến khách đa công cụ phải dùng nhiều
   dịch vụ khác nhau, dễ bỏ hẳn CWS để dùng 1 nhà cung cấp duy nhất.
2. [EVIDENCE] Farm khác từng bị chê vì lag phiên bản phần mềm hỗ trợ — nếu CWS cũng giới hạn
   version mà không công khai rõ, khách sẽ thất vọng tương tự. (plainlyvideos.com)
3. [HYPOTHESIS] Không có API để tích hợp pipeline tự động — bất tiện cho studio muốn tự động hoá.
4. [HYPOTHESIS] Không có gói subscription cho khách thường xuyên — mỗi lần dùng đều bắt đầu lại
   như khách mới.
5. [INFERENCE] Không rõ có báo cáo chi phí tổng hợp theo tháng cho khách dùng nhiều lần — bất
   tiện cho quản lý ngân sách.
6. [HYPOTHESIS] Không có tính năng chia sẻ dự án cho nhiều thành viên nhóm cùng theo dõi 1 job.
7. [HYPOTHESIS] Không có tuỳ chọn Worker riêng/cô lập cho khách có yêu cầu bảo mật cao hơn.
8. [HYPOTHESIS] Không có cam kết bằng văn bản (hợp đồng/SLA) như một số đối thủ cung cấp.
9. [INFERENCE] Không có cơ chế lưu cấu hình render ưa thích (preset) để dùng lại nhanh.
10. [HYPOTHESIS] Không có điểm thưởng/ưu đãi cho khách quay lại nhiều lần.

## B9. Vấn đề lặp lại dùng lần 2 trở đi (10)

1. [HYPOTHESIS] Quy trình lần 2 không nhanh hơn/quen thuộc hơn — không có tối ưu trải nghiệm cho
   khách quay lại.
2. [INFERENCE] Không có cách lưu file/scene đã dùng trước để tái sử dụng nhanh — mỗi lần đều
   upload/link mới hoàn toàn.
3. [HYPOTHESIS] Nếu Worker fleet vẫn hạn chế ở lần dùng thứ 2, khách sẽ củng cố ấn tượng "đây là
   vấn đề hệ thống", không phải may rủi, và ngừng hẳn.
4. [HYPOTHESIS] Không có ưu đãi cho lần 2, 3... khiến động lực quay lại chỉ dựa trên nhu cầu
   thuần tuý.
5. [INFERENCE] Không có thông báo chủ động mời khách quay lại sau job đầu tiên.
6. [HYPOTHESIS] Với thương hiệu mới, khách có xu hướng quy 1 vấn đề gặp phải cho "cả hệ thống",
   không phải "sự cố hi hữu" — ngưỡng chịu đựng thấp hơn.
7. [HYPOTHESIS] Không có cách khách phản hồi trực tiếp trải nghiệm sau mỗi job — CWS không có
   tín hiệu sớm để biết khách sắp rời bỏ.
8. [INFERENCE] `useJobHistory` tồn tại nhưng chưa rõ có hiển thị đủ thông tin so sánh giữa các
   lần dùng để khách tự đánh giá xu hướng cải thiện.
9. [HYPOTHESIS] CWS không "nhớ" sở thích/thiết lập của khách — mỗi lần phải chọn lại từ đầu.
10. [HYPOTHESIS] Nếu giá cuối lần 2 vẫn khác ước tính như lần 1, khách kết luận đây là đặc điểm
    cố hữu, giảm mạnh khả năng quay lại lần 3.

## B10. Niềm tin bị xói mòn sau trải nghiệm đầu (10)

1. [HYPOTHESIS] Khoảng cách giữa kỳ vọng (marketing) và thực tế gây tổn hại niềm tin nặng hơn
   bình thường vì CWS chưa có "vốn tin cậy" tích luỹ để bù đắp.
2. [EVIDENCE] Trường hợp thật ở RebusFarm: dù được hoàn token, khách vẫn rời bỏ vì cách xử lý
   (support chậm, giải thích mơ hồ) — vấn đề niềm tin nằm ở CÁCH xử lý sự cố. (trustpilot.com)
3. [HYPOTHESIS] Trải nghiệm xấu chia sẻ trong cộng đồng nhỏ (group Blender/VFX VN) lan truyền
   nhanh và nặng nề hơn với thương hiệu mới.
4. [INFERENCE] Vì thiếu support real-time, mọi trải nghiệm xấu khách "tự chịu một mình" — cảm
   giác bị bỏ rơi mạnh hơn so với farm có support tức thời.
5. [HYPOTHESIS] Khách B2B mất niềm tin ở lần đầu thường không cho cơ hội thứ 2 vì rủi ro với dự
   án khách hàng cuối của họ quá cao.
6. [HYPOTHESIS] Nếu khách phát hiện khác biệt giữa tuyên bố và hành vi thực tế (VD: nút Hủy
   không hủy được), họ nghi ngờ luôn các cam kết khác chưa kiểm chứng.
7. [INFERENCE] Không có cách CWS chủ động bù đắp (voucher, ưu đãi) sau trải nghiệm không tốt.
8. [HYPOTHESIS] Khách đánh giá "một lần là đủ để biết" khi thương hiệu chưa chứng minh cải thiện
   liên tục.
9. [HYPOTHESIS] Nếu phải tự tìm cách giải quyết vấn đề (không support), khách có thể chuyển hẳn
   sang đối thủ ngay giữa quá trình, không đợi lần dùng thứ 2.
10. [INFERENCE] Hệ thống hiện chưa từng phục vụ 1 khách thật đi hết chuỗi — mọi insight Phần B là
    dự đoán có căn cứ kiến trúc, chưa xác nhận bằng phản hồi thật; đây tự nó là rủi ro lớn nhất.
    (`MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`)

---

# PHẦN C — 100 điều khách MUỐN CWS có (phân loại Kano)

`MUST HAVE` = bắt buộc phải có, thiếu là mất khách · `WANT` = tăng trải nghiệm/giá trị ·
`DELIGHTER` = không bắt buộc nhưng tạo khác biệt · `BAD IDEA` = nghe hấp dẫn nhưng chi phí/rủi
ro > giá trị.

## C1. Minh bạch & tin tưởng (10)

1. [MUST HAVE][INFERENCE] Bảng giá/công thức tính giá công khai, dễ hiểu — giải quyết trực tiếp
   A6, B2.
2. [MUST HAVE][EVIDENCE] Trang "Về chúng tôi" + pháp nhân + Điều khoản/Chính sách bảo mật công
   khai — chuẩn tối thiểu để xây niềm tin thương hiệu mới. (irendering.net)
3. [WANT][HYPOTHESIS] Hiển thị số liệu vận hành thật (số Worker online, thời gian phản hồi trung
   bình) trên landing page.
4. [DELIGHTER][HYPOTHESIS] Case study/review từ khách Việt Nam thật (có thể ẩn danh) khi có
   khách đầu tiên hài lòng.
5. [MUST HAVE][INFERENCE] Công khai chính sách xoá file sau X ngày kể từ khi tải xong — giải
   quyết trực tiếp A2.
6. [WANT][EVIDENCE] Cam kết mã hoá + tự động xoá file như RenderDay quảng bá — mô hình đã được
   thị trường chứng minh hiệu quả. (g2.com/products/renderday)
7. [BAD IDEA][HYPOTHESIS] Hiển thị "số khách đã dùng" phóng đại để tạo ảo giác uy tín — rủi ro bị
   phát hiện nói dối cao hơn giá trị marketing, đặc biệt nguy hiểm khi CWS thực tế chưa có khách
   thật.
8. [WANT][INFERENCE] Giải thích rõ mô hình vận hành ("Worker là máy tính thật do đối tác vận
   hành") thay vì để khách tự suy đoán và lo lắng.
9. [MUST HAVE][INFERENCE] Thông báo minh bạch giới hạn thật của MVP hiện tại (chỉ .blend, 2GB,
   có thể chờ lâu) thay vì im lặng để khách tự phát hiện.
10. [DELIGHTER][HYPOTHESIS] Chứng chỉ/cam kết bên thứ 3 về bảo mật dữ liệu khi đủ trưởng thành.

## C2. Giá & thanh toán (10)

1. [MUST HAVE][INFERENCE] Cam kết giá cuối không vượt quá X% so với ước tính ban đầu (price cap)
   — giảm trực tiếp rủi ro sốc giá ở B2.
2. [MUST HAVE][INFERENCE] Hiển thị breakdown giá cuối (số Worker, số giờ, đơn giá) khi khách
   thấy số tiền phải trả.
3. [WANT][EVIDENCE] Đồng hồ đếm ngược rõ ràng trên màn thanh toán, kèm hướng dẫn nếu hết giờ —
   giải quyết B3.
4. [WANT][INFERENCE] Cho phép dung sai nhỏ khi đối soát số tiền chuyển khoản thay vì khớp tuyệt
   đối.
5. [DELIGHTER][HYPOTHESIS] Hỗ trợ ví điện tử phổ biến (Momo, ZaloPay) ngoài chuyển khoản ngân
   hàng.
6. [WANT][EVIDENCE] Gói test/credit nhỏ để khách verify trước khi cam kết job lớn — chuẩn ngành
   đã chứng minh hiệu quả giảm rủi ro. (sourceforge.net/software/render-farms/free-trial)
7. [MUST HAVE][INFERENCE] Sửa nút "Hủy job" để không hiển thị (hoặc disable rõ, kèm giải thích)
   khi backend thực sự không cho hủy ở `AWAITING_PAYMENT`.
8. [BAD IDEA][HYPOTHESIS] Cho khách tự chọn Worker cụ thể để render — hấp dẫn với khách kỹ thuật
   nhưng độ phức tạp UI/vận hành tăng vọt so với lợi ích, đa số khách không cần mức chi tiết này.
9. [WANT][INFERENCE] Email/thông báo xác nhận độc lập khi thanh toán được ghi nhận, không phụ
   thuộc khách tự refresh trang.
10. [DELIGHTER][HYPOTHESIS] Gói subscription/trả trước theo tháng cho khách dùng thường xuyên.

## C3. Upload & định dạng (10)

1. [MUST HAVE][INFERENCE] Cơ chế upload có resume khi mất kết nối — giải quyết A5.
2. [WANT][INFERENCE] Xác minh thật cho OneDrive/Dropbox/Direct Link giống Google Drive, hoặc ẩn
   các lựa chọn chưa hoạt động thật để tránh hiểu nhầm.
3. [MUST HAVE][INFERENCE] Cảnh báo dung lượng vượt giới hạn NGAY khi chọn file, trước khi bắt
   đầu upload.
4. [DELIGHTER][HYPOTHESIS] Nén/tối ưu file tự động phía client trước khi upload.
5. [WANT][INFERENCE] Hỗ trợ thêm định dạng phần mềm khác (Cinema 4D, Maya, After Effects) để mở
   rộng tệp khách hàng.
6. [BAD IDEA][HYPOTHESIS] Cho upload không giới hạn dung lượng ngay từ đầu — vượt khả năng hạ
   tầng B2/Worker hiện tại, rủi ro vận hành lớn hơn giá trị ở giai đoạn MVP.
7. [WANT][HYPOTHESIS] Thanh tiến trình upload chi tiết (tốc độ, thời gian còn lại).
8. [MUST HAVE][INFERENCE] Kiểm tra sớm file .blend có mở được/không lỗi cơ bản trước khi submit
   job, tránh khách chờ hàng đợi rồi mới biết file lỗi.
9. [DELIGHTER][HYPOTHESIS] Ứng dụng desktop nhỏ hỗ trợ upload nền cho file lớn.
10. [WANT][INFERENCE] Cho xem trước danh sách asset/texture liên kết trong file .blend để tự
    kiểm tra thiếu file trước khi gửi.

## C4. Preview & duyệt (10)

1. [MUST HAVE][INFERENCE] Preview video ngắn (không chỉ ảnh tĩnh) — giải quyết trực tiếp B1.
2. [WANT][HYPOTHESIS] Cho khách tự chọn khung hình muốn xem preview thay vì hệ thống tự chọn.
3. [WANT][INFERENCE] Watermark nhẹ hơn/có thể tắt một phần để khách đánh giá chất lượng thật
   chính xác hơn mà vẫn bảo vệ nội dung.
4. [MUST HAVE][INFERENCE] "Yêu cầu chỉnh sửa" có timeline phản hồi rõ ràng thay vì thông báo
   tĩnh mơ hồ.
5. [DELIGHTER][HYPOTHESIS] Công cụ zoom trực tiếp trên preview để kiểm tra chi tiết nhỏ.
6. [WANT][HYPOTHESIS] Cho khách để lại ghi chú/đánh dấu trực tiếp trên khung hình khi yêu cầu
   chỉnh sửa, thay vì mô tả bằng chữ.
7. [BAD IDEA][HYPOTHESIS] Cho xem preview đầy đủ không watermark để "tạo thiện chí" — rủi ro
   khách lấy preview dùng luôn mà không thanh toán, chi phí lớn hơn thiện chí mang lại.
8. [MUST HAVE][INFERENCE] Làm rõ chính sách "yêu cầu chỉnh sửa có tính phí không, giới hạn mấy
   lần" ngay trên giao diện duyệt.
9. [DELIGHTER][HYPOTHESIS] So sánh preview song song với scene gốc ngay trên giao diện.
10. [WANT][INFERENCE] Hiển thị rõ preview là "mẫu đại diện", chất lượng bản cuối có thể khác ra
    sao, để tránh kỳ vọng sai.

## C5. Bảo mật & quyền riêng tư (10)

1. [MUST HAVE][INFERENCE] Thay B2 Application Key toàn quyền hardcode plaintext bằng key giới
   hạn quyền/thời hạn — rủi ro bảo mật nghiêm trọng nhất team tự ghi nhận. (worker readiness audit)
2. [MUST HAVE][INFERENCE] Xử lý rủi ro `--enable-autoexec` trước khi mở self-serve đại trà —
   hiện an toàn chỉ vì Owner tự chọn file thủ công.
3. [WANT][EVIDENCE] Cam kết công khai "đối tác vận hành Worker không xem được nội dung file của
   bạn" — trả lời trực tiếp nỗi lo phổ biến ngành. (irendering.net)
4. [DELIGHTER][HYPOTHESIS] Tuỳ chọn "Worker riêng/cô lập" cho khách yêu cầu bảo mật cao (trả
   thêm phí), như mô hình iRender.
5. [MUST HAVE][INFERENCE] Chính sách xoá file tự động sau X ngày, có thông báo trước cho khách.
6. [BAD IDEA][HYPOTHESIS] Cho khách xem log chi tiết "Worker nào đã xử lý file kèm thông tin
   máy" — nghe minh bạch nhưng có thể lộ thông tin vận hành nội bộ không cần thiết, rủi ro lớn
   hơn lợi ích.
7. [WANT][HYPOTHESIS] Điều khoản dịch vụ có điều khoản bồi thường/trách nhiệm nếu rò rỉ dữ liệu.
8. [MUST HAVE][INFERENCE] Dọn dẹp file tạm trên máy Worker sau mỗi job — ảnh hưởng gián tiếp tới
   độ tin cậy vận hành lâu dài.
9. [DELIGHTER][HYPOTHESIS] Chứng nhận/audit bảo mật độc lập công khai khi đủ trưởng thành.
10. [WANT][INFERENCE] Giải thích rõ quyền Google được yêu cầu chỉ dùng để xác thực, không đọc
    Drive/dữ liệu khác — giảm nghi ngại ở A4.

## C6. Support & giao tiếp (10)

1. [MUST HAVE][EVIDENCE] Kênh chat/hỗ trợ phản hồi nhanh (mục tiêu ngành 2-15 phút) — thiếu hụt
   lớn nhất hiện tại so với chuẩn ngành. (superrendersfarm.com, radarrender.com)
2. [MUST HAVE][INFERENCE] Định nghĩa rõ kênh liên hệ cụ thể khi "yêu cầu chỉnh sửa".
3. [WANT][HYPOTHESIS] Zalo OA/hotline chính thức phù hợp thói quen liên hệ của khách Việt Nam.
4. [WANT][INFERENCE] Trang FAQ tự phục vụ trả lời câu hỏi phổ biến để giảm tải support.
5. [BAD IDEA][HYPOTHESIS] Cam kết "support 24/7" khi đội ngũ còn nhỏ — nếu không thực hiện đúng,
   hậu quả mất niềm tin nặng hơn nhiều so với không hứa. (bài học từ reviews.io/RebusFarm)
6. [MUST HAVE][INFERENCE] Cơ chế theo dõi trạng thái yêu cầu hỗ trợ (mã ticket).
7. [DELIGHTER][HYPOTHESIS] Chatbot AI trả lời câu hỏi cơ bản tức thời, chuyển người thật khi cần.
8. [WANT][HYPOTHESIS] Thông báo chủ động (email/push) khi job có sự cố.
9. [DELIGHTER][HYPOTHESIS] Cộng đồng/group hỏi đáp công khai nơi khách tiềm năng đọc trải nghiệm
   người dùng trước.
10. [MUST HAVE][INFERENCE] Cam kết công khai mức phản hồi thực tế đội ngũ đáp ứng được, thay vì
    im lặng để khách tự đoán.

## C7. Tài khoản & đăng nhập (10)

1. [WANT][EVIDENCE] Bổ sung phương thức đăng nhập khác (email/password hoặc Zalo) cho khách
   không muốn dùng Google cho công việc — dù `DECISIONS.md` hiện chủ đích chỉ Google, đây là
   điểm ma sát thật cần cân nhắc lại theo dữ liệu thật. (`DECISIONS.md:5,9-16`)
2. [MUST HAVE][INFERENCE] Cho xem demo giao diện/luồng mà không cần đăng nhập, chỉ yêu cầu khi
   thực sự submit job.
3. [WANT][INFERENCE] Popup đăng nhập thay vì redirect toàn trang, giữ nguyên trạng thái đã chọn.
4. [DELIGHTER][HYPOTHESIS] Tài khoản doanh nghiệp quản lý nhiều thành viên cùng theo dõi job chung.
5. [BAD IDEA][HYPOTHESIS] Mở hoàn toàn ẩn danh không cần tài khoản — mất khả năng liên hệ lại
   khách khi có vấn đề thanh toán/hỗ trợ, rủi ro vận hành/gian lận lớn hơn tiện lợi.
6. [WANT][INFERENCE] Giải thích rõ trên UI lý do cần đăng nhập Google để giảm cảm giác bị ép
   buộc vô cớ.
7. [MUST HAVE][INFERENCE] Trang quản lý tài khoản hiển thị đủ lịch sử job, giá đã trả, trạng
   thái (tận dụng `useJobHistory` đã có).
8. [DELIGHTER][HYPOTHESIS] Lưu Render Profile ưa thích và thông tin thường dùng.
9. [WANT][HYPOTHESIS] Thông báo rõ CWS không truy cập Google Drive/dữ liệu khác ngoài xác thực.
10. [MUST HAVE][INFERENCE] Đảm bảo job tạo trước khi đăng nhập được gắn đúng tài khoản sau khi
    đăng nhập, tránh mất dữ liệu do luồng đăng nhập gián đoạn.

## C8. Giao/nhận file cuối (10)

1. [MUST HAVE][INFERENCE] Kéo dài thời hạn link tải (hơn 5 phút) hoặc cho tự cấp lại rõ ràng —
   giải quyết trực tiếp B5.
2. [WANT][HYPOTHESIS] Email thông báo khi file sẵn sàng, kèm link thời hạn hợp lý.
3. [DELIGHTER][HYPOTHESIS] Tích hợp tải trực tiếp về Google Drive của khách.
4. [MUST HAVE][INFERENCE] Hiển thị rõ số lần cấp lại link và thời hạn link ngay ở bước tải.
5. [WANT][INFERENCE] Xem trước nhanh file cuối trên trình duyệt trước khi tải về máy.
6. [BAD IDEA][HYPOTHESIS] Cho chia sẻ công khai link tải không giới hạn người xem — thuận tiện
   nhưng rủi ro rò rỉ nội dung trả phí lớn hơn lợi ích.
7. [WANT][HYPOTHESIS] Cho chọn định dạng/độ nén xuất file cuối theo nhu cầu.
8. [DELIGHTER][HYPOTHESIS] Watermark preview và file cuối đồng bộ để khách dễ đối chiếu.
9. [MUST HAVE][INFERENCE] Xác nhận rõ ràng khi khách đã tải thành công.
10. [WANT][INFERENCE] Chính sách lưu trữ (giữ file bao lâu) hiển thị công khai, không chỉ ẩn
    trong code.

## C9. Tốc độ/độ tin cậy render (10)

1. [MUST HAVE][INFERENCE] Timeout hợp lý cho từng frame render để tránh Worker treo vô thời hạn
   — vá trực tiếp rủi ro team tự ghi nhận. (worker readiness audit)
2. [WANT][INFERENCE] Hiển thị tiến độ chi tiết trong lúc render thay vì trạng thái chung chung.
3. [MUST HAVE][INFERENCE] Cơ chế Worker claim job MVP chung thay vì hardcode job_id riêng — điều
   kiện tiên quyết để bất kỳ khách thật nào được render, không phải chỉ là "desire".
   (`CURRENT_STATUS.md`, worker readiness audit)
4. [WANT][HYPOTHESIS] Cam kết SLA thời gian hoàn thành tối đa cho từng gói tốc độ.
5. [DELIGHTER][HYPOTHESIS] Thông báo tự động khi job hoàn tất từng giai đoạn.
6. [BAD IDEA][HYPOTHESIS] Cho khách tự chọn cấu hình phần cứng Worker cụ thể — quá kỹ thuật với
   đa số khách, tăng độ phức tạp vận hành không tương xứng lợi ích ở MVP.
7. [MUST HAVE][INFERENCE] Cảnh báo chủ động khi ước tính hàng đợi vượt ngưỡng lớn (VD >30 phút)
   kèm lựa chọn huỷ miễn phí trước khi cam kết.
8. [WANT][INFERENCE] Đảm bảo tính nhất quán chất lượng giữa các Worker khác nhau.
9. [DELIGHTER][HYPOTHESIS] Cho chọn khung giờ mong muốn render (VD qua đêm giá rẻ hơn).
10. [WANT][HYPOTHESIS] Cơ chế retry tự động khi Worker gặp lỗi tạm thời.

## C10. Tính năng nâng cao / hợp tác nhóm (10)

1. [DELIGHTER][HYPOTHESIS] API/CLI cho studio tích hợp CWS vào pipeline tự động.
2. [DELIGHTER][HYPOTHESIS] Hỗ trợ đa phần mềm (Cinema 4D, Maya, After Effects) ngoài Blender.
3. [WANT][HYPOTHESIS] Nhiều thành viên nhóm cùng xem/duyệt 1 job.
4. [BAD IDEA][HYPOTHESIS] Xây bộ công cụ chỉnh sửa scene ngay trên web — hấp dẫn nhưng là dự án
   khác quy mô hoàn toàn, sẽ làm MVP phình to nghiêm trọng so với giá trị mang lại hiện tại.
5. [DELIGHTER][HYPOTHESIS] Gợi ý tự động cấu hình render tối ưu dựa trên phân tích scene.
6. [WANT][HYPOTHESIS] Xuất báo cáo chi phí/lịch sử job theo tháng cho khách doanh nghiệp.
7. [DELIGHTER][HYPOTHESIS] Tích hợp thông báo Slack/Discord cho team khi job hoàn tất.
8. [BAD IDEA][HYPOTHESIS] Cho "đấu giá" ưu tiên render (trả thêm để vượt hàng đợi) — tăng doanh
   thu ngắn hạn nhưng gây cảm giác bất công, rủi ro thương hiệu cao hơn lợi ích ở giai đoạn xây
   niềm tin ban đầu.
9. [WANT][HYPOTHESIS] Preset lưu cấu hình render ưa thích để tái sử dụng nhanh.
10. [DELIGHTER][HYPOTHESIS] Chương trình giới thiệu bạn bè (referral) — giúp thương hiệu mới lan
    toả qua tin tưởng cá nhân thay vì quảng cáo.

---

# 5. ROOT CAUSE CLUSTERS

## 5.1 Vấn đề xuyên persona (ảnh hưởng mọi loại khách, không riêng 1 nhóm)

- Thiếu kênh support real-time (B6, C6) — ảnh hưởng mọi khách bất kể persona.
- Giá cuối khác ước tính (A6, B2, C2) — ảnh hưởng mọi khách nhạy cảm ngân sách, từ freelancer
  tới studio.
- Thiếu minh bạch bảo mật/chính sách xoá file (A2, C1, C5) — ảnh hưởng mọi khách có dữ liệu
  nhạy cảm (NDA, asset bản quyền).
- Rào cản đăng nhập Google-only (A4, C7) — ảnh hưởng khách doanh nghiệp lẫn cá nhân như nhau.

## 5.2 Feature giải quyết nhiều objection cùng lúc (ưu tiên cao — đòn bẩy lớn)

- **C1.5 + C1.9** (minh bạch giới hạn MVP + chính sách xoá file) → giải quyết đồng thời A1, A2,
  A9, B10, C5.
- **C6.1 + C6.6** (kênh support nhanh + theo dõi ticket) → giải quyết đồng thời A9, B6, B7, B10.
- **C2.1 + C2.2** (price cap + breakdown giá) → giải quyết đồng thời A6, B2, B9.
- **C9.3** (Worker claim job MVP chung) → không chỉ là 1 feature, là **điều kiện tiên quyết** để
  bất kỳ insight nào khác trong tài liệu này có ý nghĩa thực tế — nếu không sửa, không khách
  thật nào trải nghiệm được toàn bộ luồng để CWS học hỏi tiếp.

## 5.3 Feature nghe hấp dẫn nhưng ROI thấp (đã gắn nhãn BAD IDEA ở Phần C)

C2.8 (chọn Worker cụ thể), C5.6 (log chi tiết Worker xử lý file), C7.5 (ẩn danh hoàn toàn),
C8.6 (chia sẻ công khai không giới hạn), C9.6 (chọn cấu hình phần cứng), C10.4 (editor scene
online), C10.8 (đấu giá ưu tiên render), C1.7 (số liệu giả) — tất cả là trường hợp khách có thể
*nói* muốn, nhưng chi phí/rủi ro triển khai vượt xa giá trị thu về ở giai đoạn hiện tại của CWS.

## 5.4 Feature làm MVP phình to (nên hoãn, chưa phải bây giờ)

C10.1 (API/CLI pipeline), C10.2 (đa phần mềm), C4.9 (so sánh trước/sau), C9.5 (chọn khung giờ
render) — đều là DELIGHTER hợp lý về lâu dài nhưng đòi hỏi đầu tư kỹ thuật lớn; nên xếp SAU khi
CWS đã đạt điểm dừng A (1 khách thật render thành công, trả tiền, nhận file đúng như cam kết).

## 5.5 Vấn đề có thể "giết" CWS nếu không giải quyết (mức độ sống còn)

- **Worker không claim job MVP chung** (C9.3) — không có luồng nào hoạt động cho khách thật nếu
  không sửa; đây là gap kiến trúc đã xác nhận bằng code, không phải vấn đề thiếu máy vật lý.
- **B2 key toàn quyền hardcode plaintext** (C5.1) — 1 sự cố rò rỉ dữ liệu khách hàng có thể phá
  huỷ hoàn toàn niềm tin của một thương hiệu mới chưa có "vốn tin cậy" để phục hồi.
- **Không có refund flow khi khách mất tiền mà không nhận output** (B3.5, B7.1) — rủi ro danh
  tiếng nghiêm trọng nhất nếu xảy ra với khách thật đầu tiên, vì câu chuyện xấu đầu tiên của
  thương hiệu mới lan truyền rất nhanh trong cộng đồng nhỏ (B10.3).
- **`--enable-autoexec` khi mở self-serve đại trà** (C5.2) — lỗ hổng thực thi mã tuỳ ý, rủi ro
  không chỉ với 1 khách mà với toàn bộ hạ tầng Worker và dữ liệu của các khách khác.

## 5.6 Lợi thế CWS có thể xây thành moat (nếu làm tốt, khó bị sao chép nhanh)

- **Giá VNĐ + thanh toán QR ngân hàng nội địa** (đã có sẵn) — lợi thế tự nhiên so với farm quốc
  tế định giá USD/thẻ tín dụng, **NẾU** giải quyết được vấn đề tin tưởng thanh toán (A7, C2).
- **Hỗ trợ tiếng Việt, gần cộng đồng Việt Nam** (Zalo, group Blender/VFX VN) — kênh mà farm quốc
  tế không đầu tư; có thể là lợi thế "gần gũi, hiểu khách nội địa" nếu support được xây tốt (C6).
- **Mô hình "duyệt preview trước khi thanh toán"** (đã có sẵn trong kiến trúc) — vốn dĩ ưu việt
  hơn mô hình "đặt cọc trước, không rõ kết quả" phổ biến ở nhiều nhà cung cấp render nội địa
  (renderfarms.vn). **NẾU** preview đủ tốt (video, không chỉ ảnh — C4.1) để khách thực sự tự tin
  quyết định, đây có thể là điểm khác biệt cạnh tranh mạnh nhất của CWS.

---

# Kết luận — Ưu tiên phải sửa/làm trước khi mời khách thật

Xếp theo mức độ "khách hàng đầu tiên sẽ chịu thử, trả tiền, và quay lại":

1. **Sửa kiến trúc Worker để claim job MVP chung** (C9.3) — không có gì khác trong tài liệu này
   có ý nghĩa nếu bước này chưa xong, vì hiện tại không khách thật nào có thể được render.
2. **Vá 2 lỗ hổng bảo mật đã biết**: B2 key toàn quyền hardcode (C5.1) và `--enable-autoexec`
   (C5.2) — trước khi mở cho khách lạ tự upload file.
3. **Dựng lưới an toàn tối thiểu cho thanh toán/hoàn tiền** (B7, A7.10) — bảo vệ khách hàng đầu
   tiên khỏi rủi ro mất tiền mà không nhận được file.
4. **Mở 1 kênh support có người thật trả lời** (C6.1-3), dù chỉ Zalo/hotline thủ công ban đầu —
   chi phí thấp nhất, tác động lên niềm tin cao nhất trong toàn bộ danh sách.
5. **Minh bạch giá**: hiển thị breakdown + cam kết mức trần hợp lý (C2.1-2) — giảm sốc giá, tăng
   khả năng khách quay lại lần 2.
6. **Sửa preview thành video + gỡ bỏ UX gây hiểu lầm** (C4.1, nút Hủy ở C2.7) — tăng độ tin cậy
   ngay tại điểm quyết định trả tiền.
7. **Công bố chính sách xoá file + minh bạch giới hạn MVP thật** (C1.5, C1.9, C5.5) — rẻ để làm,
   giải quyết đồng thời nhiều nỗi lo bảo mật/niềm tin ở cả Phần A và Phần B.

---

## Phụ lục — Nguồn chi tiết

Báo cáo repo đầy đủ (customer journey, pricing formula, giới hạn kỹ thuật, rủi ro bảo mật, trạng
thái thật của từng giai đoạn MVP, trích dẫn file:dòng) được tổng hợp từ việc đọc trực tiếp:
`AGENTS.md`, `CURRENT_STATUS.md`, `DECISIONS.md`, `PROJECT_CONTEXT.md`, `CWS_ROADMAP_MVP_V1.md`,
`CWS_MVP_WORKFLOW_FINAL.md`, `CWS_DATABASE_SCHEMA.md`, `CWS_WORKER_ROADMAP.md`,
`reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`, `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md`,
`reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md`, `reports/AUTH_GOOGLE_MIGRATION_REPORT.md`,
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`,
`reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`,
`reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`,
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`, `docs/MVP_GAP_REPORT.md`,
`docs/WORKER_FLEET_AUDIT.md`, và code: `backend/src/jobs/jobs.service.ts`,
`backend/src/jobs/services/pricing.service.ts`, `backend/src/payments/payments.controller.ts`,
`backend/src/files/files.controller.ts`, `backend/src/files/google-drive.service.ts`,
`backend/src/files/b2-storage.service.ts`, `backend/src/storage/preview.service.ts`,
`src/App.jsx`, `src/pages/PaymentScreen.jsx`, `src/pages/ReviewScreen.jsx`,
`src/constants/renderConstants.js`, `cws_worker_full.py`.

Nguồn external research: xem mục "Nguồn research bên ngoài đã dùng" ở đầu tài liệu.
