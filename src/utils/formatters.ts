import type {
  DeviceConnectionStatus,
  ExtensionDevice,
  FacebookAccount,
  FacebookGroup,
  Plan,
  PublishingTask,
  Subscription,
} from '../types/domain';
import type { PaymentOrderIntent, SubscriptionUsageSummary } from '../types/viewModels';

export const DEVICE_ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}₫`;
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function formatMemberCount(count: number | null): string {
  if (count === null || count === undefined) return 'Chưa rõ';
  return new Intl.NumberFormat('vi-VN').format(count);
}

/**
 * Computes ExtensionDevice connection status strictly from revokedAt & lastSeenAt.
 * Revoked devices can never appear CONNECTED or OFFLINE.
 */
export function computeDeviceConnectionStatus(
  device: Pick<ExtensionDevice, 'revokedAt' | 'lastSeenAt'>,
  now: Date = new Date()
): DeviceConnectionStatus {
  if (device.revokedAt) return 'REVOKED';
  if (!device.lastSeenAt) return 'OFFLINE';
  const lastSeenMs = new Date(device.lastSeenAt).getTime();
  if (Number.isNaN(lastSeenMs)) return 'OFFLINE';
  return now.getTime() - lastSeenMs <= DEVICE_ONLINE_THRESHOLD_MS ? 'CONNECTED' : 'OFFLINE';
}

export function isSubscriptionActive(
  subscription: Subscription | null | undefined,
  now: Date = new Date()
): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'ACTIVE') return false;
  const expiresMs = new Date(subscription.expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return false;
  return expiresMs > now.getTime();
}

export function classifyPaymentOrderIntent(
  currentSubscription: Subscription | null | undefined,
  targetPlanId: string,
  now: Date = new Date()
): PaymentOrderIntent {
  if (!currentSubscription || !isSubscriptionActive(currentSubscription, now)) {
    if (currentSubscription && currentSubscription.planId === targetPlanId) {
      return 'RENEWAL';
    }
    return 'PURCHASE';
  }
  if (currentSubscription.planId === targetPlanId) {
    return 'RENEWAL';
  }
  return 'CHANGE_PLAN';
}

/**
 * Official quota semantics:
 * - maxFacebookAccounts: active Facebook profiles (status !== 'DISCONNECTED')
 * - maxSavedGroups: saved groups count
 * - maxScheduledTasks: concurrent tasks currently in status === 'SCHEDULED'
 *   (NOT daily post count; immediate tasks do NOT consume this quota; cancelling frees it).
 */
export function computeSubscriptionUsage(params: {
  subscription: Subscription | null;
  plan: Plan | null;
  accounts: FacebookAccount[];
  groups: FacebookGroup[];
  tasks: PublishingTask[];
  now?: Date;
}): SubscriptionUsageSummary {
  const now = params.now ?? new Date();
  const active = isSubscriptionActive(params.subscription, now);
  const daysRemaining =
    active && params.subscription
      ? Math.max(
          0,
          Math.ceil(
            (new Date(params.subscription.expiresAt).getTime() - now.getTime()) / 86_400_000
          )
        )
      : 0;

  const scheduledTasksUsed = params.tasks.filter((t) => t.status === 'SCHEDULED').length;
  const activeAccountsCount = params.accounts.filter((a) => a.status !== 'DISCONNECTED').length;

  return {
    plan: params.plan,
    subscription: params.subscription,
    isActive: active,
    daysRemaining,
    accountsUsed: activeAccountsCount,
    accountsLimit: params.plan?.maxFacebookAccounts ?? 0,
    groupsUsed: params.groups.length,
    groupsLimit: params.plan?.maxSavedGroups ?? 0,
    scheduledTasksUsed,
    scheduledTasksLimit: params.plan?.maxScheduledTasks ?? 0,
  };
}
