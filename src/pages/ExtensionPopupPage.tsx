import React, { useState } from 'react';
import {
  ExtensionSettings,
  FacebookAccount,
  PlanTier,
  PublishingTask,
} from '../types/app';
import { PLAN_SPECS } from '../data/mockData';
import { SafeImage } from '../components/SafeImage';

interface ExtensionPopupPageProps {
  accounts: FacebookAccount[];
  tasks: PublishingTask[];
  currentPlan: PlanTier;
  extensionSettings: ExtensionSettings;
  onUpdateSettings: (patch: Partial<ExtensionSettings>) => void;
  onPauseResumeTask: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onNavigateToPost: () => void;
  onNavigateToDashboard: () => void;
  onRefreshSession: (accountId: string) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

export const ExtensionPopupPage: React.FC<ExtensionPopupPageProps> = ({
  accounts,
  tasks,
  currentPlan,
  extensionSettings,
  onUpdateSettings,
  onPauseResumeTask,
  onCancelTask,
  onNavigateToPost,
  onNavigateToDashboard,
  onRefreshSession,
  onNotify,
}) => {
  const [viewMode, setViewMode] = useState<'live' | 'debugger'>('live');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [sessionExpiredSimulated, setSessionExpiredSimulated] = useState(false);

  // Local state for safety controls
  const [humanEmulation, setHumanEmulation] = useState(extensionSettings.humanEmulation);
  const [autoPause, setAutoPause] = useState(extensionSettings.autoPauseOnWarning);
  const [minDelay, setMinDelay] = useState(extensionSettings.minDelaySec);
  const [maxDelay, setMaxDelay] = useState(extensionSettings.maxDelaySec);
  const [dailyLimit, setDailyLimit] = useState(extensionSettings.dailyLimitPerAccount);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const activeTask =
    tasks.find((t) => t.status === 'RUNNING') ||
    tasks.find((t) => t.status === 'WAITING_CONFIRMATION') ||
    tasks[0];

  const planSpec = PLAN_SPECS[currentPlan];
  const taskPct =
    activeTask && activeTask.totalCount > 0
      ? Math.round((activeTask.completedCount / activeTask.totalCount) * 100)
      : 0;

  const handleSaveConfig = () => {
    onUpdateSettings({
      humanEmulation,
      autoPauseOnWarning: autoPause,
      minDelaySec: minDelay,
      maxDelaySec: maxDelay,
      dailyLimitPerAccount: dailyLimit,
    });
    onNotify('success', 'Đã lưu cấu hình an toàn Chrome Extension Manifest V3.');
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Command Context Bar */}
      <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <span className="text-[11px] uppercase tracking-wider text-primary font-semibold">
              Chế độ Mô phỏng Chrome Native
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-surface-container-highest" />
            <span className="text-[11px] text-on-surface-variant font-mono">
              Manifest V3 • Chromium 124+
            </span>
          </div>
          <h1 className="text-[24px] font-bold text-on-surface tracking-tight">
            Chrome Extension Popup Showcase
          </h1>
          <p className="text-[13px] text-on-surface-variant">
            Không gian kiểm thử giao diện cửa sổ tiện ích 385px x 590px, trạng thái thực thi tiến
            trình đăng và cơ chế chống Checkpoint.
          </p>
        </div>

        {/* Switcher Controls */}
        <div className="flex items-center gap-space-sm self-start lg:self-auto bg-surface-container-low p-space-xs rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('live')}
            className={`px-space-md py-space-xs rounded-lg text-[13px] font-medium flex items-center gap-space-xs transition-colors whitespace-nowrap ${
              viewMode === 'live'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>Popup Live View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('debugger')}
            className={`px-space-md py-space-xs rounded-lg text-[13px] font-medium flex items-center gap-space-xs transition-colors whitespace-nowrap ${
              viewMode === 'debugger'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">device_hub</span>
            <span>Sandbox Debugger</span>
          </button>
          <div className="w-px h-5 bg-surface-container-high mx-space-xs" />
          <div className="flex items-center gap-space-xs px-space-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-on-surface tabular-nums">Port: 8443</span>
          </div>
        </div>
      </div>

      {/* Main Showcase Container */}
      <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        {/* LEFT & CENTER (8 cols): Simulated Chrome Window */}
        <div className="xl:col-span-8 flex flex-col gap-space-lg">
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-md overflow-hidden">
            {/* Chrome Window Header */}
            <div className="w-full bg-surface-container-high px-space-md pt-space-sm pb-0 flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-space-sm bg-surface-container-lowest px-space-md py-1.5 rounded-t-lg shadow-sm">
                    <span className="material-symbols-outlined text-primary text-[16px]">
                      public
                    </span>
                    <span className="text-xs text-on-surface max-w-[160px] truncate font-medium">
                      Hội Cư Dân BĐS Cầu Giấy...
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                      close
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateToDashboard}
                    className="hidden sm:flex items-center gap-space-sm px-space-sm py-1.5 text-on-surface-variant opacity-80 hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[16px]">tab</span>
                    <span className="text-xs max-w-[120px] truncate">FB POST PRO Dash...</span>
                  </button>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                  add
                </span>
              </div>

              {/* Chrome Omnibox */}
              <div className="w-full bg-surface-container-lowest py-space-xs px-space-sm rounded-lg flex items-center justify-between gap-space-md shadow-sm mb-space-xs">
                <div className="flex items-center gap-space-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] p-1">arrow_back</span>
                  <span className="material-symbols-outlined text-[16px] p-1">arrow_forward</span>
                  <button
                    type="button"
                    onClick={() => onNotify('info', 'Đã tải lại ngữ cảnh DOM trang Facebook.')}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                  </button>
                </div>

                <div className="flex-1 bg-surface-container-low px-space-md py-1 rounded-md flex items-center justify-between gap-space-sm min-w-0">
                  <div className="flex items-center gap-space-xs overflow-hidden">
                    <span className="material-symbols-outlined text-emerald-600 text-[14px]">
                      lock
                    </span>
                    <span className="text-[11px] text-on-surface-variant">https://</span>
                    <span className="text-[11px] font-mono text-on-surface font-medium truncate">
                      www.facebook.com/groups/bds.caugiay.hanoi/composer
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                    star
                  </span>
                </div>

                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant p-1">
                    extension
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSessionExpiredSimulated(false)}
                      className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-md ring-2 ring-primary/30 relative"
                    >
                      <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-surface-container-lowest flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      </span>
                    </button>
                    <div className="absolute -bottom-2 right-3 w-3 h-3 bg-surface-container-lowest rotate-45 shadow-sm z-30" />
                  </div>
                  <div className="w-px h-5 bg-surface-container-high mx-space-xs" />
                  <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container text-xs font-semibold">
                    {activeAccount.initials}
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Browser Viewport with Anchored 385px Extension Popup */}
            <div className="relative w-full bg-surface-container-low min-h-[680px] p-space-lg overflow-hidden flex justify-center sm:justify-end">
              {/* Background Facebook Group Mockup */}
              <div className="absolute inset-0 p-space-xl opacity-35 pointer-events-none select-none flex flex-col gap-space-md">
                <div className="w-full h-44 rounded-xl bg-surface-container flex items-end p-space-lg">
                  <div className="flex items-center gap-space-md">
                    <div className="w-16 h-16 rounded-xl bg-surface-container-highest" />
                    <div className="flex flex-col gap-1">
                      <div className="w-64 h-5 bg-surface-container-highest rounded" />
                      <div className="w-36 h-3 bg-surface-container-highest rounded" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-space-md mt-space-md">
                  <div className="col-span-2 flex flex-col gap-space-md">
                    <div className="h-28 bg-surface-container rounded-xl p-space-md flex flex-col justify-between">
                      <div className="w-48 h-4 bg-surface-container-highest rounded" />
                      <div className="w-full h-8 bg-surface-container-highest rounded" />
                    </div>
                    <div className="h-60 bg-surface-container rounded-xl" />
                  </div>
                  <div className="col-span-1 flex flex-col gap-space-md">
                    <div className="h-44 bg-surface-container rounded-xl" />
                    <div className="h-32 bg-surface-container rounded-xl" />
                  </div>
                </div>
              </div>

