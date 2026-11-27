# Planned Backend REST API Mapping (V3)

All service methods in `src/services/contracts.ts` map 1-to-1 to the planned backend REST endpoints below. Currently backed by `src/services/mockService.ts` (`MockAppService`) in DEMO mode (`VITE_DEMO_MODE !== 'false'`).

## Auth
- `POST /api/auth/login` → `AuthServiceContract.login`
- `POST /api/auth/register` → `AuthServiceContract.register` (uses `displayName`)
- `POST /api/auth/forgot-password` → `AuthServiceContract.forgotPassword`
- `POST /api/auth/reset-password` → `AuthServiceContract.resetPassword`
- `POST /api/auth/change-password` → `AuthServiceContract.changePassword`
- `POST /api/auth/logout` → `AuthServiceContract.logout`
- `GET /api/auth/me` → `AuthServiceContract.getCurrentUser`

## Posts & Media
- `PATCH /api/posts/drafts/:slotNumber` → `PostServiceContract.updateDraftSlot`
- `DELETE /api/posts/drafts/:slotNumber` → `PostServiceContract.resetDraftSlot`
- `POST /api/posts/saved` → `PostServiceContract.savePostTemplate`
- `DELETE /api/posts/saved/:postId` → `PostServiceContract.deleteSavedPost`
- *(Backend Object Storage required)* `POST /api/media/upload` & `GET /api/media/:mediaId/signed-url` — Prototype currently persists blobs locally in IndexedDB via `src/services/mediaStorage.ts` (`DemoMediaStorage`) and only deletes unreferenced blobs after checking `isMediaReferenced(mediaId)`.

## Groups & Collections
- `POST /api/groups` → `GroupServiceContract.createGroup` (enforces `Plan.maxSavedGroups`)
- `PATCH /api/groups/:groupId` → `GroupServiceContract.updateGroup`
- `DELETE /api/groups/:groupId` → `GroupServiceContract.deleteGroup`
- `POST /api/groups/import` → `GroupServiceContract.importGroups` (enforces `Plan.maxSavedGroups`)
- `POST /api/group-collections` → `GroupServiceContract.createCollection`
- `PATCH /api/group-collections/:collectionId` → `GroupServiceContract.renameCollection`
- `PUT /api/group-collections/:collectionId/groups` → `GroupServiceContract.setCollectionGroups`
- `DELETE /api/group-collections/:collectionId` → `GroupServiceContract.deleteCollection`

## Publishing Tasks
- `POST /api/tasks` → `TaskServiceContract.createTask`
  - Accepts explicit per-draft `(postId, groupId | pageId)` `pairs` (never implicit Cartesian product).
  - Enforces `idempotencyKey`, active `Subscription` (`expiresAt > now`), and `Plan.maxScheduledTasks` (concurrent `SCHEDULED` count only; immediate tasks do NOT consume `maxScheduledTasks`).
- `PATCH /api/tasks/:taskId/schedule` → `TaskServiceContract.rescheduleTask` (eligible only for `SCHEDULED` or `PAUSED` with `scheduledAt`, requires future `scheduledAt` & active subscription)
- *(DEMO-only trigger; real backend uses Cron/Queue worker)* `POST /api/tasks/:taskId/trigger-due-demo` → `TaskServiceContract.triggerDueScheduledTaskDemo` (re-verifies subscription at execution time; if expired, marks pending items `FAILED` with `errorCode: 'SUBSCRIPTION_EXPIRED'`)
- `POST /api/tasks/:taskId/pause` → `TaskServiceContract.pauseTask`
- `POST /api/tasks/:taskId/resume` → `TaskServiceContract.resumeTask` (re-checks active subscription)
- `POST /api/tasks/:taskId/cancel` → `TaskServiceContract.cancelTask` (cancelling `SCHEDULED` frees quota; `PROCESSING` transitions to `NEEDS_REVIEW`)
- `POST /api/tasks/:taskId/items/:itemId/confirm` → `TaskServiceContract.confirmTaskItem` (enforces strict state machine: rejects `META_PAGE_API` user confirms, rejects terminal `SUCCESS`/`FAILED`/`CANCELLED` overwrites, rejects future `SCHEDULED`/`PAUSED`/`CANCELLED` tasks)
- `POST /api/tasks/:taskId/items/:itemId/retry` → `TaskServiceContract.retryTaskItem` (only `item.status === 'FAILED'`, rejects `NEEDS_REVIEW`, checks active subscription)
- `POST /api/tasks/:taskId/retry-failed` → `TaskServiceContract.retryFailedItems`

## Accounts, Pages & Extension Devices
- `POST /api/facebook-accounts/manual` → `AccountServiceContract.createManualProfile` (enforces `Plan.maxFacebookAccounts`)
- `POST /api/facebook-accounts/oauth/start` → *(Backend Meta OAuth required; prototype uses DEMO-gated `simulateDemoOAuthConnect`)*
- `POST /api/facebook-accounts/:accountId/refresh` → `AccountServiceContract.refreshAccountStatus`
- `POST /api/facebook-accounts/:accountId/disconnect` → `AccountServiceContract.disconnectAccount`
- `POST /api/facebook-accounts/:accountId/sync-pages` → `AccountServiceContract.syncPages`
- `POST /api/extension/devices/connect` → `AccountServiceContract.connectExtensionDevice`
- `POST /api/extension/devices/:deviceId/heartbeat` → `AccountServiceContract.checkDeviceConnection`
- `POST /api/extension/devices/:deviceId/revoke` → `AccountServiceContract.revokeDevice`

## Billing & Admin
- `POST /api/payments/orders` → `BillingServiceContract.createPaymentOrder`
- `GET /api/payments/orders/:orderId/status` → `BillingServiceContract.checkOrderStatus` (never auto-marks `PAID`, transitions expired `PENDING` orders to `EXPIRED`)
- `POST /api/payments/orders/:orderId/cancel` → `BillingServiceContract.cancelPaymentOrder`
- `POST /api/payments/webhook` → *(Real VietQR/Banking webhook required in Backend)*
- `PATCH /api/admin/users/:userId` → `AdminServiceContract.updateUser` (blocks self-lock & self-demote, writes `AuditLog`)
- `POST /api/admin/plans` / `PATCH /api/admin/plans/:planId` → `AdminServiceContract.upsertPlan` (canonical `Plan` fields only: `code, name, monthlyPriceVnd, yearlyPriceVnd, maxFacebookAccounts, maxSavedGroups, maxScheduledTasks, isActive`)
- *(DEMO-only)* `POST /api/admin/payments/:orderId/confirm-demo` → `AdminServiceContract.confirmPaymentOrderDemo`
  - Rejects already `PAID` (`ORDER_ALREADY_PAID`) and expired orders (`ORDER_EXPIRED`).
  - `RENEWAL` (same plan while active) preserves remaining time (`expiresAt` extended from current `expiresAt`).
  - `CHANGE_PLAN` (different plan while active) requires `acknowledgeUnapprovedPlanChangePolicy: true` until product owner finalizes proration/stacking policy (`docs/OPEN_QUESTIONS.md`).
