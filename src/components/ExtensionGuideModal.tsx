import React from 'react';

interface ExtensionGuideModalProps {
  open: boolean;
  onClose: () => void;
  onOpenExtensionSimulator: () => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

export const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({
  open,
  onClose,
  onOpenExtensionSimulator,
  onNotify,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-surface-container">
        <div className="px-5 py-3.5 bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">extension</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                Cài đặt FB POST PRO Extension (Manifest V3)
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Phiên bản v1.2.4 · Hỗ trợ Chrome, Edge, Cốc Cốc, Brave
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3.5 text-xs">
          <div className="p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="font-semibold text-on-surface">
                Tải xuống gói tiện ích FB-POST-PRO-v1.2.4.zip
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Cài đặt từ Chrome Web Store hoặc giải nén trực tiếp trong Developer Mode.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="font-semibold text-on-surface">
                Mở chrome://extensions và bật Chế độ dành cho nhà phát triển
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Chọn &quot;Load unpacked&quot; (Tải tiện ích đã giải nén) và trỏ tới thư mục vừa giải nén.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <p className="font-semibold text-on-surface">
                Ghim biểu tượng Tên lửa lên thanh công cụ Chrome
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Hệ thống tự động đồng bộ 2 chiều qua WebSocket (WSS) mà không cần nhập mật khẩu Facebook.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-surface-container-low/70 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenExtensionSimulator();
            }}
            className="h-8 px-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">preview</span>
            <span>Mở mô phỏng Extension Popup</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-lg bg-surface-container text-on-surface text-xs font-medium"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onNotify('success', 'Đã bắt đầu tải gói cài đặt FB-POST-PRO-v1.2.4.zip (1.8 MB).');
                onClose();
              }}
              className="h-8 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Tải gói Extension</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
