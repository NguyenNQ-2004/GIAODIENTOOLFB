import React, { useEffect } from 'react';
import { PublishingTask } from '../types/app';
import { SafeImage } from './SafeImage';

interface TaskDrawerProps {
  task: PublishingTask | null;
  onClose: () => void;
  onPauseResume: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onRetryFailed: (taskId: string) => void;
  onConfirmWaiting: (taskId: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

const STATUS_BADGE: Record<
  PublishingTask['status'],
  { label: string; badgeClass: string }
> = {
  RUNNING: { label: 'ĐANG CHẠY', badgeClass: 'bg-blue-100 text-primary-container' },
  WAITING_CONFIRMATION: { label: 'CHỜ DUYỆT', badgeClass: 'bg-amber-100 text-amber-900' },
  SCHEDULED: { label: 'CHỜ TỚI GIỜ', badgeClass: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: 'HOÀN THÀNH', badgeClass: 'bg-emerald-100 text-emerald-800' },
  PARTIAL_FAILED: { label: 'LỖI MỘT PHẦN', badgeClass: 'bg-rose-100 text-rose-800' },
  CANCELLED: { label: 'ĐÃ HỦY', badgeClass: 'bg-surface-container text-secondary' },
};

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  task,
  onClose,
  onPauseResume,
  onCancelTask,
  onRetryFailed,
  onConfirmWaiting,
  onNotify,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && task) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  const badge = STATUS_BADGE[task.status];
  const progressPct =
    task.totalCount > 0 ? Math.round((task.completedCount / task.totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 h-full w-full max-w-[560px] bg-surface-container-lowest shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="text-lg font-bold text-on-surface leading-tight font-mono">
                #{task.id}
              </span>
              <span
                className={`text-[11px] px-space-xs py-[2px] rounded font-semibold uppercase ${badge.badgeClass}`}
              >
                {badge.label}
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant mt-[2px]">
              Chi tiết tiến trình phân phối và nhật ký xuất bản
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            title="Đóng ngăn chi tiết"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-space-xl flex flex-col gap-space-lg">
          {/* Summary Card */}
          <div className="bg-surface-container-low/60 rounded-xl p-space-md flex flex-col gap-space-sm">
            <div className="grid grid-cols-2 gap-space-sm text-[11px]">
              <div>
                <span className="text-on-surface-variant block">Tài khoản thực thi:</span>
                <span className="font-semibold text-on-surface text-[13px]">
                  {task.accountName}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Phương thức đăng:</span>
                <span className="font-semibold text-on-surface text-[13px]">
                  {task.method === 'MANUAL_GROUP'
                    ? 'Chrome Extension (MANUAL_GROUP)'
                    : 'Fanpage Graph API (META_PAGE_API)'}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Thời gian lên lịch:</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  {task.scheduledLabel}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block">Độ trễ giãn cách:</span>
                <span className="font-semibold text-primary font-mono">
                  45s - 90s (An toàn)
                </span>
              </div>
            </div>

            <div className="mt-space-xs pt-space-xs">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-on-surface">Tiến độ xuất bản tổng thể</span>
                <span className="text-primary-container tabular-nums">
                  {task.completedCount} / {task.totalCount} nhóm hoàn thành ({progressPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content Snapshot */}
          <div className="flex flex-col gap-space-xs">
            <span className="text-[13px] font-semibold text-on-surface">
              Nội dung bài viết đã cấu hình
            </span>
            <div className="bg-surface rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm border border-surface-container">
              <p className="text-[13px] text-on-surface leading-relaxed whitespace-pre-line">
                {task.content}
              </p>
              {task.mediaUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {task.mediaUrls.slice(0, 3).map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-square bg-surface-container-high rounded-lg overflow-hidden relative"
                    >
                      <SafeImage
                        src={url}
                        alt={`Ảnh đính kèm ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  <div className="aspect-square bg-surface-container-high rounded-lg overflow-hidden flex items-center justify-center font-bold text-on-surface-variant text-xs">
                    +{Math.max(1, task.mediaUrls.length - 2)} ảnh
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Items Breakdown */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-on-surface">
                Danh sách nhóm mục tiêu ({task.items.length})
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Tự động kiểm tra link sau khi đăng
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              {task.items.map((item) => {
                const isSuccess = item.status === 'SUCCESS';
                const isRunning = item.status === 'RUNNING';
                const isFailed = item.status === 'FAILED';
                const isWaiting = item.status === 'WAITING_CONFIRMATION';

                return (
                  <div
                    key={item.id}
                    className={`p-space-sm rounded-xl flex items-center justify-between gap-2 ${
                      isRunning
                        ? 'bg-blue-50/70'
                        : isFailed
                        ? 'bg-rose-50/70'
                        : isWaiting
                        ? 'bg-amber-50/70'
                        : 'bg-surface-container-low/50'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span
                        className={`material-symbols-outlined text-[20px] shrink-0 ${
                          isSuccess
                            ? 'text-emerald-600'
                            : isRunning
                            ? 'text-primary-container animate-spin'
                            : isFailed
                            ? 'text-rose-600'
                            : isWaiting
                            ? 'text-amber-600'
                            : 'text-secondary'
                        }`}
                      >
                        {isSuccess
                          ? 'check_circle'
                          : isRunning
                          ? 'sync'
                          : isFailed
                          ? 'error'
                          : isWaiting
                          ? 'pending'
                          : 'hourglass_empty'}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-on-surface truncate">
                          {item.groupName}
                        </span>
                        <span
                          className={`text-[11px] truncate ${
                            isSuccess
                              ? 'text-emerald-800'
                              : isRunning
                              ? 'text-primary-container'
                              : isFailed
                              ? 'text-rose-700'
                              : isWaiting
                              ? 'text-amber-800'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          {item.statusDetail}
                        </span>
                      </div>
                    </div>

                    {isSuccess ? (
                      <button
                        type="button"
                        onClick={() =>
                          onNotify(
                            'info',
                            `Mở bài viết trên Facebook: ${item.permalink || item.groupName}`
                          )
                        }
                        className="h-6 px-2 rounded bg-surface-container hover:bg-surface-container-high text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <span>Xem bài</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </button>
                    ) : isRunning ? (
                      <span className="text-[11px] font-mono text-primary-container font-semibold shrink-0">
                        Đang xử lý
                      </span>
                    ) : isFailed ? (
                      <button
                        type="button"
                        onClick={() => onRetryFailed(task.id)}
                        className="h-6 px-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0"
                      >
                        Thử lại
                      </button>
                    ) : isWaiting ? (
                      <button
                        type="button"
                        onClick={() => onConfirmWaiting(task.id)}
                        className="h-6 px-2 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold shrink-0"
                      >
                        Xác nhận
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-secondary shrink-0">
                        Xếp hàng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extension Logs */}
          <div className="flex flex-col gap-space-xs">
            <span className="text-[13px] font-semibold text-on-surface">
              Nhật ký máy khách (Chrome Extension Logs)
            </span>
            <div className="bg-inverse-surface text-inverse-on-surface p-space-sm rounded-xl font-mono text-[11px] leading-relaxed max-h-44 overflow-y-auto space-y-1">
              {task.logs.map((log, i) => (
                <p
                  key={i}
                  className={
                    log.tone === 'success'
                      ? 'text-emerald-400'
                      : log.tone === 'warn'
                      ? 'text-amber-300'
                      : log.tone === 'error'
                      ? 'text-rose-400'
                      : 'text-blue-300'
                  }
                >
                  [{log.time}] {log.tag} {log.message}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between shrink-0">
          {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' ? (
            <button
              type="button"
              onClick={() => onCancelTask(task.id)}
              className="h-8 px-space-md rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[13px] font-semibold transition-colors flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[16px]">stop_circle</span>
              <span>Hủy tác vụ</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-space-sm">
            {task.status === 'RUNNING' && (
              <button
                type="button"
                onClick={() => onPauseResume(task.id)}
                className="h-8 px-space-md rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-semibold transition-colors flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[16px]">pause</span>
                <span>Tạm dừng</span>
              </button>
            )}
            {task.status === 'PARTIAL_FAILED' && (
              <button
                type="button"
                onClick={() => onRetryFailed(task.id)}
                className="h-8 px-space-md rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold transition-colors flex items-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[16px]">replay</span>
                <span>Thử lại lượt lỗi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary text-[13px] font-semibold transition-colors"
            >
              Xong
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
