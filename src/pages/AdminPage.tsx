import React, { useMemo, useState } from 'react';
import {
  AdminUser,
  ExtensionSettings,
  PaymentOrder,
  PlanTier,
  PublishingTask,
} from '../types/app';
import { SafeImage } from '../components/SafeImage';

interface AdminPageProps {
  users: AdminUser[];
  orders: PaymentOrder[];
  tasks: PublishingTask[];
  extensionSettings: ExtensionSettings;
  onUpdateUser: (userId: string, patch: Partial<AdminUser>) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: Omit<AdminUser, 'id' | 'initials' | 'createdAt'>) => void;
  onUpdateExtensionSettings: (patch: Partial<ExtensionSettings>) => void;
  onOpenDrawer: (taskId: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

type AdminTab = 'users' | 'plans' | 'tasks' | 'settings';

export const AdminPage: React.FC<AdminPageProps> = ({
  users,
  orders,
  tasks,
  extensionSettings,
  onUpdateUser,
  onDeleteUser,
  onAddUser,
  onUpdateExtensionSettings,
  onOpenDrawer,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add User modal
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Member' | 'Admin' | 'SuperAdmin'>('Member');
  const [newUserPlan, setNewUserPlan] = useState<PlanTier>('PRO');

  // Inline global limit editing
  const [editingLimits, setEditingLimits] = useState(false);
  const [draftDelay, setDraftDelay] = useState(extensionSettings.minDelaySec);
  const [draftDailyLimit, setDraftDailyLimit] = useState(extensionSettings.dailyLimitPerAccount);
  const [draftSyncHours, setDraftSyncHours] = useState(extensionSettings.groupSyncHours);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role.toLowerCase() !== roleFilter) return false;
      if (planFilter !== 'all') {
        if (planFilter === 'free' && u.plan !== 'NONE') return false;
        if (planFilter !== 'free' && u.plan.toLowerCase() !== planFilter) return false;
      }
      if (statusFilter !== 'all' && u.status.toLowerCase() !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, planFilter, statusFilter, searchQuery]);

  const handleExportCsv = () => {
    const header = 'id,name,email,role,plan,status,created_at\n';
    const body = filteredUsers
      .map((u) => `"${u.id}","${u.name}","${u.email}","${u.role}","${u.plan}","${u.status}","${u.createdAt}"`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fbpostpro_users_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', `Đã xuất ${filteredUsers.length} người dùng ra tệp CSV.`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setPlanFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
    onNotify('info', 'Đã đặt lại bộ lọc quản trị.');
  };

  const toggleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const toggleUserRow = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      onNotify('warning', 'Vui lòng nhập đầy đủ họ tên và email.');
      return;
    }
    const maxMap: Record<PlanTier, number> = { BASIC: 1, PRO: 3, BUSINESS: 5 };
    onAddUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      verified: true,
      role: newUserRole,
      plan: newUserPlan,
      planExpiry: 'Hết hạn: 24/10/2025',
      fbAccountsUsed: 0,
      fbAccountsMax: maxMap[newUserPlan],
      groupsCount: 0,
      status: 'ACTIVE',
    });
    setNewUserName('');
    setNewUserEmail('');
    setAddUserModalOpen(false);
  };

  const handleSaveGlobalLimits = () => {
    onUpdateExtensionSettings({
      minDelaySec: draftDelay,
      dailyLimitPerAccount: draftDailyLimit,
      groupSyncHours: draftSyncHours,
    });
    setEditingLimits(false);
    onNotify('success', 'Đã cập nhật hạn mức mặc định toàn hệ thống.');
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Context Header & System Status Telemetry */}
      <div className="flex flex-col gap-space-md mb-space-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-space-xs text-on-surface-variant text-xs">
            <span className="hover:text-primary cursor-pointer transition-colors">Hệ thống</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-medium">Quản trị hệ thống (/admin)</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="inline-flex items-center gap-space-xs bg-surface-container-high text-primary text-xs px-space-md py-[3px] rounded-full font-medium">
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield_person
              </span>
              <span>Quyền Quản trị viên (SuperAdmin)</span>
            </span>
            <span className="text-[11px] text-on-surface-variant bg-surface-container-lowest px-space-sm py-[3px] rounded-lg shadow-sm font-mono">
              Cluster VN-North-01
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <h2 className="text-[20px] text-on-surface font-bold tracking-tight">
                Quản trị hệ thống &amp; Giám sát dịch vụ
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="flex flex-wrap items-center gap-space-sm text-on-surface-variant text-[11px] pt-space-xs">
              <span className="inline-flex items-center gap-1 bg-surface-container-low px-space-sm py-[2px] rounded text-on-surface">
                <span className="material-symbols-outlined text-[13px] text-primary">database</span>
                <span>PostgreSQL v15</span>
              </span>
              <span className="text-outline-variant">•</span>
              <span className="inline-flex items-center gap-1 bg-surface-container-low px-space-sm py-[2px] rounded text-on-surface">
                <span className="material-symbols-outlined text-[13px] text-tertiary">memory</span>
                <span>Redis v7.2</span>
              </span>
              <span className="text-outline-variant">•</span>
              <span className="inline-flex items-center gap-1 bg-surface-container-low px-space-sm py-[2px] rounded text-on-surface">
                <span className="material-symbols-outlined text-[13px] text-emerald-600">sync</span>
                <span>Cron Engine: Active</span>
              </span>
              <span className="text-outline-variant">•</span>
              <span className="inline-flex items-center gap-1 bg-surface-container-low px-space-sm py-[2px] rounded text-on-surface">
                <span className="material-symbols-outlined text-[13px] text-primary">extension</span>
                <span>
                  Extension Heartbeat:{' '}
                  <strong className="text-emerald-600 font-semibold tabular-nums">99.8%</strong>
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm shrink-0">
            <button
              type="button"
              onClick={() =>
                onNotify('success', 'Ping Cluster VN-North-01: PostgreSQL 4ms, Redis 2ms, WSS OK.')
              }
              className="h-8 px-space-md bg-surface-container text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-space-xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">network_ping</span>
              <span>Kiểm tra kết nối</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-8 px-space-md bg-surface-container-lowest text-on-surface text-[13px] font-medium rounded-lg hover:bg-surface-container transition-colors flex items-center gap-space-xs shadow-sm border border-surface-container whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setAddUserModalOpen(true)}
              className="h-8 px-space-lg bg-primary-container text-on-primary text-[13px] rounded-lg hover:bg-primary transition-all flex items-center gap-space-xs shadow-sm font-medium whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Thêm người dùng mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                Tổng người dùng
              </span>
              <span className="text-[28px] text-on-surface font-bold mt-space-xs tracking-tight tabular-nums">
                {(1243 + users.length).toLocaleString('en-US')}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-space-md mt-space-xs">
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+12.4%</span>
              <span className="text-on-surface-variant font-normal">tháng này</span>
            </div>
            <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-1.5 py-[2px] rounded">
              18 mới hôm nay
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary/20 group-hover:bg-primary transition-colors" />
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                Gói cước đang kích hoạt
              </span>
              <span className="text-[28px] text-on-surface font-bold mt-space-xs tracking-tight tabular-nums">
                842
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-secondary-container/40 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs pt-space-md mt-space-xs text-[11px] text-on-surface-variant">
            <span className="bg-primary/10 text-primary px-1.5 py-[2px] rounded font-medium tabular-nums">
              PRO: 512
            </span>
            <span className="bg-secondary-container/60 text-on-secondary-container px-1.5 py-[2px] rounded font-medium tabular-nums">
              BIZ: 186
            </span>
            <span className="bg-surface-container px-1.5 py-[2px] rounded tabular-nums">
              BASIC: 144
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-container/20 group-hover:bg-primary-container transition-colors" />
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                Doanh thu tháng (MRR)
              </span>
              <span className="text-[28px] text-on-surface font-bold mt-space-xs tracking-tight tabular-nums">
                482.5M{' '}
                <span className="text-[13px] font-normal text-on-surface-variant">VNĐ</span>
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-space-md mt-space-xs text-[11px]">
            <span className="text-on-surface-variant">Tỷ lệ gia hạn định kỳ</span>
            <span className="text-xs font-semibold text-emerald-600 bg-surface-container-low px-1.5 py-[2px] rounded tabular-nums">
              94.2%
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/30 group-hover:bg-emerald-500 transition-colors" />
        </div>

        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                Tác vụ đăng 24h qua
              </span>
              <span className="text-[28px] text-on-surface font-bold mt-space-xs tracking-tight tabular-nums">
                14,290
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-tertiary-fixed/40 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[20px]">send_time_extension</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-space-md mt-space-xs text-[11px]">
            <span className="text-emerald-600 font-medium tabular-nums">Thành công 98.4%</span>
            <span className="font-medium bg-error-container/40 text-on-error-container px-1.5 py-[2px] rounded tabular-nums">
              Lỗi CP FB 1.6%
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-tertiary/20 group-hover:bg-tertiary transition-colors" />
        </div>
      </div>

      {/* Operational Tabs Navigation */}
      <div className="flex items-center gap-space-xs mb-space-md overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`h-9 px-space-lg rounded-lg text-[13px] flex items-center gap-space-xs shrink-0 whitespace-nowrap transition-colors ${
            activeTab === 'users'
              ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">manage_accounts</span>
          <span>Quản lý người dùng (users)</span>
          <span className="ml-space-xs px-1.5 py-[1px] bg-primary/10 text-primary text-[11px] rounded-full tabular-nums">
            {(1243 + users.length).toLocaleString('en-US')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`h-9 px-space-lg rounded-lg text-[13px] flex items-center gap-space-xs shrink-0 whitespace-nowrap transition-colors ${
            activeTab === 'plans'
              ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">loyalty</span>
          <span>Gói cước &amp; Đơn hàng (plans)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`h-9 px-space-lg rounded-lg text-[13px] flex items-center gap-space-xs shrink-0 whitespace-nowrap transition-colors ${
            activeTab === 'tasks'
              ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">sync_alt</span>
          <span>Tác vụ nền (publishing_tasks)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`h-9 px-space-lg rounded-lg text-[13px] flex items-center gap-space-xs shrink-0 whitespace-nowrap transition-colors ${
            activeTab === 'settings'
              ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">settings_suggest</span>
          <span>Cấu hình &amp; Extension (settings)</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* LEFT 8 COLS */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {activeTab === 'users' && (
            <>
              {/* Search & Multi-Filters Toolbar */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md">
                <div className="relative flex-1 min-w-[220px]">
                  <span className="material-symbols-outlined text-[18px] text-outline absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo Họ tên, Email, UID hoặc ID người dùng..."
                    className="w-full h-8 pl-8 pr-space-md bg-surface-container-low text-on-surface placeholder:text-outline text-[13px] rounded-lg focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-space-xs shrink-0">
                  <div className="relative">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-8 pl-space-md pr-7 bg-surface-container-low text-on-surface text-xs rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="superadmin">SuperAdmin</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <span className="material-symbols-outlined text-[16px] text-outline absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="h-8 pl-space-md pr-7 bg-surface-container-low text-on-surface text-xs rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">Tất cả gói cước</option>
                      <option value="business">BUSINESS</option>
                      <option value="pro">PRO</option>
                      <option value="basic">BASIC</option>
                      <option value="free">FREE</option>
                    </select>
                    <span className="material-symbols-outlined text-[16px] text-outline absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-8 pl-space-md pr-7 bg-surface-container-low text-on-surface text-xs rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">ACTIVE (Đang chạy)</option>
                      <option value="expired">EXPIRED (Quá hạn)</option>
                      <option value="locked">LOCKED (Đã khóa)</option>
                    </select>
                    <span className="material-symbols-outlined text-[16px] text-outline absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="h-8 w-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                    title="Đặt lại bộ lọc"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant text-xs h-9 uppercase tracking-wider select-none">
                        <th className="pl-space-lg pr-space-sm font-semibold w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredUsers.length > 0 &&
                              selectedUserIds.length === filteredUsers.length
                            }
                            onChange={(e) => toggleSelectAllUsers(e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                          />
                        </th>
                        <th className="px-space-md font-semibold">ID &amp; Người dùng</th>
                        <th className="px-space-md font-semibold">Vai trò</th>
                        <th className="px-space-md font-semibold">Gói hiện tại</th>
                        <th className="px-space-md font-semibold">Tài khoản FB / Nhóm</th>
                        <th className="px-space-md font-semibold">Trạng thái</th>
                        <th className="px-space-md font-semibold">Ngày tạo</th>
                        <th className="pr-space-lg pl-space-md font-semibold text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low text-[13px] text-on-surface">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={`hover:bg-surface-container-low/50 transition-colors group ${
                            user.status === 'LOCKED'
                              ? 'bg-error-container/5'
                              : user.role === 'SuperAdmin'
                              ? 'bg-surface-container-low/30'
                              : ''
                          }`}
                        >
                          <td className="pl-space-lg pr-space-sm py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => toggleUserRow(user.id)}
                              className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="px-space-md py-2.5">
                            <div className="flex items-center gap-space-sm">
                              <SafeImage
                                src={user.avatarUrl}
                                alt={user.name}
                                fallbackText={user.initials}
                                className={`w-8 h-8 rounded-full object-cover shrink-0 ${
                                  user.role === 'SuperAdmin'
                                    ? 'ring-2 ring-primary/40'
                                    : 'ring-1 ring-surface-container-high'
                                }`}
                              />
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`font-semibold text-on-surface truncate ${
                                      user.status === 'LOCKED' ? 'line-through opacity-70' : ''
                                    }`}
                                  >
                                    {user.name}
                                  </span>
                                  {user.status === 'LOCKED' ? (
                                    <span
                                      className="material-symbols-outlined text-[14px] text-error"
                                      title="Tài khoản bị cấm"
                                    >
                                      block
                                    </span>
                                  ) : user.role === 'SuperAdmin' ? (
                                    <span
                                      className="material-symbols-outlined text-[14px] text-primary"
                                      title="Hệ thống nội bộ"
                                    >
                                      verified_user
                                    </span>
                                  ) : user.verified ? (
                                    <span
                                      className="material-symbols-outlined text-[14px] text-primary"
                                      title="Email đã xác thực"
                                    >
                                      verified
                                    </span>
                                  ) : (
                                    <span
                                      className="material-symbols-outlined text-[14px] text-outline"
                                      title="Chưa xác thực đầy đủ"
                                    >
                                      shield
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-[11px] truncate ${
                                    user.role === 'SuperAdmin'
                                      ? 'text-primary font-medium'
                                      : 'text-on-surface-variant'
                                  }`}
                                >
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-space-md py-2.5">
                            {user.role === 'SuperAdmin' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-[2px] rounded-full bg-primary-container text-on-primary font-semibold whitespace-nowrap">
                                <span className="material-symbols-outlined text-[11px]">star</span>
                                SuperAdmin
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[11px] px-1.5 py-[2px] rounded bg-surface-container text-on-surface-variant font-medium">
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-space-md py-2.5">
                            <div className="flex flex-col">
                              <span
                                className={`inline-flex items-center w-fit text-xs font-semibold px-1.5 py-[2px] rounded ${
                                  user.plan === 'PRO' || user.plan === 'ROOT SYSTEM'
                                    ? 'text-primary bg-primary/10'
                                    : user.plan === 'BUSINESS'
                                    ? 'text-on-secondary-container bg-secondary-container'
                                    : user.plan === 'BASIC'
                                    ? 'text-tertiary bg-tertiary-fixed/60'
                                    : 'text-outline bg-surface-container'
                                }`}
                              >
                                {user.plan}
                              </span>
                              <span
                                className={`text-[11px] mt-0.5 ${
                                  user.status === 'EXPIRED'
                                    ? 'text-error font-medium'
                                    : 'text-on-surface-variant'
                                }`}
                              >
                                {user.planExpiry}
                              </span>
                            </div>
                          </td>
                          <td className="px-space-md py-2.5">
                            {user.role === 'SuperAdmin' ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-on-surface">Đầy đủ quyền</span>
                                <span className="text-[11px] text-on-surface-variant">
                                  Không giới hạn
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium text-on-surface tabular-nums">
                                  {user.fbAccountsUsed}/{user.fbAccountsMax} TK FB
                                </span>
                                <span className="text-[11px] text-on-surface-variant tabular-nums">
                                  {user.groupsCount} Nhóm mục tiêu
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-space-md py-2.5">
                            {user.status === 'ACTIVE' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-space-sm py-[2px] rounded-full bg-emerald-50 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ACTIVE
                              </span>
                            )}
                            {user.status === 'EXPIRED' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-space-sm py-[2px] rounded-full bg-amber-50 text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                EXPIRED
                              </span>
                            )}
                            {user.status === 'LOCKED' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-space-sm py-[2px] rounded-full bg-red-100 text-red-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                LOCKED
                              </span>
                            )}
                          </td>
                          <td className="px-space-md py-2.5 text-on-surface-variant text-[11px] tabular-nums">
                            {user.createdAt}
                          </td>
                          <td className="pr-space-lg pl-space-md py-2.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              {user.role !== 'SuperAdmin' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextPlan: PlanTier =
                                        user.plan === 'BASIC'
                                          ? 'PRO'
                                          : user.plan === 'PRO'
                                          ? 'BUSINESS'
                                          : 'BUSINESS';
                                      onUpdateUser(user.id, {
                                        plan: nextPlan,
                                        status: 'ACTIVE',
                                        planExpiry: 'Hết hạn: 24/10/2025',
                                        fbAccountsMax:
                                          nextPlan === 'BUSINESS' ? 5 : 3,
                                      });
                                      onNotify(
                                        'success',
                                        `Đã nâng cấp ${user.name} lên gói ${nextPlan}.`
                                      );
                                    }}
                                    className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
                                    title="Nâng gói / Gia hạn"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      {user.status === 'EXPIRED' ? 'autorenew' : 'upgrade'}
                                    </span>
                                  </button>

                                  {user.status === 'LOCKED' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateUser(user.id, { status: 'ACTIVE' });
                                        onNotify('success', `Đã mở khóa tài khoản ${user.name}.`);
                                      }}
                                      className="w-7 h-7 rounded hover:bg-surface-container-high text-emerald-600 flex items-center justify-center transition-colors"
                                      title="Mở khóa tài khoản"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        lock_open
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateUser(user.id, { status: 'LOCKED' });
                                        onNotify('warning', `Đã tạm khóa tài khoản ${user.name}.`);
                                      }}
                                      className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-error flex items-center justify-center transition-colors"
                                      title="Khóa tài khoản"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        lock_person
                                      </span>
                                    </button>
                                  )}

                                  {user.status === 'LOCKED' ? (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteUser(user.id)}
                                      className="w-7 h-7 rounded hover:bg-surface-container-high text-error flex items-center justify-center transition-colors"
                                      title="Xóa tài khoản vĩnh viễn"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        delete_forever
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onNotify(
                                          'info',
                                          `Đã gửi email ${
                                            user.status === 'EXPIRED'
                                              ? 'nhắc gia hạn'
                                              : 'đặt lại mật khẩu'
                                          } tới ${user.email}.`
                                        )
                                      }
                                      className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                                      title={
                                        user.status === 'EXPIRED'
                                          ? 'Gửi nhắc phí'
                                          : 'Đặt lại mật khẩu'
                                      }
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        {user.status === 'EXPIRED' ? 'mail' : 'key'}
                                      </span>
                                    </button>
                                  )}
                                </>
                              )}
                              {user.role === 'SuperAdmin' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onNotify(
                                        'info',
                                        `${user.name} đang nắm giữ quyền ROOT SuperAdmin toàn hệ thống.`
                                      )
                                    }
                                    className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
                                    title="Xem phân quyền RBAC"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      admin_panel_settings
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onNotify('info', 'Audit Log: 0 cảnh báo bảo mật bất thường.')
                                    }
                                    className="w-7 h-7 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                                    title="Xem Audit Logs"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      receipt_long
                                    </span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-space-lg py-space-md bg-surface-container-low text-on-surface-variant text-[11px]">
                  <div className="flex items-center gap-space-sm">
                    <span>
                      Hiển thị{' '}
                      <strong className="text-on-surface font-semibold tabular-nums">
                        1 - {filteredUsers.length}
                      </strong>{' '}
                      trong{' '}
                      <strong className="text-on-surface font-semibold tabular-nums">
                        {(1243 + users.length).toLocaleString('en-US')}
                      </strong>{' '}
                      người dùng
                    </span>
                    <span className="text-outline-variant">|</span>
                    <span className="flex items-center gap-1">
                      <span>Hàng mỗi trang:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="bg-surface-container-lowest text-on-surface text-[11px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded bg-surface-container-lowest text-outline disabled:opacity-50 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                    </button>
                    {[1, 2, 3].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded font-medium flex items-center justify-center transition-colors ${
                          currentPage === p
                            ? 'bg-primary-container text-on-primary shadow-xs'
                            : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                      className="w-7 h-7 rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'plans' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    Đơn hàng &amp; Đối soát VietQR hệ thống
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Danh sách đơn nâng cấp gói dịch vụ được ghi nhận qua Webhook MBBank/VCB
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary-fixed px-2.5 py-1 rounded">
                  {orders.length} giao dịch
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase h-9">
                      <th className="px-3 font-semibold">Mã đơn</th>
                      <th className="px-3 font-semibold">Gói / Chu kỳ</th>
                      <th className="px-3 font-semibold">Số tiền</th>
                      <th className="px-3 font-semibold">Thời gian</th>
                      <th className="px-3 font-semibold text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-surface-container-low/40">
                        <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                          {ord.id}
                        </td>
                        <td className="px-3 py-2.5">
                          Gói {ord.plan} ({ord.cycle})
                        </td>
                        <td className="px-3 py-2.5 font-bold tabular-nums">
                          {ord.amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-3 py-2.5 text-xs text-on-surface-variant tabular-nums">
                          {ord.createdAt}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              ord.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : ord.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-surface-container text-secondary'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-on-surface">
                    Giám sát hàng đợi Publishing Tasks
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Theo dõi thời gian thực các tác vụ đang chạy qua Extension Worker
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                  Cron Worker: Online
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg bg-surface-container-low flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">#{t.id}</span>
                        <span className="text-xs font-semibold text-on-surface">
                          {t.accountName}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-secondary">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant truncate mt-1">{t.content}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-on-surface tabular-nums">
                        {t.completedCount}/{t.totalCount} nhóm
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenDrawer(t.id)}
                        className="h-7 px-3 rounded bg-primary-container text-on-primary text-xs font-medium"
                      >
                        Kiểm tra
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
              <h3 className="text-base font-bold text-on-surface">
                Cấu hình Global Anti-Checkpoint &amp; Extension Manifest V3
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-on-surface">
                    Giãn cách tối thiểu mặc định
                  </span>
                  <span className="text-xl font-bold text-primary tabular-nums">
                    {extensionSettings.minDelaySec} giây
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Áp dụng tự động cho toàn bộ Worker Extension v1.2.4
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-surface-container-low flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-on-surface">
                    Chế độ Human Emulation &amp; Auto-Pause
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {extensionSettings.humanEmulation ? 'Đang BẬT' : 'Đang TẮT'} ·{' '}
                    {extensionSettings.autoPauseOnWarning
                      ? 'Tự ngắt khi Meta cảnh báo'
                      : 'Thủ công'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Giảm 98.4% nguy cơ Checkpoint khi đăng hàng loạt
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 4 COLS: Live Sentinel Panel */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* 1. Meta API Alerts Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-tertiary">warning</span>
                <h3 className="text-[18px] text-on-surface font-bold">Cảnh báo Meta API</h3>
              </div>
              <span className="inline-flex items-center px-1.5 py-[2px] bg-amber-50 text-amber-800 text-[11px] font-semibold rounded">
                Theo dõi thời gian thực
              </span>
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-on-surface">
                    Checkpoint Facebook
                  </span>
                  <span className="text-[11px] text-error font-medium">3 TK bị khóa tạm thời</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Meta kích hoạt xác minh số điện thoại trên 3 profile đăng bài với tần suất dày.
                  Đã được Extension v1.2.4 tự động ngắt phiên an toàn.
                </p>
              </div>

              <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface font-medium">
                    Tỷ lệ hoàn thành tác vụ Extension
                  </span>
                  <span className="text-emerald-600 font-bold tabular-nums">99.1%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.1%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-0.5 tabular-nums">
                  <span>Đã thực thi: 14,161/14,290</span>
                  <span>Lỗi retry: 129</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. VietQR Webhook Live Feed */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-primary">receipt</span>
                <h3 className="text-[18px] text-on-surface font-bold">
                  Thanh toán VietQR Webhook
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="flex flex-col gap-space-sm">
              <div className="p-space-md rounded-lg bg-surface-container-low flex items-start justify-between gap-space-sm">
                <div className="flex items-start gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-on-surface truncate font-mono">
                      ORD-20241024-8902
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Gói BUSINESS 1 Năm • MBBank
                    </span>
                    <span className="text-[11px] text-outline mt-0.5">2 phút trước</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[13px] font-bold text-emerald-600 tabular-nums">
                    +1.990.000đ
                  </span>
                  <span className="block text-[11px] text-on-surface-variant">Đã kích hoạt</span>
                </div>
              </div>

              <div className="p-space-md rounded-lg bg-surface-container-low flex items-start justify-between gap-space-sm">
                <div className="flex items-start gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-on-surface truncate font-mono">
                      ORD-20241024-8898
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Gói PRO 1 Năm • Vietcombank
                    </span>
                    <span className="text-[11px] text-outline mt-0.5">18 phút trước</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[13px] font-bold text-emerald-600 tabular-nums">
                    +990.000đ
                  </span>
                  <span className="block text-[11px] text-on-surface-variant">Đã kích hoạt</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Global Throttling & Limits Control */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-on-surface">tune</span>
                <h3 className="text-[18px] text-on-surface font-bold">Hạn mức toàn hệ thống</h3>
              </div>
              {editingLimits ? (
                <button
                  type="button"
                  onClick={handleSaveGlobalLimits}
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  Lưu thay đổi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftDelay(extensionSettings.minDelaySec);
                    setDraftDailyLimit(extensionSettings.dailyLimitPerAccount);
                    setDraftSyncHours(extensionSettings.groupSyncHours);
                    setEditingLimits(true);
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>

            <div className="flex flex-col gap-space-sm text-[13px]">
              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                <div className="flex flex-col">
                  <span className="font-medium text-on-surface">Giãn cách giữa 2 bài đăng</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Chống cờ thuật toán Meta
                  </span>
                </div>
                {editingLimits ? (
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={draftDelay}
                    onChange={(e) => setDraftDelay(Number(e.target.value))}
                    className="w-20 h-7 px-2 rounded bg-surface-container-lowest text-right font-bold text-primary text-xs"
                  />
                ) : (
                  <span className="text-[13px] font-bold text-primary px-space-sm py-0.5 bg-surface-container-lowest rounded shadow-xs tabular-nums">
                    {extensionSettings.minDelaySec} giây
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                <div className="flex flex-col">
                  <span className="font-medium text-on-surface">
                    Giới hạn bài tối đa/ngày/tài khoản
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Hạn mức mặc định gói Member
                  </span>
                </div>
                {editingLimits ? (
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={draftDailyLimit}
                    onChange={(e) => setDraftDailyLimit(Number(e.target.value))}
                    className="w-20 h-7 px-2 rounded bg-surface-container-lowest text-right font-bold text-primary text-xs"
                  />
                ) : (
                  <span className="text-[13px] font-bold text-primary px-space-sm py-0.5 bg-surface-container-lowest rounded shadow-xs tabular-nums">
                    {extensionSettings.dailyLimitPerAccount} bài
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low">
                <div className="flex flex-col">
                  <span className="font-medium text-on-surface">Đồng bộ nhóm tự động</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Chu kỳ quét danh sách group
                  </span>
                </div>
                {editingLimits ? (
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={draftSyncHours}
                    onChange={(e) => setDraftSyncHours(Number(e.target.value))}
                    className="w-20 h-7 px-2 rounded bg-surface-container-lowest text-right font-bold text-primary text-xs"
                  />
                ) : (
                  <span className="text-[13px] font-bold text-primary px-space-sm py-0.5 bg-surface-container-lowest rounded shadow-xs tabular-nums">
                    {extensionSettings.groupSyncHours} giờ/lần
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-surface-container">
            <div className="px-5 py-3.5 bg-surface-container-low flex items-center justify-between">
              <h4 className="text-sm font-bold text-on-surface">Thêm người dùng mới</h4>
              <button
                type="button"
                onClick={() => setAddUserModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface">Họ và tên *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ví dụ: Lê Minh Khôi"
                  className="h-8 px-3 rounded-lg bg-surface-container-low text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-on-surface">Email *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="khoi.le@agency.vn"
                  className="h-8 px-3 rounded-lg bg-surface-container-low text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-on-surface">Vai trò</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="h-8 px-2.5 rounded-lg bg-surface-container-low text-xs"
                  >
                    <option value="Member">Member</option>
                    <option value="Admin">Admin</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-on-surface">Gói dịch vụ</label>
                  <select
                    value={newUserPlan}
                    onChange={(e) => setNewUserPlan(e.target.value as PlanTier)}
                    className="h-8 px-2.5 rounded-lg bg-surface-container-low text-xs"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="BUSINESS">BUSINESS</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="h-8 px-4 rounded-lg bg-surface-container text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
