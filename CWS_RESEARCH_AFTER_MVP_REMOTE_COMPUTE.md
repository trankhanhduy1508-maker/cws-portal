# CWS --- TÀI LIỆU NGHIÊN CỨU SAU MVP

## Hướng mở rộng: Distributed Rendering → Remote Compute

**Trạng thái:** Nghiên cứu sau MVP, không đưa vào scope MVP hiện tại\
**Ngày:** 2026-08-01\
**Nguồn khởi phát:** Transcript video TikTok và các ảnh bình luận do
Founder cung cấp trong phiên.

## 1. Mục tiêu

Ghi nhận một hướng nghiên cứu dài hạn cho CWS: sau khi MVP distributed
rendering hoạt động và có dữ liệu người dùng thật, đánh giá khả năng mở
rộng thành nền tảng **remote compute**, nơi các workload nặng có thể sử
dụng GPU, CPU, RAM/VRAM và storage của các node CWS.

Nguyên tắc: **không làm phình MVP hiện tại**.

## 2. Tín hiệu từ nguồn thực tế

Các bình luận TikTok được cung cấp cho thấy một số pain point đáng
nghiên cứu:

-   Có người nói 32 GB RAM đã gần hết khi edit.
-   Có người mô tả Lightroom + Photoshop sử dụng khoảng 88--90% RAM.
-   Có bình luận nói workload làm phim sử dụng lượng RAM rất lớn.
-   Ảnh Task Manager trong bình luận cho thấy mức sử dụng RAM cao.
-   Video gốc nhấn mạnh workstation cấu hình rất cao cho kiến trúc/AI và
    lập luận rằng giảm thời gian chờ render giúp tăng thời gian làm
    việc.

Đây là **bằng chứng giai thoại**, không phải khảo sát thị trường. Chúng
chỉ đủ để hình thành giả thuyết nghiên cứu, chưa đủ để kết luận quy mô
nhu cầu.

## 3. Pain point rộng hơn "render chậm"

CWS ban đầu giải quyết: \> Render chiếm máy → người dùng phải chờ → mất
thời gian làm việc.

Hướng nghiên cứu mới mở rộng vấn đề:

-   GPU bị chiếm khi render.
-   CPU bị chiếm khi encode/export/simulation.
-   RAM có thể trở thành bottleneck với project lớn hoặc nhiều ứng dụng.
-   Workstation mạnh có chi phí đầu tư cao.
-   Tài nguyên cực mạnh có thể chỉ cần trong các thời điểm cao điểm.
-   Máy bị chiếm bởi tác vụ nặng làm giảm khả năng tiếp tục công việc
    khác.

## 4. Định vị cần kiểm chứng

Không chỉ: \> "Render nhanh hơn."

Có thể nghiên cứu định vị: \> **Đẩy tác vụ nặng sang CWS để máy của bạn
tiếp tục làm việc.**

Khách hàng khi đó không chỉ mua GPU-time mà có thể đang mua: - thời gian
làm việc lấy lại được; - khả năng tiếp tục chỉnh sửa; - giảm workstation
downtime; - giảm nhu cầu nâng cấp phần cứng chỉ cho workload cao điểm; -
compute theo nhu cầu.

## 5. Hướng CWS Remote Compute

MVP hiện tại: **Job → Worker → Render → Preview Watermark → khách duyệt
→ Payment → Webhook xác nhận PAID → Download**

Sau MVP có thể nghiên cứu: **Workload → Resource Profiling → Node
Matching → Compute → Result**

Tài nguyên có thể gồm: - GPU compute; - CPU compute; - RAM lớn; - VRAM
lớn; - storage tốc độ cao; - multi-GPU; - nhiều node phối hợp.

## 6. Workload tiềm năng

### Video / Media

-   render;
-   encode/transcode;
-   proxy generation;
-   batch processing;
-   AI denoise/upscale;
-   frame interpolation.

### 3D / Kiến trúc

-   Blender;
-   3ds Max;
-   V-Ray;
-   Corona;
-   Unreal Engine;
-   simulation;
-   baking;
-   animation rendering.

Không mặc định mọi workload/phần mềm đều phân phối được; phải nghiên cứu
engine, plugin và licensing riêng.

### AI

-   inference;
-   image generation;
-   Stable Diffusion và workflow tương tự;
-   LoRA training;
-   batch inference;
-   model serving;
-   workload cần VRAM lớn.

Đây là hướng khác đáng kể so với render farm và cần nghiên cứu kiến
trúc/bảo mật/economics riêng.

## 7. RAM-as-a-resource

Giả thuyết đáng nghiên cứu: người dùng có máy 32 GB nhưng đôi lúc cần
64/128 GB hoặc hơn. Thay vì mua workstation mới/nâng cấp chỉ cho
workload không thường xuyên, họ có thể thuê node CWS có RAM lớn.

Các mức chỉ để nghiên cứu: - 32 GB - 64 GB - 128 GB - 256 GB+

Chưa phải tier sản phẩm đã quyết định.

## 8. Compute Profile

Có thể nghiên cứu UX không bắt khách chọn phần cứng trực tiếp:

-   **Render:** ưu tiên GPU/render.
-   **Memory:** ưu tiên RAM.
-   **AI:** ưu tiên GPU/VRAM.
-   **CPU:** ưu tiên nhiều core.
-   **Extreme:** multi-GPU + RAM lớn.

