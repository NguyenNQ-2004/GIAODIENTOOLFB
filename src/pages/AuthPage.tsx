import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IS_DEMO_MODE } from '../config/demoConfig';
import { DEMO_ACCOUNTS } from '../data/mockData';
import { useApp } from '../state/AppContext';

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface AuthPageProps {
  mode: AuthMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const { login, loginAsDemoUser, register, forgotPassword, resetPassword, addToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Always empty defaults — NEVER prefill passwords
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState(searchParams.get('token') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [forgotTokenPreview, setForgotTokenPreview] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login({ email, password, rememberMe });
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Đăng nhập thất bại.');
      return;
    }
    addToast('success', 'Đăng nhập thành công (DEMO)', `Xin chào ${res.data.displayName}.`);
    navigate(res.data.role === 'ADMIN' ? '/admin' : '/post', { replace: true });
  };

  const handleQuickDemoLogin = (userId: string) => {
    if (!IS_DEMO_MODE) return;
    setError(null);
    const res = loginAsDemoUser(userId);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Không thể đăng nhập tài khoản DEMO.');
      return;
    }
    addToast(
      'success',
      'Đã vào phiên DEMO',
      `Đang sử dụng tài khoản ${res.data.displayName} (${res.data.role}).`
    );
    navigate(res.data.role === 'ADMIN' ? '/admin' : '/post', { replace: true });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    const res = register({ displayName, email, password });
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Đăng ký thất bại.');
      return;
    }
    addToast(
      'success',
      'Tạo tài khoản DEMO thành công',
      'Tài khoản mới được cấp dùng thử 7 ngày gói Cơ Bản trong môi trường DEMO.'
    );
    navigate('/post', { replace: true });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = forgotPassword({ email });
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Không thể tạo yêu cầu khôi phục.');
      return;
    }
    setForgotTokenPreview(res.data.resetTokenPreview);
    addToast('info', 'Đã tạo mã khôi phục DEMO', 'Không có email thật được gửi ở chế độ prototype.');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    const res = resetPassword({ token: resetToken, newPassword: password });
    if (!res.ok) {
      setError(res.error ?? 'Không thể đặt lại mật khẩu.');
      return;
    }
    addToast('success', 'Đặt lại mật khẩu thành công', res.data?.message);
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Brand Column */}
      <div className="lg:w-[44%] bg-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px] text-white">send</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">FB POST PRO</span>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30">
                  Frontend Prototype
                </span>
              </div>
              <p className="text-xs text-slate-400">Quản lý nội dung, nhóm &amp; lịch đăng Facebook</p>
            </div>
          </div>

          <div className="mt-10 lg:mt-14 max-w-md space-y-4">
            <h1 className="text-2xl lg:text-3xl font-bold leading-snug tracking-tight">
              Tổ chức bài đăng, danh sách nhóm và theo dõi kết quả trên một nền tảng thống nhất.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Soạn trước tối đa 10 bài nháp, quản lý danh sách nhóm theo bộ sưu tập, lên lịch đăng
              theo múi giờ Việt Nam (GMT+7) và xác nhận kết quả minh bạch cho từng mục.
            </p>
          </div>

          <div className="mt-8 space-y-3 max-w-md">
            {[
              {
                icon: 'edit_note',
                title: '10 khung bài nháp độc lập & thư viện bài lưu',
                desc: 'Hỗ trợ văn bản, liên kết và ảnh/video đính kèm theo từng chiến dịch.',
              },
              {
                icon: 'fact_check',
                title: 'Trạng thái tác vụ chuẩn hóa theo từng đích đăng',
                desc: 'Theo dõi rõ mục thành công, chờ xác nhận, thất bại hoặc cần kiểm tra.',
              },
              {
                icon: 'verified_user',
                title: 'Không tự động gửi bài ẩn hoặc đọc cookie trình duyệt',
                desc: 'Tôn trọng quyền kiểm soát của người dùng cho từng nhóm và Fanpage.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="material-symbols-outlined text-blue-400 text-[20px] mt-0.5 shrink-0">
                  {item.icon}
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-5 border-t border-white/10 text-[11px] text-slate-400">
          Môi trường DEMO cục bộ: Dữ liệu phiên và xác thực được mô phỏng trên trình duyệt, chưa kết
          nối máy chủ backend thực tế. Không nhập mật khẩu hoặc thông tin đăng nhập Meta/Facebook thật tại đây.
        </div>
      </div>

      {/* Right Form Column */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            {/* Mode Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {mode === 'login' && 'Đăng nhập hệ thống'}
                {mode === 'register' && 'Tạo tài khoản mới'}
                {mode === 'forgot-password' && 'Khôi phục mật khẩu'}
                {mode === 'reset-password' && 'Đặt lại mật khẩu mới'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'login' && 'Nhập thông tin tài khoản hoặc chọn tài khoản DEMO bên dưới.'}
                {mode === 'register' && 'Tạo tài khoản khách hàng mới trong môi trường DEMO.'}
                {mode === 'forgot-password' &&
                  'Nhập email đã đăng ký để nhận mã khôi phục mô phỏng.'}
                {mode === 'reset-password' && 'Nhập mã khôi phục và mật khẩu mới (tối thiểu 8 ký tự).'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Địa chỉ email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                      Mật khẩu
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ghi nhớ phiên đăng nhập trên trình duyệt này</span>
                </label>

                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  Đăng nhập
                </button>

                <p className="text-center text-xs text-slate-500 pt-1">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                    Đăng ký ngay
                  </Link>
                </p>
              </form>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tên hiển thị
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ban@domain.com"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu (tối thiểu 8 ký tự)
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  Tạo tài khoản (DEMO)
                </button>
                <p className="text-center text-xs text-slate-500 pt-1">
                  Đã có tài khoản?{' '}
                  <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                    Quay lại đăng nhập
                  </Link>
                </p>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot-password' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email tài khoản
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="customer@demo.fbpostpro.local"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  Tạo mã khôi phục (Mô phỏng)
                </button>

                {forgotTokenPreview && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                    <p className="font-semibold text-amber-900">
                      Mã khôi phục DEMO đã sẵn sàng (chưa kết nối máy chủ gửi email):
                    </p>
                    <code className="block px-2.5 py-1.5 rounded bg-white border border-amber-200 font-mono text-amber-950 select-all">
                      {forgotTokenPreview}
                    </code>
                    <Link
                      to={`/reset-password?token=${encodeURIComponent(forgotTokenPreview)}`}
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      Đi tới trang đặt lại mật khẩu
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </Link>
                  </div>
                )}

                <p className="text-center text-xs text-slate-500 pt-1">
                  <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                    Quay lại đăng nhập
                  </Link>
                </p>
              </form>
            )}

            {/* RESET PASSWORD FORM */}
            {mode === 'reset-password' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label htmlFor="reset-token" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã khôi phục
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    placeholder="demo-reset-..."
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="reset-pass" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <input
                    id="reset-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  Đặt lại mật khẩu
                </button>
                <p className="text-center text-xs text-slate-500 pt-1">
                  <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                    Quay lại đăng nhập
                  </Link>
                </p>
              </form>
            )}
          </div>

          {/* Explicit DEMO Quick Login Card (strictly gated by IS_DEMO_MODE) */}
          {mode === 'login' && IS_DEMO_MODE && (
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Đăng nhập nhanh (DEMO)
                </p>
                <span className="text-[11px] text-slate-500">Chỉ dùng cho môi trường thử nghiệm</span>
              </div>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.userId}
                    type="button"
                    onClick={() => handleQuickDemoLogin(acc.userId)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{acc.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            acc.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {acc.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{acc.email}</p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">
                      login
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                Lưu ý bảo mật DEMO: Không sử dụng mật khẩu thật. Mật khẩu mẫu:{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">Demo@1234</code>{' '}
                (Khách hàng) hoặc{' '}
                <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">Admin@1234</code>{' '}
                (Quản trị viên).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
