import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IS_DEMO_MODE, IS_DEV_OR_DEMO } from '../config/demoConfig';
import { useApp } from '../state/AppContext';

interface ExtensionGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({ open, onClose }) => {
  const { connectExtensionDevice, addToast } = useApp();
  const [deviceName, setDeviceName] = useState('');

  useEffect(() => {
    if (!open) {
      setDeviceName('');
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleAddDemoDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const res = connectExtensionDevice(deviceName);
    if (!res.ok) {
      addToast('error', 'Không thể thêm thiết bị', res.error);
      return;
    }
    addToast('success', 'Đã đăng ký thiết bị Extension (DEMO)', res.data?.deviceName);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ext-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="ext-guide-title" className="text-sm font-bold text-slate-900">
              Hướng dẫn kết nối Chrome Extension (Companion)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ sao chép nội dung, mở trang nhóm và xác nhận kết quả đăng bài thủ công.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <ol className="space-y-2.5 text-xs text-slate-700 list-decimal pl-5 leading-relaxed">
            <li>
              Cài đặt tiện ích mở rộng <strong>FB POST PRO Companion</strong> trên trình duyệt Chrome.
            </li>
            <li>
              Đăng nhập cùng tài khoản dịch vụ FB POST PRO để đồng bộ tác vụ đang chờ xác nhận.
            </li>
            <li>
              Với mỗi mục đăng nhóm: sao chép nội dung, mở nhóm Facebook, đăng bài trực tiếp và bấm{' '}
              <strong>Xác nhận kết quả</strong> trên Popup.
            </li>
          </ol>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <strong>Cam kết phạm vi hợp lệ:</strong> Extension không đọc cookie Facebook, không lấy
            token ngầm và không tự động giả lập thao tác gõ phím/bấm nút đăng ẩn.
          </div>

          {IS_DEMO_MODE && (
            <form onSubmit={handleAddDemoDevice} className="pt-2 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Thêm nhanh thiết bị mô phỏng (DEMO)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                  placeholder="Ví dụ: Chrome — Máy làm việc tại nhà"
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
                <button
                  type="submit"
                  className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0"
                >
                  Kết nối (DEMO)
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center justify-between pt-2">
            {IS_DEV_OR_DEMO ? (
              <Link
                to="/extension-preview"
                onClick={onClose}
                className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Mở màn hình xem trước Popup Extension
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            ) : (
              <span className="text-xs text-slate-500">
                Cài đặt từ Chrome Web Store sau khi triển khai Extension thật.
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
