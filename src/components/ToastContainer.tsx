import React from 'react';
import { ToastMessage } from '../types/app';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const styleMap = {
          success: {
            bg: 'bg-emerald-950 text-emerald-50 border border-emerald-700/60',
            icon: 'check_circle',
            iconColor: 'text-emerald-400',
          },
          info: {
            bg: 'bg-inverse-surface text-inverse-on-surface border border-primary/40',
            icon: 'info',
            iconColor: 'text-primary-fixed',
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
            className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-xs font-medium transition-all ${styleMap.bg}`}
          >
            <span className={`material-symbols-outlined text-[18px] shrink-0 ${styleMap.iconColor}`}>
              {styleMap.icon}
            </span>
            <span className="flex-1 leading-relaxed">{toast.message}</span>
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
