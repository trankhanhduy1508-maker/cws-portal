# Báo cáo cài đặt Matt Pocock Skills — 2026-08-16

## Bản báo cáo để sao chép nhanh

> Nhấn nút **Copy** ở góc trên bên phải khối bên dưới để sao chép toàn bộ báo cáo tóm tắt.

```text
KẾT QUẢ CÀI ĐẶT MATTPOCOCK/SKILLS

1. Kết quả cài đặt: BỊ CHẶN bởi chính sách mạng của môi trường thực thi.
2. Lệnh đã thực thi: npx skills@latest add mattpocock/skills
3. Danh sách skill đã cài: Không có.
4. setup-matt-pocock-skills: Chưa được cài nên không thể gọi /setup-matt-pocock-skills.
5. Khả năng phát hiện của Codex: Không phát hiện skill Matt Pocock vì gói chưa được tải xuống.
6. Gọi thử một skill mới: Không thể thực hiện vì không có payload skill tương thích.
7. Skill không tương thích: CHƯA XÁC MINH; không đoán khi chưa tải được nguồn chính thức.
8. Tệp CWS được tạo/thay đổi: Chỉ có báo cáo này; không sửa mã production.
9. Có cần khởi động lại Codex không: Hiện tại không. Sau khi cài thành công, cần mở lượt/phiên Codex mới để Codex phát hiện skill project-local.
10. Khuyến nghị vai trò: Chỉ chọn tên skill cụ thể cho WORKER / GUARD / VERIFIER / RESEARCH sau khi tải và xác thực manifest chính thức.

Lỗi quan sát được:
- npm: E403 khi truy cập https://registry.npmjs.org/skills
- GitHub: CONNECT tunnel failed, response 403

Trạng thái an toàn:
- Không cài bản trùng lặp.
- Không thay đổi hoặc làm yếu quy tắc CWS.
- Không sửa mã production, cấu hình runtime, hạ tầng hay dữ liệu khách hàng.
- Không yêu cầu, hiển thị hoặc commit bí mật.
```

## Phạm vi và thẩm quyền

- Bề mặt thực thi: `CODEX CLI IN TERMINAL`.
- Nguồn được yêu cầu: `mattpocock/skills`.
- Phạm vi dự kiến: cài đặt project-local cho CWS.
- Quản trị CWS vẫn là thẩm quyền cao hơn. Nếu được cài sau này, các skill bên ngoài chỉ có vai trò bổ sung; chúng không được thay thế hoặc làm yếu `AGENTS.md`, quy tắc Founder, bằng chứng hiện tại của repository, ranh giới bảo mật hoặc các tài liệu workflow chuẩn.
- Tác vụ này không cho phép và không thay đổi mã ứng dụng production, cấu hình runtime, hạ tầng, thông tin xác thực hoặc dữ liệu khách hàng của CWS.

## Trạng thái trước khi cài đặt

Bằng chứng được thu thập trước khi chạy lệnh cài đặt:

- Node.js khả dụng ở phiên bản `v24.15.0`.
- `npx` khả dụng thông qua npm `11.4.2`.
- Thư mục skill của dự án `.agents/skills/` có mười skill Spec Kit.
- Bộ cài Codex tại `/opt/codex/skills/` có năm system skill tích hợp sẵn.
- Không tìm thấy thư mục hoặc `SKILL.md` khớp với `mattpocock`, `setup-matt-pocock-skills` hoặc một Superpowers skill đã cài trong các thư mục skill của dự án và Codex được kiểm tra.
- `docs/superpowers/` chứa tài liệu CWS, không phải định nghĩa skill đã cài. Thư mục này không bị thay đổi.
- Working tree Git sạch trước khi báo cáo ban đầu được tạo.

## Lệnh cài đặt đã thực thi

```bash
npx skills@latest add mattpocock/skills
```

Lệnh trên đã thực sự được chạy từ thư mục gốc của repository. Lệnh thất bại trước khi installer có thể tải xuống hoặc cho phép chọn skill:

