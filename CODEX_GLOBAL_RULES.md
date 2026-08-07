# CWS CODEX GLOBAL RULES

> Purpose: Global mandatory operating rules for Codex/AI agents working on CWS.
> Scope: Applies to every task unless the Project Owner explicitly overrides a rule.

## Vercel / Deployment Rules

### NO NEW VERCEL PROJECTS WITHOUT OWNER APPROVAL

- **TUYỆT ĐỐI KHÔNG tự ý tạo Vercel project mới.**
- Project production canonical của CWS là **`cws-portal`**.
- Mọi thay đổi frontend/deployment phải ưu tiên sử dụng project **`cws-portal`** hiện có.
- Không tạo project tạm, project test, project preview riêng, project có hậu tố ngẫu nhiên, project `*-fix`, `*-project`, hoặc bản sao của `cws-portal` chỉ để thử nghiệm.
- Không import lại cùng GitHub repository thành một Vercel project mới nếu `cws-portal` đã kết nối repository đó.
- Preview/testing phải dùng deployment/branch/preview của project hiện có nếu Vercel hỗ trợ, không nhân bản project.
- Chỉ được tạo Vercel project mới khi **Project Owner yêu cầu hoặc phê duyệt rõ ràng**.
- Trước mọi thao tác có khả năng tạo project mới, Codex phải kiểm tra project hiện có và dừng thao tác tạo mới nếu chưa có xác nhận của Owner.
- Nếu phát hiện project Vercel dư/trùng lặp: không tạo thêm; báo cáo tên project, Git connection, domain và deployment liên quan; chỉ xóa khi đã xác minh an toàn hoặc Owner yêu cầu.

## General Guardrails

- Không tự ý mở rộng phạm vi task.
- Không tự ý thay đổi production ngoài phạm vi được giao.
- Không commit secret, token, password hoặc API key.
- Ưu tiên sửa project/config hiện có thay vì tạo tài nguyên mới.
- Nếu có nhiều cách làm, chọn cách đơn giản nhất phù hợp MVP và ít tạo tài nguyên phụ nhất.

## Violation Handling

Nếu một thao tác sắp thực hiện xung đột với các quy tắc trên:

1. Không thực hiện thao tác đó.
2. Dùng tài nguyên/project hiện có nếu có thể.
3. Nếu thật sự cần tài nguyên mới, đánh dấu BLOCKED và xin Owner phê duyệt.