CWS tự match node theo workload. Điều này phù hợp triết lý UX hiện tại:
khách không cần hiểu chi tiết GPU/CPU.

## 9. Marketplace tài nguyên

Tầm nhìn dài hạn:

**Nguồn cung:** gaming PC / workstation / cybercafé / studio / văn
phòng\
↓\
**CWS Orchestrator**\
↓\
**Nhu cầu:** Render / Video / Architecture / AI / Compute

CWS có thể phụ trách discovery, scheduling, matching, isolation,
transfer, monitoring, billing, payment, reliability và reputation.

Đây không phải scope MVP.

## 10. Insight kinh doanh cần kiểm chứng

Câu hỏi quan trọng: \> **Khách có nhất thiết phải sở hữu toàn bộ công
suất cao nhất nếu họ chỉ cần nó một phần thời gian?**

Nếu workload mang tính "burst", thuê compute theo nhu cầu có thể cạnh
tranh với việc mua workstation cực mạnh.

Cần đo: - tần suất workload; - thời lượng; - giá phần cứng; - điện/khấu
hao; - giá thuê CWS; - bandwidth/storage; - willingness-to-pay; - chi
phí cơ hội của thời gian chờ.

## 11. Giả thuyết marketing

Các thông điệp cần A/B test sau MVP:

-   "Render nhanh hơn."
-   "Render ở CWS. Máy bạn tiếp tục làm việc."
-   "Đừng để workstation ngồi render thay bạn."
-   "Khi máy bạn hết sức, mượn sức mạnh từ CWS."
-   "Không cần mua workstation cực mạnh chỉ cho vài giờ cao điểm."

Chưa có dữ liệu để kết luận thông điệp nào tốt nhất.

## 12. Không đưa vào MVP hiện tại

Chưa triển khai: - full remote workstation; - general-purpose cloud
VM; - AI training platform; - RAM marketplace; - multi-GPU AI cluster; -
distributed memory; - arbitrary user code execution; - hàng loạt
workload ngoài render.

MVP phải chứng minh chuỗi giá trị render trước.

## 13. Dữ liệu cần thu sau MVP

Khi có người dùng thật, nghiên cứu: 1. Phần mềm khách sử dụng. 2.
CPU/GPU/RAM máy khách. 3. RAM peak. 4. VRAM peak. 5. Thời gian
render/export. 6. Tần suất render. 7. Thời gian workstation bị chiếm. 8.
Khách có muốn tiếp tục làm việc khi render không. 9. Khách từng nâng
RAM/GPU vì project nặng chưa. 10. Mức sẵn sàng trả để tránh nâng
workstation. 11. Kích thước project/file. 12. Upload/download thực tế.
13. Workload khách muốn chuyển khỏi máy cá nhân nhất.

## 14. Câu hỏi nghiên cứu kỹ thuật

-   Workload nào có thể tách khỏi workstation?
-   Workload nào cần interactive session?
-   Workload nào phù hợp batch processing?
-   Licensing/network render của từng phần mềm?
-   Checkpoint/resume được không?
-   Data locality và file size ảnh hưởng economics thế nào?
-   Sandbox workload khách ra sao?
-   Chống malware thế nào?
-   Xóa dữ liệu sau job thế nào?
-   Driver/plugin/GPU compatibility?
-   Estimate RAM/VRAM tự động được không?
-   Scheduler match CPU/RAM/VRAM/GPU thế nào?
-   Economics so với cloud GPU truyền thống?

## 15. Research hypotheses

**H1 --- Workstation blocking:** Một phần khách hàng mục tiêu mất năng
suất vì workstation bị chiếm bởi render/export.

**H2 --- Memory pressure:** RAM là bottleneck đáng kể với một bộ phận
khách video/3D/kiến trúc.

**H3 --- Burst compute:** Nhiều khách không cần workstation cực mạnh
liên tục, chỉ cần công suất cao theo thời điểm.

**H4 --- Opportunity-cost pricing:** Khách có thể định giá CWS dựa trên
thời gian làm việc lấy lại được, không chỉ GPU/giờ.

**H5 --- Compute expansion:** Nếu distributed rendering đạt
product-market fit, hạ tầng CWS có thể là nền móng cho các dịch vụ
compute khác.

Tất cả đều là **giả thuyết cần kiểm chứng**, chưa phải kết luận.

## 16. Kết luận

Tín hiệu ban đầu gợi ý CWS có thể giải quyết vấn đề rộng hơn "render
chậm":

> **Tác vụ nặng chiếm tài nguyên workstation và lấy đi thời gian làm
> việc của người dùng.**

Con đường nghiên cứu dài hạn:

**Render Farm → Distributed Rendering Platform → Remote Compute
Marketplace**

Thứ tự bắt buộc:

**Hoàn thành MVP → có khách thật → thu dữ liệu → xác minh pain point →
thử nghiệm compute mới → mở rộng.**

## 17. Nguồn và giới hạn

Nguồn trực tiếp: - transcript video TikTok do Founder cung cấp; - ba ảnh
chụp bình luận TikTok trong phiên.

Các bình luận mạng xã hội chỉ dùng để phát hiện giả thuyết/pain point.
Không dùng chúng để khẳng định quy mô thị trường.

Nghiên cứu tiếp theo nên gồm phỏng vấn khách hàng, survey, dữ liệu job
thực (có sự đồng ý), benchmark kỹ thuật và phân tích economics giữa mua
workstation, cloud compute và CWS.
