import React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { LayoutShell } from './components/LayoutShell';
import { ToastContainer } from './components/ToastContainer';
import { AccountsPage } from './pages/AccountsPage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExtensionPopupPage } from './pages/ExtensionPopupPage';
import { PostComposerPage } from './pages/PostComposerPage';
import { PricingPage } from './pages/PricingPage';
import { IS_DEV_OR_DEMO } from './config/demoConfig';
import { AppProvider, useApp } from './state/AppContext';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <LayoutShell>{children}</LayoutShell>;
};

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser.role !== 'ADMIN') {
    return (
      <LayoutShell>
        <div className="max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[28px]">gpp_bad</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">Không có quyền truy cập</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Khu vực Quản trị hệ thống chỉ dành cho tài khoản có vai trò Quản trị viên (ADMIN).
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/post"
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              Về trang Đăng bài
            </Link>
            <Link
              to="/dashboard"
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              Xem Tổng quan
            </Link>
          </div>
        </div>
      </LayoutShell>
    );
  }
  return <LayoutShell>{children}</LayoutShell>;
};

const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useApp();
  if (currentUser) {
    return <Navigate to={currentUser.role === 'ADMIN' ? '/admin' : '/post'} replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const {
    currentUser,
    toasts,
    dismissToast,
    schemaMigrationNotice,
    dismissSchemaMigrationNotice,
  } = useApp();

  return (
    <>
      {schemaMigrationNotice && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 max-w-[1440px] mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">
                info
              </span>
              <span>{schemaMigrationNotice}</span>
            </div>
            <button
              type="button"
              onClick={dismissSchemaMigrationNotice}
              className="px-2.5 py-1 rounded-md border border-amber-300 bg-white hover:bg-amber-100 text-[11px] font-semibold text-amber-900 shrink-0"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={<Navigate to={currentUser ? '/post' : '/login'} replace />}
        />

        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={
            <GuestOnly>
              <AuthPage mode="login" />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <AuthPage mode="register" />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <AuthPage mode="forgot-password" />
            </GuestOnly>
          }
        />
        <Route
          path="/reset-password"
          element={
            <GuestOnly>
              <AuthPage mode="reset-password" />
            </GuestOnly>
          }
        />

        {/* Authenticated Customer/Admin Routes */}
        <Route
          path="/post"
          element={
            <AuthGuard>
              <PostComposerPage />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/accounts"
          element={
            <AuthGuard>
              <AccountsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/pricing"
          element={
            <AuthGuard>
              <PricingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/extension-preview"
          element={
            IS_DEV_OR_DEMO ? (
              <AuthGuard>
                <ExtensionPopupPage />
              </AuthGuard>
            ) : (
              <Navigate to="/post" replace />
            )
          }
        />

        {/* Admin-Only Route */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPage />
            </AdminGuard>
          }
        />

        {/* Catch-all fallback */}
        <Route
          path="*"
          element={<Navigate to={currentUser ? '/post' : '/login'} replace />}
        />
      </Routes>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
