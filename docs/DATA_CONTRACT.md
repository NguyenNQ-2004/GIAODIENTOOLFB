# Data Contract V3 (Canonical TypeScript ↔ PostgreSQL Mapping)

Canonical TypeScript interfaces live in `src/types/domain.ts`, REST DTOs in `src/types/api.ts`, and UI View Models in `src/types/viewModels.ts`.
Local DEMO persistence uses schema envelope version **3** (`fbpostpro_demo_db_v3` + `fbpostpro_demo_session_user_id_v3` in `src/config/demoConfig.ts`), with automatic migration/reset and user notice when legacy v1/v2 or corrupt data is detected.

## 1. Canonical Entities & Normalized Fields

1. **`users` → `User`**: `id, email, displayName, avatarUrl (nullable), role ('CUSTOMER'|'ADMIN'), status ('ACTIVE'|'LOCKED'), emailVerifiedAt (nullable), lastLoginAt (nullable), createdAt, updatedAt`. *(Do NOT use `fullName` as a business field.)*
2. **`plans` → `Plan`**: `id, code, name, monthlyPriceVnd, yearlyPriceVnd, maxFacebookAccounts, maxSavedGroups, maxScheduledTasks, isActive, createdAt, updatedAt`. *(Strictly approved columns only — NO `description` or `features` DB columns; Pricing UI cards derive display copy from a fixed View Model using the 3 official quotas.)*
3. **`subscriptions` → `Subscription`**: `id, userId, planId, billingPeriod ('MONTHLY'|'YEARLY'), startsAt, expiresAt, status ('ACTIVE'|'EXPIRED'|'CANCELLED'), createdAt, updatedAt`. *(Do NOT use `endsAt`.)*
4. **`facebook_accounts` → `FacebookAccount`**: `id, userId, facebookUid (nullable), displayName, avatarUrl (nullable), connectionType ('META_OAUTH'|'MANUAL_PROFILE'), status ('CONNECTED'|'DISCONNECTED'|'EXPIRED'|'ERROR'|'UNVERIFIED'), lastConnectedAt (nullable), createdAt, updatedAt`.
5. **`facebook_pages` → `FacebookPage`**: `id, userId, facebookAccountId, pageUid, pageName, avatarUrl (nullable), pageUrl, canPublish, createdAt, updatedAt`.
6. **`groups` → `FacebookGroup`**: `id, userId, groupUid (nullable), groupName, groupUrl, avatarUrl (nullable), memberCount (nullable), requiresApproval (nullable), notes (nullable), createdAt, updatedAt`. *(No `selected` or single `collectionId` field.)*
7. **`group_collections` → `GroupCollection`**: `id, userId, name, createdAt, updatedAt`.
8. **`group_collection_items` → `GroupCollectionItem`**: `collectionId, groupId, createdAt` (many-to-many join).
9. **`posts` + `media_files` + `post_media` → `Post` & `MediaAttachment`**: `slotNumber (1..10 for DRAFT, null for SAVED)`, `savedName (nullable)`, `content`, `linkUrl (nullable)`, `status ('DRAFT'|'SAVED')`, `media: MediaAttachment[]`. *(In DEMO mode, binary blobs are persisted in IndexedDB `fbpostpro_demo_media_v1` keyed by `media.id`; `previewUrl` is never persisted as an ephemeral `blob:` URL.)*
10. **`publishing_tasks` → `PublishingTask`**: `id, userId, facebookAccountId (nullable), targetType ('GROUP'|'PAGE'), executionMode ('MANUAL_GROUP'|'META_PAGE_API'), scheduledAt (nullable), status (10 TaskStatus values), idempotencyKey, startedAt (nullable), finishedAt (nullable), createdAt, updatedAt, items`. *(No stored `completedCount`/`totalCount` — always computed from `items`.)*
11. **`publishing_task_items` + `task_item_media` → `PublishingTaskItem`**: `groupId` XOR `pageId`, `contentSnapshot`, `linkSnapshot (nullable)`, `destinationNameSnapshot`, `destinationUrlSnapshot`, `mediaSnapshots: MediaAttachment[]`, `status (7 TaskItemStatus values)`, `confirmationType ('USER'|'API'|null)`, `resultPostUrl (nullable)`, `externalPostId (nullable)`, `errorCode (nullable)`, `errorMessage (nullable)`, `attemptCount`, `startedAt (nullable)`, `finishedAt (nullable)`, `createdAt`, `updatedAt`.
12. **`extension_devices` → `ExtensionDevice`**: `id, userId, deviceName, extensionVersion, lastSeenAt, revokedAt (nullable), createdAt` (`connectionStatus` derived as `'CONNECTED'|'OFFLINE'|'REVOKED'`).
13. **`payment_orders` → `PaymentOrder`**: `id, userId, planId, orderCode, amountVnd, billingPeriod, paymentMethod, providerReference (nullable), status ('PENDING'|'PAID'|'FAILED'|'EXPIRED'|'CANCELLED'), paidAt (nullable), expiresAt, createdAt, updatedAt`.
14. **`audit_logs` → `AuditLog`**: `id, actorUserId, action, entityType, entityId, summary, createdAt`.

