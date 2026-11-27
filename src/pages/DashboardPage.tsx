import React, { useMemo, useState } from 'react';
import { FacebookAccount, PublishingTask, TaskStatus } from '../types/app';
import { UPCOMING_SCHEDULE_ITEMS } from '../data/mockData';

interface DashboardPageProps {
  tasks: PublishingTask[];
  accounts: FacebookAccount[];
  onOpenDrawer: (taskId: string) => void;
  onNavigateToSchedule: () => void;
  onPauseResume: (taskId: string) => void;
  onConfirmWaiting: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onRetryFailed: (taskId: string) => void;
  onUpdateTaskSchedule: (taskId: string, newTime: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

type FilterTab = 'ALL' | TaskStatus;

export const DashboardPage: React.FC<DashboardPageProps> = ({
  tasks,
  accounts,
  onOpenDrawer,
  onNavigateToSchedule,
  onPauseResume,
  onConfirmWaiting,
  onCancelTask,
  onRetryFailed,
  onUpdateTaskSchedule,
  onNotify,
}) => {
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [statusFilter, setStatusFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [calendarDayFilter, setCalendarDayFilter] = useState<number | null>(null);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  // Edit schedule modal state
  const [editingTask, setEditingTask] = useState<PublishingTask | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState<string>('2024-10-24T17:30');

  const counts = useMemo(() => {
    return {
      ALL: tasks.length,
      RUNNING: tasks.filter((t) => t.status === 'RUNNING').length,
      SCHEDULED: tasks.filter((t) => t.status === 'SCHEDULED').length,
      WAITING_CONFIRMATION: tasks.filter((t) => t.status === 'WAITING_CONFIRMATION').length,
      COMPLETED: tasks.filter((t) => t.status === 'COMPLETED').length,
      PARTIAL_FAILED: tasks.filter((t) => t.status === 'PARTIAL_FAILED').length,
      CANCELLED: tasks.filter((t) => t.status === 'CANCELLED').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (accountFilter !== 'ALL' && task.accountId !== accountFilter) return false;
      if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;
      if (calendarDayFilter && task.calendarDay && task.calendarDay !== calendarDayFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          task.id.toLowerCase().includes(q) ||
          task.content.toLowerCase().includes(q) ||
          task.accountName.toLowerCase().includes(q) ||
          task.destinationDetail.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [tasks, accountFilter, statusFilter, calendarDayFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetFilters = () => {
    setAccountFilter('ALL');
    setDateFilter('today');
    setStatusFilter('ALL');
    setSearchQuery('');
    setCalendarDayFilter(null);
    setCurrentPage(1);
    onNotify('info', 'Đã đặt lại toàn bộ bộ lọc tác vụ.');
  };

  const monthNames = ['Tháng 9, 2024', 'Tháng 10, 2024', 'Tháng 11, 2024'];
  const activeMonthLabel = monthNames[1 + calendarMonthOffset] || 'Tháng 10, 2024';
  const taskDays = new Set([24, 25, 26, 28]);

  const statusTabs: { key: FilterTab; label: string; count: number; badgeClass: string }[] = [
    { key: 'ALL', label: 'Tất cả', count: counts.ALL, badgeClass: 'bg-primary/20 text-on-primary' },
    {
      key: 'RUNNING',
      label: 'Đang chạy',
      count: counts.RUNNING,
      badgeClass: 'bg-surface-container-high text-primary-container',
    },
    {
      key: 'SCHEDULED',
      label: 'Chờ tới giờ',
      count: counts.SCHEDULED,
      badgeClass: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'WAITING_CONFIRMATION',
      label: 'Chờ xác nhận',
      count: counts.WAITING_CONFIRMATION,
      badgeClass: 'bg-indigo-100 text-indigo-700',
    },
    {
      key: 'COMPLETED',
      label: 'Hoàn thành',
      count: counts.COMPLETED,
      badgeClass: 'bg-emerald-100 text-emerald-800',
    },
    {
      key: 'PARTIAL_FAILED',
      label: 'Thất bại',
      count: counts.PARTIAL_FAILED,
      badgeClass: 'bg-rose-100 text-rose-800',
    },
    {
      key: 'CANCELLED',
      label: 'Đã hủy',
      count: counts.CANCELLED,
      badgeClass: 'bg-surface-container text-secondary',
    },
  ];

  const renderStatusPill = (status: TaskStatus) => {
    switch (status) {
      case 'RUNNING':
        return (
          <div className="inline-flex items-center gap-1 bg-blue-100 text-primary-container px-1.5 py-[2px] rounded text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping" />
            <span>ĐANG CHẠY</span>
          </div>
        );
      case 'WAITING_CONFIRMATION':
        return (
          <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-1.5 py-[2px] rounded text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>CHỜ DUYỆT</span>
          </div>
        );
      case 'SCHEDULED':
        return (
          <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-[2px] rounded text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>CHỜ TỚI GIỜ</span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-1.5 py-[2px] rounded text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>HOÀN THÀNH</span>
          </div>
        );
      case 'PARTIAL_FAILED':
        return (
          <div className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-1.5 py-[2px] rounded text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            <span>LỖI MỘT PHẦN</span>
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="inline-flex items-center gap-1 bg-surface-container text-secondary px-1.5 py-[2px] rounded text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>ĐÃ HỦY</span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Command Toolbar & Filters */}
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          {/* Account Selector */}
          <div className="relative min-w-[210px]">
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-[5px] rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-primary-container shrink-0">
                account_circle
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] text-on-surface-variant leading-none">
                  Tài khoản Facebook
                </span>
                <select
                  value={accountFilter}
                  onChange={(e) => {
                    setAccountFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs text-on-surface font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="ALL">Tất cả tài khoản ({accounts.length})</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="relative min-w-[190px]">
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-[5px] rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                calendar_today
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] text-on-surface-variant leading-none">
                  Khoảng thời gian
                </span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs text-on-surface font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="today">Hôm nay, 24/10/2024</option>
                  <option value="7d">7 ngày gần nhất</option>
                  <option value="30d">Tháng 10/2024</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[170px]">
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-[5px] rounded-lg hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                filter_list
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] text-on-surface-variant leading-none">
                  Trạng thái tác vụ
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as FilterTab);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs text-on-surface font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="RUNNING">Đang chạy</option>
                  <option value="SCHEDULED">Chờ tới giờ</option>
                  <option value="WAITING_CONFIRMATION">Chờ xác nhận</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="PARTIAL_FAILED">Lỗi một phần</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="h-9 px-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
            title="Đặt lại bộ lọc"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            type="button"
            onClick={() => tasks[0] && onOpenDrawer(tasks[0].id)}
            className="h-8 px-space-md rounded-lg bg-surface-container text-on-surface text-[13px] font-medium hover:bg-surface-container-high transition-colors flex items-center gap-space-xs whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
            <span>Mở Drawer tác vụ</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToSchedule}
            className="h-8 px-space-lg rounded-lg bg-primary-container text-on-primary text-[13px] hover:bg-primary transition-colors flex items-center gap-space-xs font-semibold shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">add_task</span>
            <span>+ Lên lịch mới</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-surface-container-low rounded-full pointer-events-none transition-transform group-hover:scale-125" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Hoàn thành hôm nay
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="text-[28px] font-bold text-on-surface tabular-nums">
              {String(17 + counts.COMPLETED).padStart(2, '0')}
            </span>
            <span className="text-xs text-on-surface-variant">tác vụ</span>
            <span className="ml-auto text-[11px] text-emerald-800 bg-emerald-100 px-1.5 py-[2px] rounded font-semibold">
              100% mục tiêu
            </span>
          </div>
          <div className="mt-space-xs flex items-center gap-space-xs text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px] text-emerald-600">done_all</span>
            <span>Tác vụ đã hoàn tất trong ngày</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('RUNNING')}
          className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-surface-container-low rounded-full pointer-events-none transition-transform group-hover:scale-125" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Đang chạy
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="text-[28px] font-bold text-primary-container tabular-nums">
              {String(counts.RUNNING).padStart(2, '0')}
            </span>
            <span className="text-xs text-on-surface-variant">tác vụ</span>
            <span className="ml-auto text-[11px] text-primary-container bg-surface-container-high px-1.5 py-[2px] rounded font-semibold">
              Đang chạy
            </span>
          </div>
          <div className="mt-space-xs flex items-center gap-space-xs text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px] text-primary">hub</span>
            <span>Đang phân phối tới các nhóm</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('SCHEDULED')}
          className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-surface-container-low rounded-full pointer-events-none transition-transform group-hover:scale-125" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Chờ tới giờ
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="text-[28px] font-bold text-amber-800 tabular-nums">
              {String(4 + counts.SCHEDULED).padStart(2, '0')}
            </span>
            <span className="text-xs text-on-surface-variant">tác vụ</span>
            <span className="ml-auto text-[11px] text-amber-800 bg-amber-100 px-1.5 py-[2px] rounded font-semibold">
              Xếp hàng
            </span>
          </div>
          <div className="mt-space-xs flex items-center gap-space-xs text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px] text-amber-600">alarm</span>
            <span>Đã lên lịch trong tương lai</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('PARTIAL_FAILED')}
          className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-surface-container-low rounded-full pointer-events-none transition-transform group-hover:scale-125" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Thất bại / Lỗi
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <span className="material-symbols-outlined text-[18px]">error</span>
            </span>
          </div>
          <div className="mt-space-xs flex items-baseline gap-space-xs">
            <span className="text-[28px] font-bold text-rose-700 tabular-nums">
              {String(counts.PARTIAL_FAILED).padStart(2, '0')}
            </span>
            <span className="text-xs text-on-surface-variant">tác vụ</span>
            <span className="ml-auto text-[11px] text-rose-800 bg-rose-100 px-1.5 py-[2px] rounded font-semibold">
              Cần thử lại
            </span>
          </div>
          <div className="mt-space-xs flex items-center gap-space-xs text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px] text-rose-600">
              report_problem
            </span>
            <span>Cần kiểm tra hoặc chạy lại</span>
          </div>
        </div>
      </section>

      {/* Main Content Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column: Task Data Table & Status Tabs */}
        <section className="lg:col-span-9 flex flex-col gap-space-md">
          {/* Status Tabs */}
          <div className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex items-center gap-space-xs overflow-x-auto no-scrollbar">
            {statusTabs.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`px-space-md py-[6px] rounded-lg text-[13px] shrink-0 flex items-center gap-space-xs transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                      : 'hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-[6px] py-[1px] rounded text-[11px] font-bold tabular-nums ${
                      active ? 'bg-primary/40 text-on-primary' : tab.badgeClass
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Task Table Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-space-lg py-space-sm bg-surface-container-low/50 flex flex-wrap items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <span className="text-[13px] font-semibold text-on-surface">
                  Danh sách tác vụ phát hành
                </span>
                <span className="text-[11px] text-on-surface-variant bg-surface-container-high px-1.5 py-[2px] rounded tabular-nums">
                  {filteredTasks.length} hiển thị / {tasks.length} tổng số
                </span>
                {calendarDayFilter && (
                  <button
                    type="button"
                    onClick={() => setCalendarDayFilter(null)}
                    className="text-[11px] bg-primary-fixed text-primary px-2 py-[2px] rounded font-medium flex items-center gap-1"
                  >
                    <span>Ngày {calendarDayFilter}/10</span>
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-space-sm">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-2 text-[16px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm theo nội dung, ID..."
                    className="h-8 pl-7 pr-3 text-[13px] bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary w-52"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onNotify('success', 'Đã đồng bộ trạng thái hàng đợi mới nhất.')}
                  className="h-8 px-space-sm bg-surface-container-lowest rounded-lg hover:bg-surface-container text-on-surface flex items-center justify-center"
                  title="Làm mới danh sách"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/70 text-on-surface-variant text-[11px] uppercase tracking-wider">
                    <th className="py-space-sm px-space-md w-32">Trạng thái</th>
                    <th className="py-space-sm px-space-md min-w-[230px]">Nội dung tác vụ</th>
                    <th className="py-space-sm px-space-md w-40">Tài khoản</th>
                    <th className="py-space-sm px-space-md min-w-[150px]">Đích đăng</th>
                    <th className="py-space-sm px-space-md w-32">Tiến độ</th>
                    <th className="py-space-sm px-space-md w-36">Thời gian</th>
                    <th className="py-space-sm px-space-md text-right w-44">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/60 text-[13px] text-on-surface">
                  {paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-[32px] text-outline">
                            inbox
                          </span>
                          <p className="text-sm font-medium">
                            Không tìm thấy tác vụ nào phù hợp với bộ lọc.
                          </p>
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="text-xs text-primary font-semibold hover:underline"
                          >
                            Đặt lại bộ lọc
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task) => {
                      const pct =
                        task.totalCount > 0
                          ? Math.round((task.completedCount / task.totalCount) * 100)
                          : 0;
                      const mediaIcon =
                        task.mediaType === 'video'
                          ? 'videocam'
                          : task.mediaType === 'link'
                          ? 'link'
                          : task.mediaType === 'image'
                          ? 'image'
                          : 'photo_library';

                      return (
                        <tr
                          key={task.id}
                          className={`transition-colors group ${
                            task.status === 'PARTIAL_FAILED'
                              ? 'bg-rose-50/30 hover:bg-rose-50/60'
                              : task.status === 'WAITING_CONFIRMATION'
                              ? 'bg-surface-container-low/20 hover:bg-surface-container-low/60'
                              : 'hover:bg-surface-container-low/50'
                          }`}
                        >
                          <td className="py-space-md px-space-md align-top">
                            {renderStatusPill(task.status)}
                            <div className="text-[11px] text-on-surface-variant font-mono mt-1">
                              #{task.id}
                            </div>
                          </td>

                          <td className="py-space-md px-space-md align-top">
                            <div className="flex items-start gap-space-xs">
                              <span
                                className={`text-[11px] bg-surface-container px-1.5 py-[1px] rounded font-semibold shrink-0 ${
                                  task.status === 'PARTIAL_FAILED'
                                    ? 'text-rose-700'
                                    : 'text-primary-container'
                                }`}
                              >
                                Slot {task.slotNumber}
                              </span>
                              <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-[1px]">
                                {mediaIcon}
                              </span>
                              <span className="text-[11px] text-on-surface-variant font-medium">
                                {task.mediaSummary}
                              </span>
                            </div>
                            <p className="mt-1 text-on-surface font-medium line-clamp-2 leading-relaxed">
                              {task.content}
                            </p>
                          </td>

                          <td className="py-space-md px-space-md align-top">
                            <div className="flex items-center gap-space-xs">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  task.method === 'META_PAGE_API'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : task.accountInitials === 'TL'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-primary-container/20 text-primary-container'
                                }`}
                              >
                                {task.accountInitials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold truncate">
                                  {task.accountName}
                                </span>
                                <span className="text-[11px] text-on-surface-variant truncate">
                                  {task.accountRoleLabel}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md align-top">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-on-surface">
                                {task.destinationSummary}
                              </span>
                              <span
                                className={`text-[11px] truncate max-w-[150px] ${
                                  task.status === 'PARTIAL_FAILED'
                                    ? 'text-rose-700'
                                    : 'text-on-surface-variant'
                                }`}
                                title={task.destinationDetail}
                              >
                                {task.destinationDetail}
                              </span>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md align-top">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold tabular-nums">
                                <span
                                  className={
                                    task.status === 'COMPLETED'
                                      ? 'text-emerald-700'
                                      : task.status === 'PARTIAL_FAILED'
                                      ? 'text-rose-700'
                                      : task.status === 'WAITING_CONFIRMATION'
                                      ? 'text-amber-800'
                                      : task.status === 'RUNNING'
                                      ? 'text-primary-container'
                                      : 'text-on-surface-variant'
                                  }
                                >
                                  {task.completedCount}/{task.totalCount}
                                </span>
                                <span
                                  className={
                                    task.status === 'COMPLETED'
                                      ? 'text-emerald-700'
                                      : task.status === 'PARTIAL_FAILED'
                                      ? 'text-rose-700'
                                      : task.status === 'WAITING_CONFIRMATION'
                                      ? 'text-amber-800'
                                      : task.status === 'RUNNING'
                                      ? 'text-primary-container'
                                      : 'text-on-surface-variant'
                                  }
                                >
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    task.status === 'COMPLETED'
                                      ? 'bg-emerald-600'
                                      : task.status === 'PARTIAL_FAILED'
                                      ? 'bg-rose-600'
                                      : task.status === 'WAITING_CONFIRMATION'
                                      ? 'bg-amber-500'
                                      : task.status === 'RUNNING'
                                      ? 'bg-primary-container animate-pulse'
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md align-top">
                            <span
                              className={`text-xs block font-medium tabular-nums ${
                                task.status === 'SCHEDULED'
                                  ? 'text-amber-800 font-semibold'
                                  : 'text-on-surface'
                              }`}
                            >
                              {task.scheduledLabel}
                            </span>
                            <span
                              className={`text-[11px] ${
                                task.status === 'COMPLETED' || task.status === 'RUNNING'
                                  ? 'text-emerald-700'
                                  : task.status === 'WAITING_CONFIRMATION'
                                  ? 'text-amber-800 font-medium'
                                  : task.status === 'PARTIAL_FAILED'
                                  ? 'text-rose-700 font-medium'
                                  : 'text-on-surface-variant'
                              }`}
                            >
                              {task.subTimeLabel}
                            </span>
                          </td>

                          <td className="py-space-md px-space-md align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              {task.status === 'RUNNING' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onPauseResume(task.id)}
                                    className="h-7 px-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      pause
                                    </span>
                                    <span>Dừng</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDrawer(task.id)}
                                    className="h-7 px-2 rounded bg-primary-container hover:bg-primary text-on-primary text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      open_in_new
                                    </span>
                                    <span>Chi tiết</span>
                                  </button>
                                </>
                              )}

                              {task.status === 'WAITING_CONFIRMATION' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onConfirmWaiting(task.id)}
                                    className="h-7 px-2 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      fact_check
                                    </span>
                                    <span>Xác nhận</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDrawer(task.id)}
                                    className="h-7 px-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center transition-colors"
                                    title="Xem chi tiết"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      visibility
                                    </span>
                                  </button>
                                </>
                              )}

