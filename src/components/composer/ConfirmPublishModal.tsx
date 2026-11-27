import React, { useEffect, useState } from 'react';
import type {
  FacebookAccount,
  Post,
  TaskExecutionMode,
  TaskTargetType,
} from '../../types/domain';
import { formatVietnamDateTime } from '../../utils/dateTime';

export interface PreviewPublishPair {
  pairKey: string;
  post: Post;
  destinationId: string;
  destinationName: string;
  destinationUrl: string;
}

interface ConfirmPublishModalProps {
  open: boolean;
  account: FacebookAccount | null;
  targetType: TaskTargetType;
  executionMode: TaskExecutionMode;
  scheduledAtIso: string | null;
  initialPairs: PreviewPublishPair[];
  onClose: () => void;
  onConfirm: (pairs: PreviewPublishPair[]) => void;
}

export const ConfirmPublishModal: React.FC<ConfirmPublishModalProps> = ({
  open,
  account,
  targetType,
  executionMode,
  scheduledAtIso,
  initialPairs,
  onClose,
  onConfirm,
}) => {
  const [pairs, setPairs] = useState<PreviewPublishPair[]>(initialPairs);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPairs(initialPairs);
    setSubmitting(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, initialPairs, onClose, submitting]);

  if (!open) return null;

  const removePair = (pairKey: string) => {
    setPairs((prev) => prev.filter((p) => p.pairKey !== pairKey));
  };

  const handleConfirm = () => {
    if (submitting || pairs.length === 0) return;
    setSubmitting(true);
    onConfirm(pairs);
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-publish-title"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 id="confirm-publish-title" className="text-sm font-bold text-slate-900">
              Xác nhận tạo tác vụ đăng bài ({pairs.length} mục)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiểm tra danh sách cặp (Bài viết × Đích đăng) trước khi tạo tác vụ mô phỏng.
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">Hồ sơ Facebook</p>
              <p className="font-semibold text-slate-900 truncate mt-0.5">
                {account ? account.displayName : 'Chưa chọn hồ sơ'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">Chế độ thực thi</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {targetType === 'GROUP'
                  ? 'Nhóm Facebook (Thủ công + Xác nhận)'
                  : 'Fanpage (Meta Page API)'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[11px] text-slate-500">Thời điểm thực hiện</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {scheduledAtIso
                  ? `${formatVietnamDateTime(scheduledAtIso)} (GMT+7)`
                  : 'Tạo tác vụ ngay'}
              </p>
            </div>
          </div>

          {/* Honest prototype note */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">
              info
            </span>
            <span>
              {executionMode === 'MANUAL_GROUP'
                ? 'Đăng lên Nhóm Facebook không dùng auto-post ẩn. Mỗi mục sẽ tạo bản chụp nội dung (snapshot) và chờ bạn mở nhóm, đăng bài và xác nhận kết quả.'
                : 'Chế độ DEMO: Tác vụ Fanpage sẽ được ghi nhận vào lịch sử mô phỏng (chưa gửi request tới Meta Graph API thực tế).'}
            </span>
          </div>

          {/* Explicit Pairs List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-800">
                Danh sách mục sẽ tạo ({pairs.length})
              </p>
              <span className="text-[11px] text-slate-500">
                Bạn có thể bỏ bớt từng cặp trước khi xác nhận
              </span>
            </div>

            {pairs.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                Đã gỡ hết tất cả các cặp. Vui lòng đóng hộp thoại và chọn lại bài viết hoặc đích đăng.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {pairs.map((pair, idx) => (
                  <div
                    key={pair.pairKey}
                    className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold">
                          {pair.post.slotNumber ? `Bài nháp #${pair.post.slotNumber}` : pair.post.savedName ?? 'Bài viết'}
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-slate-400">
                          arrow_forward
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {pair.destinationName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {pair.post.content.trim() ||
                          pair.post.linkUrl ||
                          `(${pair.post.media.length} tệp media đính kèm)`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePair(pair.pairKey)}
                      aria-label={`Gỡ cặp ${pair.destinationName}`}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Quay lại chỉnh sửa
          </button>
          <button
            type="button"
            disabled={submitting || pairs.length === 0}
            onClick={handleConfirm}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {submitting ? 'Đang tạo tác vụ...' : `Xác nhận tạo tác vụ (${pairs.length} mục)`}
          </button>
        </div>
      </div>
    </div>
  );
};
