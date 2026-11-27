import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ConnectAccountModal } from '../components/ConnectAccountModal';
import { ExtensionGuideModal } from '../components/ExtensionGuideModal';
import { IS_DEV_OR_DEMO } from '../config/demoConfig';
import { useApp } from '../state/AppContext';
import type {
  DeviceConnectionStatus,
  ExtensionDevice,
  FacebookAccount,
  FacebookAccountStatus,
} from '../types/domain';
import { formatRelativeTimeVi, formatVietnamDateTime } from '../utils/dateTime';

const ACCOUNT_STATUS_STYLE: Record<
  FacebookAccountStatus,
  { label: string; badgeClass: string }
> = {
  CONNECTED: { label: 'Đã kết nối', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DISCONNECTED: { label: 'Đã ngắt kết nối', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  EXPIRED: { label: 'Hết hạn phiên', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  ERROR: { label: 'Lỗi kết nối', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  UNVERIFIED: { label: 'Chưa xác minh', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const DEVICE_STATUS_STYLE: Record<
  DeviceConnectionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  CONNECTED: {
    label: 'Đang kết nối',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  OFFLINE: {
    label: 'Ngoại tuyến',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  REVOKED: {
    label: 'Đã thu hồi',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const AccountsPage: React.FC = () => {
  const {
    accounts,
    pages,
    devices,
    usageSummary,
    refreshAccountStatus,
    disconnectAccount,
    syncPages,
    checkDeviceConnection,
    revokeDevice,
    addToast,
  } = useApp();

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<FacebookAccount | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ExtensionDevice | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const handleRefreshAccount = (acc: FacebookAccount) => {
    const res = refreshAccountStatus(acc.id);
    if (!res.ok || !res.data) {
      addToast('error', 'Không thể kiểm tra trạng thái', res.error);
      return;
    }
    const label = ACCOUNT_STATUS_STYLE[res.data.status].label;
    addToast(
      'info',
      `Trạng thái hiện tại: ${label}`,
      res.data.connectionType === 'MANUAL_PROFILE'
        ? 'Hồ sơ thủ công không tự xác minh qua Meta OAuth.'
        : 'Chế độ DEMO giữ nguyên trạng thái thực tế của hồ sơ.'
    );
  };

  const handleSyncPages = (acc: FacebookAccount) => {
    const res = syncPages(acc.id);
    if (!res.ok || !res.data) {
      addToast('error', 'Không thể đồng bộ Fanpage', res.error);
      return;
    }
    addToast('info', 'Kiểm tra Fanpage hoàn tất', res.data.message);
  };

  const handleCheckDevice = (deviceId: string, deviceName: string) => {
    const res = checkDeviceConnection(deviceId);
    if (!res.ok) {
      addToast('error', 'Không thể kiểm tra kết nối', res.error);
      return;
    }
    addToast('success', 'Đã cập nhật tín hiệu thiết bị (DEMO)', deviceName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Tài khoản Facebook, Fanpage &amp; Thiết bị Extension
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý hồ sơ kết nối ({usageSummary.accountsUsed}/{usageSummary.accountsLimit} theo gói
            hiện tại), quyền đăng Fanpage và thiết bị tiện ích mở rộng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setGuideModalOpen(true)}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[17px]">extension</span>
            Kết nối Extension
          </button>
          <button
            type="button"
            onClick={() => setConnectModalOpen(true)}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            Thêm hồ sơ Facebook
          </button>
        </div>
      </div>

      {/* Section 1: Facebook Accounts */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Hồ sơ Facebook ({accounts.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân biệt rõ hồ sơ Meta OAuth (đăng Fanpage) và hồ sơ thủ công (nhóm Facebook).
            </p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <span className="material-symbols-outlined text-[34px] text-slate-300">
              account_circle
            </span>
            <p>Chưa có hồ sơ Facebook nào được thêm.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accounts.map((acc) => {
              const st = ACCOUNT_STATUS_STYLE[acc.status];
              const accPages = pages.filter((p) => p.facebookAccountId === acc.id);
              return (
                <div
                  key={acc.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {acc.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{acc.displayName}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.badgeClass}`}
                        >
                          {st.label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {acc.connectionType === 'META_OAUTH' ? 'Meta OAuth' : 'Hồ sơ thủ công'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1">
                        <span>
                          UID:{' '}
                          <code className="font-mono text-slate-700">
                            {acc.facebookUid ?? 'Chưa xác định'}
                          </code>
                        </span>
                        <span>Fanpage liên kết: {accPages.length}</span>
                        <span>
                          Kết nối gần nhất:{' '}
                          {acc.lastConnectedAt ? formatVietnamDateTime(acc.lastConnectedAt) : 'Chưa kết nối'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRefreshAccount(acc)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                    >
                      Kiểm tra trạng thái
                    </button>
                    {acc.connectionType === 'META_OAUTH' && acc.status === 'CONNECTED' && (
                      <button
                        type="button"
                        onClick={() => handleSyncPages(acc)}
                        className="h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"
                      >
                        Đồng bộ Fanpage
                      </button>
                    )}
                    {acc.status !== 'DISCONNECTED' && (
                      <button
                        type="button"
                        onClick={() => setDisconnectTarget(acc)}
                        className="h-8 px-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold"
                      >
                        Ngắt kết nối
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Fanpages */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Fanpage đã đồng bộ ({pages.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chỉ các Fanpage có quyền đăng (<code className="font-mono">canPublish = true</code>) mới
            được chọn trong màn hình Đăng bài.
          </p>
        </div>

        {pages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Chưa có Fanpage nào được đồng bộ từ hồ sơ Meta OAuth.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tên Fanpage</th>
                  <th className="px-5 py-3 font-semibold">Page UID</th>
                  <th className="px-5 py-3 font-semibold">Hồ sơ quản lý</th>
                  <th className="px-5 py-3 font-semibold">Quyền đăng bài</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pages.map((pg) => {
                  const parent = accountMap.get(pg.facebookAccountId);
                  return (
                    <tr key={pg.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <p className="font-bold text-slate-900">{pg.pageName}</p>
                        <a
                          href={pg.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          {pg.pageUrl}
                        </a>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-600">{pg.pageUid}</td>
                      <td className="px-5 py-3 text-slate-700">
                        {parent ? parent.displayName : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pg.canPublish
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {pg.canPublish ? 'Có quyền đăng' : 'Không có quyền đăng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 3: Extension Devices */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Thiết bị Chrome Extension ({devices.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Trạng thái thiết bị được tính từ thời điểm hoạt động gần nhất và trạng thái thu hồi.
            </p>
          </div>
          {IS_DEV_OR_DEMO && (
            <Link
              to="/extension-preview"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Xem trước Extension Popup
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </Link>
          )}
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <span className="material-symbols-outlined text-[34px] text-slate-300">devices</span>
            <p>Chưa có thiết bị Extension nào được kết nối.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {devices.map((dev) => {
              const st = DEVICE_STATUS_STYLE[dev.connectionStatus];
              const isRevoked = dev.connectionStatus === 'REVOKED';
              return (
                <div
                  key={dev.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                      <p className="text-sm font-bold text-slate-900">{dev.deviceName}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.badgeClass}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Phiên bản: {dev.extensionVersion}</span>
                      <span>
                        Hoạt động gần nhất: {formatRelativeTimeVi(dev.lastSeenAt)} (
                        {formatVietnamDateTime(dev.lastSeenAt)})
                      </span>
                      {dev.revokedAt && (
                        <span className="text-rose-600">
                          Đã thu hồi lúc: {formatVietnamDateTime(dev.revokedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isRevoked}
                      onClick={() => handleCheckDevice(dev.id, dev.deviceName)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-semibold"
                    >
                      Kiểm tra kết nối
                    </button>
                    {!isRevoked && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(dev)}
                        className="h-8 px-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold"
                      >
                        Thu hồi thiết bị
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConnectAccountModal open={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
      <ExtensionGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />

      <ConfirmDialog
        open={Boolean(disconnectTarget)}
        title="Ngắt kết nối hồ sơ Facebook?"
        description={`Hồ sơ "${disconnectTarget?.displayName ?? ''}" sẽ chuyển sang trạng thái Đã ngắt kết nối (DISCONNECTED) và vẫn giữ lại lịch sử các tác vụ cũ.`}
        confirmLabel="Ngắt kết nối"
        onCancel={() => setDisconnectTarget(null)}
        onConfirm={() => {
          if (disconnectTarget) {
            const res = disconnectAccount(disconnectTarget.id);
            if (!res.ok) {
              addToast('error', 'Không thể ngắt kết nối', res.error);
            } else {
              addToast('info', 'Đã ngắt kết nối hồ sơ', disconnectTarget.displayName);
            }
          }
          setDisconnectTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Thu hồi quyền truy cập thiết bị?"
        description={`Thiết bị "${revokeTarget?.deviceName ?? ''}" sẽ chuyển sang trạng thái Đã thu hồi (REVOKED) và không thể kết nối lại bằng phiên cũ.`}
        confirmLabel="Thu hồi thiết bị"
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) {
            const res = revokeDevice(revokeTarget.id);
            if (!res.ok) {
              addToast('error', 'Không thể thu hồi thiết bị', res.error);
            } else {
              addToast('warning', 'Đã thu hồi thiết bị', revokeTarget.deviceName);
            }
          }
          setRevokeTarget(null);
        }}
      />
    </div>
  );
};
