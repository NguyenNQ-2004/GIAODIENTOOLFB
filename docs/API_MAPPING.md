# Planned Backend REST API Mapping

All service methods in `src/services/contracts.ts` map 1-to-1 to the backend endpoints below. Currently backed by `src/services/mockService.ts` in DEMO mode.

## Auth
- `POST /api/auth/login` -> `AuthServiceContract.login`
- `POST /api/auth/register` -> `AuthServiceContract.register`
- `POST /api/auth/forgot-password` -> `AuthServiceContract.forgotPassword`
- `POST /api/auth/reset-password` -> `AuthServiceContract.resetPassword`
- `POST /api/auth/change-password` -> `AuthServiceContract.changePassword`
- `POST /api/auth/logout` -> `AuthServiceContract.logout`
- `GET /api/auth/me` -> `AuthServiceContract.getCurrentUser`

## Posts & Media
- `PATCH /api/posts/drafts/:slotNumber` -> `PostServiceContract.updateDraftSlot`
- `DELETE /api/posts/drafts/:slotNumber` -> `PostServiceContract.resetDraftSlot`
- `POST /api/posts/saved` -> `PostServiceContract.savePostTemplate`
- `DELETE /api/posts/saved/:postId` -> `PostServiceContract.deleteSavedPost`
- *(Not yet implemented — requires backend)* `POST /api/media/upload` (currently uses local browser `URL.createObjectURL`)

## Groups & Collections
- `POST /api/groups` -> `GroupServiceContract.createGroup`
- `PATCH /api/groups/:groupId` -> `GroupServiceContract.updateGroup`
- `DELETE /api/groups/:groupId` -> `GroupServiceContract.deleteGroup`
- `POST /api/groups/import` -> `GroupServiceContract.importGroups`
- `POST /api/group-collections` -> `GroupServiceContract.createCollection`
- `PATCH /api/group-collections/:collectionId` -> `GroupServiceContract.renameCollection`
- `PUT /api/group-collections/:collectionId/groups` -> `GroupServiceContract.setCollectionGroups`
- `DELETE /api/group-collections/:collectionId` -> `GroupServiceContract.deleteCollection`

## Publishing Tasks
- `POST /api/tasks` -> `TaskServiceContract.createTask` (enforces `idempotencyKey`)
- `POST /api/tasks/:taskId/pause` -> `TaskServiceContract.pauseTask`
- `POST /api/tasks/:taskId/resume` -> `TaskServiceContract.resumeTask`
- `POST /api/tasks/:taskId/cancel` -> `TaskServiceContract.cancelTask`
- `POST /api/tasks/:taskId/items/:itemId/confirm` -> `TaskServiceContract.confirmTaskItem`
- `POST /api/tasks/:taskId/items/:itemId/retry` -> `TaskServiceContract.retryTaskItem`
- `POST /api/tasks/:taskId/retry-failed` -> `TaskServiceContract.retryFailedItems`

## Accounts, Pages & Extension Devices
- `POST /api/facebook-accounts/manual` -> `AccountServiceContract.createManualProfile`
- `GET /api/facebook-accounts/oauth/start` -> *(Backend OAuth required; prototype uses `simulateDemoOAuthConnect`)*
- `POST /api/facebook-accounts/:accountId/refresh` -> `AccountServiceContract.refreshAccountStatus`
- `POST /api/facebook-accounts/:accountId/disconnect` -> `AccountServiceContract.disconnectAccount`
- `POST /api/facebook-accounts/:accountId/sync-pages` -> `AccountServiceContract.syncPages`
- `POST /api/extension/devices/connect` -> `AccountServiceContract.connectExtensionDevice`
- `POST /api/extension/devices/:deviceId/heartbeat` -> `AccountServiceContract.checkDeviceConnection`
- `POST /api/extension/devices/:deviceId/revoke` -> `AccountServiceContract.revokeDevice`

## Billing & Admin
- `POST /api/payments/orders` -> `BillingServiceContract.createPaymentOrder`
- `GET /api/payments/orders/:orderId/status` -> `BillingServiceContract.checkOrderStatus`
- `POST /api/payments/orders/:orderId/cancel` -> `BillingServiceContract.cancelPaymentOrder`
- `POST /api/payments/webhook` -> *(Backend webhook required; prototype uses Admin DEMO confirmation)*
- `PATCH /api/admin/users/:userId` -> `AdminServiceContract.updateUser`
- `POST /api/admin/plans` / `PATCH /api/admin/plans/:planId` -> `AdminServiceContract.upsertPlan`
- `POST /api/admin/payments/:orderId/confirm-demo` -> `AdminServiceContract.confirmPaymentOrderDemo`
