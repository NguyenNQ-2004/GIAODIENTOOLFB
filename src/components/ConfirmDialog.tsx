import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-surface-container">
        <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                variant === 'danger'
                  ? 'bg-error-container text-error'
                  : 'bg-primary-fixed text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {variant === 'danger' ? 'warning' : 'help'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-on-surface-variant leading-relaxed">{description}</p>
        </div>
        <div className="px-5 py-3 bg-surface-container-low/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-8 px-4 rounded-lg text-xs font-semibold transition-colors ${
              variant === 'danger'
                ? 'bg-error hover:bg-rose-700 text-on-error'
                : 'bg-primary-container hover:bg-primary text-on-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
