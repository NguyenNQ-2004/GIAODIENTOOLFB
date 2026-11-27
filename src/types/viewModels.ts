import type {
  DeviceConnectionStatus,
  ExtensionDevice,
  FacebookAccount,
  Plan,
  PublishingTask,
  Subscription,
  TaskItemStatus,
  TaskStatus,
  User,
} from './domain';

/**
 * UI-only view models and derived state shapes.
 */

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

export interface TaskProgress {
  total: number;
  completed: number;
  failed: number;
  needsReview: number;
  cancelled: number;
  waitingConfirmation: number;
  processing: number;
  pending: number;
  progressPercent: number;
}

export interface TaskStatusMeta {
  status: TaskStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export interface TaskItemStatusMeta {
  status: TaskItemStatus;
  label: string;
  badgeClass: string;
}

export interface DeviceViewModel extends ExtensionDevice {
  connectionStatus: DeviceConnectionStatus;
}

export interface SubscriptionUsageSummary {
  plan: Plan | null;
  subscription: Subscription | null;
  isActive: boolean;
  daysRemaining: number;
  accountsUsed: number;
  accountsLimit: number;
  groupsUsed: number;
  groupsLimit: number;
  scheduledTodayUsed: number;
  scheduledTodayLimit: number;
}

export interface AdminUserRowViewModel {
  user: User;
  subscription: Subscription | null;
  plan: Plan | null;
  accountsCount: number;
  groupsCount: number;
  tasksCount: number;
}

export interface TaskWithAccountViewModel {
  task: PublishingTask;
  account: FacebookAccount | null;
  progress: TaskProgress;
}

export type ExtensionPreviewScenario =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED_IDLE'
  | 'WAITING_CONFIRMATION'
  | 'RUNNING'
  | 'OFFLINE'
  | 'REVOKED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'CONNECTION_ERROR';
