# Open Questions & Business Policies Pending Owner Approval

Các quyết định nghiệp vụ dưới đây đã được đánh dấu rõ trong Frontend Prototype V3 và **cần Chủ sản phẩm (Product Owner) phê duyệt** trước khi OpenAI Codex triển khai Backend / PostgreSQL / Payment Webhook thực tế.

## 1. Chính sách đổi gói giữa kỳ (`CHANGE_PLAN` — Upgrade / Downgrade)
- **Hiện trạng trong Frontend V3**:
  - `classifyPaymentOrderIntent(currentSubscription, targetPlanId)` phân biệt rõ 3 trường hợp: `PURCHASE` (mua mới / đã hết hạn), `RENEWAL` (gia hạn đúng gói đang hoạt động — **cộng dồn trực tiếp từ `currentSub.expiresAt`**, không làm mất thời gian còn lại), và `CHANGE_PLAN` (chuyển sang gói khác khi gói hiện tại vẫn còn hiệu lực).
  - Trong DEMO Admin Confirmation Modal, đơn `CHANGE_PLAN` hiển thị cảnh báo rõ và yêu cầu checkbox `acknowledgeUnapprovedPlanChangePolicy: true` để xác nhận mô phỏng.
- **Cần chốt trước khi làm Backend thật**:
  1. Khi **Nâng cấp (Upgrade)** giữa kỳ: tính theo tỷ lệ ngày còn lại (proration), khấu trừ số dư sang đơn mới, hay bắt đầu chu kỳ mới ngay và cộng quy đổi ngày còn lại?
  2. Khi **Hạ cấp (Downgrade)** giữa kỳ: áp dụng ngay lập tức hay xếp lịch chuyển gói khi `expiresAt` hiện tại kết thúc (`scheduledPlanId`)?
  3. Nếu khách hàng đang có số lượng nhóm (`groupsUsed`), hồ sơ (`accountsUsed`) hoặc lịch chờ (`scheduledTasksUsed`) vượt quá hạn mức gói mới khi hạ cấp: khóa tạo mới (soft-cap) hay chặn hạ cấp cho tới khi giảm xuống dưới hạn mức?

## 2. Giới hạn lưu trữ Media & Object Storage Policy
- **Hiện trạng trong Frontend V3**: Lưu nhị phân tạm trong IndexedDB (`fbpostpro_demo_media_v1`) và chỉ xóa khi `isMediaReferenced(mediaId) === false`.
- **Cần chốt trước khi làm Backend thật**:
  - Dung lượng tối đa mỗi tệp ảnh/video, tổng dung lượng media trên mỗi user/gói (nếu có), và thời gian lưu giữ media snapshot sau khi `PublishingTask` đã hoàn tất (`retentionDays`).

## 3. Nội dung mô tả gói dịch vụ trên trang Pricing (`Plan` DB Schema)
- **Hiện trạng trong Frontend V3**: Thực thể `Plan` chỉ giữ đúng 11 trường canonical đã duyệt (`id, code, name, monthlyPriceVnd, yearlyPriceVnd, maxFacebookAccounts, maxSavedGroups, maxScheduledTasks, isActive, createdAt, updatedAt`). Trang `/pricing` hiển thị mô tả cố định từ View Model theo 3 hạn mức chính thức.
- **Cần chốt**: Nếu trong tương lai cần quản trị câu chữ marketing / badge "Phổ biến" từ Admin, cần bổ sung migration schema chính thức (`display_tagline`, `sort_order`, v.v.) sau khi được phê duyệt.

## 4. Tích hợp Meta App Review & VietQR / Cổng thanh toán thực tế
- **Meta Graph API**: Cần xác nhận danh sách quyền chính thức (`pages_manage_posts`, `pages_read_engagement`, `pages_show_list`) và quy trình mã hóa token (`AES-256-GCM` / KMS) ở Backend.
- **VietQR / Payment Webhook**: Cần chốt nhà cung cấp (Casso / SePay / PayOS / VNPay), chữ ký HMAC webhook, chính sách xử lý chuyển khoản thiếu/thừa số tiền, và đơn hết hạn nhưng khách chuyển khoản trễ.

## 5. Khung thực thi Chrome Extension (Manifest V3)
- Cần chốt cơ chế xác thực giữa Web App và Chrome Extension (Device pairing token / short-lived JWT + Refresh Token + `revokedAt` check trên mỗi request) và cơ chế heartbeat cập nhật `extension_devices.last_seen_at`.