              {/* 385px Extension Popup */}
              <div className="relative z-20 w-full max-w-[385px] bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col overflow-hidden self-start border border-surface-container">
                {/* Popup Header */}
                <div className="bg-surface-container-lowest px-space-md py-space-sm flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-on-primary text-[18px]">
                        rocket_launch
                      </span>
                    </div>
                    <div className="flex flex-col leading-none">
                      <div className="flex items-center gap-space-xs">
                        <span className="text-[13px] font-bold text-on-surface">FB POST PRO</span>
                        <span className="text-[10px] bg-primary-fixed text-on-primary-fixed font-semibold px-1 rounded">
                          v1.2.4
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sessionExpiredSimulated ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            sessionExpiredSimulated ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {sessionExpiredSimulated ? 'Session 401' : 'Socket Live'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          • 18ms
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={onNavigateToDashboard}
                      className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                      title="Mở Dashboard toàn màn hình"
                    >
                      <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSessionExpiredSimulated((prev) => !prev)
                      }
                      className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                      title="Chuyển trạng thái Socket / Error 401"
                    >
                      <span className="material-symbols-outlined text-[17px]">tune</span>
                    </button>
                  </div>
                </div>

                {/* Popup Body */}
                <div className="p-space-md flex flex-col gap-space-md overflow-y-auto max-h-[520px]">
                  {viewMode === 'debugger' && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-[11px] text-indigo-900 flex items-center justify-between">
                      <span className="font-mono">Worker WSS: wss://ws.fbpostpro.vn/v1</span>
                      <span className="font-bold text-emerald-700">200 OK</span>
                    </div>
                  )}

                  {/* 1. Active FB Account Card */}
                  <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between gap-space-sm shadow-sm">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="relative shrink-0">
                        <SafeImage
                          src={activeAccount.avatarUrl}
                          alt={activeAccount.name}
                          fallbackText={activeAccount.initials}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1 ring-white ${
                            sessionExpiredSimulated ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs">
                          <span className="text-[13px] text-on-surface font-semibold truncate">
                            {activeAccount.name}
                          </span>
                          <span className="material-symbols-outlined text-primary text-[14px]">
                            verified
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-on-surface-variant truncate tabular-nums">
                          UID: {activeAccount.uid}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          sessionExpiredSimulated
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {sessionExpiredSimulated ? 'Cookie Expired' : 'Cookie Live'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant mt-0.5 tabular-nums">
                        Gói {currentPlan} ({accounts.length}/{planSpec.maxAccounts} TK)
                      </span>
                    </div>
                  </div>

                  {/* 2. Active Running Task Box */}
                  {activeTask && (
                    <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex flex-col gap-space-sm border border-surface-container">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              activeTask.status === 'RUNNING'
                                ? 'bg-primary animate-ping'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-xs font-semibold text-primary font-mono">
                            #{activeTask.id}
                          </span>
                          <span className="text-[11px] text-on-surface-variant truncate max-w-[140px]">
                            • {activeTask.content}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onPauseResumeTask(activeTask.id)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                            title={
                              activeTask.status === 'RUNNING'
                                ? 'Tạm dừng tác vụ'
                                : 'Tiếp tục tác vụ'
                            }
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {activeTask.status === 'RUNNING' ? 'pause' : 'play_arrow'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelTask(activeTask.id)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-surface-container hover:bg-red-50 text-error"
                            title="Hủy tác vụ"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-on-surface font-medium">Tiến độ xuất bản</span>
                          <span className="text-primary font-bold font-mono tabular-nums">
                            {activeTask.completedCount} / {activeTask.totalCount} Nhóm ({taskPct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${taskPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-surface-container-low p-space-xs rounded flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-on-surface-variant">
                          <span className="text-[11px] flex items-center gap-1 truncate">
                            <span className="material-symbols-outlined text-[13px] text-primary animate-spin">
                              sync
                            </span>
                            {activeTask.items[0]?.groupName || 'Hội Cư Dân BĐS Cầu Giấy'}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium shrink-0">
                            {humanEmulation ? 'Human Typing' : 'Fast Paste'}
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant italic pl-4">
                          Đang giả lập gõ phím &amp; đính kèm tệp ảnh nội thất...
                        </p>
                      </div>

                      <div className="flex items-center justify-between bg-amber-50 px-space-sm py-1 rounded text-amber-800">
                        <div className="flex items-center gap-1 text-[11px] font-medium">
                          <span className="material-symbols-outlined text-[14px] text-amber-600">
                            timer
                          </span>
                          Giãn cách an toàn Meta:
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-900 tabular-nums">
                          Nghỉ {minDelay}s tiếp theo
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. Today's Mini Stats */}
                  <div className="grid grid-cols-3 gap-space-xs">
                    <div className="bg-surface-container-low p-space-xs rounded text-center">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-medium">
                        Đã đăng
                      </span>
                      <span className="text-[13px] font-bold text-on-surface tabular-nums">
                        18 bài
                      </span>
                    </div>
                    <div className="bg-surface-container-low p-space-xs rounded text-center">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-medium">
                        Thành công
                      </span>
                      <span className="text-[13px] font-bold text-emerald-700 tabular-nums">
                        99.1%
                      </span>
                    </div>
                    <div className="bg-surface-container-low p-space-xs rounded text-center">
                      <span className="text-[10px] text-on-surface-variant block uppercase font-medium">
                        Giãn cách
                      </span>
                      <span className="text-[13px] font-bold text-primary tabular-nums">
                        {minDelay}-{maxDelay}s
                      </span>
                    </div>
                  </div>

                  {/* 4. Quick Action CTA Row */}
                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={onNavigateToPost}
                      className="flex-1 h-8 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-medium flex items-center justify-center gap-space-xs transition-colors shadow-sm whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_square</span>
                      <span>Mở Composer Đăng Bài</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onNotify('success', 'Extension đã đồng bộ danh sách nhóm Facebook mới nhất.')
                      }
                      className="h-8 px-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs flex items-center gap-1 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      <span>Sync Nhóm</span>
                    </button>
                  </div>

                  {/* 5. Terminal Client Logs */}
                  <div className="bg-slate-900 rounded-lg p-space-sm font-mono text-[11px] leading-tight flex flex-col gap-1 shadow-inner">
                    <div className="flex items-center justify-between text-slate-400 pb-1 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Terminal Log (Client Runtime)
                      </span>
                      <span className="text-[9px] text-slate-500">v1.2.4</span>
                    </div>
                    <p className="text-slate-400 truncate">
                      <span className="text-slate-500">[14:18:02]</span>{' '}
                      <span className="text-emerald-400">[AUTH]</span> Active Session:{' '}
                      {activeAccount.name}
                    </p>
                    <p className="text-slate-400 truncate">
                      <span className="text-slate-500">[14:18:20]</span>{' '}
                      <span className="text-sky-400">[NAV]</span> Injected to /groups/bds.caugiay
                    </p>
                    <p className="text-slate-300 truncate">
                      <span className="text-slate-500">[14:18:40]</span>{' '}
                      <span className="text-amber-400">[SIM]</span> Typing content with human
                      jitter...
                    </p>
                    <p className="text-emerald-300 truncate">
                      <span className="text-slate-500">[14:19:15]</span>{' '}
                      <span className="text-emerald-400">[POST]</span> OK!
                      fb.com/groups/post/98129
                    </p>
                    <p className="text-amber-300 truncate">
                      <span className="text-slate-500">[14:19:16]</span>{' '}
                      <span className="text-amber-400">[THROTTLE]</span> Waiting safe delay:{' '}
                      {minDelay}.0s...
                    </p>
                  </div>
                </div>

                {/* Popup Footer */}
                <div className="bg-surface-container-high px-space-md py-space-xs flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-800 font-medium">
                    <span className="material-symbols-outlined text-[14px] text-emerald-700">
                      shield
                    </span>
                    Anti-Checkpoint:{' '}
                    <span className="font-bold">{autoPause ? 'BẬT' : 'TẮT'}</span>
                  </div>
                  <span className="text-on-surface-variant font-mono text-[10px]">
                    FB Post Pro Extension
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Specs Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  verified_user
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-on-surface">
                  Không Lưu Password
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Khai thác trực tiếp Cookie &amp; Token hợp lệ từ trình duyệt người dùng.
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  fingerprint
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-on-surface">Human Emulation</span>
                <span className="text-[11px] text-on-surface-variant">
                  Giả lập nhấp chuột, di chuyển con trỏ và tốc độ gõ phím ngẫu nhiên.
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-start gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-on-surface">Đồng Bộ 2 Chiều</span>
                <span className="text-[11px] text-on-surface-variant">
                  Tác vụ tạo từ Web App lập tức được nhận và chạy trên Extension.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT (4 cols): Auxiliary Extension States */}
        <div className="xl:col-span-4 flex flex-col gap-space-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-on-surface">
                Các Trạng Thái Khác (UI States)
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Đặc tả giao diện xử lý ngoại lệ và màn hình cài đặt
              </span>
            </div>
            <span className="text-[11px] font-mono bg-surface-container px-space-xs py-0.5 rounded text-primary">
              Specs v1.2
            </span>
          </div>

          {/* STATE 1: Session Expired ERROR_CODE_401 */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-error-container/40 px-space-md py-space-sm flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-on-error-container">
                <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                <span className="text-xs font-semibold">Trạng thái: Mất Kết Nối Cookie</span>
              </div>
              <span className="text-[10px] font-mono text-error font-medium">ERROR_CODE_401</span>
            </div>
            <div className="p-space-md flex flex-col gap-space-sm">
              <div className="flex items-start gap-space-sm">
                <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0 text-error">
                  <span className="material-symbols-outlined text-[20px]">no_accounts</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-[13px] font-semibold text-on-surface">
                    Phiên Facebook Đã Hết Hạn
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Token truy cập hoặc Cookie của tài khoản{' '}
                    <span className="font-medium text-on-surface">{activeAccount.name}</span> không
                    còn hoạt động. Cần mở Facebook để làm mới.
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-low rounded p-space-sm flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[11px] text-on-surface">
                  <span className="w-4 h-4 rounded-full bg-surface-container-highest text-center text-[10px] font-bold leading-4 shrink-0">
                    1
                  </span>
                  <span>
                    Đăng nhập lại tại <strong className="text-primary">facebook.com</strong> trên
                    Chrome.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-on-surface">
                  <span className="w-4 h-4 rounded-full bg-surface-container-highest text-center text-[10px] font-bold leading-4 shrink-0">
                    2
                  </span>
                  <span>Nhấn nút &quot;Làm mới phiên&quot; bên dưới để Extension đọc Cookie.</span>
                </div>
              </div>

              <div className="flex items-center gap-space-xs pt-space-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSessionExpiredSimulated(false);
                    onRefreshSession(activeAccount.id);
                  }}
                  className="flex-1 h-8 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  <span>Làm Mới Phiên Đăng Nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idx = accounts.findIndex((a) => a.id === selectedAccountId);
                    const next = accounts[(idx + 1) % accounts.length];
                    if (next) setSelectedAccountId(next.id);
                  }}
                  className="h-8 px-space-sm bg-surface-container rounded-lg text-xs text-on-surface hover:bg-surface-container-high whitespace-nowrap"
                >
                  Đổi Tài Khoản
                </button>
              </div>
            </div>
          </div>

          {/* STATE 2: Anti-Checkpoint & Throttle Settings */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-surface-container-high px-space-md py-space-sm flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">security</span>
                <span className="text-xs font-semibold">Cài Đặt An Toàn &amp; Chống Checkpoint</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                Chế Độ Nghiêm Ngặt
              </span>
            </div>

            <div className="p-space-md flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-on-surface">
                    Giãn cách giữa các bài đăng
                  </span>
                  <span className="text-[11px] font-mono text-primary font-bold tabular-nums">
                    {minDelay}s - {maxDelay}s (Khuyên dùng)
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={180}
                  step={5}
                  value={minDelay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMinDelay(val);
                    setMaxDelay(val + 45);
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant">
                  Tự động cộng thêm độ trễ ngẫu nhiên (Jitter Delay) ±15 giây.
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-on-surface">
                    Mô phỏng thao tác người dùng
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Gõ phím ngẫu nhiên, di chuột trước khi bấm Đăng
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHumanEmulation((v) => !v)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    humanEmulation ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-on-surface">
                    Dừng khẩn cấp khi Meta cảnh báo
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Tự động Pause toàn bộ queue khi gặp thông báo Spam
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPause((v) => !v)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                    autoPause ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-surface-container-low p-space-sm rounded">
                <span className="text-[11px] text-on-surface">Giới hạn bài tối đa / ngày:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-14 h-6 px-1.5 rounded bg-surface-container-lowest text-center font-bold font-mono text-xs text-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant">bài / tài khoản</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="w-full h-8 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">save</span>
                <span>Lưu Cấu Hình Extension</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-space-xs">
            <span className="text-xs font-semibold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">
                integration_instructions
              </span>
              Thông tin tích hợp Chrome Extension
            </span>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Giao diện popup được đóng gói dưới định dạng HTML/Tailwind tiêu chuẩn của Manifest V3.
              Kích thước cửa sổ popup cố định ở{' '}
              <code className="font-mono text-primary font-bold">385px</code> chiều rộng để tương
              thích tuyệt đối với thanh công cụ trình duyệt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
