# Frontend Audit & Verification Test Report

## 1. Automated Unit & Service Tests (`node:test`)
Command: `npx --yes tsx --test src/utils/__tests__/taskStatus.test.ts src/utils/__tests__/validationAndCsv.test.ts src/services/__tests__/mockService.test.ts`

- **Result**: **18 / 18 passed, 0 failed** across 5 test suites.
- Coverage:
  - `taskStatus.test.ts` (5 tests): All 10 canonical `TaskStatus` derivations, Pause -> `PAUSED` & Resume, Per-Item Confirmation without blindly marking task complete, Cancel (`PROCESSING -> NEEDS_REVIEW`, preserving `SUCCESS`/`FAILED`), Retry eligibility (`FAILED` only + `attemptCount` increment).
  - `validationAndCsv.test.ts` (7 tests): Image-only / link-only / text-only draft validation, invalid URL rejection, Facebook group URL normalization & numeric UID extraction (never fabricating UID), RFC-4180 CSV classification (`VALID` / `DUPLICATE` / `ERROR`), CSV formula-injection neutralization (`=`, `+`, `-`, `@` prefixed with `'`), GMT+7 -> ISO UTC conversion, future schedule validation, live countdown from `expiresAt`, dynamic calendar month grid, device `REVOKED` / `CONNECTED` / `OFFLINE` derivation.
  - `mockService.test.ts` (6 tests): User isolation on logout & login switch (TEST-30), expired subscription blocking task creation & exact `0` usage, `idempotencyKey` deduplication & Fanpage `canPublish = false` blocking, many-to-many Group Collections & non-destructive collection deletion, customer `checkOrderStatus` never auto-marking `PAID` vs Admin DEMO payment confirmation activating subscription, Admin self-lock prevention, truthful `refreshAccountStatus`, non-destructive `disconnectAccount`, and revoked device reconnect block.

## 2. TypeScript Check & Production Build
- `npm run lint` (`tsc --noEmit`): **PASS (0 errors)**
- `npm run build` (`vite build`): **PASS**

## 3. Headless Chromium Browser Verification (`playwright-cli`)
Verified live against `http://localhost:3000` at `1440×900` with **0 console errors and 0 warnings**:
- Unauthenticated `/` redirects to `/login` with empty password field and explicit DEMO buttons.
- Demo Customer login navigates to `/post`, hides Admin nav link, renders all 10 draft slots (`Bài 1..10`) in a 2×5 grid, zero horizontal overflow.
- Direct Customer navigation to `/admin` renders **Không có quyền truy cập** Access Denied screen.
- `/dashboard` renders dynamic current-year/current-month calendar, real computed KPIs, all 10 status filter chips, and opens reactive `TaskDrawer`.
- `/accounts` renders Facebook accounts, Fanpages (`canPublish` badges), and Extension devices with zero out-of-scope cookie/ping fields.
- `/pricing` renders exact usage counters, live synced plans, and placeholder **QR DEMO** checkout.
- `/extension-preview` renders 385×560px preview frame, 9 UI scenarios, and legal action buttons without out-of-scope automation terms.
- Demo Admin login navigates to `/admin`, renders all 5 header nav items without overlap (`navOverlap: false`), and displays the 4 scoped tabs (`Tổng quan`, `Người dùng`, `Gói dịch vụ`, `Thanh toán`).
