# User Actions & Business Behavior Matrix (V3)

| Module | User Action | Trigger Component | Validation / Guard | Resulting State Change |
|---|---|---|---|---|
| Auth | Login / Demo Login | `AuthPage.tsx` | Email/password check; rejects `LOCKED` users; Quick DEMO gated by `IS_DEMO_MODE`; security warning shown | Sets active user session, navigates to `/post` (or `/admin` for Admin quick demo) |
| Auth | Register | `AuthPage.tsx` | Uses canonical `displayName`, email validation, password >= 8 chars | Creates `CUSTOMER` user + 10 empty draft slots |
| Auth | Logout | `LayoutShell.tsx` | Authenticated | Clears active user session & user-scoped state, redirects to `/login` |
| Auth | Change Password | `ChangePasswordModal.tsx` | Current password + min 8 chars + confirm match | Updates session password in DEMO store |
| Composer | Edit Draft Slot (1..10) | `PostComposerPage.tsx` | Slot `1..10`; never auto-reselects unchecked drafts | Saves `content`, `linkUrl`, `media[]` to `Post(status='DRAFT')`; persists binaries to IndexedDB `demoMediaStorage` |
| Composer | Assign Destinations per Draft | `PostComposerPage.tsx` | Per-draft `groupIdsByDraftId` / `pageIdsByDraftId` mapping | Each checked draft maps to its own destinations (never implicit Cartesian product); optional explicit copy-to-selected action |
| Composer | Save Template / Load Template | `PostComposerPage.tsx` | Valid text OR link OR ready media | Creates/loads `Post(status='SAVED')` with full `media[]` references |
| Composer | Add / Edit / Delete Group | `GroupFormModal.tsx` | Valid `facebook.com/groups/...`, dedupe URL & UID, `Plan.maxSavedGroups` quota | Immediately updates reactive `groups` slice via immutable snapshot |
| Composer | Import / Export CSV | `CsvImportModal.tsx` | Header check (`group_name,group_url`), RFC-4180 parse, formula injection escape, `maxSavedGroups` check | Imports only `VALID` rows; exports selected groups (or visible if none selected) |
| Composer | Create / Rename / Delete Collection | `CollectionModal.tsx` | >= 1 selected group on create | Updates `GroupCollection` & `GroupCollectionItem`; deleting collection keeps groups |
| Composer | Create Publishing Task | `ConfirmPublishModal.tsx` | Active subscription (`expiresAt > now`), `Plan.maxScheduledTasks` (only when `scheduledAt != null`), valid drafts, future `scheduledAt`, `canPublish=true` for Pages, `idempotencyKey` | Creates `PublishingTask` with exact per-draft `(postId, dest)` item snapshots; immediately visible on Dashboard |
| Tasks | Pause / Resume / Reschedule / Cancel | `TaskDrawer.tsx` | Strict state machine guards + active subscription on Resume/Reschedule | Transitions task via `taskStatus.ts`; Cancel frees `SCHEDULED` quota & marks `PROCESSING` as `NEEDS_REVIEW` |
| Tasks | Due Scheduled Trigger *(DEMO)* | `TaskDrawer.tsx` | `IS_DEMO_MODE`, `task.status === 'SCHEDULED'` | Moves to `WAITING_CONFIRMATION`/`QUEUED` if sub active; or `FAILED (SUBSCRIPTION_EXPIRED)` if expired |
| Tasks | Confirm Item Result | `TaskDrawer.tsx`, `ExtensionPopupPage.tsx` | `MANUAL_GROUP` only; rejects `META_PAGE_API`, future `SCHEDULED`, `PAUSED`, `CANCELLED`, and terminal overwrites | Updates single `PublishingTaskItem` (`confirmationType='USER'`), recomputes parent `TaskStatus` immediately |
| Tasks | Retry Item / Retry All Failed | `TaskDrawer.tsx` | `item.status === 'FAILED'` only (rejects `NEEDS_REVIEW`), active subscription | Increments `attemptCount`, moves item back to `WAITING_CONFIRMATION`/`PENDING` |
| Accounts | Add Manual Profile / Demo OAuth | `ConnectAccountModal.tsx` | `Plan.maxFacebookAccounts` quota; Demo OAuth gated by `IS_DEMO_MODE` | Creates `MANUAL_PROFILE (UNVERIFIED)` or `META_OAUTH (CONNECTED)` demo profile |
| Accounts | Refresh / Disconnect Account | `AccountsPage.tsx` | Owner check; checks `res.ok` | Refresh preserves actual status; Disconnect sets `status='DISCONNECTED'` |
| Devices | Check Connection / Revoke Device | `AccountsPage.tsx` | Blocks check on `REVOKED` devices; checks `res.ok` | Updates `lastSeenAt` or sets `revokedAt` permanently |
| Billing | Create / Check / Cancel Order | `PricingPage.tsx` | Active plan; classifies `PURCHASE` / `RENEWAL` / `CHANGE_PLAN` | Creates `PENDING` order; Check NEVER auto-marks `PAID` (only expires overdue orders) |
| Admin | Update User Role / Lock | `AdminPage.tsx` | `ADMIN` role; blocks self-lock & self-demote | Updates `User.role` / `User.status` + records `AuditLog` |
| Admin | Create / Edit Plan | `AdminPage.tsx` | `ADMIN` role; canonical `Plan` fields only; unique `code`; limits >= 1 | Immediately syncs `plans` / `activePlans` to `/pricing` |
| Admin | Confirm Payment *(DEMO)* | `AdminPage.tsx` | `ADMIN` + `IS_DEMO_MODE`; rejects `PAID`/`EXPIRED`; `RENEWAL` extends from `expiresAt`; `CHANGE_PLAN` requires checkbox acknowledgment | Marks order `PAID`, updates `Subscription`, writes `AuditLog` |
