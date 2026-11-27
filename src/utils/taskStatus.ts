import type {
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

  // When cancelled explicitly and no active work remains
  if (control.isCancelled && !hasActiveWork) {
    if (p.needsReview > 0) return 'NEEDS_REVIEW';
    if (p.completed === 0 && p.failed === 0 && p.cancelled === p.total) {
      return 'CANCELLED';
    }
    // Preserve terminal history while flagging cancellation if all remaining were cancelled
    return 'CANCELLED';
  }

  // When paused and there is still unfinished work
  if (control.isPaused && hasActiveWork) {
    return 'PAUSED';
  }

  // Active execution states
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

  // All items are in terminal states (SUCCESS, FAILED, NEEDS_REVIEW, CANCELLED)
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

export function canRetryItem(item: PublishingTaskItem): boolean {
  return item.status === 'FAILED';
}

export function canConfirmItem(item: PublishingTaskItem): boolean {
  return (
    item.status === 'WAITING_CONFIRMATION' ||
    item.status === 'PENDING' ||
    item.status === 'PROCESSING' ||
    item.status === 'NEEDS_REVIEW'
  );
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
    Boolean(task.scheduledAt) && new Date(task.scheduledAt!).getTime() > new Date(timestampIso).getTime();
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
        errorMessage: 'Tác vụ bị hủy khi mục đang xử lý. Vui lòng kiểm tra trực tiếp trên Facebook.',
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

/**
 * Confirms a single item (never blindly marks the entire task COMPLETED unless all items are terminal).
 */
export function confirmTaskItem(
  task: PublishingTask,
  payload: ConfirmItemPayload,
  timestampIso: string
): PublishingTask {
  let matched = false;
  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (item.id !== payload.itemId) return item;
    matched = true;
    return {
      ...item,
      status: payload.status,
      confirmationType: payload.confirmationType ?? 'USER',
      resultPostUrl: payload.status === 'SUCCESS' ? (payload.resultPostUrl?.trim() || null) : item.resultPostUrl,
      errorCode:
        payload.status === 'FAILED'
          ? 'USER_REPORTED_FAILURE'
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

  if (!matched) return task;

  const isScheduledFuture =
    Boolean(task.scheduledAt) && new Date(task.scheduledAt!).getTime() > new Date(timestampIso).getTime();
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

/**
 * Retries a single FAILED item, incrementing attemptCount and moving it back to WAITING_CONFIRMATION (MANUAL_GROUP)
 * or PENDING (META_PAGE_API).
 */
export function retryTaskItem(
  task: PublishingTask,
  itemId: string,
  timestampIso: string
): PublishingTask {
  let retried = false;
  const retryTargetStatus: TaskItemStatus =
    task.executionMode === 'MANUAL_GROUP' ? 'WAITING_CONFIRMATION' : 'PENDING';

  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (item.id !== itemId || !canRetryItem(item)) return item;
    retried = true;
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

  if (!retried) return task;

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
  let retriedCount = 0;
  const retryTargetStatus: TaskItemStatus =
    task.executionMode === 'MANUAL_GROUP' ? 'WAITING_CONFIRMATION' : 'PENDING';

  const nextItems: PublishingTaskItem[] = task.items.map((item) => {
    if (!canRetryItem(item)) return item;
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
