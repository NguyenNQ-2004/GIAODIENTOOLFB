# Task & TaskItem State Machine Specification (V3)

Single source of truth: `src/utils/taskStatus.ts` (enforced at both UI helper layer and service layer in `src/services/mockService.ts`).

## 1. Canonical Enums
- **TaskStatus (10)**: `SCHEDULED | QUEUED | RUNNING | WAITING_CONFIRMATION | PAUSED | COMPLETED | PARTIAL_FAILED | FAILED | NEEDS_REVIEW | CANCELLED`
- **TaskItemStatus (7)**: `PENDING | PROCESSING | WAITING_CONFIRMATION | SUCCESS | FAILED | NEEDS_REVIEW | CANCELLED`
- **ExecutionMode (2)**: `MANUAL_GROUP | META_PAGE_API`

## 2. Parent Task Aggregation (`deriveTaskStatus`)
1. If explicitly cancelled and no active work remains: `NEEDS_REVIEW` if any item is `NEEDS_REVIEW`, otherwise `CANCELLED`.
2. If paused and active work remains (`PENDING`, `PROCESSING`, or `WAITING_CONFIRMATION` > 0): `PAUSED`.
3. Active states:
   - Any `PROCESSING` → `RUNNING`
   - Any `WAITING_CONFIRMATION` → `WAITING_CONFIRMATION`
   - Any `PENDING` → `SCHEDULED` (when `isScheduledFuture` and no completed/failed/review items yet), else `RUNNING` (if partial progress exists) or `QUEUED`.
4. All items terminal:
   - All `CANCELLED` → `CANCELLED`
   - Any `NEEDS_REVIEW` → `NEEDS_REVIEW`
   - All `SUCCESS` → `COMPLETED`
   - All `FAILED` → `FAILED`
   - Mix of `SUCCESS` and (`FAILED` or `CANCELLED`) → `PARTIAL_FAILED`
   - Mix of `FAILED` and `CANCELLED` → `FAILED`

## 3. Explicit Transition & Guard Matrix

| Action | Allowed Task States | Allowed Item States | ExecutionMode / Preconditions | Result | Explicitly Rejected |
|---|---|---|---|---|---|
| **Pause** (`pauseTask`) | `SCHEDULED`, `QUEUED`, `RUNNING`, `WAITING_CONFIRMATION` | Has active item (`PENDING`/`PROCESSING`/`WAITING_CONFIRMATION`) | Any | Task → `PAUSED` | `PAUSED`, `COMPLETED`, `FAILED`, `PARTIAL_FAILED`, `NEEDS_REVIEW`, `CANCELLED` |
| **Resume** (`resumeTask`) | `PAUSED` | Has active item | Active `Subscription` required | Recomputes active state (`SCHEDULED` if future `scheduledAt`, else `WAITING_CONFIRMATION`/`QUEUED`/`RUNNING`) | Non-`PAUSED` tasks or expired subscription |
| **Reschedule** (`rescheduleTask`) | `SCHEDULED`, `PAUSED` (with `scheduledAt`) | Has `PENDING` items | Future `scheduledAt`, active `Subscription` | Updates `scheduledAt`, keeps/sets `SCHEDULED` (or stays `PAUSED`) | Past `scheduledAt`, non-scheduled/terminal tasks, expired subscription |
| **Due Trigger** (`triggerDueScheduledTaskDemo`) | `SCHEDULED` | `PENDING` | Re-checks active `Subscription` | If active: `MANUAL_GROUP` → `WAITING_CONFIRMATION`; `META_PAGE_API` → `QUEUED`. If expired: items → `FAILED (SUBSCRIPTION_EXPIRED)`, task → `FAILED` | Non-`SCHEDULED` tasks |
| **Cancel** (`cancelTask`) | `SCHEDULED`, `QUEUED`, `RUNNING`, `WAITING_CONFIRMATION`, `PAUSED` | Any | Any | `PENDING`/`WAITING_CONFIRMATION` → `CANCELLED`; `PROCESSING` → `NEEDS_REVIEW (CANCELLED_IN_FLIGHT)`; terminal items preserved unchanged; frees `SCHEDULED` quota | Already terminal tasks (`COMPLETED`, `FAILED`, `PARTIAL_FAILED`, `NEEDS_REVIEW`, `CANCELLED`) |
| **Confirm Item (USER)** (`confirmTaskItem`) | `WAITING_CONFIRMATION`, `QUEUED`, `RUNNING`, `NEEDS_REVIEW`, `PARTIAL_FAILED` (NOT `SCHEDULED`, `PAUSED`, `CANCELLED`, `COMPLETED`, `FAILED`) | `WAITING_CONFIRMATION`, `NEEDS_REVIEW`, or `PENDING` (when due) | `executionMode === 'MANUAL_GROUP'` ONLY | Updates ONLY target `itemId` to `SUCCESS`/`FAILED`/`NEEDS_REVIEW` (`confirmationType='USER'`), recomputes parent `TaskStatus` | `META_PAGE_API` tasks; future `SCHEDULED` tasks; `PAUSED`/`CANCELLED` tasks; overwriting `SUCCESS`, `FAILED`, or `CANCELLED` items |
| **Retry Item** (`retryTaskItem`) | Non-`CANCELLED` | `FAILED` ONLY | Active `Subscription` required | `attemptCount += 1`, clears `errorCode`/`errorMessage`, sets `WAITING_CONFIRMATION` (`MANUAL_GROUP`) or `PENDING` (`META_PAGE_API`) | `SUCCESS`, `NEEDS_REVIEW`, `PENDING`, `PROCESSING`, `WAITING_CONFIRMATION`, `CANCELLED` items; `CANCELLED` task; expired subscription |

## 4. Chrome Extension Eligible Selection (`getEligibleExtensionSelection`)
- Returns `{ task, item }` ONLY when:
  1. `isSubscriptionActive === true`
  2. User has at least one non-`REVOKED` Extension device (`devices.some(d => d.connectionStatus !== 'REVOKED')`)
  3. Task belongs to `userId`, has `executionMode === 'MANUAL_GROUP'`, is NOT `SCHEDULED` (future), `PAUSED`, `COMPLETED`, `FAILED`, `CANCELLED`
  4. Task contains at least one item passing `canConfirmItem(task, item, now)`
- Otherwise returns `null` (UI displays honest empty state `"Không có tác vụ cần xử lý"` — NEVER falls back to `tasks[0]` or `items[0]`).
