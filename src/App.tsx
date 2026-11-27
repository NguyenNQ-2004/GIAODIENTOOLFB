import { useCallback, useMemo, useState } from 'react';
import {
  AdminUser,
  BillingCycle,
  ExtensionDevice,
  ExtensionSettings,
  FacebookAccount,
  FacebookGroup,
  Fanpage,
  GroupCollection,
  PaymentOrder,
  PlanTier,
  PostSlot,
  PublishingTask,
  RouteKey,
  SavedPost,
  ToastMessage,
} from './types/app';
import {
  INITIAL_ACCOUNTS,
  INITIAL_ADMIN_USERS,
  INITIAL_COLLECTIONS,
  INITIAL_DEVICES,
  INITIAL_EXTENSION_SETTINGS,
  INITIAL_FANPAGES,
  INITIAL_GROUPS,
  INITIAL_ORDERS,
  INITIAL_SAVED_POSTS,
  INITIAL_SLOTS,
  INITIAL_TASKS,
  PLAN_SPECS,
} from './data/mockData';
import { LayoutShell } from './components/LayoutShell';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TaskDrawer } from './components/TaskDrawer';
import { ConnectAccountModal } from './components/ConnectAccountModal';
import { ExtensionGuideModal } from './components/ExtensionGuideModal';
import { DashboardPage } from './pages/DashboardPage';
import { PostComposerPage } from './pages/PostComposerPage';
import { AccountsPage } from './pages/AccountsPage';
import { PricingPage } from './pages/PricingPage';
import { AdminPage } from './pages/AdminPage';
import { ExtensionPopupPage } from './pages/ExtensionPopupPage';
import { AuthPage, ChangePasswordModal } from './pages/AuthPage';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
}

