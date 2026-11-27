import React, { useState } from 'react';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
  onNotify,
}) => {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) {
      onNotify('warning', 'Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPwd !== confirmPwd) {
      onNotify('error', 'Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    onClose();
    onNotify('success', 'Mật khẩu tài khoản đã được cập nhật an toàn!');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <div className="w-full max-w-[400px] bg-surface-container-lowest rounded-xl p-5 shadow-2xl flex flex-col gap-4 border border-surface-container">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-on-surface">Đổi mật khẩu</h3>
              <p className="text-[11px] text-secondary">Cập nhật thông tin đăng nhập định kỳ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface">Mật khẩu hiện tại</label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full h-8 pl-3 pr-8 bg-surface-container-low text-on-surface text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-1.5 p-1 text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showCurrent ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface">Mật khẩu mới</label>
            <div className="relative flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className="w-full h-8 pl-3 pr-8 bg-surface-container-low text-on-surface text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-1.5 p-1 text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface">Xác nhận mật khẩu mới</label>
            <div className="relative flex items-center">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full h-8 pl-3 pr-8 bg-surface-container-low text-on-surface text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-1.5 p-1 text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container text-[11px] text-secondary flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
              shield
            </span>
            <span>
              Tuyệt đối bảo mật: Mật khẩu được mã hóa an toàn trên đường truyền và máy chủ.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-8 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold flex items-center gap-1 shadow-sm hover:bg-primary"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AuthPageProps {
  onLoginSuccess: (displayName: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

type AuthTab = 'login' | 'register' | 'forgot';

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onNotify }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [loginEmail, setLoginEmail] = useState('nguyenminhanh@company.com');
  const [loginPassword, setLoginPassword] = useState('********');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [registeredEmailNotice, setRegisteredEmailNotice] = useState<string | null>(null);

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Change password modal
  const [changePwdOpen, setChangePwdOpen] = useState(false);

  const strength =
    regPassword.length === 0
      ? 0
      : regPassword.length < 6
      ? 1
      : regPassword.length < 10
      ? 2
      : 3;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onNotify('success', 'Đăng nhập thành công! Chào mừng trở lại FB POST PRO.');
      onLoginSuccess('Nguyễn Minh Anh');
    }, 500);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      onNotify('error', 'Mật khẩu và xác nhận mật khẩu không khớp!');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setRegisteredEmailNotice(regEmail);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirm('');
      onNotify('success', 'Tạo tài khoản thành công! Vui lòng kiểm tra email.');
    }, 600);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setForgotSent(true);
      setForgotEmail('');
      onNotify('info', 'Đã gửi yêu cầu khôi phục mật khẩu.');
    }, 500);
  };

  const subtitle =
    activeTab === 'login'
      ? 'Hệ sinh thái phân phối nội dung Facebook tự động hóa'
      : activeTab === 'register'
      ? 'Nền tảng xuất bản đa tài khoản tốc độ cao'
      : 'Khôi phục quyền truy cập bảng điều khiển FB POST PRO';

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface auth-pattern-bg">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 w-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
              <span className="material-symbols-outlined text-[18px]">layers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[18px] font-bold tracking-tight text-on-surface">
                FB POST PRO
              </span>
              <span className="px-1.5 py-[2px] rounded-lg bg-secondary-container text-on-secondary-container text-xs font-medium">
                v1.2.4
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span className="text-xs text-secondary">Hệ thống hoạt động 99.9%</span>
            </div>
          </div>

          <nav className="flex items-center gap-5 text-[13px]">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`transition-colors ${
                activeTab === 'login'
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`transition-colors ${
                activeTab === 'register'
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              Đăng ký
            </button>
            <button
              type="button"
              onClick={() =>
                onNotify('info', 'Hotline hỗ trợ kỹ thuật FB POST PRO 24/7: 1900 8866')
              }
              className="text-on-surface-variant hover:text-on-surface font-medium hidden sm:inline-block"
            >
              Hỗ trợ
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onLoginSuccess('Nguyễn Minh Anh')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-surface-container transition-colors text-xs font-semibold"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Vào Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full pt-20 pb-10 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[420px] my-auto flex flex-col items-center">
          {/* 3-Tab Switcher */}
          <div className="w-full mb-4 flex items-center justify-between p-1 bg-surface-container rounded-full shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-1.5 px-2.5 rounded-full text-[13px] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'login'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-1.5 px-2.5 rounded-full text-[13px] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'register'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Đăng ký</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('forgot')}
              className={`flex-1 py-1.5 px-2.5 rounded-full text-[13px] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'forgot'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface font-medium'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              <span>Khôi phục</span>
            </button>
          </div>

          {/* Auth Card */}
          <div className="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary mb-2.5 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">send</span>
              </div>
              <div className="inline-flex items-center gap-1.5 mb-1">
                <span className="text-[18px] font-bold tracking-tight text-on-surface">
                  FB POST PRO
                </span>
                <span className="px-1.5 py-[2px] rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] uppercase tracking-wider font-semibold">
                  Bản chuẩn v1.0
                </span>
              </div>
              <p className="text-xs text-secondary">{subtitle}</p>
            </div>

            {/* LOGIN VIEW */}
            {activeTab === 'login' && (
              <div className="flex flex-col">
                <div className="mb-4 text-left">
                  <h1 className="text-[20px] font-semibold text-on-surface">Đăng nhập</h1>
                  <p className="text-xs text-secondary mt-0.5">
                    Chào mừng bạn đến với FB POST PRO
                  </p>
                </div>

                {/* Error Simulation */}
                <div className="mb-4 flex flex-col gap-1.5">
                  {loginError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-error-container text-on-error-container">
                      <span className="material-symbols-outlined text-[18px] text-error shrink-0">
                        error
                      </span>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-semibold text-error">
                          Đăng nhập không thành công
                        </p>
                        <p className="text-[11px] text-error">{loginError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoginError(null)}
                        className="text-error hover:opacity-75"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 text-[11px]">
                    <span className="text-secondary">Mô phỏng lỗi:</span>
                    <button
                      type="button"
                      onClick={() => setLoginError('Email hoặc mật khẩu không chính xác.')}
                      className="text-error hover:underline"
                    >
                      Sai pass
                    </button>
                    <span className="text-outline-variant">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setLoginError('Tài khoản đã bị khóa do vi phạm chính sách hoạt động.')
                      }
                      className="text-error hover:underline"
                    >
                      Khóa tài khoản
                    </button>
                    <span className="text-outline-variant">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setLoginError(
                          'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email xác thực.'
                        )
                      }
                      className="text-error hover:underline"
                    >
                      Chưa xác minh
                    </button>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[13px] font-medium text-on-surface">Email</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full h-9 px-3 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-medium text-on-surface">Mật khẩu</label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('forgot')}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showLoginPwd ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-9 pl-3 pr-9 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPwd((v) => !v)}
                        className="absolute right-2 p-1 text-secondary hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showLoginPwd ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-9 rounded-lg bg-primary-container text-on-primary text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary transition-colors"
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        submitting ? 'animate-spin' : ''
                      }`}
                    >
                      {submitting ? 'refresh' : 'login'}
                    </span>
                    <span>{submitting ? 'Đang xác thực...' : 'Đăng nhập'}</span>
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-surface-container text-center">
                  <p className="text-xs text-secondary">
                    Chưa có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* REGISTER VIEW */}
            {activeTab === 'register' && (
              <div className="flex flex-col">
                <div className="mb-4 text-left">
                  <h1 className="text-[20px] font-semibold text-on-surface">
                    Đăng ký tài khoản mới
                  </h1>
                  <p className="text-xs text-secondary mt-0.5">
                    Bắt đầu tối ưu hóa hiệu suất đăng bài Facebook ngay hôm nay
                  </p>
                </div>

                {registeredEmailNotice && (
                  <div className="mb-4 p-3 rounded-xl bg-surface-container-high text-on-surface">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px]">
                          mark_email_read
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-[13px] font-semibold text-primary">
                          Tạo tài khoản thành công!
                        </h3>
                        <p className="text-xs text-secondary mt-1">
                          Vui lòng kiểm tra email{' '}
                          <span className="font-semibold text-on-surface">
                            {registeredEmailNotice}
                          </span>{' '}
                          để xác minh tài khoản trước khi đăng nhập.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('login')}
                          className="mt-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                          <span>Đến trang Đăng nhập</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegister} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[13px] font-medium text-on-surface">Họ và tên</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nguyễn Minh Anh"
                      className="w-full h-9 px-3 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[13px] font-medium text-on-surface">Email</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="minh.anh@example.com"
                      className="w-full h-9 px-3 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[13px] font-medium text-on-surface">Mật khẩu</label>
                    <div className="relative flex items-center">
                      <input
                        type={showRegPwd ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full h-9 pl-3 pr-9 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPwd((v) => !v)}
                        className="absolute right-2 p-1 text-secondary hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showRegPwd ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] text-secondary">
                        <span>Độ bảo mật mật khẩu</span>
                        <span
                          className={`font-semibold ${
                            strength === 1
                              ? 'text-error'
                              : strength === 2
                              ? 'text-tertiary-container'
                              : strength === 3
                              ? 'text-primary'
                              : 'text-secondary'
                          }`}
                        >
                          {strength === 0
                            ? 'Chưa nhập'
                            : strength === 1
                            ? 'Yếu'
                            : strength === 2
                            ? 'Trung bình'
                            : 'Rất mạnh'}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden flex gap-1">
                        <div
                          className={`h-full w-1/3 transition-colors ${
                            strength >= 1
                              ? strength === 1
                                ? 'bg-error'
                                : strength === 2
                                ? 'bg-tertiary-container'
                                : 'bg-primary-container'
                              : 'bg-transparent'
                          }`}
                        />
                        <div
                          className={`h-full w-1/3 transition-colors ${
                            strength >= 2
                              ? strength === 2
                                ? 'bg-tertiary-container'
                                : 'bg-primary-container'
                              : 'bg-transparent'
                          }`}
                        />
                        <div
                          className={`h-full w-1/3 transition-colors ${
                            strength >= 3 ? 'bg-primary-container' : 'bg-transparent'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[13px] font-medium text-on-surface">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showRegConfirm ? 'text' : 'password'}
                        required
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full h-9 pl-3 pr-9 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirm((v) => !v)}
                        className="absolute right-2 p-1 text-secondary hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showRegConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-2 text-[11px] text-secondary cursor-pointer select-none mt-1">
                    <input type="checkbox" required className="w-4 h-4 mt-0.5 accent-primary" />
                    <span>
                      Tôi đồng ý với{' '}
                      <span className="text-primary font-medium">Điều khoản dịch vụ</span> và{' '}
                      <span className="text-primary font-medium">Chính sách bảo mật</span> của FB
                      POST PRO.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-9 mt-1 rounded-lg bg-primary-container text-on-primary text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
                  </button>
                </form>

                <div className="mt-4 pt-3 border-t border-surface-container text-center">
                  <p className="text-xs text-secondary">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-primary font-semibold hover:underline"
                    >
                      Đăng nhập
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* FORGOT PASSWORD VIEW */}
            {activeTab === 'forgot' && (
              <div className="flex flex-col">
                <div className="mb-4 text-left">
                  <h1 className="text-[20px] font-semibold text-on-surface">Khôi phục mật khẩu</h1>
                  <p className="text-xs text-secondary mt-0.5">
                    Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu
                  </p>
                </div>

                {forgotSent && (
                  <div className="mb-4 p-3 rounded-xl bg-surface-container-high text-on-surface text-left">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                        mail
                      </span>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-on-surface">
                          Kiểm tra hộp thư của bạn
                        </p>
                        <p className="text-[11px] text-secondary mt-1">
                          Nếu email tồn tại trong hệ thống, chúng tôi đã gửi đường dẫn đặt lại mật
                          khẩu trong hộp thư. Vì lý do bảo mật, chúng tôi không tiết lộ trạng thái
                          tài khoản.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleForgot} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[13px] font-medium text-on-surface">
                      Email tài khoản
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full h-9 px-3 bg-surface-container-low text-on-surface text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-9 rounded-lg bg-primary-container text-on-primary text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>
                      {submitting ? 'Đang xử lý yêu cầu...' : 'Gửi hướng dẫn đặt lại mật khẩu'}
                    </span>
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-surface-container text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="inline-flex items-center gap-1.5 text-[13px] text-secondary hover:text-on-surface font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>Quay lại đăng nhập</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Contract 10.5 Change Password Test Helper */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-secondary text-[11px]">
            <span>Tiện ích kiểm thử Contract 10.5:</span>
            <button
              type="button"
              onClick={() => setChangePwdOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-semibold transition-colors shadow-sm inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">lock_reset</span>
              <span>Xem trước Modal Đổi mật khẩu (/change-password)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest/80 backdrop-blur-md shadow-[0_-1px_6px_rgba(0,0,0,0.02)] py-3">
        <div className="w-full px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-secondary">
          <span>© 2024 FB POST PRO. Nền tảng tự động hóa đăng bài Facebook chuyên nghiệp.</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
              Mã hóa SSL 256-bit
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">
                verified_user
              </span>
              Cam kết bảo mật dữ liệu
            </span>
            <button
              type="button"
              onClick={() => onNotify('info', 'Tổng đài hỗ trợ kỹ thuật Zalo/Hotline: 1900 8866')}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-[14px]">support_agent</span>
              <span>Hotline 24/7</span>
            </button>
          </div>
        </div>
      </footer>

      <ChangePasswordModal
        open={changePwdOpen}
        onClose={() => setChangePwdOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
};
