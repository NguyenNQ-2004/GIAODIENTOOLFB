import React, { useState } from 'react';

interface ConnectAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConnectOAuth: () => void;
  onAddManual: (displayName: string, facebookUid: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

export const ConnectAccountModal: React.FC<ConnectAccountModalProps> = ({
  open,
  onClose,
  onConnectOAuth,
  onAddManual,
  onNotify,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [facebookUid, setFacebookUid] = useState('');

  if (!open) return null;

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      onNotify('warning', 'Vui lòng nhập Tên hiển thị tài khoản.');
      return;
    }
    onAddManual(displayName.trim(), facebookUid.trim());
    setDisplayName('');
    setFacebookUid('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col overflow-hidden border border-surface-container">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-on-surface leading-tight">
                Kết nối tài khoản Facebook
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono leading-none mt-0.5">
                Mã hành động: ACC-01
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Method 1: Meta Official OAuth */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-surface-container-low/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary-container">
                  verified
                </span>
                <span className="text-[13px] font-semibold text-on-surface">
                  Cách 1: Kết nối qua Meta
                </span>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-[2px] rounded">
                Khuyến nghị
              </span>
            </div>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              Xác thực OAuth chính thức từ Meta. An toàn 100%, bảo vệ tài khoản, tự động nhận diện
              danh sách Fanpage và quyền <code className="font-mono text-primary">can_publish</code>.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onConnectOAuth();
                  onClose();
                }}
                className="w-full h-9 bg-primary-container hover:bg-primary text-on-primary text-[13px] font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">passkey</span>
                <span>Tiếp tục với Facebook (Meta OAuth)</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full h-[1px] bg-surface-container" />
            <span className="absolute bg-surface-container-lowest px-2.5 text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">
              Hoặc thêm nhanh
            </span>
          </div>

          {/* Method 2: Manual Profile Creation */}
          <form id="manual-account-form" onSubmit={handleSaveManual} className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">badge</span>
              <span className="text-[13px] font-semibold text-on-surface">
                Cách 2: Thêm hồ sơ thủ công
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface font-medium flex items-center justify-between">
                <span>
                  Tên hiển thị tài khoản (display_name) <span className="text-error">*</span>
                </span>
                <span className="text-[11px] text-on-surface-variant">Bắt buộc</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Hoàng Lan Chi (Clone 02)"
                className="w-full h-8 px-3 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-on-surface font-medium flex items-center justify-between">
                <span>Facebook UID (facebook_uid)</span>
                <span className="text-[11px] text-on-surface-variant">Tùy chọn</span>
              </label>
              <input
                type="text"
                value={facebookUid}
                onChange={(e) => setFacebookUid(e.target.value)}
                placeholder="Ví dụ: 10008920194819"
                className="w-full h-8 px-3 bg-surface-container-low text-on-surface placeholder:text-on-surface-variant text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-container font-mono"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/10 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">
                info
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                <strong>Lưu ý bảo mật:</strong> Hồ sơ thêm thủ công sẽ ở trạng thái{' '}
                <span className="font-mono font-semibold">UNVERIFIED</span> (Chưa xác minh). Bạn
                sẽ cần hoàn tất xác thực thông qua Extension để bắt đầu đăng bài tự động.{' '}
                <em>Hệ thống cam kết không bao giờ yêu cầu mật khẩu hay mã 2FA.</em>
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-on-surface hover:bg-surface-container-high text-[13px] font-medium transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="manual-account-form"
            className="h-8 px-4 bg-surface-container-highest hover:bg-primary-container hover:text-on-primary text-on-surface text-[13px] rounded-lg transition-colors font-medium whitespace-nowrap"
          >
            Lưu hồ sơ thủ công
          </button>
        </div>
      </div>
    </div>
  );
};
