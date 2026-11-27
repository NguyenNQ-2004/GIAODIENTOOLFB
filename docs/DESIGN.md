# FB POST PRO — Frontend Design & Architecture Specification (V3)

## 1. Product Scope
FB POST PRO is a frontend React + TypeScript + Tailwind CSS web application prototype ready for handoff to Backend (PostgreSQL + Prisma + REST API) and Chrome Extension implementation across 7 business modules:
1. **Post Composer (`/post`)**: 10 independent draft slots (no auto-reselect bug), per-draft destination mapping (`groupIdsByDraftId` / `pageIdsByDraftId`), IndexedDB-backed media previews (`MediaPreview`), saved post templates, Facebook group CRUD, many-to-many collections, RFC-4180 CSV import/export, Fanpage targeting filtered by Meta OAuth account (`canPublish = true`), GMT+7 scheduling, and explicit `(post, destination)` confirmation with `idempotencyKey`.
2. **Dashboard & Schedule (`/dashboard`)**: Computed KPIs, working filters across all 10 canonical `TaskStatus` states, overdue `"Quá giờ lịch"` badges, dynamic current-month calendar, and reactive `TaskDrawer` with media previews, inline Reschedule, and DEMO due trigger.
3. **Facebook Accounts, Fanpages & Extension Devices (`/accounts`)**: Meta OAuth (DEMO-gated) vs Manual Profile (`UNVERIFIED`), truthful status refresh, non-destructive disconnect, Fanpage publish permission visibility, and Extension Device lifecycle (`CONNECTED` / `OFFLINE` / `REVOKED`).
4. **Pricing & Payment Orders (`/pricing`)**: Exact usage counters (`maxFacebookAccounts`, `maxSavedGroups`, concurrent `SCHEDULED` `maxScheduledTasks`), live plans synced with Admin CRUD using fixed UI view-model copy (zero unapproved `Plan` DB columns), `PURCHASE`/`RENEWAL`/`CHANGE_PLAN` intent detection, placeholder QR DEMO checkout, live `expiresAt` countdown, and non-auto-paid customer status checks.
5. **Authentication (`/login`, `/register`, `/forgot-password`, `/reset-password`)**: Route-based auth flows with `AuthGuard` and `AdminGuard`, canonical `displayName`, zero pre-filled passwords, DEMO security warning, DEMO-gated quick logins, and `ChangePasswordModal`.
6. **Admin Console (`/admin`)**: Strictly 4 tabs (`overview`, `users`, `plans`, `payments`), real computed KPIs, `CUSTOMER`/`ADMIN` roles, self-lock prevention, canonical Plan CRUD, and Admin DEMO payment confirmation with `RENEWAL` preservation, expiry guard, and `CHANGE_PLAN` policy notice.
7. **Chrome Extension Popup Preview (`/extension-preview`, `IS_DEV_OR_DEMO` only)**: 385×560px companion simulator using strict `getEligibleExtensionSelection` (zero fallback to ineligible tasks/items) and strictly legal user-confirmed actions.

## 2. Prototype vs Production Boundary (`src/config/demoConfig.ts`)
- `IS_DEMO_MODE`: controlled by `VITE_DEMO_MODE` (defaults to `true` for prototype; set `VITE_DEMO_MODE=false` for production API integration).
- `IS_DEV_OR_DEMO`: gates `/extension-preview` and scenario debug tools.
- Persistence uses `localStorage` (`fbpostpro_demo_db_v3`, schema v3) + IndexedDB (`fbpostpro_demo_media_v1`) via `src/services/mockService.ts` and `src/services/mediaStorage.ts`.
- No real PostgreSQL database, Meta OAuth/Graph API, VietQR/Banking webhook, email server, or Chrome Extension runtime is connected.

## 3. Codebase Structure
- `src/config/demoConfig.ts`: Central environment flags & storage schema constants.
- `src/types/`: `domain.ts` (canonical DB entities), `api.ts` (REST DTOs), `viewModels.ts` (derived UI types), `app.ts` (re-export).
- `src/utils/`: Pure, unit-tested business logic (`taskStatus.ts`, `validation.ts`, `csv.ts`, `dateTime.ts`, `formatters.ts`).
- `src/services/`: `contracts.ts` (backend interface signatures), `mockService.ts` (immutable structural-sharing reactive prototype store), `mediaStorage.ts` (persistent IndexedDB media blob store).
- `src/state/AppContext.tsx`: Reactive context powered by `useSyncExternalStore` with slice-level memoization and strict per-user isolation.
- `src/components/` & `src/pages/`: Modular views with Escape-key modal handling and zero `window.alert`/`window.confirm`/`window.open`.