```text
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/skills
```

Lệnh kiểm tra chỉ đọc `git ls-remote https://github.com/mattpocock/skills.git HEAD` cũng thất bại tại ranh giới mạng của môi trường với lỗi `CONNECT tunnel failed, response 403`. Bằng chứng này cho thấy môi trường thực thi không truy cập được cả gói npm lẫn repository GitHub nguồn. Không chạy phương thức cài đặt cạnh tranh khác, không tự dựng lại thủ công và không âm thầm sửa các tệp skill bên ngoài.

## Kết quả cài đặt và thiết lập

- Kết quả cài đặt: **BLOCKED do chính sách mạng của môi trường**.
- Danh sách Matt Pocock skill đã cài: **không có**.
- Bản cài trùng lặp: **không có**.
- `setup-matt-pocock-skills`: **chưa được cài**, vì vậy không thể tuyên bố đã gọi `/setup-matt-pocock-skills`.
- Cấu hình setup: **không được tạo**. Các quy ước hiện có của CWS về issue tracking và tài liệu được giữ nguyên.

## Kết quả xác minh

1. Codex phát hiện Matt Pocock skill: **FAIL / chưa cài**.
2. Codex phát hiện `setup-matt-pocock-skills`: **FAIL / chưa cài**.
3. Gọi thực tế một skill mới cài: **BLOCKED / chưa tải được payload skill tương thích**.
4. Bảo toàn skill hiện có: **PASS**. Mười project skill Spec Kit và năm system skill Codex vẫn tồn tại; không có thư mục skill trùng lặp được thêm vào.
5. Thẩm quyền CWS: **PASS**. `AGENTS.md` và quản trị CWS qua router không bị thay đổi.
6. Mã production: **PASS**. Không có mã production CWS nào bị sửa trong lần thử này.
7. Bí mật: **PASS**. Không có giá trị bí mật nào được yêu cầu, hiển thị, thêm hoặc commit.

## Khả năng tương thích và yêu cầu khởi động lại

- Không thể chạy kiểm tra tương thích Codex vì payload skill nguồn chưa được tải xuống.
- Danh sách chính xác các skill không tương thích: **UNKNOWN**, không suy đoán.
- Hiện tại **không cần và cũng không có ích khi khởi động lại Codex**, vì chưa có skill nào được cài. Sau một lần cài đặt thành công trong tương lai, cần bắt đầu một lượt hoặc phiên Codex mới để phát hiện các project-local skill.

## Khuyến nghị theo vai trò

Tên Matt Pocock skill cụ thể dành cho `WORKER`, `GUARD`, `VERIFIER` và `RESEARCH` giữ trạng thái **NEEDS_VERIFICATION** cho đến khi manifest chính thức truy cập được và Codex xác định tập skill tương thích. Gán tên theo trí nhớ sẽ vi phạm quy tắc grounding của CWS. Khi có đủ bằng chứng, lựa chọn theo các tiêu chí sau:

- `WORKER`: skill triển khai và gỡ lỗi tập trung, giữ nguyên ranh giới Worker track hiện tại.
- `GUARD`: skill bảo mật và review, phụ thuộc vào trust boundary do Founder kiểm soát và các quy tắc fail-safe.
- `VERIFIER`: skill kiểm thử, review và xác thực bằng chứng, phân biệt rõ code verification với runtime/production verification.
- `RESEARCH`: skill nghiên cứu repository/tài liệu, phân biệt rõ fact, inference, hypothesis và unknown.

## Bước tiếp theo an toàn và nhỏ nhất

Chạy lại đúng lệnh được yêu cầu trong môi trường được phép truy cập cả `https://registry.npmjs.org/skills` và `https://github.com/mattpocock/skills`; giữ phạm vi project-local; chọn các engineering skill tương thích với Codex, bao gồm `setup-matt-pocock-skills`; sau đó gọi setup và chạy discovery/validation trong một lượt Codex mới. Không cài thêm một bản global trùng lặp.
