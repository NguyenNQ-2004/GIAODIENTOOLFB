# Task & TaskItem State Machine Specification

Single source of truth: `src/utils/taskStatus.ts`.

## Canonical Enums
- **TaskStatus (10)**: `SCHEDULED | QUEUED | RUNNING | WAITING_CONFIRMATION | PAUSED | COMPLETED | PARTIAL_FAILED | FAILED | NEEDS_REVIEW | CANCELLED`
- **TaskItemStatus (7)**: `PENDING | PROCESSING | WAITING_CONFIRMATION | SUCCESS | FAILED | NEEDS_REVIEW | CANCELLED`

## Aggregation Rules (`deriveTaskStatus`)
1. If explicitly cancelled and no active work remains: `NEEDS_REVIEW` if any item is `NEEDS_REVIEW`, otherwise `CANCELLED`.
2. If paused and active work remains (`PENDING`, `PROCESSING`, or `WAITING_CONFIRMATION` > 0): `PAUSED`.
3. Active states:
   - Any `PROCESSING` -> `RUNNING`
   - Any `WAITING_CONFIRMATION` -> `WAITING_CONFIRMATION`
   - Any `PENDING` -> `SCHEDULED` (when `isScheduledFuture` and no completed/failed/review items yet), else `RUNNING` (if partial progress exists) or `QUEUED`.
4. All items terminal:
   - All `CANCELLED` -> `CANCELLED`
   - Any `NEEDS_REVIEW` -> `NEEDS_REVIEW`
   - All `SUCCESS` -> `COMPLETED`
   - All `FAILED` -> `FAILED`
   - Mix of `SUCCESS` and (`FAILED` or `CANCELLED`) -> `PARTIAL_FAILED`
   - Mix of `FAILED` and `CANCELLED` -> `FAILED`

## Transition Rules
- **Pause (`pauseTask`)**: Eligible on `SCHEDULED | QUEUED | RUNNING | WAITING_CONFIRMATION` -> sets `PAUSED`.
- **Resume (`resumeTask`)**: Eligible on `PAUSED` -> recomputes active status from items and future `scheduledAt`.
- **Cancel (`cancelTask`)**:
  - `PENDING` / `WAITING_CONFIRMATION` -> `CANCELLED`
  - `PROCESSING` -> `NEEDS_REVIEW` (`errorCode: 'CANCELLED_IN_FLIGHT'`)
  - `SUCCESS` / `FAILED` / `NEEDS_REVIEW` / `CANCELLED` -> preserved unchanged.
- **Confirm Item (`confirmTaskItem`)**: Updates only the target `itemId` (`SUCCESS | FAILED | NEEDS_REVIEW`, `confirmationType: 'USER'`), never blindly completes other items; recomputes parent `TaskStatus`.
- **Retry Item (`retryTaskItem`)**: Eligible ONLY for `item.status === 'FAILED'`; increments `attemptCount`, clears `errorCode`/`errorMessage`, moves item back to `WAITING_CONFIRMATION` (for `MANUAL_GROUP`) or `PENDING` (for `META_PAGE_API`).
