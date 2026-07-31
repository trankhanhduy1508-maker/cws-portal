# CWS MVP EXECUTION LOOP

> Mục đích: Cho phép AI Agent liên tục thực hiện các nhiệm vụ MVP độc lập, có kiểm chứng và có điểm dừng rõ ràng.

---

## 1. GOAL

Đưa CWS đến trạng thái MVP hoàn chỉnh theo:

1. `CWS_FULL_ROADMAP_OFFICIAL_V1_1.md` nếu tồn tại.
2. `CWS_ROADMAP_MVP_V1.md`
3. `CWS_MVP_WORKFLOW_FINAL.md`
4. `CWS_DATABASE_SCHEMA.md`
5. `DECISIONS.md`

Không mở rộng ngoài MVP.

---

## 2. TRIGGER

Thực hiện loop khi Project Owner yêu cầu một trong các lệnh:

- `tiếp`
- `tiếp tục MVP`
- `chạy loop`
- `chạy xuyên đêm`
- `hoàn thiện MVP`

---

## 3. REQUIRED READING

Trước khi bắt đầu loop, đọc theo thứ tự:

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `DECISIONS.md`
4. `CURRENT_STATUS.md`
5. Roadmap và workflow liên quan đến nhiệm vụ được chọn.
6. Report hoặc checklist liên quan.

Code và kết quả test thực tế được ưu tiên hơn thông tin trạng thái cũ.

Nếu `CURRENT_STATUS.md` không khớp code thật, chỉ cập nhật nó sau khi đã có bằng chứng.

---

## 4. EXECUTION LOOP

Lặp lại các bước sau:

### Bước 1 — Xác định trạng thái

- Kiểm tra Git branch.
- Kiểm tra `git status`.
- Không xóa hoặc ghi đè thay đổi của người dùng hoặc Agent khác.
- Đối chiếu `CURRENT_STATUS.md` với code và test hiện tại khi cần.

### Bước 2 — Chọn nhiệm vụ

Chọn nhiệm vụ MVP chưa hoàn thành có mức ưu tiên cao nhất.

Thứ tự ưu tiên:

1. P0 blocker làm luồng MVP không chạy.
2. Build hoặc test đang lỗi.
3. Luồng end-to-end chưa hoàn thành.
4. Security hoặc dữ liệu có nguy cơ nghiêm trọng.
5. P1 cần thiết để MVP vận hành.
6. Documentation và cleanup cần thiết.

Không chọn:

- Feature ngoài MVP.
- Refactor không cần thiết.
- Tối ưu hóa chưa có bằng chứng cần thiết.
- Nhiệm vụ bị chặn bởi quyền hoặc thao tác thủ công nếu vẫn còn nhiệm vụ độc lập khác.

### Bước 3 — Giới hạn phạm vi

Mỗi vòng chỉ chọn một nhiệm vụ có thể:

- triển khai độc lập;
- kiểm tra độc lập;
- commit độc lập;
- rollback độc lập.

Không gom nhiều thay đổi không liên quan vào cùng một task.

### Bước 4 — Thực hiện

- Chỉ sửa file liên quan.
- Ưu tiên patch nhỏ.
- Không viết lại module đang hoạt động nếu không cần.
- Không tạo repository hoặc Windows worktree mới.
- Không commit secret.
- Không thay đổi production mù quáng.

### Bước 5 — Kiểm chứng

Chạy kiểm tra phù hợp, có thể gồm:

- build;
- typecheck;
- lint;
- unit test;
- integration test;
- migration validation;
- syntax check;
- runtime check.

Không tuyên bố hoàn thành nếu chưa chạy kiểm tra phù hợp.

Nếu môi trường không thể kiểm thử runtime thật, ghi rõ:

```text
CODE VERIFIED
RUNTIME NOT VERIFIED
