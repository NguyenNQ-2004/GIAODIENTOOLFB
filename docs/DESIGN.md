# FB POST PRO — Frontend Design & Architecture Specification

## 1. Product Scope
FB POST PRO is a frontend React + TypeScript + Tailwind CSS web application prototype for managing Facebook publishing workflows across 7 business groups (13 screens/routes):
1. **Post Composer (`/post`)**: 10 independent draft slots, saved post templates with full media attachment references, Facebook group management, many-to-many group collections, CSV import/export, Fanpage targeting filtered by Meta OAuth account, scheduling (GMT+7 -> ISO UTC), and explicit `(post, destination)` confirmation.
2. **Dashboard & Schedule (`/dashboard`)**: Computed KPIs, working date/account/status/search filters across all 10 canonical `TaskStatus` states, dynamic current-month calendar, and reactive `TaskDrawer`.
3. **Facebook Accounts, Fanpages & Extension Devices (`/accounts`)**: Meta OAuth (DEMO) vs Manual Profile (`UNVERIFIED`), truthful status refresh, non-destructive disconnect, Fanpage publish permission visibility (`canPublish`), and Extension Device lifecycle (`CONNECTED` / `OFFLINE` / `REVOKED`).
4. **Pricing & Payment Orders (`/pricing`)**: Exact real usage counters, live plans synced with Admin CRUD, placeholder QR DEMO checkout, live `expiresAt` countdown, and strict non-auto-paid customer status checks.
5. **Authentication (`/login`, `/register`, `/forgot-password`, `/reset-password`)**: Route-based auth flows with `AuthGuard` and `AdminGuard`, zero pre-filled passwords, explicit DEMO login buttons, and `ChangePasswordModal`.
6. **Admin Console (`/admin`)**: Strictly 4 tabs (`overview`, `users`, `plans`, `payments`), real computed KPIs, `CUSTOMER`/`ADMIN` roles, self-lock prevention, Plan CRUD, and Admin DEMO payment confirmation.
7. **Chrome Extension Popup Preview (`/extension-preview`)**: Dev/Preview 385×560px companion simulator with 9 UI states and strictly legal user-confirmed actions.

## 2. Prototype vs Production Boundary
- All persistence runs in-memory + `localStorage` via `src/services/mockService.ts` (`MockAppService`).
- No real PostgreSQL database, Meta OAuth/Graph API, VietQR/Banking webhook, email server, or Chrome Extension runtime is connected.
- All simulated capabilities are explicitly labeled **DEMO** or **Preview** in the UI.

## 3. Codebase Structure
- `src/types/`: `domain.ts` (canonical DB entities), `api.ts` (REST DTOs), `viewModels.ts` (derived UI types), `app.ts` (re-export).
- `src/utils/`: Pure, unit-tested business logic (`taskStatus.ts`, `validation.ts`, `csv.ts`, `dateTime.ts`, `formatters.ts`).
- `src/services/`: `contracts.ts` (backend interface signatures) & `mockService.ts` (prototype implementation).
- `src/state/AppContext.tsx`: Reactive context enforcing strict per-user data isolation.
- `src/components/` & `src/pages/`: Clean modular views with Escape-key modal handling and zero `window.alert`/`window.confirm`/`window.open`.
