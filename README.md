# FB POST PRO — Frontend Application (V3 Handoff Baseline)

Ứng dụng web quản trị và điều phối quy trình đăng bài Facebook (nhóm Facebook hỗ trợ Chrome Extension Companion & Fanpage qua Meta API), xây dựng bằng **React 19 + TypeScript + Tailwind CSS v4 + Vite**.

> **Lưu ý môi trường:** Phiên bản hiện tại là **Frontend Prototype hoàn chỉnh** chạy với kho dữ liệu mô phỏng cục bộ (`MockAppService` + `localStorage` schema v3 + IndexedDB media storage) để sẵn sàng bàn giao cho đội Backend/Extension (PostgreSQL, Prisma, REST API, Chrome Extension Manifest V3).

## 1. Cài đặt & Chạy dự án

```bash
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (cổng 3000)
npm run dev

# Chạy toàn bộ unit & regression tests (node:test + tsx)
npm run test

# Kiểm tra kiểu dữ liệu TypeScript
npm run lint

# Build production bundle
npm run build
```

## 2. Chế độ DEMO vs Production (`VITE_DEMO_MODE`)

Cấu hình biên giới DEMO nằm tập trung tại `src/config/demoConfig.ts`:

- **Mặc định (`VITE_DEMO_MODE` không đặt hoặc `!== 'false'`)**: Bật chế độ DEMO.
  - Hiển thị huy hiệu `DEMO`, nút đăng nhập nhanh DEMO (Khách hàng Pro, Khách hàng Hết hạn, Admin), nút `Reset DEMO`, nút `Xác nhận (DEMO)` tại Admin → Thanh toán, tạo hồ sơ Meta OAuth mẫu, nút `Mô phỏng đến giờ chạy (DEMO)` trong `TaskDrawer`, và tuyến xem trước `/extension-preview`.
  - Dữ liệu lưu cục bộ theo schema v3 (`fbpostpro_demo_db_v3`), media blob lưu trong IndexedDB (`fbpostpro_demo_media_v1`).
- **Tắt chế độ DEMO (`VITE_DEMO_MODE=false`)**:
  - Ẩn toàn bộ nút đăng nhập nhanh DEMO, huy hiệu DEMO, nút Reset DEMO, nút xác nhận thanh toán DEMO, tạo OAuth DEMO và tuyến `/extension-preview` (trên bản build production).

## 3. Cấu trúc tuyến đường (Routes)

| Tuyến | Quyền truy cập | Chức năng |
|---|---|---|
| `/login`, `/register`, `/forgot-password`, `/reset-password` | GuestOnly | Xác thực tài khoản |
| `/post` | AuthGuard | Soạn thảo 10 bản nháp, gắn đích riêng từng bài, quản lý nhóm/bộ sưu tập/CSV, hẹn giờ GMT+7 |
| `/dashboard` | AuthGuard | Tổng quan KPI, bộ lọc tác vụ, lịch động theo tháng, `TaskDrawer` chi tiết & đổi lịch |
| `/accounts` | AuthGuard | Hồ sơ Facebook (Meta OAuth / Thủ công), Fanpage (`canPublish`), thiết bị Extension |
| `/pricing` | AuthGuard | Hạn mức sử dụng thực tế, bảng gói đồng bộ Admin, tạo & theo dõi đơn thanh toán |
| `/admin` | AdminGuard | 4 tab quản trị: Tổng quan, Người dùng, Gói dịch vụ (CRUD), Thanh toán |
| `/extension-preview` | `IS_DEV_OR_DEMO` + AuthGuard | Mô phỏng Popup Chrome Extension 385×560px với quy tắc chọn tác vụ nghiêm ngặt |

## 4. Kiến trúc thư mục chính

- `src/config/demoConfig.ts` — Cờ `IS_DEMO_MODE`, `IS_DEV_OR_DEMO` và hằng số schema storage v3.
- `src/types/` — Hợp đồng kiểu chuẩn hóa: `domain.ts` (entities), `api.ts` (DTOs), `viewModels.ts` (derived UI models).
- `src/services/contracts.ts` — Giao diện dịch vụ 1-1 với REST API Backend.
- `src/services/mockService.ts` — Triển khai DEMO với immutable structural-sharing snapshots (`useSyncExternalStore`).
- `src/services/mediaStorage.ts` — Lưu trữ blob media bền vững qua IndexedDB, chỉ xóa khi không còn tham chiếu.
- `src/state/AppContext.tsx` — Context reactive theo từng slice dữ liệu, đảm bảo cách ly dữ liệu giữa các user.
- `src/utils/` — Logic nghiệp vụ thuần túy có kiểm thử đơn vị: `taskStatus.ts`, `formatters.ts`, `validation.ts`, `csv.ts`, `dateTime.ts`.
- `docs/` — Tài liệu bàn giao đầy đủ (`DATA_CONTRACT.md`, `API_MAPPING.md`, `TASK_STATE_MACHINE.md`, `ACTIONS.md`, `SCREEN_MAPPING.md`, `FRONTEND_AUDIT.md`, `TEST_REPORT.md`, `OPEN_QUESTIONS.md`, `DESIGN.md`).
- `design/` — Bản xuất Stitch HTML tĩnh ban đầu (**đã lưu trữ / archived**, không phải nguồn sự thật).

## 5. Những phần CHƯA tích hợp Backend thật

1. **PostgreSQL & Prisma ORM** (hiện lưu cục bộ bằng `localStorage` + IndexedDB).
2. **Xác thực JWT / Cookie HttpOnly & Email Server** (đặt lại mật khẩu qua email thật).
3. **Meta OAuth & Graph API** (đăng bài Fanpage thật, đồng bộ Fanpage thật).
4. **Cổng thanh toán VietQR / Banking Webhook** (tạo QR thật & đối soát webhook tự động).
5. **Object Storage (S3/R2/GCS)** cho tệp ảnh/video đính kèm.
6. **Cron/Queue Worker** tự kích hoạt tác vụ `SCHEDULED` khi đến giờ.
7. **Chrome Extension Manifest V3** runtime thực tế.

## 6. Hướng dẫn thay `MockAppService` bằng API thật cho Backend / Codex

1. Giữ nguyên các interface trong `src/services/contracts.ts` và kiểu dữ liệu trong `src/types/domain.ts`, `src/types/api.ts` (ánh xạ `camelCase` ↔ `snake_case` xem tại `docs/DATA_CONTRACT.md`).
2. Tạo `src/services/apiService.ts` triển khai cùng các contract (`AuthServiceContract`, `PostServiceContract`, `GroupServiceContract`, `TaskServiceContract`, `AccountServiceContract`, `BillingServiceContract`, `AdminServiceContract`) gọi tới các endpoint trong `docs/API_MAPPING.md`.
3. Thay `demoMediaStorage` bằng endpoint `POST /api/media/upload` + signed URLs trong `MediaPreview.tsx`.
4. Chuyển `AppContext.tsx` từ `mockAppService` sang `apiService` (hoặc React Query/SWR dựa trên cùng hợp đồng dữ liệu) và thiết lập `VITE_DEMO_MODE=false` khi build production.
