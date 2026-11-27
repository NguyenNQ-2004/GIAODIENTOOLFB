import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IS_DEV_OR_DEMO } from '../config/demoConfig';
import { useApp } from '../state/AppContext';
import type { TaskItemStatus } from '../types/domain';
import type { ExtensionPreviewScenario } from '../types/viewModels';
import {
  canCancelTask,
  canPauseTask,
  canResumeTask,
  getEligibleExtensionSelection,
  getTaskProgress,
  TASK_ITEM_STATUS_META,
  TASK_STATUS_META,
} from '../utils/taskStatus';

const SCENARIOS: { id: ExtensionPreviewScenario; label: string; desc: string }[] = [
  { id: 'WAITING_CONFIRMATION', label: 'Chờ xác nhận', desc: 'Hiển thị mục đăng nhóm đang chờ người dùng xác nhận.' },
  { id: 'CONNECTED_IDLE', label: 'Không có tác vụ', desc: 'Đã kết nối nhưng không có mục nào chờ xử lý.' },
  { id: 'RUNNING', label: 'Đang chạy', desc: 'Tác vụ đang trong phiên thực hiện.' },
  { id: 'DISCONNECTED', label: 'Chưa kết nối', desc: 'Chưa liên kết Extension với tài khoản website.' },
  { id: 'CONNECTING', label: 'Đang kết nối', desc: 'Đang xác thực kết nối với dịch vụ.' },
  { id: 'OFFLINE', label: 'Ngoại tuyến (Offline)', desc: 'Mất kết nối mạng hoặc phiên đồng bộ tạm gián đoạn.' },
  { id: 'REVOKED', label: 'Đã thu hồi thiết bị', desc: 'Thiết bị đã bị thu hồi quyền từ trang Tài khoản.' },
  { id: 'SUBSCRIPTION_EXPIRED', label: 'Gói hết hạn', desc: 'Tài khoản cần gia hạn gói dịch vụ để tiếp tục.' },
  { id: 'CONNECTION_ERROR', label: 'Lỗi kết nối', desc: 'Không thể tải danh sách tác vụ từ máy chủ.' },
];

