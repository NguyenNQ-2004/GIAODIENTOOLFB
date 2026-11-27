import React, { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApp } from '../state/AppContext';
import type { BillingPeriod, PaymentOrder, PaymentOrderStatus } from '../types/domain';
import { computeCountdown, formatVietnamDate, formatVietnamDateTime } from '../utils/dateTime';
import { formatVnd } from '../utils/formatters';

const ORDER_STATUS_META: Record<PaymentOrderStatus, { label: string; badgeClass: string }> = {
  PENDING: { label: 'Chờ thanh toán', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  PAID: { label: 'Đã thanh toán', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  FAILED: { label: 'Thất bại', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  EXPIRED: { label: 'Hết hạn', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Đã hủy', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const PricingPage: React.FC = () => {
  const {
    activePlans,
    plans,
    orders,
    usageSummary,
    createPaymentOrder,
    checkOrderStatus,
    cancelPaymentOrder,
    addToast,
  } = useApp();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<PaymentOrder | null>(null);
  const [tickNow, setTickNow] = useState<Date>(() => new Date());

  // Tick every second for accurate expiresAt countdown
  useEffect(() => {
    const timer = window.setInterval(() => setTickNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  // Select active pending order safely (never crashes when orders is empty)
  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = orders.find((o) => o.id === selectedOrderId);
      if (found) return found;
    }
    return orders.find((o) => o.status === 'PENDING') ?? orders[0] ?? null;
  }, [orders, selectedOrderId]);

  const countdown = useMemo(
    () => (activeOrder ? computeCountdown(activeOrder.expiresAt, tickNow) : null),
    [activeOrder, tickNow]
  );

  const handleCreateOrder = (planId: string) => {
    const res = createPaymentOrder({
      planId,
      billingPeriod,
      paymentMethod: 'VIETQR',
    });
    if (!res.ok || !res.data) {
      addToast('error', 'Không thể tạo đơn thanh toán', res.error);
      return;
    }
    setSelectedOrderId(res.data.id);
    addToast(
      'success',
      'Đã tạo đơn thanh toán (PENDING)',
      `Mã đơn ${res.data.orderCode}. Đơn ở trạng thái chờ xác nhận thanh toán.`
    );
  };

  const handleCheckStatus = (order: PaymentOrder) => {
    const res = checkOrderStatus(order.id);
    if (!res.ok || !res.data) {
      addToast('error', 'Không thể kiểm tra trạng thái đơn', res.error);
      return;
    }
    if (res.data.status === 'PENDING') {
      addToast(
        'info',
        'Đơn hàng vẫn đang Chờ thanh toán (PENDING)',
        'Chế độ DEMO không tự đánh dấu PAID từ phía khách hàng. Hãy đăng nhập Admin → tab Thanh toán để xác nhận mô phỏng.'
      );
    } else if (res.data.status === 'EXPIRED') {
      addToast('warning', 'Đơn hàng đã hết hạn', 'Vui lòng tạo đơn thanh toán mới nếu cần.');
    } else {
      addToast('success', `Trạng thái hiện tại: ${ORDER_STATUS_META[res.data.status].label}`);
    }
  };

  const pct = (used: number, limit: number) =>
    limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gói dịch vụ &amp; Thanh toán</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi mức sử dụng thực tế, nâng cấp gói và quản lý đơn thanh toán.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white">
          <button
            type="button"
            onClick={() => setBillingPeriod('MONTHLY')}
            className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors ${
              billingPeriod === 'MONTHLY'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Thanh toán hàng tháng
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('YEARLY')}
            className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors ${
              billingPeriod === 'YEARLY'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Thanh toán hàng năm (Tiết kiệm 2 tháng)
          </button>
        </div>
      </div>

      {/* Current Subscription & Exact Usage Summary */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Gói hiện tại:{' '}
                {usageSummary.plan ? usageSummary.plan.name : 'Chưa đăng ký gói'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  usageSummary.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {usageSummary.isActive
                  ? `Đang hoạt động · Còn ${usageSummary.daysRemaining} ngày`
                  : 'Hết hạn / Chưa kích hoạt'}
              </span>
            </div>
            {usageSummary.subscription && (
              <p className="text-xs text-slate-500 mt-1">
                Hiệu lực: {formatVietnamDate(usageSummary.subscription.startsAt)} —{' '}
                {formatVietnamDate(usageSummary.subscription.endsAt)} (
                {usageSummary.subscription.billingPeriod === 'YEARLY' ? 'Theo năm' : 'Theo tháng'})
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Hồ sơ Facebook đang dùng',
              used: usageSummary.accountsUsed,
              limit: usageSummary.accountsLimit,
            },
            {
              label: 'Nhóm Facebook đã lưu',
              used: usageSummary.groupsUsed,
              limit: usageSummary.groupsLimit,
            },
            {
              label: 'Tác vụ đã tạo hôm nay',
              used: usageSummary.scheduledTodayUsed,
              limit: usageSummary.scheduledTodayLimit,
            },
          ].map((metric) => (
            <div key={metric.label} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-600 font-medium">{metric.label}</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {metric.used} / {metric.limit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${pct(metric.used, metric.limit)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Plans Grid (Live synced with Admin Plans CRUD) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activePlans.map((plan) => {
          const price =
            billingPeriod === 'YEARLY' ? plan.priceYearlyVnd : plan.priceMonthlyVnd;
          const isCurrent = usageSummary.isActive && usageSummary.plan?.id === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border p-5 flex flex-col justify-between gap-5 ${
                isCurrent ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                    {plan.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{plan.description}</p>
                <div className="pt-1">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    {formatVnd(price)}
                  </span>
                  <span className="text-xs text-slate-500">
                    /{billingPeriod === 'YEARLY' ? 'năm' : 'tháng'}
                  </span>
                </div>

                <ul className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                      check_circle
                    </span>
                    Tối đa <strong>{plan.maxFacebookAccounts}</strong> hồ sơ Facebook
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                      check_circle
                    </span>
                    Lưu trữ tối đa <strong>{plan.maxGroups}</strong> nhóm Facebook
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                      check_circle
                    </span>
                    Tối đa <strong>{plan.maxScheduledTasksPerDay}</strong> tác vụ/ngày
                  </li>
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5 shrink-0">
                        done
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCreateOrder(plan.id)}
                className={`w-full h-10 rounded-lg text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'border border-blue-600 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isCurrent ? 'Gia hạn gói này' : 'Tạo đơn nâng cấp'}
              </button>
            </div>
          );
        })}
      </section>

      {/* Active Order Checkout Box + Order History */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Checkout Panel */}
        <section className="xl:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Chi tiết đơn thanh toán</h2>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
              DEMO — Chưa kết nối VietQR thật
            </span>
          </div>

          {!activeOrder ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              Bạn chưa có đơn thanh toán nào. Hãy chọn một gói dịch vụ ở phía trên để tạo đơn mới.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã đơn hàng</span>
                  <span className="font-mono font-bold text-slate-900">{activeOrder.orderCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gói dịch vụ</span>
                  <span className="font-semibold text-slate-900">
                    {planMap.get(activeOrder.planId)?.name ?? activeOrder.planId} (
                    {activeOrder.billingPeriod === 'YEARLY' ? 'Năm' : 'Tháng'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Số tiền</span>
                  <span className="font-bold text-blue-700 text-sm">
                    {formatVnd(activeOrder.amountVnd)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                      ORDER_STATUS_META[activeOrder.status].badgeClass
                    }`}
                  >
                    {ORDER_STATUS_META[activeOrder.status].label}
                  </span>
                </div>
                {activeOrder.status === 'PENDING' && countdown && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Thời gian giữ đơn</span>
                    <span
                      className={`font-mono font-bold ${
                        countdown.isExpired ? 'text-rose-600' : 'text-amber-700'
                      }`}
                    >
                      {countdown.isExpired ? 'Đã hết hạn' : countdown.formatted}
                    </span>
                  </div>
                )}
              </div>

              {/* Honest Placeholder QR (zero real bank numbers) */}
              {activeOrder.status === 'PENDING' && (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-[40px]">qr_code_2</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide mt-1">
                      QR DEMO
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    Mã QR minh họa — Không chuyển khoản thật
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Nội dung chuyển khoản mẫu: <code className="font-mono font-bold">{activeOrder.orderCode}</code>.
                    Xác nhận thanh toán thật sẽ do Webhook backend xử lý; trong chế độ DEMO, tài
                    khoản Admin có thể xác nhận đơn tại mục Quản trị → Thanh toán.
                  </p>
                </div>
              )}

              {activeOrder.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckStatus(activeOrder)}
                    className="flex-1 h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Kiểm tra trạng thái
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelTargetOrder(activeOrder)}
                    className="h-9 px-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold"
                  >
                    Hủy đơn
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Order History Table */}
        <section className="xl:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Lịch sử đơn hàng ({orders.length})
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Chưa có lịch sử giao dịch nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Mã đơn</th>
                    <th className="px-4 py-3 font-semibold">Gói</th>
                    <th className="px-4 py-3 font-semibold">Số tiền</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Ngày tạo (GMT+7)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => {
                    const meta = ORDER_STATUS_META[ord.status];
                    const isSelected = activeOrder?.id === ord.id;
                    return (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrderId(ord.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                          {ord.orderCode}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {planMap.get(ord.planId)?.name ?? ord.planId}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums">
                          {formatVnd(ord.amountVnd)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatVietnamDateTime(ord.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTargetOrder)}
        title="Hủy đơn thanh toán đang chờ?"
        description={`Đơn hàng ${cancelTargetOrder?.orderCode ?? ''} sẽ chuyển sang trạng thái Đã hủy (CANCELLED).`}
        confirmLabel="Hủy đơn hàng"
        onCancel={() => setCancelTargetOrder(null)}
        onConfirm={() => {
          if (cancelTargetOrder) {
            cancelPaymentOrder(cancelTargetOrder.id);
            addToast('info', 'Đã hủy đơn hàng', cancelTargetOrder.orderCode);
          }
          setCancelTargetOrder(null);
        }}
      />
    </div>
  );
};
