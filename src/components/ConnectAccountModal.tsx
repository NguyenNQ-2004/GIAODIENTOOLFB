import React, { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';

interface ConnectAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export const ConnectAccountModal: React.FC<ConnectAccountModalProps> = ({ open, onClose }) => {
  const { createManualProfile, simulateDemoOAuthConnect, addToast } = useApp();
  const [tab, setTab] = useState<'oauth' | 'manual'>('oauth');
  const [displayName, setDisplayName] = useState('');
  const [facebookUid, setFacebookUid] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDisplayName('');
    setFacebookUid('');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmitOAuthDemo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = simulateDemoOAuthConnect(displayName);
    if (!res.ok) {
      setError(res.error ?? 'Không thể tạo hồ sơ Meta OAuth DEMO.');
      return;
    }
    addToast(
      'success',
      'Đã tạo hồ sơ Meta OAuth (DEMO)',
      `${res.data?.account.displayName} kèm 1 Fanpage mẫu đã được thêm.`
    );
    onClose();
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = createManualProfile({
      displayName,
      facebookUid: facebookUid.trim() || null,
    });
    if (!res.ok) {
      setError(res.error ?? 'Không thể thêm hồ sơ thủ công.');
      return;
    }
    addToast(
      'success',
      'Đã thêm hồ sơ thủ công',
      `"${res.data?.displayName}" ở trạng thái Chưa xác minh (UNVERIFIED).`
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-account-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="connect-account-title" className="text-sm font-bold text-slate-900">
              Thêm hồ sơ Facebook
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Không yêu cầu nhập mật khẩu Facebook hay cookie trình duyệt.
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
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-100">
            <button
              type="button"
              onClick={() => {
                setTab('oauth');
                setError(null);
              }}
              className={`h-8 rounded-md text-xs font-semibold transition-colors ${
                tab === 'oauth' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Meta OAuth (DEMO)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('manual');
                setError(null);
              }}
              className={`h-8 rounded-md text-xs font-semibold transition-colors ${
                tab === 'manual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Hồ sơ thủ công
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {tab === 'oauth' ? (
            <form onSubmit={handleSubmitOAuthDemo} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Chế độ DEMO / Chưa kết nối Meta OAuth thực tế</p>
                <p className="leading-relaxed">
                  Trong môi trường production, nút này sẽ chuyển hướng tới Meta OAuth chính thức để
                  cấp quyền quản lý Fanpage. Hiện tại bạn có thể tạo một hồ sơ Meta OAuth mẫu để
                  kiểm thử luồng đăng Fanpage.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên hiển thị hồ sơ mẫu <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Ví dụ: Nguyễn Văn A — Marketing"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Tạo kết nối Meta OAuth (DEMO)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitManual} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                Hồ sơ thủ công dùng để phân loại tác vụ đăng nhóm thủ công. Trạng thái mặc định là{' '}
                <strong>Chưa xác minh (UNVERIFIED)</strong> và không hỗ trợ đăng Fanpage qua API.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên hồ sơ Facebook <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Ví dụ: Hồ sơ bán hàng cá nhân"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Facebook UID (tùy chọn — để trống nếu chưa rõ)
                </label>
                <input
                  type="text"
                  value={facebookUid}
                  onChange={(e) => setFacebookUid(e.target.value)}
                  placeholder="Để trống nếu chưa có"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Thêm hồ sơ thủ công
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