## 2. Official Quota Semantics
- `maxFacebookAccounts` (`max_facebook_accounts`): active Facebook profiles used under the plan (`status !== 'DISCONNECTED'`).
- `maxSavedGroups` (`max_saved_groups`): total saved Facebook groups in `groups` for the user.
- `maxScheduledTasks` (`max_scheduled_tasks`): number of user tasks currently in `status === 'SCHEDULED'` (concurrent scheduled queue).
  - Immediate tasks (`scheduledAt === null`) do **NOT** consume `maxScheduledTasks`.
  - Cancelling a `SCHEDULED` task immediately frees 1 slot.
  - Once a `SCHEDULED` task starts (`WAITING_CONFIRMATION`, `QUEUED`, `RUNNING`, etc.), it no longer counts toward `maxScheduledTasks`.

## 3. TypeScript `camelCase` ↔ PostgreSQL `snake_case` Mapping

| Table | TypeScript Field (`camelCase`) | PostgreSQL Column (`snake_case`) | Nullable |
|---|---|---|---|
| `users` | `displayName` | `display_name` | No |
| `users` | `avatarUrl` | `avatar_url` | Yes |
| `users` | `emailVerifiedAt` | `email_verified_at` | Yes |
| `users` | `lastLoginAt` | `last_login_at` | Yes |
| `plans` | `monthlyPriceVnd` | `monthly_price_vnd` | No |
| `plans` | `yearlyPriceVnd` | `yearly_price_vnd` | No |
| `plans` | `maxFacebookAccounts` | `max_facebook_accounts` | No |
| `plans` | `maxSavedGroups` | `max_saved_groups` | No |
| `plans` | `maxScheduledTasks` | `max_scheduled_tasks` | No |
| `plans` | `isActive` | `is_active` | No |
| `subscriptions` | `userId` | `user_id` | No |
| `subscriptions` | `planId` | `plan_id` | No |
| `subscriptions` | `billingPeriod` | `billing_period` | No |
| `subscriptions` | `startsAt` | `starts_at` | No |
| `subscriptions` | `expiresAt` | `expires_at` | No |
| `facebook_accounts` | `facebookUid` | `facebook_uid` | Yes |
| `facebook_accounts` | `displayName` | `display_name` | No |
| `facebook_accounts` | `connectionType` | `connection_type` | No |
| `facebook_accounts` | `lastConnectedAt` | `last_connected_at` | Yes |
| `facebook_pages` | `facebookAccountId` | `facebook_account_id` | No |
| `facebook_pages` | `pageUid` | `page_uid` | No |
| `facebook_pages` | `pageName` | `page_name` | No |
| `facebook_pages` | `pageUrl` | `page_url` | No |
| `facebook_pages` | `canPublish` | `can_publish` | No |
| `groups` | `groupUid` | `group_uid` | Yes |
| `groups` | `groupName` | `group_name` | No |
| `groups` | `groupUrl` | `group_url` | No |
| `groups` | `memberCount` | `member_count` | Yes |
| `groups` | `requiresApproval` | `requires_approval` | Yes |
| `group_collection_items` | `collectionId` / `groupId` | `collection_id` / `group_id` | No |
| `posts` | `slotNumber` | `slot_number` | Yes (`1..10` for `DRAFT`, `null` for `SAVED`) |
| `posts` | `savedName` | `saved_name` | Yes |
| `posts` | `linkUrl` | `link_url` | Yes |
| `media_files` | `originalName` / `mimeType` / `sizeBytes` / `mediaType` | `original_name` / `mime_type` / `size_bytes` / `media_type` | No |
| `publishing_tasks` | `facebookAccountId` | `facebook_account_id` | Yes |
| `publishing_tasks` | `targetType` / `executionMode` | `target_type` / `execution_mode` | No |
| `publishing_tasks` | `scheduledAt` / `startedAt` / `finishedAt` | `scheduled_at` / `started_at` / `finished_at` | Yes |
| `publishing_tasks` | `idempotencyKey` | `idempotency_key` | No |
| `publishing_task_items` | `taskId` / `sourcePostId` | `task_id` / `source_post_id` | No / Yes |
| `publishing_task_items` | `groupId` / `pageId` | `group_id` / `page_id` | XOR (one non-null) |
| `publishing_task_items` | `contentSnapshot` / `linkSnapshot` | `content_snapshot` / `link_snapshot` | No / Yes |
| `publishing_task_items` | `destinationNameSnapshot` / `destinationUrlSnapshot` | `destination_name_snapshot` / `destination_url_snapshot` | No |
| `publishing_task_items` | `confirmationType` | `confirmation_type` | Yes |
| `publishing_task_items` | `resultPostUrl` / `externalPostId` | `result_post_url` / `external_post_id` | Yes |
| `publishing_task_items` | `errorCode` / `errorMessage` | `error_code` / `error_message` | Yes |
| `publishing_task_items` | `attemptCount` | `attempt_count` | No |
| `extension_devices` | `deviceName` / `extensionVersion` | `device_name` / `extension_version` | No |
| `extension_devices` | `lastSeenAt` / `revokedAt` | `last_seen_at` / `revoked_at` | No / Yes |
| `payment_orders` | `orderCode` / `amountVnd` / `billingPeriod` / `paymentMethod` | `order_code` / `amount_vnd` / `billing_period` / `payment_method` | No |
| `payment_orders` | `providerReference` / `paidAt` | `provider_reference` / `paid_at` | Yes |
| `payment_orders` | `expiresAt` | `expires_at` | No |
| `audit_logs` | `actorUserId` / `entityType` / `entityId` | `actor_user_id` / `entity_type` / `entity_id` | No |
| *(all tables)* | `createdAt` / `updatedAt` | `created_at` / `updated_at` | No |

## 4. Removed Legacy / Out-of-Scope Fields
- Removed in V3: `User.fullName`, `Plan.description`, `Plan.features`, `Plan.priceMonthlyVnd`, `Plan.priceYearlyVnd`, `Plan.maxGroups`, `Plan.maxScheduledTasksPerDay`, `Subscription.endsAt`, `SubscriptionUsageSummary.scheduledTodayUsed`, `SubscriptionUsageSummary.scheduledTodayLimit`.
- Removed in V1/V2: `cookieDaysLeft`, `humanEmulation`, `minDelaySec`, `maxDelaySec`, `dailyLimitPerAccount`, `groupSyncHours`, `pingMs`, `ipAddress`, `ExtensionSettings`, `totalReach`, `instantOpenPct`, `SuperAdmin`/`Member`, `FacebookGroup.selected`, `FacebookGroup.collectionId`.
