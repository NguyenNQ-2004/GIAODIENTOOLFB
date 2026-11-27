import React, { useState, useRef, useEffect } from 'react';
import { PlanTier, RouteKey } from '../types/app';
import { LOGO_URL, USER_AVATAR_URL } from '../data/mockData';
import { SafeImage } from './SafeImage';

interface LayoutShellProps {
  activeRoute: RouteKey;
  onNavigate: (route: RouteKey) => void;
  currentPlan: PlanTier;
  extensionConnected: boolean;
  userName: string;
  onOpenChangePassword: () => void;
  onOpenExtensionGuide: () => void;
  children: React.ReactNode;
}

const ROUTE_META: Record<Exclude<RouteKey, 'auth'>, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Tổng quan',
    subtitle: 'Theo dõi tác vụ đăng bài và lịch phát hành tự động',
  },
  post: {
    title: 'Đăng bài Facebook',
    subtitle: 'Soạn thảo đa kịch bản & phân phối tới nhóm/fanpage',
  },
  accounts: {
    title: 'Tài khoản Facebook',
    subtitle: 'Quản lý hồ sơ Facebook, Fanpage và thiết bị Extension',
  },
  pricing: {
    title: 'Gói dịch vụ & Thanh toán',
    subtitle: 'Quản lý hạn mức tài nguyên và thanh toán VietQR tự động',
  },
  admin: {
    title: 'Quản trị hệ thống',
    subtitle: 'Giám sát người dùng, tác vụ nền và cấu hình toàn hệ thống',
  },
  extension: {
    title: 'Chrome Extension Popup',
    subtitle: 'Mô phỏng tiện ích Manifest V3 và cấu hình chống Checkpoint',
  },
};

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeRoute,
  onNavigate,
  currentPlan,
  extensionConnected,
  userName,
  onOpenChangePassword,
  onOpenExtensionGuide,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = activeRoute === 'auth' ? ROUTE_META.dashboard : ROUTE_META[activeRoute];

  const primaryNav: { key: RouteKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Tổng quan', icon: 'space_dashboard' },
    { key: 'post', label: 'Đăng bài Facebook', icon: 'edit_square' },
    { key: 'accounts', label: 'Tài khoản Facebook', icon: 'group' },
    { key: 'pricing', label: 'Gói dịch vụ', icon: 'account_balance_wallet' },
  ];

  const systemNav: { key: RouteKey; label: string; icon: string }[] = [
    { key: 'extension', label: 'Extension Popup', icon: 'extension' },
    { key: 'admin', label: 'Quản trị hệ thống', icon: 'admin_panel_settings' },
  ];

  const renderNavItem = (item: { key: RouteKey; label: string; icon: string }) => {
    const isActive = activeRoute === item.key;
    return (
      <div key={item.key} className="relative group w-full">
        <button
          type="button"
          onClick={() => {
            onNavigate(item.key);
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-0 h-11' : 'gap-space-md px-space-md py-space-sm'
          } rounded-lg transition-colors text-[13px] whitespace-nowrap ${
            isActive
              ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </button>
        {collapsed && (
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-2.5 py-1 bg-inverse-surface text-inverse-on-surface text-xs rounded shadow-md whitespace-nowrap z-50 pointer-events-none">
            {item.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between py-space-md px-space-md transition-all duration-200 ${
          collapsed ? 'w-[72px] px-space-xs' : 'w-60'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col gap-space-lg">
          {/* Brand Header */}
          <div
            className={`h-12 w-full flex items-center ${
              collapsed ? 'justify-center' : 'justify-between px-space-xs'
            }`}
          >
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-space-sm text-left"
            >
              {collapsed ? (
                <div className="w-9 h-9 rounded-lg bg-primary-container/10 flex items-center justify-center overflow-hidden">
                  <SafeImage
                    src={LOGO_URL}
                    alt="FB POST PRO"
                    fallbackText="FB"
                    className="h-7 w-7 object-contain"
                  />
                </div>
              ) : (
                <span className="text-[18px] font-bold tracking-tight text-primary-container whitespace-nowrap">
                  FB POST PRO
                </span>
              )}
            </button>
            {!collapsed && (
              <span className="text-[11px] text-primary-container bg-secondary-container/40 px-1.5 py-[2px] rounded font-medium tabular-nums">
                v1.2.4
              </span>
            )}
          </div>

          {/* Primary Navigation */}
          <nav className="flex flex-col gap-space-xs w-full">
            {primaryNav.map(renderNavItem)}
          </nav>
        </div>

        {/* Bottom System Navigation */}
        <div className="flex flex-col gap-space-xs w-full">
          {!collapsed && (
            <div className="px-space-xs pt-space-xs">
              <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                Hệ thống
              </span>
            </div>
          )}
          <nav className="flex flex-col gap-space-xs w-full">
            {systemNav.map(renderNavItem)}
          </nav>
          <div className="pt-2 border-t border-surface-container mt-1 hidden lg:block">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center h-10' : 'gap-space-md px-space-md py-space-sm'
              } rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors text-[12px] font-medium`}
              title={collapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
              </span>
              {!collapsed && <span>Thu gọn menu</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-60'}`}>
        {/* Fixed Top Header */}
        <header
          className={`fixed top-0 right-0 h-[60px] bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-4 lg:px-space-xl transition-all duration-200 left-0 ${
            collapsed ? 'lg:left-[72px]' : 'lg:left-60'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-on-surface"
              aria-label="Mở menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-[17px] text-on-surface tracking-tight font-semibold leading-tight truncate">
                {meta.title}
              </h1>
              <p className="text-[11px] text-on-surface-variant leading-none mt-0.5 truncate hidden sm:block">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-space-lg shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('extension')}
              className="hidden sm:inline-flex items-center gap-space-xs bg-surface-container-low hover:bg-surface-container px-space-md py-space-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Mở mô phỏng Extension Popup"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  extensionConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs text-on-surface font-medium">
                {extensionConnected ? 'Đã kết nối' : 'Mất kết nối'}
              </span>
              <span className="text-[11px] text-on-surface-variant bg-surface-container px-1.5 rounded tabular-nums">
                v1.2.4
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenExtensionGuide}
              className="hidden md:flex h-8 px-space-lg bg-surface-container-low text-on-surface text-[13px] rounded-lg hover:bg-surface-container-high transition-colors items-center gap-space-xs font-medium whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">extension</span>
              <span>Cài đặt Extension</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className="h-8 px-space-lg bg-primary-container text-on-primary text-[13px] rounded-lg hover:bg-primary transition-colors flex items-center gap-space-xs font-medium whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>Mua gói</span>
            </button>

            <div className="h-6 w-[1px] bg-surface-container-highest hidden sm:block" />

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-space-md pl-space-xs cursor-pointer group rounded-lg py-1 pr-1 hover:bg-surface-container-low/70 transition-colors"
              >
                <SafeImage
                  src={USER_AVATAR_URL}
                  alt={userName}
                  fallbackText="NA"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-container-highest shrink-0"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[13px] text-on-surface font-medium leading-tight whitespace-nowrap">
                    {userName}
                  </span>
                  <span className="text-[11px] text-primary font-medium leading-none mt-0.5">
                    Gói {currentPlan}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-on-surface transition-colors">
                  arrow_drop_down
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-surface-container">
                    <p className="text-xs font-semibold text-on-surface">{userName}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      nguyenminhanh@company.com · Gói {currentPlan}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onNavigate('pricing');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low flex items-center gap-2.5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      workspace_premium
                    </span>
                    <span>Quản lý gói dịch vụ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenChangePassword();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low flex items-center gap-2.5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      lock_reset
                    </span>
                    <span>Đổi mật khẩu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onNavigate('admin');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-on-surface hover:bg-surface-container-low flex items-center gap-2.5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      admin_panel_settings
                    </span>
                    <span>Quản trị hệ thống</span>
                  </button>
                  <div className="my-1 border-t border-surface-container" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      onNavigate('auth');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-error hover:bg-error-container/30 flex items-center gap-2.5 font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Đăng xuất / Trang xác thực</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="w-full pt-[76px] px-4 lg:px-[20px] pb-[28px] bg-surface min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
