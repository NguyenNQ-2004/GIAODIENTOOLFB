import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { ChangePasswordModal } from './ChangePasswordModal';

interface LayoutShellProps {
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const { currentUser, currentPlan, usageSummary, devices, logout, resetDemoData, addToast } =
    useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasConnectedDevice = devices.some((d) => d.connectionStatus === 'CONNECTED');
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const navItems = [
    { to: '/post', label: 'Đăng bài', icon: 'edit_square' },
    { to: '/dashboard', label: 'Tổng quan & Lịch', icon: 'calendar_month' },
    { to: '/accounts', label: 'Tài khoản', icon: 'manage_accounts' },
    { to: '/pricing', label: 'Gói dịch vụ', icon: 'workspace_premium' },
    ...(isAdmin ? [{ to: '/admin', label: 'Quản trị', icon: 'admin_panel_settings' }] : []),
  ];

  const handleLogout = () => {
    logout();
    addToast('info', 'Đã đăng xuất', 'Phiên làm việc hiện tại đã được xóa.');
    navigate('/login', { replace: true });
  };

  const initials = currentUser
    ? currentUser.fullName
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : 'U';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand + Nav */}
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/post" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[15px] tracking-tight text-slate-900">
                    FB POST PRO
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wide">
                    DEMO
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden xl:block">
                  Quản lý nội dung &amp; lịch đăng
                </p>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Điều hướng chính">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/extension-preview"
              title="Xem trước giao diện Popup Extension (chế độ dev/preview)"
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                location.pathname === '/extension-preview'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hasConnectedDevice ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <span>
                Extension: {hasConnectedDevice ? 'Đã kết nối' : 'Chưa kết nối'}
              </span>
              <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-1.5">
                Preview
              </span>
            </Link>

            {/* User Profile Dropdown */}
            {currentUser && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left leading-tight max-w-[140px]">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {currentUser.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {usageSummary.isActive && currentPlan
                        ? currentPlan.name
                        : 'Gói hết hạn / Chưa kích hoạt'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    expand_more
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {isAdmin ? 'ADMIN' : 'CUSTOMER'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            usageSummary.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {usageSummary.isActive && currentPlan
                            ? `${currentPlan.code} (${usageSummary.daysRemaining} ngày)`
                            : 'Hết hạn gói'}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setChangePasswordOpen(true);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      >
                        <span className="material-symbols-outlined text-[17px] text-slate-400">
                          key
                        </span>
                        Đổi mật khẩu
                      </button>

                      <Link
                        to="/extension-preview"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      >
                        <span className="material-symbols-outlined text-[17px] text-slate-400">
                          extension
                        </span>
                        Xem trước Extension Popup
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          resetDemoData();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                      >
                        <span className="material-symbols-outlined text-[17px] text-slate-400">
                          restart_alt
                        </span>
                        Đặt lại dữ liệu DEMO
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                      >
                        <span className="material-symbols-outlined text-[17px]">logout</span>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Mở menu điều hướng"
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-[20px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <NavLink
              to="/extension-preview"
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">extension</span>
              <span>Extension Popup Preview</span>
            </NavLink>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-6 py-5">
        {children}
      </main>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
};
