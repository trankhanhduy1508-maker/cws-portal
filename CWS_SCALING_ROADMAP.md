# CWS Scaling Roadmap

## Mục tiêu kiến trúc

CWS phải chịu được tải tăng đột biến bằng cách chuyển overload thành **queue + waiting time**, không biến overload thành lỗi 500 hoặc mất job.

Nguyên tắc cốt lõi: **một sự kiện chỉ xử lý ở tầng đắt tiền một lần; phần còn lại cache, fan-out, queue hoặc phân phối xuống tầng rẻ hơn.**

## P0 — MVP scaling foundation

- [ ] Tách rõ **Control Plane** và **Data Plane**.
  - Control Plane: API, auth, job metadata, scheduler, payment, worker status.
  - Data Plane: `.blend`, `.zip`, texture, frame, output, log lớn.
  - File lớn không được đi xuyên backend nếu có thể tránh; ưu tiên direct-to-B2 / signed upload-download URL.
- [ ] Job creation phải nhanh, idempotent và đưa vào queue; HTTP request không giữ mở trong suốt quá trình render.
- [ ] Khi thiếu worker: job chuyển sang `QUEUED`, không fail hệ thống.
- [ ] Scheduler/worker claim phải atomic, chống duplicate claim, retry an toàn và có backpressure.
- [ ] Worker polling/heartbeat phải có interval hợp lý + random jitter để tránh thundering herd.
- [ ] Không để dashboard/customer polling trực tiếp DB theo tần suất cao; ưu tiên event/realtime/fan-out cho progress/status.
- [ ] Progress/status cùng một job chỉ ghi khi có thay đổi đáng kể; nhiều client đọc từ một nguồn trạng thái chung.
- [ ] Output render phân phối trực tiếp từ B2/CDN/signed URL; backend chỉ làm auth/authorization/payment gate/URL issuance.
- [ ] Cache dữ liệu đọc nhiều, ít đổi; không cache dữ liệu nhạy cảm sai boundary.
- [ ] Rate limit, timeout, bounded concurrency và circuit-break/fail-fast tại các dependency ngoài.

## P0 — Kiểm thử trước khi gọi là scale-ready

- [ ] 100 customer đồng thời: không mất job, không duplicate job, không crash API, worker shortage chỉ làm tăng queue.
- [ ] 100 customer upload/submit gần đồng thời: đo latency p50/p95/p99, error rate, DB connections, memory, CPU, queue depth.
- [ ] 100–500 worker heartbeat/claim mô phỏng với jitter; xác nhận không tạo DB spike theo chu kỳ.
- [ ] Kill/restart backend trong khi queue có job: job durable, không mất trạng thái.
- [ ] Worker chết giữa render: lease/fencing/failover không tạo hai output hợp lệ cho cùng một task.
- [ ] Payment và final download vẫn giữ đúng thứ tự business: render/preview xong mới payment; chỉ PAID mới mở final output.

## P1 — Sau khi MVP E2E thật PASS

- [ ] Đo capacity thật trong isolated staging trước khi thêm Redis/queue chuyên dụng.
- [ ] Chỉ thêm Redis/NATS/RabbitMQ/SQS-equivalent khi số liệu chứng minh PostgreSQL/Supabase hiện tại là bottleneck.
- [ ] Realtime/event-driven progress fan-out cho nhiều browser.
- [ ] CDN/edge cache cho static/public-safe content và final delivery phù hợp.
- [ ] Batch reads/writes, aggregate counters server-side, giảm write amplification của worker heartbeat.
- [ ] Autoscaling stateless API nếu production metrics yêu cầu.

## P2 — Scale lớn, không làm trước MVP

- [ ] 1.000 customer đồng thời / 1.000–5.000 worker.
- [ ] Event-driven worker dispatch thay polling nặng.
- [ ] Queue chuyên dụng + dead-letter/retry policy.
- [ ] Regional/geo distribution khi có nhu cầu thực tế.
- [ ] Multi-region chỉ sau khi một region được đo và vận hành ổn định.

## Quy tắc quyết định

1. **Không over-engineer trước số liệu.**
2. Ưu tiên kiến trúc giúp hệ thống degrade gracefully: queue dài hơn thay vì sập.
3. Mọi tối ưu scale phải có test đo được trước/sau.
4. Không tuyên bố production capacity từ mock/unit simulation.
5. Source of truth durable hiện tại vẫn là Supabase/PostgreSQL cho tới khi staging chứng minh cần thay đổi.
6. Mọi thay đổi scale phải giữ nguyên security boundary, idempotency, payment ordering và E2E correctness.

## Liên hệ với roadmap hiện tại

Roadmap này bổ sung cho `CWS_ROADMAP_MVP_V1.md` và các báo cáo scaling hiện có. Ưu tiên hiện tại vẫn là hoàn thành một job production E2E thật; các mục P0 ở trên được triển khai khi chúng trực tiếp giảm rủi ro mất job/crash/duplicate hoặc là điều kiện cần cho load test thực tế.
