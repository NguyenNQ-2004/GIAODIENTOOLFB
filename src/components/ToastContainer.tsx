import React from 'react';
import type { ToastMessage } from '../types/viewModels';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styleMap = {
          success: {
            bg: 'bg-emerald-950 text-emerald-50 border border-emerald-700/60',
            icon: 'check_circle',
            iconColor: 'text-emerald-400',
          },
          info: {
            bg: 'bg-slate-900 text-slate-50 border border-slate-700',
            icon: 'info',
            iconColor: 'text-sky-400',
          },
          warning: {
            bg: 'bg-amber-950 text-amber-50 border border-amber-700/60',
            icon: 'warning',
            iconColor: 'text-amber-400',
          },
          error: {
            bg: 'bg-rose-950 text-rose-50 border border-rose-700/60',
            icon: 'error',
            iconColor: 'text-rose-400',
          },
        }[toast.type];

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg flex items-start gap-3 text-xs transition-all ${styleMap.bg}`}
          >
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${styleMap.iconColor}`}
            >
              {styleMap.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="opacity-85 mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
              aria-label="Đóng thông báo"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
