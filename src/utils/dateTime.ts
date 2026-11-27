/**
 * Date/time utilities: store ISO-8601 UTC, render in Asia/Ho_Chi_Minh (GMT+7).
 */

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMinutesIso(minutes: number, baseDate: Date = new Date()): string {
  return new Date(baseDate.getTime() + minutes * 60_000).toISOString();
}

export function addDaysIso(days: number, baseDate: Date = new Date()): string {
  return new Date(baseDate.getTime() + days * 86_400_000).toISOString();
}

/**
 * Returns default future schedule string formatted for <input type="datetime-local">
 * in GMT+7 (Vietnam time), ~30 minutes ahead rounded up to 5-minute step.
 */
export function getDefaultFutureLocalDateTime(baseDate: Date = new Date()): string {
  const futureMs = baseDate.getTime() + 30 * 60_000;
  const roundedMs = Math.ceil(futureMs / (5 * 60_000)) * (5 * 60_000);
  return isoToVietnamDatetimeLocal(new Date(roundedMs).toISOString());
}

/**
 * Converts an ISO UTC string into "YYYY-MM-DDTHH:mm" in GMT+7 for datetime-local inputs.
 */
export function isoToVietnamDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Parses a "YYYY-MM-DDTHH:mm" string entered in GMT+7 into a canonical ISO-8601 UTC string.
 */
export function vietnamDatetimeLocalToIso(localValue: string): string | null {
  if (!localValue || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue.trim())) {
    return null;
  }
  const date = new Date(`${localValue.trim()}:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isFutureTimestamp(iso: string, now: Date = new Date()): boolean {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() > now.getTime();
}

export function formatVietnamDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatVietnamDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatVietnamTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getVietnamDateKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function getVietnamTodayKey(now: Date = new Date()): string {
  return getVietnamDateKey(now.toISOString()) ?? '';
}

export function isWithinDateFilter(
  iso: string | null | undefined,
  filter: 'today' | '7d' | '30d' | 'all',
  now: Date = new Date()
): boolean {
  if (filter === 'all') return true;
  if (!iso) return false;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;

  if (filter === 'today') {
    return getVietnamDateKey(iso) === getVietnamTodayKey(now);
  }
  const days = filter === '7d' ? 7 : 30;
  const cutoff = now.getTime() - days * 86_400_000;
  return target.getTime() >= cutoff;
}

export function formatRelativeTimeVi(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'Chưa có';
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return 'Chưa có';
  const diffSec = Math.floor((now.getTime() - target.getTime()) / 1000);
  if (diffSec < 0) return `Sắp tới (${formatVietnamDateTime(iso)})`;
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return formatVietnamDate(iso);
}

export interface CountdownState {
  isExpired: boolean;
  remainingSeconds: number;
  formatted: string;
}

export function computeCountdown(expiresAtIso: string, now: Date = new Date()): CountdownState {
  const target = new Date(expiresAtIso);
  if (Number.isNaN(target.getTime())) {
    return { isExpired: true, remainingSeconds: 0, formatted: '00:00' };
  }
  const diffSec = Math.floor((target.getTime() - now.getTime()) / 1000);
  if (diffSec <= 0) {
    return { isExpired: true, remainingSeconds: 0, formatted: '00:00' };
  }
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return {
    isExpired: false,
    remainingSeconds: diffSec,
    formatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
  };
}

export interface CalendarCell {
  dateKey: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generates a 6-week (or 5-week) Monday-first calendar grid for a given year & 0-indexed month.
 */
export function buildCalendarMonthGrid(
  year: number,
  monthZeroIndexed: number,
  now: Date = new Date()
): CalendarCell[] {
  const firstOfMonth = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const daysInMonth = new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate();
  // Convert JS Sun=0..Sat=6 to Mon=0..Sun=6
  const startWeekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const todayKey = getVietnamTodayKey(now);

  const cells: CalendarCell[] = [];

  // Leading days from previous month
  const prevMonthDays = new Date(Date.UTC(year, monthZeroIndexed, 0)).getUTCDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevDate = new Date(Date.UTC(year, monthZeroIndexed - 1, d));
    const dateKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      dateKey,
      dayOfMonth: d,
      inCurrentMonth: false,
      isToday: dateKey === todayKey,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(monthZeroIndexed + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      dateKey,
      dayOfMonth: d,
      inCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  // Trailing days to complete last row (multiple of 7)
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailing = 7 - remainder;
    for (let d = 1; d <= trailing; d++) {
      const nextDate = new Date(Date.UTC(year, monthZeroIndexed + 1, d));
      const dateKey = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateKey,
        dayOfMonth: d,
        inCurrentMonth: false,
        isToday: dateKey === todayKey,
      });
    }
  }

  return cells;
}
