# Data Contract (PostgreSQL 19-Table Alignment)

Canonical TypeScript interfaces live in `src/types/domain.ts`, DTOs in `src/types/api.ts`, and derived view models in `src/types/viewModels.ts`.

## Core Entities & Normalized Fields
1. `users` -> `User`: `id, email, fullName, avatarUrl, role ('CUSTOMER'|'ADMIN'), status ('ACTIVE'|'LOCKED'), emailVerifiedAt, lastLoginAt, createdAt, updatedAt`.
2. `facebook_accounts` -> `FacebookAccount`: `id, userId, facebookUid (nullable), displayName, avatarUrl, connectionType ('META_OAUTH'|'MANUAL_PROFILE'), status ('CONNECTED'|'DISCONNECTED'|'EXPIRED'|'ERROR'|'UNVERIFIED'), lastConnectedAt, createdAt, updatedAt`.
3. `facebook_pages` -> `FacebookPage`: `id, userId, facebookAccountId, pageUid, pageName, avatarUrl, pageUrl, canPublish, createdAt, updatedAt`.
4. `groups` -> `FacebookGroup`: `id, userId, groupUid (nullable), groupName, groupUrl, avatarUrl, memberCount (nullable), requiresApproval (nullable), notes (nullable), createdAt, updatedAt`. (No `selected` or single `collectionId` field.)
5. `group_collections` -> `GroupCollection`: `id, userId, name, createdAt, updatedAt`.
6. `group_collection_items` -> `GroupCollectionItem`: `collectionId, groupId, createdAt` (many-to-many).
7. `posts` + `media_files` + `post_media` -> `Post` & `MediaAttachment`: `slotNumber (1..10 for DRAFT, null for SAVED)`, `savedName`, `content`, `linkUrl`, `status ('DRAFT'|'SAVED')`, `media: MediaAttachment[]`.
8. `publishing_tasks` -> `PublishingTask`: `id, userId, facebookAccountId, targetType ('GROUP'|'PAGE'), executionMode ('MANUAL_GROUP'|'META_PAGE_API'), scheduledAt, status (10 TaskStatus values), idempotencyKey, startedAt, finishedAt, createdAt, updatedAt, items`. (No stored `completedCount`/`totalCount` — always computed.)
9. `publishing_task_items` + `task_item_media` -> `PublishingTaskItem`: `groupId` XOR `pageId`, `contentSnapshot`, `linkSnapshot`, `destinationNameSnapshot`, `destinationUrlSnapshot`, `mediaSnapshots`, `status (7 TaskItemStatus values)`, `confirmationType ('USER'|'API'|null)`, `resultPostUrl`, `externalPostId`, `errorCode`, `errorMessage`, `attemptCount`, `startedAt`, `finishedAt`.
10. `extension_devices` -> `ExtensionDevice`: `id, userId, deviceName, extensionVersion, lastSeenAt, revokedAt, createdAt` (`connectionStatus` computed as `'CONNECTED'|'OFFLINE'|'REVOKED'`).
11. `plans`, `subscriptions`, `payment_orders`, `audit_logs` -> `Plan`, `Subscription`, `PaymentOrder`, `AuditLog`.

## Removed Out-of-Scope Fields
- Removed completely: `cookieDaysLeft`, `humanEmulation`, `minDelaySec`, `maxDelaySec`, `dailyLimitPerAccount`, `groupSyncHours`, `pingMs`, `ipAddress`, `ExtensionSettings`, `totalReach`, `instantOpenPct`, `SuperAdmin`/`Member`, `mediaCount`-only saved posts, `FacebookGroup.selected`, `FacebookGroup.collectionId`.
