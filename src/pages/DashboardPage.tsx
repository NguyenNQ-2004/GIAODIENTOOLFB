import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TaskDrawer } from '../components/TaskDrawer';
import { useApp } from '../state/AppContext';
import type { TaskStatus } from '../types/domain';
import {
  buildCalendarMonthGrid,
  formatVietnamDateTime,
  formatVietnamTime,
  getVietnamDateKey,
  isWithinDateFilter,
} from '../utils/dateTime';
import { getTaskProgress, TASK_STATUS_META } from '../utils/taskStatus';

const ALL_STATUSES: TaskStatus[] = [
  'SCHEDULED',
  'QUEUED',
  'RUNNING',
  'WAITING_CONFIRMATION',
  'PAUSED',
  'COMPLETED',
  'PARTIAL_FAILED',
  'FAILED',
  'NEEDS_REVIEW',
  'CANCELLED',
];

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const PAGE_SIZE = 6;

export const DashboardPage: React.FC = () => {
  const { tasks, accounts } = useApp();

  const [dateFilter, setDateFilter] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Real dynamic current month/year for calendar (never hardcoded 2024)
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  // Date & Account filtered tasks (used for KPIs and status counts)
  const baseFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const refIso = t.scheduledAt ?? t.createdAt;
      if (!isWithinDateFilter(refIso, dateFilter)) return false;
      if (accountFilter !== 'ALL' && t.facebookAccountId !== accountFilter) return false;
      return true;
    });
  }, [tasks, dateFilter, accountFilter]);

  // Real computed KPIs (zero hardcoded offsets)
  const kpis = useMemo(() => {
    let successItems = 0;
    let activeTasks = 0;
    let attentionTasks = 0;

    for (const t of baseFilteredTasks) {
      const p = getTaskProgress(t.items);
      successItems += p.completed;
      if (
        t.status === 'SCHEDULED' ||
        t.status === 'QUEUED' ||
        t.status === 'RUNNING' ||
        t.status === 'WAITING_CONFIRMATION' ||
        t.status === 'PAUSED'
      ) {
        activeTasks += 1;
      }
      if (
        t.status === 'FAILED' ||
        t.status === 'PARTIAL_FAILED' ||
        t.status === 'NEEDS_REVIEW'
      ) {
        attentionTasks += 1;
      }
    }

    return {
      totalTasks: baseFilteredTasks.length,
      successItems,
      activeTasks,
      attentionTasks,
    };
  }, [baseFilteredTasks]);

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: baseFilteredTasks.length };
    for (const s of ALL_STATUSES) counts[s] = 0;
    for (const t of baseFilteredTasks) {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    }
    return counts;
  }, [baseFilteredTasks]);

  // Final filtered task list
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseFilteredTasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (selectedCalendarDateKey) {
        const refKey = getVietnamDateKey(t.scheduledAt ?? t.createdAt);
        if (refKey !== selectedCalendarDateKey) return false;
      }
      if (q) {
        const idMatch = t.id.toLowerCase().includes(q);
        const itemMatch = t.items.some(
          (i) =>
            i.destinationNameSnapshot.toLowerCase().includes(q) ||
            i.contentSnapshot.toLowerCase().includes(q)
        );
        if (!idMatch && !itemMatch) return false;
      }
      return true;
    });
  }, [baseFilteredTasks, statusFilter, selectedCalendarDateKey, search]);

  // Reset pagination whenever filters change
  useEffect(() => {
    setPage(1);
  }, [dateFilter, accountFilter, statusFilter, search, selectedCalendarDateKey]);

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = useMemo(
    () => visibleTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [visibleTasks, safePage]
  );

  // Calendar grid & scheduled task counts per day
  const calendarCells = useMemo(
    () => buildCalendarMonthGrid(calendarCursor.year, calendarCursor.month),
    [calendarCursor]
  );

  const scheduledByDateKey = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (!t.scheduledAt) continue;
      const key = getVietnamDateKey(t.scheduledAt);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const handleShiftMonth = (delta: number) => {
    setCalendarCursor((prev) => {
      const nextDate = new Date(prev.year, prev.month + delta, 1);
      return { year: nextDate.getFullYear(), month: nextDate.getMonth() };
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tổng quan &amp; Lịch đăng bài</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi toàn bộ tác vụ đã lên lịch, chờ xác nhận và lịch sử thực thi theo giờ Việt Nam (GMT+7).
          </p>
        </div>
        <Link
          to="/post"
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[17px]">add</span>
          Tạo tác vụ đăng mới
        </Link>
      </div>

      {/* Real Computed KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Tổng tác vụ (theo lọc)',
            value: kpis.totalTasks,
            icon: 'assignment',
            tone: 'bg-blue-50 text-blue-700',
          },
          {
            label: 'Mục đăng thành công',
            value: kpis.successItems,
            icon: 'check_circle',
            tone: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Đang chờ / Chờ xác nhận',
            value: kpis.activeTasks,
            icon: 'schedule',
            tone: 'bg-amber-50 text-amber-700',
          },
          {
            label: 'Lỗi / Cần kiểm tra',
            value: kpis.attentionTasks,
            icon: 'error_outline',
            tone: 'bg-rose-50 text-rose-700',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{card.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content: Task Table + Dynamic Calendar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT: Filterable Tasks List */}
        <section className="xl:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <span className="material-symbols-outlined text-[17px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên nhóm, Fanpage hoặc nội dung..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>

              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value as 'today' | '7d' | '30d' | 'all')
                }
                aria-label="Lọc theo thời gian"
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
              </select>

              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                aria-label="Lọc theo tài khoản"
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 max-w-[200px]"
              >
                <option value="ALL">Tất cả hồ sơ</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Calendar Day Pill */}
            {selectedCalendarDateKey && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold inline-flex items-center gap-1.5">
                  Đang lọc theo ngày: {selectedCalendarDateKey}
                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDateKey(null)}
                    aria-label="Bỏ lọc ngày"
                    className="hover:text-blue-950"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              </div>
            )}

            {/* Status Filter Chips covering all 10 canonical TaskStatus values */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả ({statusCounts.ALL})
              </button>
              {ALL_STATUSES.map((st) => {
                const meta = TASK_STATUS_META[st];
                const count = statusCounts[st] ?? 0;
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {meta.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tasks List */}
          {paginatedTasks.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-slate-300">
                event_note
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {tasks.length === 0
                  ? 'Chưa có tác vụ đăng bài nào'
                  : 'Không có tác vụ phù hợp với bộ lọc hiện tại'}
              </p>
              <p className="text-xs text-slate-500">
                {tasks.length === 0
                  ? 'Hãy vào trang Đăng bài Facebook để tạo tác vụ đầu tiên.'
                  : 'Thử đổi bộ lọc trạng thái, khoảng thời gian hoặc từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedTasks.map((task) => {
                const progress = getTaskProgress(task.items);
                const meta = TASK_STATUS_META[task.status];
                const acc = task.facebookAccountId
                  ? accountMap.get(task.facebookAccountId)
                  : null;
                const firstItem = task.items[0];

                return (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {task.targetType === 'GROUP' ? 'Nhóm Facebook' : 'Fanpage'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {task.scheduledAt
                            ? `Lịch: ${formatVietnamDateTime(task.scheduledAt)}`
                            : `Tạo: ${formatVietnamDateTime(task.createdAt)}`}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-900 line-clamp-1">
                        {firstItem?.contentSnapshot ||
                          firstItem?.linkSnapshot ||
                          `Tác vụ ${task.items.length} mục`}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>Hồ sơ: {acc ? acc.displayName : 'Chưa gán'}</span>
                        <span>
                          Đích: {firstItem?.destinationNameSnapshot ?? '—'}
                          {task.items.length > 1 ? ` +${task.items.length - 1} khác` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-28">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">
                            {progress.completed}/{progress.total}
                          </span>
                          <span className="text-slate-500">{progress.progressPercent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${progress.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTaskId(task.id)}
                        className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {visibleTasks.length > PAGE_SIZE && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Trang <strong>{safePage}</strong> / {totalPages} ({visibleTasks.length} tác vụ)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Dynamic Current-Month Calendar */}
        <aside className="xl:col-span-4 bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tháng {calendarCursor.month + 1} / {calendarCursor.year}
              </h2>
              <p className="text-[11px] text-slate-500">Lịch tác vụ đã hẹn giờ (GMT+7)</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleShiftMonth(-1)}
                aria-label="Tháng trước"
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });
                  setSelectedCalendarDateKey(null);
                }}
                className="h-7 px-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleShiftMonth(1)}
                aria-label="Tháng sau"
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
            {WEEKDAYS_VI.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const dayTasks = scheduledByDateKey.get(cell.dateKey) ?? [];
              const isSelected = selectedCalendarDateKey === cell.dateKey;
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedCalendarDateKey((prev) =>
                      prev === cell.dateKey ? null : cell.dateKey
                    )
                  }
                  className={`h-10 rounded-lg text-xs flex flex-col items-center justify-center relative transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : cell.isToday
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : cell.inCurrentMonth
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{cell.dayOfMonth}</span>
                  {dayTasks.length > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-blue-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Scheduled items for selected date or upcoming */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-800">
              {selectedCalendarDateKey
                ? `Lịch đăng ngày ${selectedCalendarDateKey}`
                : 'Tác vụ hẹn giờ sắp tới'}
            </p>
            {(() => {
              const list = selectedCalendarDateKey
                ? scheduledByDateKey.get(selectedCalendarDateKey) ?? []
                : tasks
                    .filter((t) => Boolean(t.scheduledAt) && t.status !== 'CANCELLED')
                    .sort(
                      (a, b) =>
                        new Date(a.scheduledAt!).getTime() -
                        new Date(b.scheduledAt!).getTime()
                    )
                    .slice(0, 4);

              if (list.length === 0) {
                return (
                  <p className="text-xs text-slate-500 py-2">
                    Không có tác vụ lên lịch nào trong mục này.
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {list.map((t) => {
                    const meta = TASK_STATUS_META[t.status];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTaskId(t.id)}
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono font-semibold text-blue-700">
                            {formatVietnamTime(t.scheduledAt)} ·{' '}
                            {getVietnamDateKey(t.scheduledAt!)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 truncate mt-1">
                          {t.items[0]?.destinationNameSnapshot ?? 'Tác vụ hẹn giờ'} (
                          {t.items.length} mục)
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </aside>
      </div>

      {/* Live Reactive Task Drawer */}
      <TaskDrawer taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
    </div>
  );
};