                              {task.status === 'SCHEDULED' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTask(task);
                                      setNewScheduleTime('2024-10-24T17:30');
                                    }}
                                    className="h-7 px-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      edit_calendar
                                    </span>
                                    <span>Sửa lịch</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onCancelTask(task.id)}
                                    className="h-7 px-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center transition-colors"
                                    title="Hủy tác vụ"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      close
                                    </span>
                                  </button>
                                </>
                              )}

                              {task.status === 'COMPLETED' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDrawer(task.id)}
                                    className="h-7 px-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px] text-primary">
                                      visibility
                                    </span>
                                    <span>Xem bài</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDrawer(task.id)}
                                    className="h-7 px-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center transition-colors"
                                    title="Xem chi tiết"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      more_horiz
                                    </span>
                                  </button>
                                </>
                              )}

                              {task.status === 'PARTIAL_FAILED' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onRetryFailed(task.id)}
                                    className="h-7 px-2 rounded bg-rose-600 hover:bg-rose-700 text-on-primary text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      replay
                                    </span>
                                    <span>Thử lại</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenDrawer(task.id)}
                                    className="h-7 px-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center transition-colors"
                                    title="Xem log lỗi"
                                  >
                                    <span className="material-symbols-outlined text-[14px] text-rose-600">
                                      bug_report
                                    </span>
                                  </button>
                                </>
                              )}

                              {task.status === 'CANCELLED' && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDrawer(task.id)}
                                  className="h-7 px-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    visibility
                                  </span>
                                  <span>Chi tiết</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-space-lg py-space-sm bg-surface-container-lowest border-t border-surface-container/60 flex items-center justify-between text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-space-xs">
                <span>Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-surface-container-low px-1.5 py-[2px] rounded text-on-surface font-semibold focus:outline-none"
                >
                  <option value={10}>10 mục / trang</option>
                  <option value={25}>25 mục / trang</option>
                  <option value={50}>50 mục / trang</option>
                </select>
                <span>trong tổng {filteredTasks.length} tác vụ</span>
              </div>
              <div className="flex items-center gap-1 tabular-nums">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded flex items-center justify-center bg-surface-container-low hover:bg-surface-container disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded flex items-center justify-center font-semibold ${
                      currentPage === page
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-7 h-7 rounded flex items-center justify-center bg-surface-container-low hover:bg-surface-container disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Mini Calendar + Upcoming Schedule + Extension Card */}
        <aside className="lg:col-span-3 flex flex-col gap-space-md">
          {/* Mini Calendar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  calendar_month
                </span>
                <span className="text-[13px] font-semibold text-on-surface">
                  {activeMonthLabel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCalendarMonthOffset((v) => Math.max(-1, v - 1))}
                  className="w-6 h-6 rounded flex items-center justify-center bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Tháng trước"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonthOffset((v) => Math.min(1, v + 1))}
                  className="w-6 h-6 rounded flex items-center justify-center bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Tháng sau"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-on-surface-variant py-1">
              <span>T2</span>
              <span>T3</span>
              <span>T4</span>
              <span>T5</span>
              <span>T6</span>
              <span>T7</span>
              <span className="text-rose-500">CN</span>
            </div>

            <div className="grid grid-cols-7 text-center text-xs gap-y-1 tabular-nums">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const isToday = day === 24;
                const hasTask = taskDays.has(day);
                const isSelected = calendarDayFilter === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setCalendarDayFilter((prev) => (prev === day ? null : day))
                    }
                    className={`relative py-1 flex flex-col items-center justify-center rounded transition-colors ${
                      isSelected
                        ? 'bg-primary-fixed/60'
                        : 'hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className={
                        isToday
                          ? 'w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center shadow-sm'
                          : hasTask
                          ? 'font-semibold text-on-surface'
                          : day % 7 === 0
                          ? 'text-rose-600 font-medium'
                          : ''
                      }
                    >
                      {day}
                    </span>
                    {hasTask && (
                      <span
                        className={`w-1 h-1 rounded-full mt-[2px] ${
                          day === 28 ? 'bg-amber-500' : 'bg-primary-container'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-space-sm pt-space-xs flex items-center justify-between text-[11px] text-on-surface-variant border-t border-surface-container/60">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                <span>Có lịch đăng</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCalendarDayFilter(null);
                  setStatusFilter('SCHEDULED');
                }}
                className="text-primary hover:underline font-semibold"
              >
                Xem toàn bộ lịch
              </button>
            </div>
          </div>

          {/* Upcoming Scheduled Tasks */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">
                  update
                </span>
                <span className="text-[13px] font-semibold text-on-surface">
                  Lịch đăng tiếp theo
                </span>
              </div>
              <span className="text-[11px] bg-amber-100 text-amber-900 px-1.5 py-[1px] rounded font-semibold tabular-nums">
                {UPCOMING_SCHEDULE_ITEMS.length} tác vụ
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              {UPCOMING_SCHEDULE_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenDrawer(tasks[2]?.id || tasks[0].id)}
                  className="text-left p-space-xs bg-surface-container-low/50 hover:bg-surface-container-low rounded-lg transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] font-bold px-1.5 py-[1px] rounded tabular-nums ${
                        item.isToday
                          ? 'text-amber-900 bg-amber-100/80'
                          : 'text-primary-container bg-surface-container'
                      }`}
                    >
                      {item.timeBadge}
                    </span>
                    <span className="text-[10px] text-secondary font-mono">SCHEDULED</span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface truncate w-full">
                    {item.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant w-full">
                    <span>{item.target}</span>
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      arrow_forward
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter('SCHEDULED')}
              className="w-full mt-1 py-[6px] rounded-lg bg-surface-container hover:bg-surface-container-high text-primary-container text-xs font-semibold transition-colors flex items-center justify-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[16px]">calendar_view_week</span>
              <span>Xem chi tiết dòng thời gian</span>
            </button>
          </div>

          {/* Extension Status Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">
                Tiện ích Chrome Extension
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              FB Poster Automation v1.2.4 đang chạy nền trên trình duyệt, sẵn sàng điều khiển tác vụ nhóm.
            </p>
            <div className="mt-space-xs pt-space-xs flex items-center justify-between text-[11px] border-t border-surface-container/60">
              <span className="text-on-surface-variant">Độ trễ phản hồi:</span>
              <span className="font-semibold text-emerald-700 font-mono">18ms (Hoàn hảo)</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Edit Schedule Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-surface-container-low flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">
                  Cập nhật lịch đăng (#{editingTask.id})
                </h3>
                <p className="text-[11px] text-on-surface-variant">Múi giờ GMT+7 (Asia/Ho_Chi_Minh)</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <label className="text-xs font-medium text-on-surface">
                Chọn ngày &amp; giờ phát hành mới
              </label>
              <input
                type="datetime-local"
                value={newScheduleTime}
                onChange={(e) => setNewScheduleTime(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="px-5 py-3 bg-surface-container-low/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="h-8 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const formatted = newScheduleTime.replace('T', ' ');
                  onUpdateTaskSchedule(editingTask.id, formatted);
                  setEditingTask(null);
                }}
                className="h-8 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold"
              >
                Lưu lịch mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
