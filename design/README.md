# Design Archive Notice (Stitch Exports — Historical Reference Only)

Các tệp `*.html` trong thư mục `/design` là bản xuất tĩnh ban đầu từ Stitch dùng để tham khảo bố cục và màu sắc ở giai đoạn khởi tạo giao diện.

**Trạng thái:** ĐÃ LƯU TRỮ (ARCHIVED / NON-CANONICAL).

**Cảnh báo quan trọng khi bàn giao cho Backend / Codex:**
- Các tệp HTML tĩnh này có thể chứa số liệu minh họa cố định, tên trường dữ liệu cũ hoặc luồng chưa đồng bộ với đặc tả nghiệp vụ V3.
- **Nguồn sự thật chính thức (Source of Truth)** cho toàn bộ giao diện, luồng nghiệp vụ và hợp đồng dữ liệu là:
  - Mã nguồn ứng dụng React + TypeScript trong thư mục `/src`
  - Tài liệu đặc tả kiến trúc & hợp đồng trong `/docs`:
    - `docs/DATA_CONTRACT.md` (Canonical TypeScript `camelCase` ↔ PostgreSQL `snake_case`)
    - `docs/API_MAPPING.md` (Endpoints, DTOs & error codes)
    - `docs/TASK_STATE_MACHINE.md` (State transition matrix)
    - `docs/SCREEN_MAPPING.md` & `docs/ACTIONS.md`
    - `docs/DESIGN.md` (Design System chuẩn hóa)
    - `docs/OPEN_QUESTIONS.md` (Các chính sách cần chủ sản phẩm phê duyệt trước khi triển khai Backend)