export default function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('dashboard');
  const [userName, setUserName] = useState<string>('Nguyễn Minh Anh');
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('PRO');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [extensionConnected, setExtensionConnected] = useState<boolean>(true);

  const [accounts, setAccounts] = useState<FacebookAccount[]>(INITIAL_ACCOUNTS);
  const [fanpages, setFanpages] = useState<Fanpage[]>(INITIAL_FANPAGES);
  const [devices, setDevices] = useState<ExtensionDevice[]>(INITIAL_DEVICES);
  const [collections, setCollections] = useState<GroupCollection[]>(INITIAL_COLLECTIONS);
  const [groups, setGroups] = useState<FacebookGroup[]>(INITIAL_GROUPS);
  const [slots, setSlots] = useState<PostSlot[]>(INITIAL_SLOTS);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(INITIAL_SAVED_POSTS);
  const [tasks, setTasks] = useState<PublishingTask[]>(INITIAL_TASKS);
  const [orders, setOrders] = useState<PaymentOrder[]>(INITIAL_ORDERS);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [extensionSettings, setExtensionSettings] = useState<ExtensionSettings>(
    INITIAL_EXTENSION_SETTINGS
  );

  // Navigation helpers
  const [postInitialScheduleMode, setPostInitialScheduleMode] = useState<'immediate' | 'scheduled'>(
    'immediate'
  );
  const [selectedDrawerTaskId, setSelectedDrawerTaskId] = useState<string | null>(null);

  // Global modals
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [extensionGuideOpen, setExtensionGuideOpen] = useState(false);

  // Toasts & Confirm dialog
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const notify = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const selectedDrawerTask = useMemo(
    () => tasks.find((t) => t.id === selectedDrawerTaskId) || null,
    [tasks, selectedDrawerTaskId]
  );

  // Task handlers
  const handlePauseResumeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus = t.status === 'RUNNING' ? 'SCHEDULED' : 'RUNNING';
        return {
          ...t,
          status: nextStatus,
          subTimeLabel: nextStatus === 'RUNNING' ? 'Đang chạy lại' : 'Đã tạm dừng',
          logs: [
            ...t.logs,
            {
              time: new Date().toTimeString().slice(0, 8),
              tag: '[CTRL]',
              message:
                nextStatus === 'RUNNING'
                  ? 'Resumed publishing queue.'
                  : 'Paused publishing queue by user.',
              tone: 'info',
            },
          ],
        };
      })
    );
    notify('info', `Đã cập nhật trạng thái thực thi cho tác vụ #${taskId}.`);
  };

  const handleConfirmWaitingTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'COMPLETED',
          completedCount: t.totalCount,
          subTimeLabel: 'Đã xác nhận duyệt bài',
          items: t.items.map((it) =>
            it.status === 'WAITING_CONFIRMATION'
              ? { ...it, status: 'SUCCESS', statusDetail: 'Đã xác nhận duyệt bài live' }
              : it
          ),
        };
      })
    );
    notify('success', `Đã xác nhận hoàn thành tác vụ #${taskId}.`);
  };

  const handleCancelTask = (taskId: string) => {
    setConfirmState({
      open: true,
      title: `Hủy tác vụ #${taskId}?`,
      description:
        'Các bài đã đăng thành công sẽ được giữ nguyên trên Facebook. Các nhóm còn lại trong hàng đợi sẽ bị hủy bỏ.',
      confirmLabel: 'Xác nhận hủy',
      variant: 'danger',
      onConfirm: () => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'CANCELLED',
                  subTimeLabel: 'Đã hủy bởi người dùng',
                }
              : t
          )
        );
        setConfirmState((s) => ({ ...s, open: false }));
        notify('warning', `Đã hủy tác vụ #${taskId}.`);
      },
    });
  };

  const handleRetryFailedTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'RUNNING',
          subTimeLabel: 'Đang chạy lại mục lỗi',
          items: t.items.map((it) =>
            it.status === 'FAILED'
              ? { ...it, status: 'RUNNING', statusDetail: 'Đang thử lại qua Extension...' }
              : it
          ),
          logs: [
            ...t.logs,
            {
              time: new Date().toTimeString().slice(0, 8),
              tag: '[RETRY]',
              message: 'Retrying failed group items with extended safe delay...',
              tone: 'warn',
            },
          ],
        };
      })
    );
    notify('info', `Đang thử lại các nhóm lỗi của tác vụ #${taskId}.`);
  };

  const handleUpdateTaskSchedule = (taskId: string, newTime: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              scheduledLabel: newTime,
              subTimeLabel: 'Đã cập nhật lịch hẹn',
            }
          : t
      )
    );
    notify('success', `Đã cập nhật lịch đăng mới cho #${taskId}: ${newTime}`);
  };

  // Post Composer handlers
  const handleUpdateSlot = (slotNumber: number, updated: Partial<PostSlot>) => {
    setSlots((prev) =>
      prev.map((s) => (s.slotNumber === slotNumber ? { ...s, ...updated } : s))
    );
  };

  const handleToggleGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, selected: !g.selected } : g))
    );
  };

  const handleToggleAllGroups = (selected: boolean, visibleIds: string[]) => {
    const idSet = new Set(visibleIds);
    setGroups((prev) =>
      prev.map((g) => (idSet.has(g.id) ? { ...g, selected } : g))
    );
  };

  const handleAddGroup = (groupData: Omit<FacebookGroup, 'id' | 'selected'>) => {
    const newGroup: FacebookGroup = {
      ...groupData,
      id: `grp-${Date.now()}`,
      selected: true,
    };
    setGroups((prev) => [newGroup, ...prev]);
    notify('success', `Đã thêm nhóm "${newGroup.name}" vào danh sách mục tiêu.`);
  };

  const handleDeleteGroup = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (target) {
      notify('info', `Đã xóa nhóm "${target.name}" khỏi danh sách.`);
    }
  };

  const handleImportCsvGroups = (newGroups: Omit<FacebookGroup, 'id' | 'selected'>[]) => {
    const prepared: FacebookGroup[] = newGroups.map((g, idx) => ({
      ...g,
      id: `grp-csv-${Date.now()}-${idx}`,
      selected: true,
    }));
    setGroups((prev) => [...prepared, ...prev]);
    notify('success', `Đã nhập thành công ${prepared.length} nhóm hợp lệ từ tệp CSV.`);
  };

  const handleAddCollection = (name: string) => {
    const newCol: GroupCollection = {
      id: `col_${Date.now()}`,
      name,
      colorDotClass: 'bg-primary',
    };
    setCollections((prev) => [...prev, newCol]);
    notify('success', `Đã tạo bộ sưu tập nhóm "${name}".`);
  };

  const handleSavePostTemplate = (slot: PostSlot) => {
    const existing = savedPosts.find((p) => p.content === slot.content);
    if (existing) {
      notify('info', 'Nội dung này đã tồn tại trong thư viện bài đăng đã lưu.');
      return;
    }
    const newPost: SavedPost = {
      id: `sp-${Date.now()}`,
      title: slot.title || `Mẫu bài Slot #${slot.slotNumber}`,
      content: slot.content,
      shareLink: slot.shareLink,
      mediaCount: slot.media.length,
      updatedAt: 'Vừa lưu',
    };
    setSavedPosts((prev) => [newPost, ...prev]);
    notify('success', `Đã lưu Slot #${slot.slotNumber} vào thư viện mẫu bài đăng (POST-08).`);
  };

  const handleCreateTask = (newTask: PublishingTask) => {
    setTasks((prev) => [newTask, ...prev]);
    notify(
      'success',
      `Đã tạo tác vụ #${newTask.id} với ${newTask.totalCount} mục tiêu (${
        newTask.status === 'SCHEDULED' ? 'Hẹn giờ tự động' : 'Đang phát hành'
      }).`
    );
  };

  // Account & Extension handlers
  const handleConnectOAuth = () => {
    const nextAcc: FacebookAccount = {
      id: `acc-${Date.now()}`,
      name: 'Phạm Minh Khôi (OAuth)',
      label: 'Tài khoản vừa liên kết qua Meta OAuth',
      initials: 'MK',
      uid: String(Math.floor(100080000000000 + Math.random() * 90000000000)),
      fanpageCount: 1,
      status: 'CONNECTED',
      statusLabel: 'Đã kết nối (Live)',
      lastConnectedAgo: 'Vừa xong',
      lastConnectedAt: 'Vừa xác thực OAuth',
      cookieDaysLeft: 60,
      verifiedOAuth: true,
    };
    setAccounts((prev) => [...prev, nextAcc]);
    notify('success', 'Đã kết nối thành công tài khoản Facebook qua Meta Official OAuth (ACC-01).');
  };

  const handleAddManualAccount = (displayName: string, facebookUid: string) => {
    const words = displayName.trim().split(/\s+/);
    const initials = ((words[0]?.[0] || 'F') + (words[1]?.[0] || 'B')).toUpperCase();
    const newAcc: FacebookAccount = {
      id: `acc-${Date.now()}`,
      name: displayName,
      label: 'Chưa xác minh token Meta',
      initials,
      uid: facebookUid || String(Math.floor(100080000000000 + Math.random() * 90000000000)),
      fanpageCount: 0,
      status: 'EXPIRED',
      statusLabel: 'UNVERIFIED (Chờ Extension)',
      lastConnectedAgo: 'Vừa tạo',
      lastConnectedAt: 'Hồ sơ thủ công',
      isManual: true,
      verifiedOAuth: false,
    };
    setAccounts((prev) => [...prev, newAcc]);
    notify('success', `Hồ sơ "${displayName}" đã được tạo thành công ở trạng thái UNVERIFIED.`);
  };

  const handleRefreshAccountStatus = (accountId?: string) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (accountId && a.id !== accountId) return a;
        return {
          ...a,
          status: 'CONNECTED',
          statusLabel: 'Đã kết nối (Live)',
          lastConnectedAgo: 'Vừa xong',
          verifiedOAuth: true,
        };
      })
    );
    notify(
      'success',
      accountId
        ? 'Đã đồng bộ và làm mới trạng thái phiên tài khoản (ACC-02).'
        : 'Đã làm mới trạng thái toàn bộ tài khoản Facebook (ACC-02).'
    );
  };

  const handleDisconnectAccount = (account: FacebookAccount) => {
    setConfirmState({
      open: true,
      title: `Ngắt kết nối "${account.name}"?`,
      description: `Cảnh báo ACC-03: Bạn có chắc chắn muốn ngắt kết nối tài khoản "${account.name}"? Các lịch trình đăng bài qua tài khoản này sẽ tạm hoãn.`,
      confirmLabel: 'Ngắt kết nối',
      variant: 'danger',
      onConfirm: () => {
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
        setConfirmState((s) => ({ ...s, open: false }));
        notify('warning', `Đã ngắt kết nối tài khoản ${account.name}.`);
      },
    });
  };

  const handleSyncFanpages = () => {
    notify('success', `Đã đồng bộ lại ${fanpages.length} Fanpage từ Meta Graph API v20.0.`);
  };

  const handlePingDevice = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    const nextPing = Math.floor(12 + Math.random() * 14);
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? { ...d, pingMs: nextPing, lastActive: 'Vừa xong', status: 'CONNECTED' }
          : d
      )
    );
    setExtensionConnected(true);
    notify(
      'success',
      `Kiểm tra WSS (ACC-08): "${dev?.name || 'Extension'}" phản hồi ${nextPing}ms - Ổn định.`
    );
  };

  const handleRevokeDevice = (device: ExtensionDevice) => {
    setConfirmState({
      open: true,
      title: `Thu hồi quyền thiết bị?`,
      description: `Ngắt kết nối WebSocket của thiết bị "${device.name}" (${device.ip}) ngay lập tức (ACC-09)?`,
      confirmLabel: 'Thu hồi thiết bị',
      variant: 'danger',
      onConfirm: () => {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === device.id ? { ...d, status: 'DISCONNECTED', lastActive: 'Đã thu hồi' } : d
          )
        );
        setConfirmState((s) => ({ ...s, open: false }));
        notify('warning', `Đã thu hồi phiên kết nối thiết bị "${device.name}".`);
      },
    });
  };

  // Billing handlers
  const handleCreateOrder = (plan: PlanTier, cycle: BillingCycle): PaymentOrder => {
    const spec = PLAN_SPECS[plan];
    const amount = cycle === 'yearly' ? spec.yearlyPrice : spec.monthlyPrice;
    const suffix = Math.floor(8910 + Math.random() * 900);
    const newOrder: PaymentOrder = {
      id: `ORD-20241024-${suffix}`,
      plan,
      cycle,
      amount,
      createdAt: '24/10/2024 14:30',
      paidAt: '--',
      status: 'PENDING',
      bankName: 'MBBank',
    };
    setOrders((prev) => [newOrder, ...prev]);
    notify('info', `Đã tạo đơn hàng ${newOrder.id} (${spec.name}). Vui lòng quét mã VietQR bên dưới.`);
    return newOrder;
  };

  const handleVerifyOrderPayment = (orderId: string, plan: PlanTier, cycle: BillingCycle) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'PAID', paidAt: '24/10/2024 14:32' }
          : o
      )
    );
    setCurrentPlan(plan);
    setBillingCycle(cycle);
    notify(
      'success',
      `Thanh toán VietQR thành công cho ${orderId}! Tài khoản đã được kích hoạt ${PLAN_SPECS[plan].name}.`
    );
  };

  // Admin handlers
  const handleUpdateAdminUser = (userId: string, patch: Partial<AdminUser>) => {
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    );
  };

  const handleDeleteAdminUser = (userId: string) => {
    const target = adminUsers.find((u) => u.id === userId);
    setConfirmState({
      open: true,
      title: `Xóa người dùng ${target?.name || ''}?`,
      description: 'Hành động này sẽ xóa vĩnh viễn tài khoản khỏi cơ sở dữ liệu hệ thống.',
      confirmLabel: 'Xóa vĩnh viễn',
      variant: 'danger',
      onConfirm: () => {
        setAdminUsers((prev) => prev.filter((u) => u.id !== userId));
        setConfirmState((s) => ({ ...s, open: false }));
        notify('warning', `Đã xóa người dùng ${target?.name || userId}.`);
      },
    });
  };

  const handleAddAdminUser = (userData: Omit<AdminUser, 'id' | 'initials' | 'createdAt'>) => {
    const words = userData.name.trim().split(/\s+/);
    const initials = ((words[0]?.[0] || 'U') + (words[1]?.[0] || 'S')).toUpperCase();
    const newUser: AdminUser = {
      ...userData,
      id: `usr-${Date.now()}`,
      initials,
      createdAt: '24/10/2024',
    };
    setAdminUsers((prev) => [newUser, ...prev]);
    notify('success', `Đã thêm người dùng "${newUser.name}" vào hệ thống.`);
  };

  // Standalone Auth route renders full-screen AuthPage
  if (activeRoute === 'auth') {
    return (
      <>
        <AuthPage
          onLoginSuccess={(name) => {
            setUserName(name);
            setActiveRoute('dashboard');
          }}
          onNotify={notify}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <>
      <LayoutShell
        activeRoute={activeRoute}
        onNavigate={(route) => {
          if (route === 'post') setPostInitialScheduleMode('immediate');
          setActiveRoute(route);
        }}
        currentPlan={currentPlan}
        extensionConnected={extensionConnected}
        userName={userName}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onOpenExtensionGuide={() => setExtensionGuideOpen(true)}
      >
        {activeRoute === 'dashboard' && (
          <DashboardPage
            tasks={tasks}
            accounts={accounts}
            onOpenDrawer={(id) => setSelectedDrawerTaskId(id)}
            onNavigateToSchedule={() => {
              setPostInitialScheduleMode('scheduled');
              setActiveRoute('post');
            }}
            onPauseResume={handlePauseResumeTask}
            onConfirmWaiting={handleConfirmWaitingTask}
            onCancelTask={handleCancelTask}
            onRetryFailed={handleRetryFailedTask}
            onUpdateTaskSchedule={handleUpdateTaskSchedule}
            onNotify={notify}
          />
        )}

        {activeRoute === 'post' && (
          <PostComposerPage
            accounts={accounts}
            fanpages={fanpages}
            groups={groups}
            collections={collections}
            slots={slots}
            savedPosts={savedPosts}
            initialScheduleMode={postInitialScheduleMode}
            onUpdateSlot={handleUpdateSlot}
            onToggleGroup={handleToggleGroup}
            onToggleAllGroups={handleToggleAllGroups}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
            onImportCsvGroups={handleImportCsvGroups}
            onAddCollection={handleAddCollection}
            onSavePostTemplate={handleSavePostTemplate}
            onCreateTask={handleCreateTask}
            onOpenConnectAccountModal={() => setConnectModalOpen(true)}
            onNotify={notify}
          />
        )}

        {activeRoute === 'accounts' && (
          <AccountsPage
            accounts={accounts}
            fanpages={fanpages}
            devices={devices}
            currentPlan={currentPlan}
            onNavigateToPricing={() => setActiveRoute('pricing')}
            onOpenConnectModal={() => setConnectModalOpen(true)}
            onRefreshAccountStatus={handleRefreshAccountStatus}
            onDisconnectAccount={handleDisconnectAccount}
            onSyncFanpages={handleSyncFanpages}
            onPingDevice={handlePingDevice}
            onRevokeDevice={handleRevokeDevice}
            onNotify={notify}
          />
        )}

        {activeRoute === 'pricing' && (
          <PricingPage
            currentPlan={currentPlan}
            billingCycle={billingCycle}
            onChangeBillingCycle={setBillingCycle}
            accountsCount={accounts.length}
            groupsCount={groups.length}
            scheduledCount={tasks.filter((t) => t.status === 'SCHEDULED').length}
            orders={orders}
            onVerifyOrderPayment={handleVerifyOrderPayment}
            onCreateOrder={handleCreateOrder}
            onNotify={notify}
          />
        )}

        {activeRoute === 'admin' && (
          <AdminPage
            users={adminUsers}
            orders={orders}
            tasks={tasks}
            extensionSettings={extensionSettings}
            onUpdateUser={handleUpdateAdminUser}
            onDeleteUser={handleDeleteAdminUser}
            onAddUser={handleAddAdminUser}
            onUpdateExtensionSettings={(patch) =>
              setExtensionSettings((prev) => ({ ...prev, ...patch }))
            }
            onOpenDrawer={(id) => setSelectedDrawerTaskId(id)}
            onNotify={notify}
          />
        )}

        {activeRoute === 'extension' && (
          <ExtensionPopupPage
            accounts={accounts}
            tasks={tasks}
            currentPlan={currentPlan}
            extensionSettings={extensionSettings}
            onUpdateSettings={(patch) =>
              setExtensionSettings((prev) => ({ ...prev, ...patch }))
            }
            onPauseResumeTask={handlePauseResumeTask}
            onCancelTask={handleCancelTask}
            onNavigateToPost={() => setActiveRoute('post')}
            onNavigateToDashboard={() => setActiveRoute('dashboard')}
            onRefreshSession={(accId) => handleRefreshAccountStatus(accId)}
            onNotify={notify}
          />
        )}
      </LayoutShell>

      {/* Global Task Drawer */}
      <TaskDrawer
        task={selectedDrawerTask}
        onClose={() => setSelectedDrawerTaskId(null)}
        onPauseResume={handlePauseResumeTask}
        onCancelTask={handleCancelTask}
        onRetryFailed={handleRetryFailedTask}
        onConfirmWaiting={handleConfirmWaitingTask}
        onNotify={notify}
      />

      {/* Global Connect Account Modal (ACC-01) */}
      <ConnectAccountModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onConnectOAuth={handleConnectOAuth}
        onAddManual={handleAddManualAccount}
        onNotify={notify}
      />

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onNotify={notify}
      />

      {/* Global Extension Setup Guide Modal */}
      <ExtensionGuideModal
        open={extensionGuideOpen}
        onClose={() => setExtensionGuideOpen(false)}
        onOpenExtensionSimulator={() => setActiveRoute('extension')}
        onNotify={notify}
      />

      {/* Global Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />

      {/* Toast Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
