export type RouteKey =
  | 'dashboard'
  | 'post'
  | 'accounts'
  | 'pricing'
  | 'admin'
  | 'extension'
  | 'auth';

export type PlanTier = 'BASIC' | 'PRO' | 'BUSINESS';
export type BillingCycle = 'monthly' | 'yearly';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export interface FacebookAccount {
  id: string;
  name: string;
  label: string;
  initials: string;
  avatarUrl?: string;
  uid: string;
  fanpageCount: number;
  status: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED' | 'ERROR';
  statusLabel: string;
  lastConnectedAgo: string;
  lastConnectedAt: string;
  cookieDaysLeft?: number;
  isManual?: boolean;
  verifiedOAuth?: boolean;
}

export interface Fanpage {
  id: string;
  name: string;
  pageId: string;
  initials: string;
  avatarUrl?: string;
  ownerAccountId: string;
  ownerAccountName: string;
  canPublish: boolean;
}

export interface ExtensionDevice {
  id: string;
  name: string;
  version: string;
  build?: string;
  icon: 'laptop_mac' | 'desktop_windows';
  status: 'CONNECTED' | 'DISCONNECTED';
  ip: string;
  browser: string;
  pingMs: number;
  lastActive: string;
}

export interface FacebookGroup {
  id: string;
  name: string;
  initials: string;
  badgeColorClass: string;
  uid: string;
  url: string;
  memberCount: number;
  requiresApproval: 'true' | 'false' | 'unknown';
  collectionId: string;
  notes?: string;
  selected: boolean;
}

export interface GroupCollection {
  id: string;
  name: string;
  colorDotClass: string;
}

export interface MediaAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  type: 'image' | 'video';
  url: string;
  alt: string;
}

export interface PostSlot {
  slotNumber: number;
  title: string;
  content: string;
  shareLink: string;
  media: MediaAttachment[];
}

export interface SavedPost {
  id: string;
  title: string;
  content: string;
  shareLink: string;
  mediaCount: number;
  updatedAt: string;
}

export type TaskStatus =
  | 'RUNNING'
  | 'WAITING_CONFIRMATION'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'CANCELLED';

export interface TaskTargetItem {
  id: string;
  groupName: string;
  groupUid: string;
  memberCountLabel: string;
  status: 'SUCCESS' | 'RUNNING' | 'WAITING_CONFIRMATION' | 'QUEUED' | 'FAILED';
  statusDetail: string;
  timestamp: string;
  permalink?: string;
}

export interface PublishingTask {
  id: string;
  status: TaskStatus;
  slotNumber: number;
  mediaType: 'images' | 'image' | 'video' | 'link';
  mediaSummary: string;
  content: string;
  accountId: string;
  accountName: string;
  accountInitials: string;
  accountRoleLabel: string;
  destinationSummary: string;
  destinationDetail: string;
  method: 'MANUAL_GROUP' | 'META_PAGE_API';
  completedCount: number;
  totalCount: number;
  scheduledLabel: string;
  subTimeLabel: string;
  calendarDay?: number;
  mediaUrls: string[];
  items: TaskTargetItem[];
  logs: { time: string; tag: string; message: string; tone: 'success' | 'info' | 'warn' | 'error' }[];
}

export interface PaymentOrder {
  id: string;
  plan: PlanTier;
  cycle: BillingCycle;
  amount: number;
  createdAt: string;
  paidAt: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  bankName?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  verified: boolean;
  role: 'Member' | 'Admin' | 'SuperAdmin';
  plan: PlanTier | 'NONE' | 'ROOT SYSTEM';
  planExpiry: string;
  fbAccountsUsed: number;
  fbAccountsMax: number;
  groupsCount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'LOCKED' | 'UNVERIFIED';
  createdAt: string;
}

export interface ExtensionSettings {
  minDelaySec: number;
  maxDelaySec: number;
  humanEmulation: boolean;
  autoPauseOnWarning: boolean;
  dailyLimitPerAccount: number;
  groupSyncHours: number;
}
