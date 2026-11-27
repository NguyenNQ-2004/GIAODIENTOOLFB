import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import type { PublishingTaskItem, TaskItemStatus } from '../types/domain';
import { formatVietnamDateTime } from '../utils/dateTime';
import {
  canCancelTask,
  canConfirmItem,
  canPauseTask,
  canResumeTask,
  canRetryItem,
  getTaskProgress,
  TASK_ITEM_STATUS_META,
  TASK_STATUS_META,
} from '../utils/taskStatus';
import { ConfirmDialog } from './ConfirmDialog';

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ taskId, onClose }) => {
  const {
    tasks,
    accounts,
    pauseTask,
    resumeTask,
    cancelTask,
    confirmTaskItem,
    retryTaskItem,
    retryFailedItems,
    addToast,
  } = useApp();

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmingItem, setConfirmingItem] = useState<PublishingTaskItem | null>(null);
  const [itemOutcome, setItemOutcome] = useState<
    Extract<TaskItemStatus, 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW'>
  >('SUCCESS');
  const [resultPostUrl, setResultPostUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const task = taskId ? tasks.find((t) => t.id === taskId) ?? null : null;

  useEffect(() => {
    if (!taskId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmingItem) {
          setConfirmingItem(null);
        } else if (!confirmCancelOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [taskId, confirmingItem, confirmCancelOpen, onClose]);

  if (!taskId || !task) return null;

  const progress = getTaskProgress(task.items);
  const statusMeta = TASK_STATUS_META[task.status];
  const account = accounts.find((a) => a.id === task.facebookAccountId) ?? null;

  const openConfirmModal = (item: PublishingTaskItem) => {
    setConfirmingItem(item);
    setItemOutcome('SUCCESS');
    setResultPostUrl(item.resultPostUrl ?? '');
    setErrorMessage(item.errorMessage ?? '');
  };

  const handleSubmitItemConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingItem) return;
    const res = confirmTaskItem({
      taskId: task.id,
      itemId: confirmingItem.id,
      status: itemOutcome,
      resultPostUrl: itemOutcome === 'SUCCESS' ? resultPostUrl.trim() || null : null,
      errorMessage: itemOutcome !== 'SUCCESS' ? errorMessage.trim() || null : null,
    });
    if (!res.ok) {
      addToast('error', 'Không thể xác nhận mục', res.error);
      return;
    }
    addToast(
      'success',
      'Đã cập nhật kết quả mục đăng',
      `${confirmingItem.destinationNameSnapshot} → ${TASK_ITEM_STATUS_META[itemOutcome].label}`
    );
    setConfirmingItem(null);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex justify-end bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-drawer-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="task-drawer-title" className="text-base font-bold text-slate-900">
                Chi tiết tác vụ
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1 truncate">ID: {task.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết tác vụ"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">Hồ sơ Facebook</p>
              <p className="font-semibold text-slate-900 mt-0.5 truncate">
                {account ? account.displayName : 'Không gán hồ sơ'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">Chế độ thực thi</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {task.executionMode === 'MANUAL_GROUP' ? 'Nhóm (Thủ công)' : 'Fanpage (Meta API)'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">
                {task.scheduledAt ? 'Lịch đăng (GMT+7)' : 'Tạo lúc (GMT+7)'}
              </p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatVietnamDateTime(task.scheduledAt ?? task.createdAt)}
              </p>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Tiến độ tổng hợp ({progress.completed}/{progress.total} thành công)
              </span>
              <span className="font-mono font-bold text-blue-700">{progress.progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
              <span>Thành công: <strong>{progress.completed}</strong></span>
              <span>Chờ xác nhận: <strong>{progress.waitingConfirmation}</strong></span>
              <span>Chờ xử lý: <strong>{progress.pending}</strong></span>
              <span>Thất bại: <strong className="text-rose-600">{progress.failed}</strong></span>
              <span>Cần kiểm tra: <strong className="text-purple-700">{progress.needsReview}</strong></span>
              <span>Đã hủy: <strong>{progress.cancelled}</strong></span>
            </div>
          </div>

          {/* Task-level Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {canPauseTask(task) && (
              <button
                type="button"
                onClick={() => {
                  pauseTask(task.id);
                  addToast('info', 'Đã tạm dừng tác vụ', 'Trạng thái đã chuyển sang Tạm dừng (PAUSED).');
                }}
                className="h-9 px-3.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">pause</span>
                Tạm dừng
              </button>
            )}
            {canResumeTask(task) && (
              <button
                type="button"
                onClick={() => {
                  resumeTask(task.id);
                  addToast('success', 'Đã tiếp tục tác vụ');
                }}
                className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                Tiếp tục tác vụ
              </button>
            )}
            {progress.failed > 0 && (
              <button
                type="button"
                onClick={() => {
                  const res = retryFailedItems(task.id);
                  if (res.ok) {
                    addToast(
                      'success',
                      `Đã đưa ${progress.failed} mục thất bại vào hàng chờ thử lại`
                    );
                  } else {
                    addToast('error', 'Không thể thử lại', res.error);
                  }
                }}
                className="h-9 px-3.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Thử lại tất cả mục lỗi ({progress.failed})
              </button>
            )}
            {canCancelTask(task) && (
              <button
                type="button"
                onClick={() => setConfirmCancelOpen(true)}
                className="h-9 px-3.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Hủy tác vụ
              </button>
            )}
          </div>

          {/* Per-Item List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Danh sách từng mục đăng ({task.items.length})
            </h3>
            {task.items.map((item, idx) => {
              const itemMeta = TASK_ITEM_STATUS_META[item.status];
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                        <p className="text-sm font-bold text-slate-900">
                          {item.destinationNameSnapshot}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${itemMeta.badgeClass}`}
                        >
                          {itemMeta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>Lần thử: <strong>{item.attemptCount}</strong></span>
                        {item.confirmationType && (
                          <span>
                            Nguồn xác nhận:{' '}
                            <strong>
                              {item.confirmationType === 'USER' ? 'Người dùng' : 'API'}
                            </strong>
                          </span>
                        )}
                        {item.finishedAt && (
                          <span>Hoàn tất: {formatVietnamDateTime(item.finishedAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={item.destinationUrlSnapshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                        title="Mở đích đăng trên Facebook (không tự đánh dấu thành công)"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        Mở đích
                      </a>
                      {canConfirmItem(item) && (
                        <button
                          type="button"
                          onClick={() => openConfirmModal(item)}
                          className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">fact_check</span>
                          Xác nhận
                        </button>
                      )}
                      {canRetryItem(item) && (
                        <button
                          type="button"
                          onClick={() => {
                            const res = retryTaskItem(task.id, item.id);
                            if (res.ok) {
                              addToast('success', 'Đã đưa mục vào thử lại', item.destinationNameSnapshot);
                            } else {
                              addToast('error', 'Không thể thử lại', res.error);
                            }
                          }}
                          className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[15px]">refresh</span>
                          Thử lại
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Immutable Snapshot Preview */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Bản chụp nội dung (Snapshot bất biến)
                    </p>
                    <p className="whitespace-pre-line leading-relaxed">
                      {item.contentSnapshot || '(Bài viết không có văn bản)'}
                    </p>
                    {item.linkSnapshot && (
                      <p className="text-[11px] text-blue-700 break-all">
                        Link: {item.linkSnapshot}
                      </p>
                    )}
                    {item.mediaSnapshots.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Đính kèm: {item.mediaSnapshots.length} tệp media (
                        {item.mediaSnapshots.map((m) => m.originalName).join(', ')})
                      </p>
                    )}
                  </div>

                  {item.resultPostUrl && (
                    <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                      <span className="truncate">Link bài đăng: {item.resultPostUrl}</span>
                      <a
                        href={item.resultPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline shrink-0"
                      >
                        Xem bài
                      </a>
                    </div>
                  )}

                  {item.errorMessage && (
                    <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      <span className="font-bold">
                        {item.errorCode ? `[${item.errorCode}] ` : ''}
                      </span>
                      {item.errorMessage}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-Item Result Confirmation Modal */}
      {confirmingItem && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmingItem(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xác nhận kết quả đăng bài</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {confirmingItem.destinationNameSnapshot}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingItem(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitItemConfirmation} className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Kết quả thực tế trên Facebook
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'SUCCESS', label: 'Thành công', active: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                      { value: 'FAILED', label: 'Thất bại', active: 'border-rose-500 bg-rose-50 text-rose-800' },
                      { value: 'NEEDS_REVIEW', label: 'Cần kiểm tra', active: 'border-purple-500 bg-purple-50 text-purple-800' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setItemOutcome(opt.value)}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                        itemOutcome === opt.value
                          ? opt.active
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {itemOutcome === 'SUCCESS' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Link bài đăng sau khi đăng (tùy chọn)
                  </label>
                  <input
                    type="url"
                    value={resultPostUrl}
                    onChange={(e) => setResultPostUrl(e.target.value)}
                    placeholder="https://www.facebook.com/groups/.../posts/..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Lý do / ghi chú lỗi
                  </label>
                  <textarea
                    rows={3}
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="Ví dụ: Nhóm yêu cầu chờ duyệt hoặc không cho phép đính kèm link..."
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingItem(null)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Lưu xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Hủy tác vụ đăng bài này?"
        description="Các mục chưa xử lý sẽ chuyển sang Đã hủy; mục đang xử lý dở sẽ chuyển sang Cần kiểm tra; các mục đã thành công hoặc thất bại trước đó sẽ được giữ nguyên lịch sử."
        confirmLabel="Xác nhận hủy tác vụ"
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={() => {
          cancelTask(task.id);
          setConfirmCancelOpen(false);
          addToast('warning', 'Đã hủy tác vụ', 'Lịch sử các mục đã hoàn thành vẫn được bảo toàn.');
        }}
      />
    </div>
  );
};
