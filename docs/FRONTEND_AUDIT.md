# Frontend Audit & Refactor Log (V1 → V3)

## V3 Acceptance Fixes (Final Handoff Baseline)
1. **P0 Reactive State Management (`AppContext.tsx` & `mockService.ts`)**:
   - Replaced mutable in-place `this.db` updates with structural-sharing immutable snapshots (`ReactiveStoreSnapshot`) + `subscribe()` consumed via React 19 `useSyncExternalStore`.
   - Slice-level `useMemo` dependencies (`[db.groups, userId]`, `[db.tasks, userId]`, `[db.plans]`, etc.) ensure every group, collection, task, item confirmation, plan price edit, and DEMO payment confirmation updates UI & open `TaskDrawer` instantaneously without browser refresh or infinite loops.
2. **P0 Canonical Database Contract Alignment**:
   - Standardized `User.displayName` (removed `fullName`), `Subscription.expiresAt` (removed `endsAt`), and `Plan` (`monthlyPriceVnd`, `yearlyPriceVnd`, `maxFacebookAccounts`, `maxSavedGroups`, `maxScheduledTasks` — removed unapproved `description` & `features` columns).
   - Added `localStorage` schema v3 envelope (`fbpostpro_demo_db_v3`) with automatic migration/reset from legacy `v1`/`v2`/corrupt storage and a dismissible banner (`schemaMigrationNotice`).
3. **P0 Official Subscription Quota Semantics**:
   - Replaced erroneous `maxScheduledTasksPerDay` / `scheduledTodayUsed` with concurrent `SCHEDULED` task quota (`maxScheduledTasks` / `scheduledTasksUsed`).
   - Immediate tasks do not consume `maxScheduledTasks`; cancelling or starting a scheduled task frees the slot; active subscription is verified on create, resume, retry, reschedule, and due trigger.
4. **P0 Post Composer Selection & Per-Draft Destination Mapping**:
   - Fixed `TEST-34`: removed auto-reselect `useEffect`, initialized selection once per user, and ensured unchecked drafts never publish.
   - Fixed `TEST-35`: replaced shared group/page checkboxes with explicit per-draft mapping (`groupIdsByDraftId`, `pageIdsByDraftId`) so Draft 1 → Group A and Draft 2 → Group B produces exactly 2 items (never implicit Cartesian product), plus an explicit optional "Áp dụng đích của bài này cho các bài đang chọn" button.
5. **P0 Persistent Media Lifecycle (`mediaStorage.ts` & `MediaPreview.tsx`)**:
   - Stored uploaded `File`/`Blob` binaries in IndexedDB (`fbpostpro_demo_media_v1`) keyed by `media.id`; stopped persisting ephemeral `blob:` URLs in `localStorage` and stopped revoking object URLs on unmount.
   - Verified `isMediaReferenced(mediaId)` across drafts, saved posts, and task item snapshots before deleting orphan blobs; rendered honest `"Tệp không còn khả dụng"` fallback when missing.
6. **P0 Strict Task State Machine & Extension Selection**:
   - Enforced transition validation in both `taskStatus.ts` and `mockService.ts` (rejecting `USER` confirms on `META_PAGE_API`, terminal overwrites, future/paused/cancelled confirms, and `NEEDS_REVIEW` retries).
   - Removed `tasks[0]`/`items[0]` fallback from `ExtensionPopupPage.tsx` via strict `getEligibleExtensionSelection`.
   - Added `rescheduleTask`, `triggerDueScheduledTaskDemo`, and `"Quá giờ lịch"` indicator for overdue `SCHEDULED` tasks.
7. **P0 Payment Order Safety & Renewal Preservation**:
   - Preserved remaining active time on `RENEWAL` (extending from `currentSub.expiresAt`), rejected already-`PAID` and `EXPIRED` orders, and added explicit policy acknowledgment guard for mid-term `CHANGE_PLAN` pending owner decision (`docs/OPEN_QUESTIONS.md`).
8. **P1 Environment / DEMO Boundary & Archival Hygiene**:
   - Centralized `IS_DEMO_MODE` / `IS_DEV_OR_DEMO` in `src/config/demoConfig.ts` to gate DEMO badges, quick logins, Reset DEMO, Admin DEMO confirm, Meta OAuth DEMO, and `/extension-preview`.
   - Archived all 8 static `/design/*.html` Stitch exports with header comments, top banners, and `/design/README.md`.

## Earlier V1/V2 Resolved Defects (Preserved)
- Removed out-of-scope cookie/human-emulation/delay/terminal features.
- Implemented `BrowserRouter` + `AuthGuard` + `AdminGuard` + user data isolation on logout/login.
- Implemented RFC-4180 CSV import preview & formula-injection-safe export, GMT+7 scheduling, dynamic calendar, and strictly 4 Admin tabs.
