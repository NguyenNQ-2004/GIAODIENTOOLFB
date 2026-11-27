# Frontend Acceptance Test Report — V3 Final

## 1. Build & TypeScript Verification
- `npm run lint` (`tsc --noEmit`): **PASS** (0 errors)
- `npm run build` (`vite build`): **PASS** (clean production bundle)
- Legacy field audit (`grep` across `src/` for `fullName`, `endsAt`, `priceMonthlyVnd`, `priceYearlyVnd`, `maxGroups`, `maxScheduledTasksPerDay`, `scheduledTodayUsed`, `scheduledTodayLimit`): **0 matches**

## 2. Automated Unit & Regression Tests (`npm run test` — `tsx --test`)
**Result: 29 / 29 tests PASSED across 6 test suites (0 failures, 0 skipped).**

| Suite | File | Tests | Covered Scope |
|---|---|---|---|
| V3 Acceptance Regression (`TEST-31`..`TEST-50`) | `src/services/__tests__/acceptanceV3.test.ts` | 11 | Reactive structural-sharing snapshots (`TEST-31..33`), exact per-draft destination pairs (`TEST-34..35`), official `maxScheduledTasks` concurrent `SCHEDULED` quota & overdue expiry (`TEST-36..37b`), payment renewal preservation / expired / double-confirm / `CHANGE_PLAN` policy guard (`TEST-38..40`), strict task state machine transitions (`TEST-41..44`), persistent `DemoMediaStorage` + `isMediaReferenced` snapshot retention (`TEST-45..47`), strict Extension eligible selection with zero fallback (`TEST-48`), Admin plan price live sync & canonical schema (`TEST-49`), localStorage schema v3 migration & notice (`TEST-50`) |
| Service Business Integrity (`TEST-30` & core flows) | `src/services/__tests__/mockService.test.ts` | 6 | User isolation on logout/switch, expired subscription zero usage & create block, `idempotencyKey` dedupe & Fanpage `canPublish=true`, many-to-many collections, non-auto-paid customer status check, admin self-lock / non-destructive disconnect / revoked device block |
| Task State Machine | `src/utils/__tests__/taskStatus.test.ts` | 5 | All 10 `TaskStatus` aggregate derivations, pause/resume, per-item confirm, cancel (`PROCESSING -> NEEDS_REVIEW`), retry only `FAILED` |
| Validation Utilities | `src/utils/__tests__/validationAndCsv.test.ts` | 2 | Text/link/media-only post validation, Facebook group URL normalization & numeric UID extraction |
| CSV Import & Safe Export | `src/utils/__tests__/validationAndCsv.test.ts` | 2 | RFC-4180 CSV row classification (`VALID`/`DUPLICATE`/`ERROR`), CSV formula-injection neutralization |
| DateTime & Device Formatters | `src/utils/__tests__/validationAndCsv.test.ts` | 3 | GMT+7 conversion & future timestamp check, countdown & dynamic month grid, device connection status derivation |

## 3. Real Browser E2E Behavioral & Multi-Viewport Visual QA (Headless Chromium via `playwright-cli`)
- **Console / Uncaught Page Errors**: **0** across all tested routes (`/login`, `/post`, `/dashboard`, `/accounts`, `/pricing`, `/admin`, `/extension-preview`).
- **Verified Interactive Flows**:
  1. `/login`: DEMO security notice displayed (`"Không sử dụng mật khẩu thật"`), quick DEMO logins functional.
  2. `TEST-31` (`/post`): Added `Nhóm QA Reactive V3`, edited to `Nhóm QA Reactive Edited`, deleted group — every change reflected instantaneously in the DOM without browser reload.
  3. `TEST-34` (`/post`): Unchecked all 10 draft checkboxes — remained at 0 selected with zero auto-reselection.
  4. `TEST-35` (`/post`): Checked Draft 1 → assigned 1 group; checked Draft 2 → assigned 1 different group → primary CTA & `ConfirmPublishModal` confirmed exact **2 items** (never Cartesian 4).
  5. `TEST-45/46/47` (`/post` → `/dashboard` reload → `TaskDrawer`): Uploaded real `qa-banner.png` (PNG) in Draft 1, created task, navigated to `/dashboard`, executed full `page.reload()`, opened `TaskDrawer`, verified `<img alt="qa-banner.png">` rendered intact (`complete === true && naturalWidth > 0`) from IndexedDB.
  6. `TEST-32 & TEST-33` (`TaskDrawer`): Confirmed item #1 inside open `TaskDrawer` → progress updated immediately to `1/2 (50%)` and item badge updated to `Thành công` without reload.
  7. `TEST-48` (`/extension-preview`): Rendered cleanly with strict `getEligibleExtensionSelection`.
  8. `TEST-49` (`/admin` → `/pricing`): Admin updated `Gói Chuyên Nghiệp` monthly price to `555.000đ` → navigated to `/pricing` → `555.000đ/tháng` and official `Tác vụ đang chờ lịch (SCHEDULED)` quota bar rendered immediately.
- **Multi-Viewport Layout & Horizontal Overflow Audit**: **25 / 25 checks PASSED with `0px` horizontal overflow** across:
  - Desktop: `1920×1080`, `1440×900`, `1366×768`
  - Tablet: `768×1024`
  - Mobile: `390×844`
  - Routes checked at every viewport: `/post`, `/dashboard`, `/accounts`, `/pricing`, `/admin`.
