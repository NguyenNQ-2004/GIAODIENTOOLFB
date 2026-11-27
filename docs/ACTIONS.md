# User Actions & Business Behavior Matrix

| Module | User Action | Trigger Component | Validation / Guard | Resulting State Change |
|---|---|---|---|---|
| Auth | Login / Demo Login | `AuthPage.tsx` | Email/password check; rejects `LOCKED` users | Sets active user session, navigates to `/post` (or `/admin` for Admin quick demo) |
| Auth | Logout | `LayoutShell.tsx` | Authenticated | Clears active user session & user-scoped state, redirects to `/login` |
| Auth | Change Password | `ChangePasswordModal.tsx` | Current password + min 8 chars + confirm match | Updates session password in DEMO store |
| Composer | Edit Draft Slot (1..10) | `PostComposerPage.tsx` | Slot `1..10` | Saves `content`, `linkUrl`, `media[]` to `Post(status='DRAFT')` |
| Composer | Save Template / Load Template | `PostComposerPage.tsx` | Valid text OR link OR ready media | Creates/loads `Post(status='SAVED')` with full `media[]` references |
| Composer | Add / Edit / Delete Group | `GroupFormModal.tsx` | Valid `facebook.com/groups/...`, dedupe URL & UID, plan quota | Upserts/deletes `FacebookGroup` (delete note: does not leave FB group) |
| Composer | Import / Export CSV | `CsvImportModal.tsx` | Header check (`group_name,group_url`), RFC-4180 parse, formula injection escape | Imports only `VALID` rows; exports selected groups (or visible if none selected) |
| Composer | Create / Rename / Delete Collection | `CollectionModal.tsx` | >= 1 selected group on create | Updates `GroupCollection` & `GroupCollectionItem`; deleting collection keeps groups |
| Composer | Create Publishing Task | `ConfirmPublishModal.tsx` | Active subscription, daily quota, valid drafts, future `scheduledAt`, `canPublish=true` for Pages, `idempotencyKey` | Creates `PublishingTask` with immutable item snapshots; shows `"Đã tạo tác vụ mô phỏng"` |
| Tasks | Pause / Resume / Cancel | `TaskDrawer.tsx` | State machine eligibility guards | Transitions task via `taskStatus.ts`; cancel marks `PROCESSING` as `NEEDS_REVIEW` |
| Tasks | Confirm Item Result | `TaskDrawer.tsx`, `ExtensionPopupPage.tsx` | Item in confirmable state | Updates single `PublishingTaskItem` (`confirmationType='USER'`), recomputes parent `TaskStatus` |
| Tasks | Retry Item / Retry All Failed | `TaskDrawer.tsx` | Only `item.status === 'FAILED'` | Increments `attemptCount`, moves item back to `WAITING_CONFIRMATION`/`PENDING` |
| Accounts | Add Manual Profile / Demo OAuth | `ConnectAccountModal.tsx` | Plan `maxFacebookAccounts` quota | Creates `MANUAL_PROFILE (UNVERIFIED)` or `META_OAUTH (CONNECTED)` demo profile |
| Accounts | Refresh / Disconnect Account | `AccountsPage.tsx` | Owner check | Refresh preserves actual status; Disconnect sets `status='DISCONNECTED'` |
| Devices | Check Connection / Revoke Device | `AccountsPage.tsx` | Blocks check on `REVOKED` devices | Updates `lastSeenAt` or sets `revokedAt` permanently |
| Billing | Create / Check / Cancel Order | `PricingPage.tsx` | Active plan | Creates `PENDING` order; Check NEVER auto-marks `PAID` (only checks expiry) |
| Admin | Update User Role / Lock | `AdminPage.tsx` | `ADMIN` role; blocks self-lock & self-demote | Updates `User.role` / `User.status` + records `AuditLog` |
| Admin | Create / Edit Plan | `AdminPage.tsx` | `ADMIN` role; unique `code`; limits >= 1 | Updates shared `plans` store synced live to `/pricing` |
| Admin | Confirm Payment (DEMO) | `AdminPage.tsx` | `ADMIN` role; order must be `PENDING` | Marks order `PAID`, activates user `Subscription`, writes `AuditLog` |
