import type {
  ExtensionDevice,
  PublishingTask,
  PublishingTaskItem,
  TaskItemStatus,
  TaskStatus,
} from '../types/domain';
import type {
  TaskItemStatusMeta,
  TaskProgress,
  TaskStatusMeta,
} from '../types/viewModels';
import { computeDeviceConnectionStatus } from './formatters';

export const TASK_STATUS_META: Record<TaskStatus, TaskStatusMeta> = {
  SCHEDULED: {
    status: 'SCHEDULED',
    label: 'Đã lên lịch',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  QUEUED: {
    status: 'QUEUED',
    label: 'Đang chờ',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
  },
  RUNNING: {
    status: 'RUNNING',
    label: 'Đang chạy',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-600',
  },
  WAITING_CONFIRMATION: {
    status: 'WAITING_CONFIRMATION',
    label: 'Chờ xác nhận',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  PAUSED: {
    status: 'PAUSED',
    label: 'Tạm dừng',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  COMPLETED: {
    status: 'COMPLETED',
    label: 'Hoàn thành',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  PARTIAL_FAILED: {
    status: 'PARTIAL_FAILED',
    label: 'Hoàn thành một phần',
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dotClass: 'bg-yellow-500',
  },
  FAILED: {
    status: 'FAILED',
    label: 'Thất bại',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  NEEDS_REVIEW: {
    status: 'NEEDS_REVIEW',
    label: 'Cần kiểm tra',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  CANCELLED: {
    status: 'CANCELLED',
    label: 'Đã hủy',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export const TASK_ITEM_STATUS_META: Record<TaskItemStatus, TaskItemStatusMeta> = {
  PENDING: {
    status: 'PENDING',
    label: 'Chờ xử lý',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  PROCESSING: {
    status: 'PROCESSING',
    label: 'Đang xử lý',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  WAITING_CONFIRMATION: {
    status: 'WAITING_CONFIRMATION',
    label: 'Chờ xác nhận',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  SUCCESS: {
    status: 'SUCCESS',
    label: 'Thành công',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FAILED: {
    status: 'FAILED',
    label: 'Thất bại',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  NEEDS_REVIEW: {
    status: 'NEEDS_REVIEW',
    label: 'Cần kiểm tra',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  CANCELLED: {
    status: 'CANCELLED',
    label: 'Đã hủy',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
  },
};

export function getTaskProgress(items: PublishingTaskItem[]): TaskProgress {
  const total = items.length;
  let completed = 0;
  let failed = 0;
  let needsReview = 0;
  let cancelled = 0;
  let waitingConfirmation = 0;
  let processing = 0;
  let pending = 0;

  for (const item of items) {
    switch (item.status) {
      case 'SUCCESS':
        completed += 1;
        break;
      case 'FAILED':
        failed += 1;
        break;
      case 'NEEDS_REVIEW':
        needsReview += 1;
        break;
      case 'CANCELLED':
        cancelled += 1;
        break;
      case 'WAITING_CONFIRMATION':
        waitingConfirmation += 1;
        break;
      case 'PROCESSING':
        processing += 1;
        break;
      case 'PENDING':
        pending += 1;
        break;
    }
  }

  const finishedCount = completed + failed + needsReview + cancelled;
  const progressPercent = total === 0 ? 0 : Math.round((finishedCount / total) * 100);

  return {
    total,
    completed,
    failed,
    needsReview,
    cancelled,
    waitingConfirmation,
    processing,
    pending,
    progressPercent,
  };
}

export interface DeriveTaskStatusControl {
  isScheduledFuture?: boolean;
  isPaused?: boolean;
  isCancelled?: boolean;
}

/**
 * Single source of truth for deriving PublishingTask.status from items + control flags.
 */
export function deriveTaskStatus(
  items: PublishingTaskItem[],
  control: DeriveTaskStatusControl = {}
): TaskStatus {
  if (items.length === 0) {
    if (control.isCancelled) return 'CANCELLED';
    if (control.isPaused) return 'PAUSED';
    return control.isScheduledFuture ? 'SCHEDULED' : 'QUEUED';
  }

  const p = getTaskProgress(items);
  const hasActiveWork = p.pending > 0 || p.processing > 0 || p.waitingConfirmation > 0;

  if (control.isCancelled && !hasActiveWork) {
    if (p.needsReview > 0) return 'NEEDS_REVIEW';
    return 'CANCELLED';
  }

  if (control.isPaused && hasActiveWork) {
    return 'PAUSED';
  }

  if (p.processing > 0) {
    return 'RUNNING';
  }
  if (p.waitingConfirmation > 0) {
    return 'WAITING_CONFIRMATION';
  }
  if (p.pending > 0) {
    if (control.isScheduledFuture && p.completed === 0 && p.failed === 0 && p.needsReview === 0) {
      return 'SCHEDULED';
    }
    return p.completed > 0 || p.failed > 0 ? 'RUNNING' : 'QUEUED';
  }

  // All items are terminal
  if (p.cancelled === p.total) {
    return 'CANCELLED';
  }
  if (p.needsReview > 0) {
    return 'NEEDS_REVIEW';
  }
  if (p.completed === p.total) {
    return 'COMPLETED';
  }
  if (p.failed === p.total) {
    return 'FAILED';
  }
  if (p.completed > 0 && (p.failed > 0 || p.cancelled > 0)) {
    return 'PARTIAL_FAILED';
  }
  if (p.failed > 0 && p.cancelled > 0) {
    return 'FAILED';
  }
  return 'COMPLETED';
}

export function isTaskDue(task: PublishingTask, now: Date = new Date()): boolean {
  if (!task.scheduledAt) return true;
  const scheduledMs = new Date(task.scheduledAt).getTime();
  if (Number.isNaN(scheduledMs)) return true;
  return scheduledMs <= now.getTime();
}

export function isScheduledTaskOverdue(task: PublishingTask, now: Date = new Date()): boolean {
  return task.status === 'SCHEDULED' && Boolean(task.scheduledAt) && isTaskDue(task, now);
}

export function canRescheduleTask(task: PublishingTask): boolean {
  if (task.status !== 'SCHEDULED' && task.status !== 'PAUSED') return false;
  if (!task.scheduledAt) return false;
  return task.items.every((i) => i.status === 'PENDING');
}

export function canPauseTask(task: PublishingTask): boolean {
  return (
    task.status === 'SCHEDULED' ||
    task.status === 'QUEUED' ||
    task.status === 'RUNNING' ||
    task.status === 'WAITING_CONFIRMATION'
  );
}

export function canResumeTask(task: PublishingTask): boolean {
  return task.status === 'PAUSED';
}

export function canCancelTask(task: PublishingTask): boolean {
  return (
    task.status === 'SCHEDULED' ||
    task.status === 'QUEUED' ||
    task.status === 'RUNNING' ||
    task.status === 'WAITING_CONFIRMATION' ||
    task.status === 'PAUSED'
  );
}

export function canRetryItem(task: PublishingTask, item: PublishingTaskItem): boolean {
  if (task.status === 'PAUSED' || task.status === 'CANCELLED' || task.status === 'SCHEDULED') {
    return false;
  }
  // Strictly only FAILED items (never SUCCESS, NEEDS_REVIEW, CANCELLED, etc.)
  return item.status === 'FAILED';
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'PARTIAL_FAILED' ||
    status === 'FAILED' ||
    status === 'NEEDS_REVIEW' ||
    status === 'CANCELLED'
  );
}

export interface TransitionValidationResult {
  allowed: boolean;
  error?: string;
}

/**
 * Strict service-level guard for USER confirmation of a task item.
 * Enforces:
 * - Only MANUAL_GROUP tasks may use USER confirmation (META_PAGE_API cannot use USER confirmation).
 * - Task must not be SCHEDULED (future/not started), PAUSED, or CANCELLED.
 * - Task scheduledAt must already be due.
 * - Item cannot be SUCCESS or CANCELLED (immutable terminal outcomes).
 */
export function validateUserConfirmItem(
  task: PublishingTask,
  item: PublishingTaskItem | undefined,
  now: Date = new Date()
): TransitionValidationResult {
  if (!item) {
    return { allowed: false, error: 'Không tìm thấy mục đăng cần xác nhận.' };
  }
  if (task.executionMode === 'META_PAGE_API') {
    return {
      allowed: false,
      error:
        'Tác vụ Fanpage (META_PAGE_API) không được dùng xác nhận thủ công (USER) thay thế phản hồi Meta API.',
    };
  }
  if (task.status === 'SCHEDULED') {
    return {
      allowed: false,
      error: 'Không thể xác nhận mục thuộc tác vụ đang hẹn giờ chưa đến thời điểm thực hiện.',
    };
  }
  if (!isTaskDue(task, now)) {
    return {
      allowed: false,
      error: 'Tác vụ chưa đến thời điểm thực hiện theo lịch.',
    };
  }
  if (task.status === 'PAUSED') {
    return {
      allowed: false,
      error: 'Không thể xác nhận mục khi tác vụ đang tạm dừng (PAUSED).',
    };
  }
  if (task.status === 'CANCELLED') {
    return {
      allowed: false,
      error: 'Không thể xác nhận mục thuộc tác vụ đã hủy (CANCELLED).',
    };
  }
  if (item.status === 'SUCCESS') {
    return {
      allowed: false,
      error: 'Mục này đã ở trạng thái Thành công (SUCCESS) và không thể bị ghi đè.',
    };
  }
  if (item.status === 'CANCELLED') {
    return {
      allowed: false,
      error: 'Mục này đã bị hủy (CANCELLED) và không thể chuyển sang trạng thái khác.',
    };
  }
  if (item.status === 'FAILED') {
    return {
      allowed: false,
      error: 'Mục đang ở trạng thái Thất bại (FAILED). Vui lòng dùng thao tác Thử lại trước khi xác nhận lại.',
    };
  }
  // Allowed source states for MANUAL_GROUP user confirmation: WAITING_CONFIRMATION, PROCESSING, PENDING (when due & active), NEEDS_REVIEW
  return { allowed: true };
}

export function canConfirmItem(
  task: PublishingTask,
  item: PublishingTaskItem,
  now: Date = new Date()
): boolean {
  return validateUserConfirmItem(task, item, now).allowed;
}

export function validateRetryItem(
  task: PublishingTask,
  item: PublishingTaskItem | undefined
): TransitionValidationResult {
  if (!item) {
    return { allowed: false, error: 'Không tìm thấy mục cần thử lại.' };
  }
  if (task.status === 'PAUSED' || task.status === 'CANCELLED' || task.status === 'SCHEDULED') {
    return {
      allowed: false,
      error: 'Không thể thử lại mục khi tác vụ đang tạm dừng, đã hủy hoặc chưa đến lịch.',
    };
  }
  if (item.status === 'SUCCESS') {
    return { allowed: false, error: 'Không thể thử lại mục đã Thành công (SUCCESS).' };
  }
  if (item.status === 'NEEDS_REVIEW') {
    return {
      allowed: false,
      error: 'Mục đang ở trạng thái Cần kiểm tra (NEEDS_REVIEW) không được thử lại tự động để tránh đăng trùng.',
    };
  }
  if (item.status !== 'FAILED') {
    return {
      allowed: false,
      error: 'Chỉ có thể thử lại các mục đang ở trạng thái Thất bại (FAILED).',
    };
  }
  return { allowed: true };
}

export function pauseTask(task: PublishingTask, timestampIso: string): PublishingTask {
  if (!canPauseTask(task)) return task;
  const nextStatus = deriveTaskStatus(task.items, { isPaused: true });
  return {
    ...task,
    status: nextStatus,
    updatedAt: timestampIso,
  };
}

export function resumeTask(task: PublishingTask, timestampIso: string): PublishingTask {
  if (!canResumeTask(task)) return task;
  const isScheduledFuture =
    Boolean(task.scheduledAt) &&
    new Date(task.scheduledAt!).getTime() > new Date(timestampIso).getTime();
  const nextStatus = deriveTaskStatus(task.items, {
    isPaused: false,
    isScheduledFuture,
  });
  return {
    ...task,
    status: nextStatus,
    updatedAt: timestampIso,
  };
}

/**
 * Cancels unfinished items:
 * - PENDING / WAITING_CONFIRMATION -> CANCELLED
 * - PROCESSING (uncertain in-flight state) -> NEEDS_REVIEW
 * - SUCCESS / FAILED / NEEDS_REVIEW / CANCELLED -> preserved unchanged
 */
export function cancelTask(task: PublishingTask, timestampIso: string): PublishingTask {
  if (!canCancelTask(task)) return task;
  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (item.status === 'PENDING' || item.status === 'WAITING_CONFIRMATION') {
      return {
        ...item,
        status: 'CANCELLED',
        finishedAt: timestampIso,
        updatedAt: timestampIso,
      };
    }
    if (item.status === 'PROCESSING') {
      return {
        ...item,
        status: 'NEEDS_REVIEW',
        errorCode: 'CANCELLED_IN_FLIGHT',
        errorMessage:
          'Tác vụ bị hủy khi mục đang xử lý. Vui lòng kiểm tra trực tiếp trên Facebook.',
        finishedAt: timestampIso,
        updatedAt: timestampIso,
      };
    }
    return item;
  });

  const nextStatus = deriveTaskStatus(nextItems, { isCancelled: true });
  return {
    ...task,
    items: nextItems,
    status: nextStatus,
    finishedAt: timestampIso,
    updatedAt: timestampIso,
  };
}

export interface ConfirmItemPayload {
  itemId: string;
  status: Extract<TaskItemStatus, 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW'>;
  resultPostUrl?: string | null;
  errorMessage?: string | null;
  confirmationType?: 'USER' | 'API';
}

export function confirmTaskItem(
  task: PublishingTask,
  payload: ConfirmItemPayload,
  timestampIso: string
): PublishingTask {
  const targetItem = task.items.find((i) => i.id === payload.itemId);
  const effectiveType = payload.confirmationType ?? 'USER';

  if (effectiveType === 'USER') {
    const check = validateUserConfirmItem(task, targetItem, new Date(timestampIso));
    if (!check.allowed) return task;
  } else if (!targetItem || targetItem.status === 'SUCCESS' || targetItem.status === 'CANCELLED') {
    return task;
  }

  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (item.id !== payload.itemId) return item;
    return {
      ...item,
      status: payload.status,
      confirmationType: effectiveType,
      resultPostUrl:
        payload.status === 'SUCCESS'
          ? payload.resultPostUrl?.trim() || null
          : item.resultPostUrl,
      errorCode:
        payload.status === 'FAILED'
          ? effectiveType === 'USER'
            ? 'USER_REPORTED_FAILURE'
            : 'META_API_ERROR'
          : payload.status === 'NEEDS_REVIEW'
          ? 'MANUAL_REVIEW_REQUIRED'
          : null,
      errorMessage:
        payload.status === 'SUCCESS'
          ? null
          : payload.errorMessage?.trim() ||
            (payload.status === 'FAILED'
              ? 'Người dùng xác nhận đăng thất bại.'
              : 'Cần kiểm tra lại trạng thái bài đăng trên Facebook.'),
      attemptCount: Math.max(1, item.attemptCount),
      startedAt: item.startedAt ?? timestampIso,
      finishedAt: timestampIso,
      updatedAt: timestampIso,
    };
  });

  const isScheduledFuture =
    Boolean(task.scheduledAt) &&
    new Date(task.scheduledAt!).getTime() > new Date(timestampIso).getTime();
  const nextStatus = deriveTaskStatus(nextItems, {
    isPaused: task.status === 'PAUSED',
    isScheduledFuture,
  });

  return {
    ...task,
    items: nextItems,
    status: nextStatus,
    startedAt: task.startedAt ?? timestampIso,
    finishedAt: isTerminalTaskStatus(nextStatus) ? timestampIso : null,
    updatedAt: timestampIso,
  };
}

export function retryTaskItem(
  task: PublishingTask,
  itemId: string,
  timestampIso: string
): PublishingTask {
  const targetItem = task.items.find((i) => i.id === itemId);
  const check = validateRetryItem(task, targetItem);
  if (!check.allowed) return task;

  const retryTargetStatus: TaskItemStatus =
    task.executionMode === 'MANUAL_GROUP' ? 'WAITING_CONFIRMATION' : 'PENDING';

  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      status: retryTargetStatus,
      confirmationType: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: item.attemptCount + 1,
      finishedAt: null,
      updatedAt: timestampIso,
    };
  });

  const nextStatus = deriveTaskStatus(nextItems, { isPaused: false });
  return {
    ...task,
    items: nextItems,
    status: nextStatus,
    finishedAt: null,
    updatedAt: timestampIso,
  };
}

export function retryAllFailedItems(task: PublishingTask, timestampIso: string): PublishingTask {
  if (task.status === 'PAUSED' || task.status === 'CANCELLED' || task.status === 'SCHEDULED') {
    return task;
  }
  let retriedCount = 0;
  const retryTargetStatus: TaskItemStatus =
    task.executionMode === 'MANUAL_GROUP' ? 'WAITING_CONFIRMATION' : 'PENDING';

  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (!canRetryItem(task, item)) return item;
    retriedCount += 1;
    return {
      ...item,
      status: retryTargetStatus,
      confirmationType: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: item.attemptCount + 1,
      finishedAt: null,
      updatedAt: timestampIso,
    };
  });

  if (retriedCount === 0) return task;

  const nextStatus = deriveTaskStatus(nextItems, { isPaused: false });
  return {
    ...task,
    items: nextItems,
    status: nextStatus,
    finishedAt: null,
    updatedAt: timestampIso,
  };
}

export interface EligibleExtensionSelection {
  task: PublishingTask;
  item: PublishingTaskItem;
}

/**
 * Strict Extension Preview task & item eligibility filter.
 * NEVER falls back to tasks[0] or items[0].
 * Only returns MANUAL_GROUP tasks belonging to userId that are due, not PAUSED/CANCELLED/COMPLETED/FAILED,
 * with an active item ready for user action, while subscription is active and at least one non-revoked device exists.
 */
export function getEligibleExtensionSelection(params: {
  userId: string;
  tasks: PublishingTask[];
  devices: ExtensionDevice[];
  isSubscriptionActive: boolean;
  now?: Date;
}): EligibleExtensionSelection | null {
  const now = params.now ?? new Date();
  if (!params.isSubscriptionActive) return null;

  const hasNonRevokedDevice = params.devices.some(
    (d) => d.userId === params.userId && computeDeviceConnectionStatus(d, now) !== 'REVOKED'
  );
  if (!hasNonRevokedDevice) return null;

  const eligibleTasks = params.tasks.filter((t) => {
    if (t.userId !== params.userId) return false;
    if (t.executionMode !== 'MANUAL_GROUP') return false;
    if (
      t.status === 'SCHEDULED' ||
      t.status === 'PAUSED' ||
      t.status === 'CANCELLED' ||
      t.status === 'COMPLETED' ||
      t.status === 'FAILED'
    ) {
      return false;
    }
    if (!isTaskDue(t, now)) return false;
    return true;
  });

  for (const task of eligibleTasks) {
    const item = task.items.find(
      (i) =>
        i.status === 'WAITING_CONFIRMATION' ||
        i.status === 'PROCESSING' ||
        i.status === 'PENDING'
    );
    if (item && validateUserConfirmItem(task, item, now).allowed) {
      return { task, item };
    }
  }

  return null;
}