export const ExtensionPopupPage: React.FC = () => {
  const {
    currentUser,
    currentPlan,
    tasks,
    devices,
    usageSummary,
    confirmTaskItem,
    pauseTask,
    resumeTask,
    cancelTask,
    addToast,
  } = useApp();

  const [scenario, setScenario] = useState<ExtensionPreviewScenario>('WAITING_CONFIRMATION');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [outcome, setOutcome] = useState<
    Extract<TaskItemStatus, 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW'>
  >('SUCCESS');
  const [resultPostUrl, setResultPostUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Strict task/item eligibility: NEVER falls back to tasks[0] or items[0].
  // Only picks MANUAL_GROUP tasks belonging to currentUser that are due, active,
  // with active subscription and at least one non-revoked Extension device.
  const eligibleSelection = useMemo(() => {
    if (!currentUser) return null;
    return getEligibleExtensionSelection({
      userId: currentUser.id,
      tasks,
      devices,
      isSubscriptionActive: usageSummary.isActive,
    });
  }, [currentUser, tasks, devices, usageSummary.isActive]);

  const activeTask = eligibleSelection?.task ?? null;
  const activeItem = eligibleSelection?.item ?? null;
  const hasNonRevokedDevice = devices.some((d) => d.connectionStatus !== 'REVOKED');

  const handleCopyContent = async () => {
    if (!activeItem) return;
    const text = [activeItem.contentSnapshot, activeItem.linkSnapshot].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', 'Đã sao chép nội dung bài viết', 'Bạn có thể dán trực tiếp khi mở nhóm Facebook.');
    } catch {
      addToast('info', 'Sao chép mô phỏng', 'Trình duyệt chặn clipboard tự động; hãy chọn và copy thủ công.');
    }
  };

  const handleSubmitConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !activeItem) return;
    const res = confirmTaskItem({
      taskId: activeTask.id,
      itemId: activeItem.id,
      status: outcome,
      resultPostUrl: outcome === 'SUCCESS' ? resultPostUrl.trim() || null : null,
      errorMessage: outcome !== 'SUCCESS' ? errorMessage.trim() || null : null,
    });
    if (!res.ok) {
      addToast('error', 'Không thể xác nhận kết quả', res.error);
      return;
    }
    addToast(
      'success',
      'Đã lưu xác nhận từ Extension Preview',
      `${activeItem.destinationNameSnapshot} → ${TASK_ITEM_STATUS_META[outcome].label}`
    );
    setConfirmOpen(false);
    setResultPostUrl('');
    setErrorMessage('');
  };

  const statusBadge = {
    DISCONNECTED: { label: 'Chưa kết nối', cls: 'bg-slate-200 text-slate-700' },
    CONNECTING: { label: 'Đang kết nối...', cls: 'bg-sky-100 text-sky-700' },
    CONNECTED_IDLE: { label: 'Đã kết nối', cls: 'bg-emerald-100 text-emerald-700' },
    WAITING_CONFIRMATION: { label: 'Đã kết nối', cls: 'bg-emerald-100 text-emerald-700' },
    RUNNING: { label: 'Đang chạy', cls: 'bg-blue-100 text-blue-700' },
    OFFLINE: { label: 'Ngoại tuyến', cls: 'bg-slate-200 text-slate-700' },
    REVOKED: { label: 'Đã thu hồi', cls: 'bg-rose-100 text-rose-700' },
    SUBSCRIPTION_EXPIRED: { label: 'Gói hết hạn', cls: 'bg-amber-100 text-amber-800' },
    CONNECTION_ERROR: { label: 'Lỗi kết nối', cls: 'bg-rose-100 text-rose-700' },
  }[scenario];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Chrome Extension Popup Preview
            </h1>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
              Dev / Preview Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mô phỏng chính xác khung 385×560px của tiện ích hỗ trợ đăng bài hợp lệ (không đọc cookie,
            không tự động đăng ẩn).
          </p>
        </div>
        <Link
          to="/accounts"
          className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          Quản lý thiết bị Extension
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: 385x560px Popup Frame */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[385px] min-h-[560px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Popup Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </div>
                <div>
                  <p className="text-xs font-bold leading-none">FB POST PRO</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Companion v1.0-preview</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </div>

            {/* Service Account Strip */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px]">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  {currentUser?.displayName ?? 'Chưa đăng nhập'}
                </p>
                <p className="text-slate-500 truncate">
                  {usageSummary.isActive && currentPlan ? currentPlan.name : 'Gói chưa kích hoạt'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setScenario((prev) =>
                    prev === 'DISCONNECTED' || prev === 'REVOKED'
                      ? 'WAITING_CONFIRMATION'
                      : 'DISCONNECTED'
                  )
                }
                className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
              >
                {scenario === 'DISCONNECTED' ? 'Kết nối website' : 'Ngắt kết nối'}
              </button>
            </div>

            {/* Popup Body by Scenario */}
            <div className="flex-1 p-4 flex flex-col justify-between gap-4 overflow-y-auto">
              {scenario === 'DISCONNECTED' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[40px] text-slate-300">
                    link_off
                  </span>
                  <p className="text-sm font-bold text-slate-900">Chưa kết nối tài khoản website</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Kết nối tiện ích với tài khoản FB POST PRO để nhận bản chụp nội dung và xác nhận
                    kết quả đăng nhóm.
                  </p>
                  <button
                    type="button"
                    onClick={() => setScenario('WAITING_CONFIRMATION')}
                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Kết nối website (DEMO)
                  </button>
                </div>
              )}

              {scenario === 'CONNECTING' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[36px] text-blue-600 animate-spin">
                    progress_activity
                  </span>
                  <p className="text-sm font-bold text-slate-900">Đang đồng bộ phiên làm việc...</p>
                  <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát.</p>
                </div>
              )}

              {scenario === 'OFFLINE' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[40px] text-slate-400">
                    cloud_off
                  </span>
                  <p className="text-sm font-bold text-slate-900">Thiết bị đang ngoại tuyến</p>
                  <p className="text-xs text-slate-500">
                    Kiểm tra kết nối internet của trình duyệt và bấm kiểm tra lại.
                  </p>
                  <button
                    type="button"
                    onClick={() => setScenario('WAITING_CONFIRMATION')}
                    className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                  >
                    Kiểm tra kết nối
                  </button>
                </div>
              )}

              {scenario === 'REVOKED' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[40px] text-rose-500">
                    block
                  </span>
                  <p className="text-sm font-bold text-rose-900">Thiết bị đã bị thu hồi quyền</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Phiên của thiết bị này đã bị thu hồi từ trang Tài khoản &amp; Thiết bị. Vui lòng
                    kết nối lại từ website.
                  </p>
                </div>
              )}

              {scenario === 'SUBSCRIPTION_EXPIRED' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[40px] text-amber-500">
                    workspace_premium
                  </span>
                  <p className="text-sm font-bold text-slate-900">Gói dịch vụ đã hết hạn</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Gia hạn gói dịch vụ trên website để tiếp tục đồng bộ và xác nhận tác vụ mới.
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Mở trang Gói dịch vụ
                  </Link>
                </div>
              )}

              {scenario === 'CONNECTION_ERROR' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[40px] text-rose-500">
                    error
                  </span>
                  <p className="text-sm font-bold text-slate-900">Không thể kết nối máy chủ</p>
                  <p className="text-xs text-slate-500">
                    Máy chủ không phản hồi. Hãy thử kiểm tra kết nối lại.
                  </p>
                  <button
                    type="button"
                    onClick={() => setScenario('WAITING_CONFIRMATION')}
                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Thử kết nối lại
                  </button>
                </div>
              )}

              {scenario === 'CONNECTED_IDLE' && (
                <div className="my-auto text-center space-y-3 py-6">
                  <span className="material-symbols-outlined text-[40px] text-emerald-500">
                    check_circle
                  </span>
                  <p className="text-sm font-bold text-slate-900">Không có tác vụ đang chờ</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tạo tác vụ mới trên website FB POST PRO để hiển thị tại đây.
                  </p>
                  <Link
                    to="/post"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Mở trang Đăng bài
                  </Link>
                </div>
              )}

              {(scenario === 'WAITING_CONFIRMATION' || scenario === 'RUNNING') && (
                <>
                  {!activeTask || !activeItem ? (
                    <div className="my-auto text-center space-y-2.5 py-8">
                      <span className="material-symbols-outlined text-[36px] text-slate-300">
                        inbox
                      </span>
                      <p className="text-sm font-bold text-slate-900">Không có tác vụ cần xử lý</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {!usageSummary.isActive
                          ? 'Gói dịch vụ hiện đã hết hạn hoặc chưa kích hoạt.'
                          : !hasNonRevokedDevice
                          ? 'Tài khoản chưa có thiết bị Extension hợp lệ (chưa kết nối hoặc đã bị thu hồi).'
                          : 'Không có tác vụ đăng Nhóm (MANUAL_GROUP) nào đã đến hạn và đang chờ xác nhận.'}
                      </p>
                      <Link
                        to={!usageSummary.isActive ? '/pricing' : '/post'}
                        className="inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                      >
                        {!usageSummary.isActive ? 'Gia hạn gói dịch vụ' : 'Tạo tác vụ đăng Nhóm'}
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded-full border font-bold ${
                            TASK_STATUS_META[activeTask.status].badgeClass
                          }`}
                        >
                          {TASK_STATUS_META[activeTask.status].label}
                        </span>
                        <span className="text-slate-500 font-semibold">
                          Tiến độ: {getTaskProgress(activeTask.items).completed}/
                          {activeTask.items.length}
                        </span>
                      </div>

                      {/* Destination Snapshot */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Đích đăng hiện tại
                        </p>
                        <p className="text-xs font-bold text-slate-900">
                          {activeItem.destinationNameSnapshot}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {activeItem.destinationUrlSnapshot}
                        </p>
                      </div>

                      {/* Post Content Snapshot */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Nội dung bài viết (Snapshot)
                        </p>
                        <p className="text-xs text-slate-700 whitespace-pre-line line-clamp-4 leading-relaxed">
                          {activeItem.contentSnapshot || '(Chỉ có link/media)'}
                        </p>
                        {activeItem.linkSnapshot && (
                          <p className="text-[11px] text-blue-600 truncate">
                            {activeItem.linkSnapshot}
                          </p>
                        )}
                      </div>

                      {/* Legal Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCopyContent}
                          className="h-9 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          Sao chép bài
                        </button>
                        <a
                          href={activeItem.destinationUrlSnapshot}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap"
                          title="Chỉ mở URL nhóm trên tab mới — KHÔNG tự đánh dấu thành công"
                        >
                          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                          Mở nhóm FB
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[17px]">fact_check</span>
                        Xác nhận kết quả mục này
                      </button>

                      {/* Task Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {canPauseTask(activeTask) && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = pauseTask(activeTask.id);
                              if (!res.ok) {
                                addToast('error', 'Không thể tạm dừng', res.error);
                                return;
                              }
                              addToast('info', 'Đã tạm dừng tác vụ');
                            }}
                            className="flex-1 h-8 rounded-lg border border-orange-200 text-orange-700 text-[11px] font-semibold hover:bg-orange-50"
                          >
                            Tạm dừng
                          </button>
                        )}
                        {canResumeTask(activeTask) && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = resumeTask(activeTask.id);
                              if (!res.ok) {
                                addToast('error', 'Không thể tiếp tục', res.error);
                                return;
                              }
                              addToast('success', 'Đã tiếp tục tác vụ');
                            }}
                            className="flex-1 h-8 rounded-lg border border-blue-200 text-blue-700 text-[11px] font-semibold hover:bg-blue-50"
                          >
                            Tiếp tục
                          </button>
                        )}
                        {canCancelTask(activeTask) && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = cancelTask(activeTask.id);
                              if (!res.ok) {
                                addToast('error', 'Không thể hủy tác vụ', res.error);
                                return;
                              }
                              addToast('warning', 'Đã hủy tác vụ');
                            }}
                            className="flex-1 h-8 rounded-lg border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-50"
                          >
                            Hủy tác vụ
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => addToast('info', 'Đã kiểm tra kết nối (Preview)')}
                  className="text-slate-600 hover:text-slate-900 font-medium"
                >
                  Kiểm tra kết nối
                </button>
                <Link to="/dashboard" className="text-blue-600 hover:underline font-semibold">
                  Mở website
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Scenario Switcher & Compliance Notes */}
        <div className="lg:col-span-7 space-y-4">
          {IS_DEV_OR_DEMO && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">
                Bộ chuyển đổi trạng thái UI (9 trạng thái chuẩn hóa)
              </h2>
              <p className="text-xs text-slate-500">
                Chỉ dùng để kiểm tra hiển thị của Popup Extension 385×560px trong chế độ Dev/DEMO.
                Không bỏ qua kiểm tra điều kiện hợp lệ ở tầng Service.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setScenario(sc.id)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      scenario === sc.id
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{sc.label}</p>
                    <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{sc.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 text-xs text-slate-600">
            <h3 className="text-sm font-bold text-slate-900">Nguyên tắc hoạt động của Popup</h3>
            <ul className="list-disc pl-5 space-y-1 leading-relaxed">
              <li>
                Nút <strong>Mở nhóm FB</strong> chỉ mở đường dẫn đích trên tab mới và{' '}
                <strong>không bao giờ tự đánh dấu thành công</strong>.
              </li>
              <li>
                Trạng thái chỉ chuyển sang Thành công / Thất bại / Cần kiểm tra khi người dùng bấm{' '}
                <strong>Xác nhận kết quả</strong> cho từng mục cụ thể.
              </li>
              <li>
                Tiện ích chỉ đồng bộ bản chụp nội dung bài viết và trạng thái xác nhận do người dùng
                chủ động gửi lên hệ thống.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Extension Preview */}
      {confirmOpen && activeItem && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Xác nhận kết quả đăng nhóm</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {activeItem.destinationNameSnapshot}
              </p>
            </div>
            <form onSubmit={handleSubmitConfirm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'SUCCESS', label: 'Thành công' },
                    { value: 'FAILED', label: 'Thất bại' },
                    { value: 'NEEDS_REVIEW', label: 'Cần kiểm tra' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    className={`h-9 rounded-lg border font-semibold ${
                      outcome === opt.value
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {outcome === 'SUCCESS' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Link bài đăng (tùy chọn)
                  </label>
                  <input
                    type="url"
                    value={resultPostUrl}
                    onChange={(e) => setResultPostUrl(e.target.value)}
                    placeholder="https://www.facebook.com/groups/.../posts/..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú lỗi</label>
                  <textarea
                    rows={2}
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="Mô tả ngắn lý do..."
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
