/**
 * Domain models aligned with the 19-table PostgreSQL schema contract.
 * All timestamps are ISO-8601 UTC strings.
 * No out-of-scope fields (cookies, anti-checkpoint, human emulation, pingMs, IP).
 */

export type UserRole = 'CUSTOMER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FacebookConnectionType = 'META_OAUTH' | 'MANUAL_PROFILE';
export type FacebookAccountStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'EXPIRED'
  | 'ERROR'
  | 'UNVERIFIED';

export interface FacebookAccount {
  id: string;
  userId: string;
  facebookUid: string | null;
  displayName: string;
  avatarUrl: string | null;
  connectionType: FacebookConnectionType;
  status: FacebookAccountStatus;
  lastConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookPage {
  id: string;
  userId: string;
  facebookAccountId: string;
  pageUid: string;
  pageName: string;
  avatarUrl: string | null;
  pageUrl: string;
  canPublish: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FacebookGroup {
  id: string;
  userId: string;
  groupUid: string | null;
  groupName: string;
  groupUrl: string;
  avatarUrl: string | null;
  memberCount: number | null;
  requiresApproval: boolean | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupCollection {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupCollectionItem {
  collectionId: string;
  groupId: string;
  createdAt: string;
}

export type MediaType = 'IMAGE' | 'VIDEO';
export type MediaStatus = 'PENDING' | 'READY' | 'FAILED';

export interface MediaAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: MediaType;
  status: MediaStatus;
  previewUrl: string | null;
  sortOrder: number;
}

export type PostStatus = 'DRAFT' | 'SAVED';

export interface Post {
  id: string;
  userId: string;
  slotNumber: number | null; // 1..10 for DRAFT, null for SAVED
  savedName: string | null;
  content: string;
  linkUrl: string | null;
  status: PostStatus;
  media: MediaAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type TaskTargetType = 'GROUP' | 'PAGE';
export type TaskExecutionMode = 'MANUAL_GROUP' | 'META_PAGE_API';

export type TaskStatus =
  | 'SCHEDULED'
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_CONFIRMATION'
  | 'PAUSED'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'FAILED'
  | 'NEEDS_REVIEW'
  | 'CANCELLED';

export type TaskItemStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'WAITING_CONFIRMATION'
  | 'SUCCESS'
  | 'FAILED'
  | 'NEEDS_REVIEW'
  | 'CANCELLED';

export type ConfirmationType = 'USER' | 'API';

export interface PublishingTaskItem {
  id: string;
  taskId: string;
  sourcePostId: string | null;
  groupId: string | null;
  pageId: string | null;
  contentSnapshot: string;
  linkSnapshot: string | null;
  destinationNameSnapshot: string;
  destinationUrlSnapshot: string;
  mediaSnapshots: MediaAttachment[];
  status: TaskItemStatus;
  confirmationType: ConfirmationType | null;
  resultPostUrl: string | null;
  externalPostId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingTask {
  id: string;
  userId: string;
  facebookAccountId: string | null;
  targetType: TaskTargetType;
  executionMode: TaskExecutionMode;
  scheduledAt: string | null;
  status: TaskStatus;
  idempotencyKey: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PublishingTaskItem[];
}

export interface ExtensionDevice {
  id: string;
  userId: string;
  deviceName: string;
  extensionVersion: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export type DeviceConnectionStatus = 'CONNECTED' | 'OFFLINE' | 'REVOKED';

export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type PaymentOrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type PaymentMethod = 'BANK_TRANSFER' | 'VIETQR';

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthlyVnd: number;
  priceYearlyVnd: number;
  maxFacebookAccounts: number;
  maxGroups: number;
  maxScheduledTasksPerDay: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  planId: string;
  orderCode: string;
  amountVnd: number;
  billingPeriod: BillingPeriod;
  paymentMethod: PaymentMethod;
  providerReference: string | null;
  status: PaymentOrderStatus;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
