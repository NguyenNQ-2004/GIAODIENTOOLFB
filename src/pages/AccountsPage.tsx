import React, { useMemo, useState } from 'react';
import {
  ExtensionDevice,
  FacebookAccount,
  Fanpage,
  PlanTier,
} from '../types/app';
import { PLAN_SPECS } from '../data/mockData';
import { SafeImage } from '../components/SafeImage';

interface AccountsPageProps {
  accounts: FacebookAccount[];
  fanpages: Fanpage[];
  devices: ExtensionDevice[];
  currentPlan: PlanTier;
  onNavigateToPricing: () => void;
  onOpenConnectModal: () => void;
  onRefreshAccountStatus: (accountId?: string) => void;
  onDisconnectAccount: (account: FacebookAccount) => void;
  onSyncFanpages: () => void;
  onPingDevice: (deviceId: string) => void;
  onRevokeDevice: (device: ExtensionDevice) => void;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

type AccountsTab = 'accounts' | 'fanpages' | 'devices';

export const AccountsPage: React.FC<AccountsPageProps> = ({
  accounts,
  fanpages,
  devices,
  currentPlan,
  onNavigateToPricing,
  onOpenConnectModal,
  onRefreshAccountStatus,
  onDisconnectAccount,
  onSyncFanpages,
  onPingDevice,
  onRevokeDevice,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AccountsTab>('accounts');
  const [searchQuery, setSearchQuery] = useState('');

  const planSpec = PLAN_SPECS[currentPlan];
  const quotaPct = Math.min(100, Math.round((accounts.length / planSpec.maxAccounts) * 100));

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase();
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.uid.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  const connectedCount = accounts.filter((a) => a.status === 'CONNECTED').length;
  const expiredCount = accounts.filter((a) => a.status !== 'CONNECTED').length;

  const copyUid = (uid: string) => {
    navigator.clipboard?.writeText(uid);
    onNotify('success', `Đã sao chép UID ${uid} vào bộ nhớ tạm.`);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Banner / Account Quota Notification Bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center gap-space-md min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="text-[13px] text-on-surface font-semibold">
                Hạn mức tài khoản Facebook
              </span>
              <span className="text-[11px] text-primary font-medium bg-primary-fixed/50 px-1.5 py-[1px] rounded">
                {planSpec.name}
              </span>
            </div>
            <p className="text-[13px] text-on-surface-variant truncate">
              {accounts.length >= planSpec.maxAccounts
                ? 'Bạn đang sử dụng tối đa giới hạn liên kết tài khoản của gói hiện tại.'
                : `Bạn còn ${planSpec.maxAccounts - accounts.length} vị trí liên kết tài khoản Facebook khả dụng.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-lg shrink-0">
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg">
            <div className="w-24 bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-all"
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-primary-container tabular-nums">
              {accounts.length} / {planSpec.maxAccounts} tài khoản
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToPricing}
            className="h-8 px-space-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[13px] font-medium rounded-lg transition-colors flex items-center gap-space-xs whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px] text-primary-container">
              upgrade
            </span>
            <span>Nâng cấp hạn mức</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest p-space-xs rounded-xl shadow-sm">
        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span>Tài khoản Facebook</span>
            <span
              className={`text-[11px] px-1.5 py-[1px] rounded font-semibold tabular-nums ${
                activeTab === 'accounts'
                  ? 'bg-white/20 text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {accounts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fanpages')}
            className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'fanpages'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            <span>Fanpage được cấp quyền</span>
            <span
              className={`text-[11px] px-1.5 py-[1px] rounded font-semibold tabular-nums ${
                activeTab === 'fanpages'
                  ? 'bg-white/20 text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {fanpages.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'devices'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">laptop_chromebook</span>
            <span>Thiết bị Extension</span>
            <span
              className={`text-[11px] px-1.5 py-[1px] rounded font-semibold tabular-nums ${
                activeTab === 'devices'
                  ? 'bg-white/20 text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {devices.length}
            </span>
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-space-md pr-space-sm text-on-surface-variant text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {connectedCount} Hoạt động
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {expiredCount} Cần xác thực
          </span>
          <span className="flex items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[14px]">sync</span> Đã đồng bộ 2 phút trước
          </span>
        </div>
      </div>

      {/* TAB 1: FACEBOOK ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="flex flex-col gap-space-md">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <div className="flex items-center gap-space-md flex-1 min-w-[260px] max-w-lg">
              <div className="relative w-full flex items-center">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-space-md pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc UID Facebook..."
                  className="w-full h-8 pl-9 pr-space-md bg-surface-container-low hover:bg-surface-container text-on-surface placeholder:text-on-surface-variant text-[13px] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-space-sm shrink-0">
              <button
                type="button"
                onClick={() => onRefreshAccountStatus()}
                className="h-8 px-space-md bg-surface-container-low hover:bg-surface-container-high text-on-surface text-[13px] font-medium rounded-lg transition-colors flex items-center gap-space-xs whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                  refresh
                </span>
                <span>Làm mới trạng thái (ACC-02)</span>
              </button>
              <button
                type="button"
                onClick={onOpenConnectModal}
                className="h-8 px-space-lg bg-primary-container hover:bg-primary text-on-primary text-[13px] rounded-lg shadow-sm transition-colors flex items-center gap-space-xs font-medium whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Kết nối tài khoản</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/70 h-9 text-on-surface-variant text-xs tracking-wider uppercase">
                    <th className="px-space-lg py-space-xs font-semibold w-[260px]">
                      Avatar &amp; Tên tài khoản
                    </th>
                    <th className="px-space-md py-space-xs font-semibold w-[190px]">
                      Facebook UID
                    </th>
                    <th className="px-space-md py-space-xs font-semibold w-[170px]">
                      Fanpage cấp quyền
                    </th>
                    <th className="px-space-md py-space-xs font-semibold w-[180px]">
                      Trạng thái kết nối
                    </th>
                    <th className="px-space-md py-space-xs font-semibold w-[160px]">
                      Kết nối gần nhất
                    </th>
                    <th className="px-space-lg py-space-xs font-semibold text-right w-[200px]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low text-[13px] text-on-surface">
                  {filteredAccounts.map((acc) => {
                    const isConnected = acc.status === 'CONNECTED';
                    const isExpired = acc.status === 'EXPIRED';

                    return (
                      <tr
                        key={acc.id}
                        className={`hover:bg-surface-container-low/50 transition-colors group ${
                          isExpired ? 'bg-amber-500/[0.02]' : ''
                        }`}
                      >
                        <td className="px-space-lg py-space-md">
                          <div className="flex items-center gap-space-md">
                            <div className="relative shrink-0">
                              <SafeImage
                                src={acc.avatarUrl}
                                alt={acc.name}
                                fallbackText={acc.initials}
                                className={`w-9 h-9 rounded-full object-cover ring-2 ${
                                  isConnected ? 'ring-emerald-500/30' : 'ring-amber-500/40'
                                }`}
                              />
                              <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface-container-lowest ${
                                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-on-surface truncate">
                                  {acc.name}
                                </span>
                                {acc.verifiedOAuth && (
                                  <span
                                    className="material-symbols-outlined text-[14px] text-primary-container shrink-0"
                                    title="Đã đồng bộ OAuth"
                                  >
                                    verified
                                  </span>
                                )}
                                {acc.isManual && (
                                  <span className="text-[10px] text-on-tertiary-container bg-tertiary-container px-1.5 py-[1px] rounded font-medium">
                                    Thủ công
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[11px] truncate ${
                                  isExpired
                                    ? 'text-amber-700 font-medium'
                                    : 'text-on-surface-variant'
                                }`}
                              >
                                {acc.label}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-space-md py-space-md">
                          <button
                            type="button"
                            onClick={() => copyUid(acc.uid)}
                            className="flex items-center gap-1.5 group/code cursor-pointer"
                            title="Nhấn để sao chép UID"
                          >
                            <span className="font-mono text-[11px] text-on-surface bg-surface-container px-1.5 py-[2px] rounded font-medium tabular-nums">
                              {acc.uid}
                            </span>
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-0 group-hover/code:opacity-100 transition-opacity">
                              content_copy
                            </span>
                          </button>
                        </td>

                        <td className="px-space-md py-space-md">
                          {acc.fanpageCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('fanpages')}
                              className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded bg-surface-container-high hover:bg-secondary-container text-on-surface text-xs transition-colors whitespace-nowrap"
                              title={`Xem ${acc.fanpageCount} Fanpage được liên kết`}
                            >
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                flag
                              </span>
                              <span className="font-semibold text-primary tabular-nums">
                                {acc.fanpageCount} Fanpage
                              </span>
                              <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
                                arrow_forward_ios
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-on-surface-variant/70 italic">
                              0 Fanpage
                            </span>
                          )}
                        </td>

                        <td className="px-space-md py-space-md">
                          {isConnected ? (
                            <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{acc.statusLabel}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{acc.statusLabel}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-space-md py-space-md">
                          <div className="flex flex-col">
                            <span className="text-on-surface font-medium">
                              {acc.lastConnectedAgo}
                            </span>
                            <span className="text-[11px] text-on-surface-variant tabular-nums">
                              {acc.lastConnectedAt}
                            </span>
                          </div>
                        </td>

                        <td className="px-space-lg py-space-md text-right">
                          <div className="inline-flex items-center justify-end gap-space-xs">
                            {isConnected ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onRefreshAccountStatus(acc.id)}
                                  className="w-7 h-7 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                                  title="Làm mới trạng thái (ACC-02)"
                                >
                                  <span className="material-symbols-outlined text-[16px]">sync</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('fanpages')}
                                  className="w-7 h-7 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                                  title="Xem Fanpage (ACC-05)"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    storefront
                                  </span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenConnectModal}
                                className="h-7 px-space-sm bg-primary-container text-on-primary hover:bg-primary rounded text-xs transition-colors flex items-center gap-1 font-medium shadow-sm whitespace-nowrap"
                              >
                                <span className="material-symbols-outlined text-[14px]">link</span>
                                <span>Kết nối lại</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDisconnectAccount(acc)}
                              className="w-7 h-7 rounded hover:bg-error-container text-error transition-colors flex items-center justify-center"
                              title="Ngắt kết nối (ACC-03)"
                            >
                              <span className="material-symbols-outlined text-[16px]">link_off</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-space-lg py-space-sm bg-surface-container-low/40 text-on-surface-variant text-[11px]">
              <div className="flex flex-wrap items-center gap-space-md">
                <span>
                  Tổng số:{' '}
                  <strong className="text-on-surface font-semibold tabular-nums">
                    {accounts.length} tài khoản
                  </strong>
                </span>
                <span className="w-1 h-1 rounded-full bg-surface-variant" />
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> CONNECTED
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> EXPIRED /
                  UNVERIFIED
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> DISCONNECTED
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-error inline-block" /> ERROR
                </span>
              </div>
              <div>
                <span>
                  Schema:{' '}
                  <code className="font-mono text-[10px]">facebook_accounts (PostgreSQL v15)</code>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTHORIZED FANPAGES */}
      {activeTab === 'fanpages' && (
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <div className="flex items-center gap-space-md">
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[18px]">flag</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-[13px] font-semibold text-on-surface">
                  Danh sách Fanpage được quản lý qua Token
                </h2>
                <span className="text-[11px] text-on-surface-variant">
                  {fanpages.length} Fanpage liên kết sẵn sàng thực hiện đăng bài tự động
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onSyncFanpages}
              className="h-8 px-space-md bg-surface-container-low hover:bg-surface-container text-on-surface text-[13px] font-medium rounded-lg transition-colors flex items-center gap-space-xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
              <span>Đồng bộ lại Fanpage từ Meta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {fanpages.map((fp) => (
              <div
                key={fp.id}
                className={`bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between gap-space-md ${
                  !fp.canPublish ? 'opacity-85' : ''
                }`}
              >
                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center font-bold text-on-surface-variant">
                      <SafeImage
                        src={fp.avatarUrl}
                        alt={fp.name}
                        fallbackText={fp.initials}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium font-mono ${
                        fp.canPublish
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      can_publish: {fp.canPublish ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[13px] font-semibold text-on-surface truncate">
                      {fp.name}
                    </h3>
                    <span className="font-mono text-[11px] text-on-surface-variant truncate tabular-nums">
                      ID: {fp.pageId}
                    </span>
                  </div>
                </div>
                <div className="pt-space-sm border-t border-surface-container flex items-center justify-between text-on-surface-variant text-[11px]">
                  <span className="truncate">
                    Từ: <strong>{fp.ownerAccountName}</strong>
                  </span>
                  {fp.canPublish ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-0.5 whitespace-nowrap">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>{' '}
                      Sẵn sàng
                    </span>
                  ) : (
                    <span
                      className="text-error font-medium flex items-center gap-0.5 whitespace-nowrap"
                      title="Chỉ có quyền Người kiểm duyệt, không thể đăng bài"
                    >
                      <span className="material-symbols-outlined text-[14px]">warning</span> Quyền xem
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CHROME EXTENSION DEVICES */}
      {activeTab === 'devices' && (
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <div className="flex items-center gap-space-md">
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[18px]">devices</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-[13px] font-semibold text-on-surface">
                  Phiên Chrome Extension Đang Hoạt Động
                </h2>
                <span className="text-[11px] text-on-surface-variant">
                  Quản lý các trình duyệt đang gắn extension thực thi tác vụ nền tự động
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] bg-surface-container-low px-space-md py-space-xs rounded-lg text-on-surface-variant">
              <span>
                Giao thức: <strong>WebSocket Secure (WSS)</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {devices.map((dev) => {
              const isConnected = dev.status === 'CONNECTED';
              return (
                <div
                  key={dev.id}
                  className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-space-md">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isConnected
                            ? 'bg-primary-fixed/50 text-primary-container'
                            : 'bg-surface-container-high text-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[24px]">{dev.icon}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-xs">
                          <h3 className="text-[13px] font-semibold text-on-surface">{dev.name}</h3>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                        </div>
                        <span className="text-[11px] text-on-surface-variant">
                          Phiên bản Extension: <strong>{dev.version}</strong>{' '}
                          {dev.build ? `(${dev.build})` : ''}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-space-sm py-0.5 rounded font-medium whitespace-nowrap ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-surface-container text-secondary'
                      }`}
                    >
                      {isConnected ? 'Đã kết nối' : 'Đã thu hồi'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm py-space-sm bg-surface-container-low/50 px-space-md rounded-lg text-[11px] text-on-surface-variant">
                    <div>
                      IP Thiết bị:{' '}
                      <span className="font-mono text-on-surface font-medium">{dev.ip}</span>
                    </div>
                    <div>
                      Trình duyệt:{' '}
                      <span className="text-on-surface font-medium">{dev.browser}</span>
                    </div>
                    <div>
                      Ping nền:{' '}
                      <span className="text-emerald-600 font-medium font-mono tabular-nums">
                        {dev.pingMs}ms (Ổn định)
                      </span>
                    </div>
                    <div>
                      Kích hoạt gần nhất:{' '}
                      <span className="text-on-surface font-medium">{dev.lastActive}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                    <button
                      type="button"
                      onClick={() => onPingDevice(dev.id)}
                      className="h-8 px-space-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[13px] font-medium rounded-lg transition-colors flex items-center gap-space-xs whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        network_ping
                      </span>
                      <span>Kiểm tra kết nối (ACC-08)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRevokeDevice(dev)}
                      className="h-8 px-space-md bg-error-container/30 hover:bg-error-container text-error text-[13px] font-medium rounded-lg transition-colors flex items-center gap-space-xs whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        power_settings_new
                      </span>
                      <span>Thu hồi (ACC-09)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
