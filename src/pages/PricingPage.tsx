import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BillingCycle, PaymentOrder, PlanTier } from '../types/app';
import { PLAN_SPECS } from '../data/mockData';

interface PricingPageProps {
  currentPlan: PlanTier;
  billingCycle: BillingCycle;
  onChangeBillingCycle: (cycle: BillingCycle) => void;
  accountsCount: number;
  groupsCount: number;
  scheduledCount: number;
  orders: PaymentOrder[];
  onVerifyOrderPayment: (orderId: string, plan: PlanTier, cycle: BillingCycle) => void;
  onCreateOrder: (plan: PlanTier, cycle: BillingCycle) => PaymentOrder;
  onNotify: (type: 'success' | 'info' | 'warning' | 'error', msg: string) => void;
}

const formatVnd = (val: number) =>
  val.toLocaleString('vi-VN') + 'đ';

export const PricingPage: React.FC<PricingPageProps> = ({
  currentPlan,
  billingCycle,
  onChangeBillingCycle,
  accountsCount,
  groupsCount,
  scheduledCount,
  orders,
  onVerifyOrderPayment,
  onCreateOrder,
  onNotify,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders.find((o) => o.status === 'PENDING')?.id || orders[0]?.id || 'ORD-20241024-8902'
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(14 * 60 + 58);
  const [checkingPayment, setCheckingPayment] = useState<boolean>(false);
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'EXPIRED'>('ALL');
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<PaymentOrder | null>(null);

  const checkoutRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentSpec = PLAN_SPECS[currentPlan];
  const savedGroupsUsed = Math.max(248, groupsCount);
  const scheduledUsed = Math.max(5, scheduledCount);

  const accountPct = Math.min(100, Math.round((accountsCount / currentSpec.maxAccounts) * 100));
  const groupsPct = Math.min(100, Number(((savedGroupsUsed / currentSpec.maxGroups) * 100).toFixed(1)));
  const tasksPct = Math.min(100, Number(((scheduledUsed / currentSpec.maxScheduledTasks) * 100).toFixed(1)));

  const activeOrder =
    orders.find((o) => o.id === selectedOrderId) ||
    orders.find((o) => o.status === 'PENDING') ||
    orders[0];

  const activeOrderSpec = PLAN_SPECS[activeOrder.plan];
  const transferMemo = `FBPAY ${activeOrder.id.split('-').pop() || 'ORD8902'}`;

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.plan.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const handleSelectPlan = (tier: PlanTier) => {
    const created = onCreateOrder(tier, billingCycle);
    setSelectedOrderId(created.id);
    setSecondsLeft(15 * 60);
    checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyText = (value: string, label: string) => {
    navigator.clipboard?.writeText(value);
    onNotify('success', label);
  };

  const handleVerifyClick = () => {
    setCheckingPayment(true);
    setTimeout(() => {
      setCheckingPayment(false);
      onVerifyOrderPayment(activeOrder.id, activeOrder.plan, activeOrder.cycle);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-10">
      {/* Top Meta Breadcrumb / SSL Banner */}
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="text-[13px] font-medium text-on-surface-variant">Cài đặt tài khoản</span>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-[13px] text-primary font-semibold">Gói dịch vụ &amp; Thanh toán</span>
        </div>
        <div className="flex flex-wrap items-center gap-space-md">
          <span className="text-[11px] text-on-surface-variant flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-lg">
            <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            <span>Giao dịch mã hóa SSL 256-bit chuẩn PCI-DSS</span>
          </span>
          <div className="flex items-center gap-space-xs text-[11px] text-secondary">
            <span>Hệ thống tự động kích hoạt sau</span>
            <span className="font-semibold text-primary">30 giây</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Subscription & Resource Consumption */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Current Plan Card (5 cols) */}
        <div className="xl:col-span-5 bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-gradient-to-br from-primary-fixed/40 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col gap-space-md relative z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-space-sm">
                <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                  Gói đang sử dụng
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-space-sm py-[2px] rounded text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE (Đang hoạt động)
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-space-sm py-[2px] rounded font-medium">
                Chu kỳ: {billingCycle === 'yearly' ? 'YEARLY (Năm)' : 'MONTHLY (Tháng)'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-space-xs gap-3">
              <div>
                <h2 className="text-[28px] text-on-surface font-bold tracking-tight">
                  {currentSpec.name}
                </h2>
                <p className="text-[13px] text-on-surface-variant mt-0.5">
                  {currentSpec.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[20px] font-bold text-primary tabular-nums">
                  Còn {currentPlan === 'BUSINESS' ? '365' : '83'} ngày
                </span>
                <p className="text-[11px] text-on-surface-variant">Thời hạn kết thúc chu kỳ</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-md p-space-md bg-surface-container-low rounded-lg mt-space-xs">
              <div className="flex flex-col">
                <span className="text-[11px] text-on-surface-variant">Ngày bắt đầu</span>
                <span className="text-[13px] text-on-surface font-semibold tabular-nums">
                  15/01/2024
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-on-surface-variant">Ngày hết hạn</span>
                <span className="text-[13px] font-semibold text-primary tabular-nums">
                  {currentPlan === 'BUSINESS' ? '24/10/2025' : '15/01/2025'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-md mt-space-lg pt-space-md relative z-10">
            <button
              type="button"
              onClick={() => checkoutRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="h-9 px-space-xl bg-primary-container text-on-primary text-[13px] rounded-lg hover:bg-primary transition-colors flex items-center justify-center gap-space-xs font-semibold flex-1 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">upgrade</span>
              <span>Nâng cấp gói</span>
            </button>
            <button
              type="button"
              onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="h-9 px-space-xl bg-surface-container text-on-surface text-[13px] rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-space-xs font-medium whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">autorenew</span>
              <span>Gia hạn gói</span>
            </button>
          </div>
        </div>

        {/* Resource Limits & Consumption (7 cols) */}
        <div className="xl:col-span-7 bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-space-md">
              <div>
                <h3 className="text-[18px] text-on-surface font-semibold">
                  Hạn mức tài nguyên hệ thống
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  Đồng bộ trực tiếp từ Database Contract người dùng
                </p>
              </div>
              <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-space-sm py-1 rounded">
                Dữ liệu theo thời gian thực
              </span>
            </div>

            <div className="flex flex-col gap-space-lg mt-space-md">
              {/* Resource 1 */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-space-xs text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      account_circle
                    </span>
                    Tài khoản Facebook (plans.max_facebook_accounts)
                  </span>
                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`font-semibold tabular-nums ${
                        accountPct >= 100 ? 'text-error' : 'text-on-surface'
                      }`}
                    >
                      {accountsCount} / {currentSpec.maxAccounts} tài khoản
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-[2px] rounded font-medium tabular-nums ${
                        accountPct >= 100
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {accountPct}% - {accountPct >= 100 ? 'Đạt giới hạn gói' : 'Còn dư hạn mức'}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      accountPct >= 100 ? 'bg-error' : 'bg-primary-container'
                    }`}
                    style={{ width: `${accountPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {accountPct >= 100
                    ? 'Cần nâng cấp lên Business để liên kết thêm tối đa 5 tài khoản vận hành.'
                    : `Bạn có thể liên kết thêm ${
                        currentSpec.maxAccounts - accountsCount
                      } tài khoản Facebook nữa.`}
                </p>
              </div>

              {/* Resource 2 */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-space-xs text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
                    Nhóm đã lưu (plans.max_saved_groups)
                  </span>
                  <div className="flex items-center gap-space-sm">
                    <span className="font-semibold text-on-surface tabular-nums">
                      {savedGroupsUsed} / {currentSpec.maxGroups.toLocaleString('vi-VN')} nhóm
                    </span>
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-[2px] rounded font-medium tabular-nums">
                      {groupsPct}% - Dung lượng ổn định
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-500"
                    style={{ width: `${groupsPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Bạn còn {(currentSpec.maxGroups - savedGroupsUsed).toLocaleString('vi-VN')} vị trí
                  nhóm lưu trữ sẵn sàng cho chiến dịch phủ rộng.
                </p>
              </div>

              {/* Resource 3 */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span className="flex items-center gap-space-xs text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      schedule_send
                    </span>
                    Tác vụ chờ lịch (plans.max_scheduled_tasks)
                  </span>
                  <div className="flex items-center gap-space-sm">
                    <span className="font-semibold text-on-surface tabular-nums">
                      {scheduledUsed} / {currentSpec.maxScheduledTasks} tác vụ
                    </span>
                    <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-[2px] rounded font-medium tabular-nums">
                      {tasksPct}% - Đang hoạt động
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${tasksPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  {scheduledUsed} bài đăng đang trong hàng đợi chờ bot Extension kích hoạt tự động
                  theo giờ vàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Pricing Matrix & Billing Toggle */}
      <div ref={plansRef} className="flex flex-col gap-space-lg w-full mt-space-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div>
            <h2 className="text-[20px] text-on-surface font-bold tracking-tight">
              Bảng giá dịch vụ
            </h2>
            <p className="text-[13px] text-on-surface-variant">
              Đầu tư chính xác theo quy mô vận hành tài nguyên nhóm Facebook của bạn
            </p>
          </div>

          <div className="flex items-center p-1 bg-surface-container-low rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => onChangeBillingCycle('monthly')}
              className={`px-space-lg py-1 rounded-md text-[13px] transition-all whitespace-nowrap ${
                billingCycle === 'monthly'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-sm'
                  : 'font-medium text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Theo tháng
            </button>
            <button
              type="button"
              onClick={() => onChangeBillingCycle('yearly')}
              className={`px-space-lg py-1 rounded-md text-[13px] transition-all flex items-center gap-space-xs whitespace-nowrap ${
                billingCycle === 'yearly'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-sm'
                  : 'font-medium text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Theo năm</span>
              <span className="text-[11px] bg-amber-100 text-amber-800 px-1.5 py-[1px] rounded font-bold">
                Tiết kiệm 2 tháng - Ưu đãi 17%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg items-stretch">
          {(['BASIC', 'PRO', 'BUSINESS'] as PlanTier[]).map((tier) => {
            const spec = PLAN_SPECS[tier];
            const isCurrent = currentPlan === tier;
            const price = billingCycle === 'yearly' ? spec.yearlyPrice : spec.monthlyPrice;

            return (
              <div
                key={tier}
                className={`bg-surface-container-lowest rounded-xl p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isCurrent
                    ? 'shadow-md ring-2 ring-primary-container'
                    : tier === 'BUSINESS'
                    ? 'shadow-sm hover:shadow-md bg-gradient-to-b from-surface-container-lowest via-surface-container-lowest to-surface-container-low/40'
                    : 'shadow-sm hover:shadow-md'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0">
                    <span className="bg-primary-container text-on-primary text-[11px] px-space-md py-1 rounded-bl-lg font-semibold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      Gói bạn đang dùng
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-space-md">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[18px] font-bold ${
                        isCurrent ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {spec.name}
                    </span>
                    {!isCurrent && (
                      <span
                        className={`text-[11px] px-space-sm py-[2px] rounded font-semibold ${
                          tier === 'BUSINESS'
                            ? 'text-on-tertiary-container bg-tertiary-fixed'
                            : 'text-secondary bg-surface-container'
                        }`}
                      >
                        {spec.badge}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[11px] text-primary bg-primary-fixed px-space-sm py-[2px] rounded font-semibold">
                        {spec.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] text-on-surface-variant">{spec.description}</p>

                  <div className="my-space-sm">
                    <div className="flex items-baseline gap-space-xs">
                      <span
                        className={`text-[28px] font-bold tabular-nums ${
                          isCurrent ? 'text-primary' : 'text-on-surface'
                        }`}
                      >
                        {formatVnd(price)}
                      </span>
                      <span className="text-[13px] text-on-surface-variant">
                        / {billingCycle === 'yearly' ? 'năm' : 'tháng'}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium block mt-1">
                      {tier === 'BASIC' && billingCycle === 'yearly'
                        ? 'Khoảng 40.800đ/tháng khi trả cả năm'
                        : tier === 'PRO' && billingCycle === 'yearly'
                        ? 'Tiết kiệm 198.000đ khi thanh toán 12 tháng'
                        : 'Đầy đủ tính năng cao cấp & ưu tiên bot xử lý'}
                    </span>
                  </div>

                  <div className="w-full h-[1px] bg-surface-container" />

                  <div className="flex flex-col gap-space-sm py-space-xs">
                    <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                      Hạn mức tài nguyên
                    </span>
                    <div className="flex items-center gap-space-sm text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        check_circle
                      </span>
                      <span>
                        <strong>{spec.maxAccounts}</strong> tài khoản Facebook
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        check_circle
                      </span>
                      <span>
                        <strong>{spec.maxGroups.toLocaleString('vi-VN')}</strong> nhóm lưu trữ
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm text-[13px] text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        check_circle
                      </span>
                      <span>
                        <strong>{spec.maxScheduledTasks}</strong> tác vụ chờ lịch
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-space-xl pt-space-md">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(tier)}
                    className={`w-full h-9 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-space-xs ${
                      tier === 'BASIC' && !isCurrent
                        ? 'bg-surface-container text-on-surface hover:bg-surface-container-high font-medium'
                        : 'bg-primary-container text-on-primary hover:bg-primary shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isCurrent ? 'autorenew' : tier === 'BUSINESS' ? 'bolt' : 'swap_horiz'}
                    </span>
                    <span>
                      {isCurrent
                        ? `Gia hạn ${spec.name}`
                        : tier === 'BASIC'
                        ? 'Chọn gói Basic'
                        : `Nâng cấp lên ${tier === 'BUSINESS' ? 'Business' : 'Pro'}`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Dynamic VietQR Checkout Box */}
      <div
        ref={checkoutRef}
        id="checkoutModal"
        className="w-full bg-surface-container-lowest rounded-xl p-5 shadow-md mt-space-md relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md pb-space-lg mb-space-lg border-b border-surface-container">
          <div>
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="text-[20px] font-bold text-on-surface">
                Thanh toán gói dịch vụ
              </span>
              <span
                className={`text-[11px] px-space-sm py-[2px] rounded font-semibold flex items-center gap-1 ${
                  activeOrder.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeOrder.status === 'PAID'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                {activeOrder.status === 'PAID'
                  ? 'Đơn hàng đã thanh toán thành công'
                  : 'Đơn hàng đang chờ thanh toán'}
              </span>
            </div>
            <p className="text-[13px] text-on-surface-variant mt-0.5">
              Quét mã QR VietQR từ bất kỳ ứng dụng ngân hàng di động nào để kích hoạt tự động tức thì.
            </p>
          </div>

          <div className="flex items-center gap-space-md bg-surface-container-low px-space-lg py-space-sm rounded-lg">
            <span className="material-symbols-outlined text-[20px] text-amber-600">timer</span>
            <div className="flex flex-col">
              <span className="text-[11px] text-on-surface-variant">
                Thời gian thanh toán còn lại
              </span>
              <span className="text-[18px] font-bold text-error tracking-wider leading-none font-mono tabular-nums">
                {mins}:{secs}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Left: VietQR SVG */}
          <div className="lg:col-span-5 bg-surface-container-low/70 p-5 rounded-xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-between w-full mb-space-md px-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="w-7 h-7 rounded bg-blue-700 text-white font-bold flex items-center justify-center text-[10px]">
                  MB
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface leading-tight">MBBank</span>
                  <span className="text-[11px] text-on-surface-variant leading-none">
                    Ngân hàng TMCP Quân Đội
                  </span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 bg-surface-container-lowest px-1.5 py-1 rounded shadow-sm">
                <span className="text-xs font-bold text-primary">Viet</span>
                <span className="text-xs font-bold text-red-600">QR</span>
              </div>
            </div>

            <div className="bg-white p-space-md rounded-xl shadow-sm relative flex items-center justify-center">
              <svg
                className="w-56 h-56 text-slate-900"
                fill="none"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect fill="white" height="200" rx="8" width="200" />
                <rect fill="currentColor" height="46" rx="4" width="46" x="14" y="14" />
                <rect fill="white" height="30" rx="2" width="30" x="22" y="22" />
                <rect fill="currentColor" height="18" rx="1" width="18" x="28" y="28" />
                <rect fill="currentColor" height="46" rx="4" width="46" x="140" y="14" />
                <rect fill="white" height="30" rx="2" width="30" x="148" y="22" />
                <rect fill="currentColor" height="18" rx="1" width="18" x="154" y="28" />
                <rect fill="currentColor" height="46" rx="4" width="46" x="14" y="140" />
                <rect fill="white" height="30" rx="2" width="30" x="22" y="148" />
                <rect fill="currentColor" height="18" rx="1" width="18" x="28" y="154" />
                <path
                  d="M70 18h10v10H70zm20 0h10v10H90zm20 0h10v10h-10zm-40 20h20v10H70zm30 0h10v10h-10zm20 0h10v10h-10zm-50 20h10v10H70zm20 0h20v10H90zm30 0h10v10h-10zm10 0h10v10h-10zm-70 20h10v10H70zm40 0h20v10h-20zm-40 20h10v10H70zm30 0h10v10h-10zm20 0h20v10h-20zm-50 20h10v10H70zm20 0h10v10H90zm30 0h10v10h-10zm-50 20h20v10H70zm30 0h10v10h-10zm20 0h20v10h-20z"
                  fill="currentColor"
                />
                <path
                  d="M18 70h10v10H18zm20 0h10v10H38zm20 0h10v10H58zm82 0h10v10h-10zm20 0h10v10h-10zm-122 20h10v10H18zm30 0h10v10H48zm82 0h20v10h-20zm-112 20h20v10H18zm30 0h10v10H48zm82 0h10v10h-10zm20 0h10v10h-10z"
                  fill="currentColor"
                />
                <rect fill="#2563EB" height="40" rx="6" width="40" x="80" y="80" />
                <path d="M89 95h22v3H89zm0 7h15v3H89zm0-14h22v3H89z" fill="white" />
              </svg>
              <div className="absolute bottom-2 right-2 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded text-[10px] text-on-surface-variant">
                VietQR 2.0
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant mt-space-md max-w-xs">
              Mở App ngân hàng bất kỳ (Vietcombank, MB, Techcombank, VPBank...) chọn chức năng{' '}
              <strong>Quét mã QR</strong>
            </p>
          </div>

          {/* Right: Order Info & Copy Buttons */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full gap-space-lg">
            <div className="flex flex-col gap-space-md">
              <div className="p-space-lg bg-surface-container-low rounded-lg flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex flex-col">
                  <span className="text-[11px] text-on-surface-variant">Gói dịch vụ đã chọn</span>
                  <span className="text-[18px] font-bold text-on-surface">
                    {activeOrderSpec.name} ({activeOrder.cycle === 'yearly' ? '1 Năm' : '1 Tháng'})
                  </span>
                  <span className="text-[11px] text-primary">
                    Tài nguyên: {activeOrderSpec.maxAccounts} TK Facebook /{' '}
                    {activeOrderSpec.maxGroups.toLocaleString('vi-VN')} nhóm /{' '}
                    {activeOrderSpec.maxScheduledTasks} tác vụ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-on-surface-variant">Tổng tiền thanh toán</span>
                  <div className="text-[26px] font-bold text-primary tabular-nums">
                    {activeOrder.amount.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-space-xs bg-surface-container-lowest rounded-lg">
                <div className="flex items-center justify-between p-space-sm hover:bg-surface-container-low rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant">Mã đơn hàng</span>
                    <span className="text-[13px] font-semibold font-mono text-on-surface">
                      {activeOrder.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(activeOrder.id, 'Đã sao chép mã đơn hàng!')}
                    className="h-7 px-space-md bg-surface-container text-on-surface rounded text-xs hover:bg-surface-container-high transition-colors flex items-center gap-1 font-medium"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Sao chép</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-space-sm hover:bg-surface-container-low rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant">Ngân hàng thụ hưởng</span>
                    <span className="text-[13px] font-semibold text-on-surface">
                      MBBank (Quân Đội) - CN Hà Nội
                    </span>
                  </div>
                  <span className="text-[11px] text-secondary">Hỗ trợ 24/7 NAPAS 247</span>
                </div>

                <div className="flex items-center justify-between p-space-sm hover:bg-surface-container-low rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant">Số tài khoản</span>
                    <span className="text-[18px] font-bold text-on-surface tracking-wider font-mono">
                      0868889999
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText('0868889999', 'Đã sao chép số tài khoản!')}
                    className="h-7 px-space-md bg-surface-container text-on-surface rounded text-xs hover:bg-surface-container-high transition-colors flex items-center gap-1 font-medium"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Sao chép</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-space-sm hover:bg-surface-container-low rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant">
                      Chủ tài khoản thụ hưởng
                    </span>
                    <span className="text-[13px] font-semibold text-on-surface uppercase">
                      CONG TY FB POST PRO
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">
                    verified
                  </span>
                </div>

                <div className="flex items-center justify-between p-space-sm bg-primary-fixed/30 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-primary font-semibold">
                      Nội dung chuyển khoản (Bắt buộc chính xác)
                    </span>
                    <span className="text-[18px] font-bold text-primary font-mono">
                      {transferMemo}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(transferMemo, 'Đã sao chép nội dung chuyển khoản!')}
                    className="h-7 px-space-md bg-primary-container text-on-primary rounded text-xs hover:bg-primary transition-colors flex items-center gap-1 font-medium shadow-sm whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Sao chép nội dung</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-space-sm hover:bg-surface-container-low rounded-lg transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-on-surface-variant">Số tiền cần chuyển</span>
                    <span className="text-[18px] font-bold text-primary tabular-nums">
                      {activeOrder.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(String(activeOrder.amount), 'Đã sao chép số tiền thanh toán!')
                    }
                    className="h-7 px-space-md bg-surface-container text-on-surface rounded text-xs hover:bg-surface-container-high transition-colors flex items-center gap-1 font-medium"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Sao chép số tiền</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-md border-t border-surface-container">
              <div className="flex items-center gap-space-xs text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">sync</span>
                <span>
                  Webhook VietQR sẽ tự xác nhận sau khi nhận thông báo có biến động số dư.
                </span>
              </div>
              <button
                type="button"
                disabled={checkingPayment || activeOrder.status === 'PAID'}
                onClick={handleVerifyClick}
                className={`h-9 px-space-xl rounded-lg text-[13px] font-semibold flex items-center gap-space-xs shadow-sm transition-colors whitespace-nowrap ${
                  activeOrder.status === 'PAID'
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-primary-container hover:bg-primary text-on-primary'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    checkingPayment ? 'animate-spin' : ''
                  }`}
                >
                  {activeOrder.status === 'PAID' ? 'check_circle' : 'hourglass_bottom'}
                </span>
                <span>
                  {checkingPayment
                    ? 'Đang kiểm tra giao dịch VietQR...'
                    : activeOrder.status === 'PAID'
                    ? 'Đã xác nhận thanh toán'
                    : 'Kiểm tra trạng thái thanh toán'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Payment Orders History */}
      <div className="flex flex-col gap-space-md w-full mt-space-md bg-surface-container-lowest rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div>
            <h3 className="text-[18px] text-on-surface font-bold">
              Lịch sử đơn hàng &amp; Thanh toán
            </h3>
            <p className="text-[13px] text-on-surface-variant">
              Theo dõi chi tiết tất cả các chu kỳ đăng ký gói cước và hóa đơn VAT điện tử
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="relative">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm kiếm theo mã đơn..."
                className="h-8 pl-8 pr-space-md bg-surface-container-low text-on-surface rounded-lg text-[13px] placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary w-52"
              />
              <span className="material-symbols-outlined text-[16px] text-outline absolute left-2.5 top-2">
                search
              </span>
            </div>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as any)}
              className="h-8 px-3 bg-surface-container text-on-surface rounded-lg text-[13px] font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider h-9">
                <th className="px-space-md py-space-xs font-semibold rounded-l-lg">Mã đơn hàng</th>
                <th className="px-space-md py-space-xs font-semibold">Gói dịch vụ</th>
                <th className="px-space-md py-space-xs font-semibold">Chu kỳ</th>
                <th className="px-space-md py-space-xs font-semibold">Số tiền</th>
                <th className="px-space-md py-space-xs font-semibold">Ngày tạo</th>
                <th className="px-space-md py-space-xs font-semibold">Ngày thanh toán</th>
                <th className="px-space-md py-space-xs font-semibold">Trạng thái</th>
                <th className="px-space-md py-space-xs font-semibold text-right rounded-r-lg">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-[13px] text-on-surface">
              {filteredOrders.map((order) => {
                const isExpired = order.status === 'EXPIRED';
                const isPending = order.status === 'PENDING';
                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-surface-container-low/50 transition-colors h-11 ${
                      isPending ? 'bg-primary-fixed/10' : ''
                    }`}
                  >
                    <td
                      className={`px-space-md py-space-xs font-semibold font-mono ${
                        isPending
                          ? 'text-primary'
                          : isExpired
                          ? 'text-outline'
                          : 'text-on-surface'
                      }`}
                    >
                      {order.id}
                    </td>
                    <td
                      className={`px-space-md py-space-xs font-medium ${
                        isExpired ? 'text-outline' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            order.plan === 'BUSINESS'
                              ? 'bg-blue-600'
                              : order.plan === 'PRO'
                              ? 'bg-blue-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {PLAN_SPECS[order.plan].name}
                      </span>
                    </td>
                    <td
                      className={`px-space-md py-space-xs ${
                        isExpired ? 'text-outline' : 'text-on-surface-variant'
                      }`}
                    >
                      {order.cycle === 'yearly' ? '1 Năm (Yearly)' : '1 Tháng (Monthly)'}
                    </td>
                    <td
                      className={`px-space-md py-space-xs font-semibold tabular-nums ${
                        isExpired ? 'text-outline' : 'text-on-surface'
                      }`}
                    >
                      {order.amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td
                      className={`px-space-md py-space-xs tabular-nums ${
                        isExpired ? 'text-outline' : 'text-on-surface-variant'
                      }`}
                    >
                      {order.createdAt}
                    </td>
                    <td
                      className={`px-space-md py-space-xs tabular-nums ${
                        order.status === 'PAID'
                          ? 'font-medium text-emerald-700'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {order.paidAt}
                    </td>
                    <td className="px-space-md py-space-xs">
                      {order.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-[2px] rounded text-xs font-semibold whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          PENDING (Chờ thanh toán)
                        </span>
                      )}
                      {order.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-[2px] rounded text-xs font-semibold whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          PAID (Đã thanh toán)
                        </span>
                      )}
                      {order.status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant px-1.5 py-[2px] rounded text-xs font-medium whitespace-nowrap">
                          EXPIRED (Hết hạn)
                        </span>
                      )}
                    </td>
                    <td className="px-space-md py-space-xs text-right">
                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            checkoutRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="h-7 px-space-sm bg-primary-container text-on-primary rounded text-xs hover:bg-primary transition-colors font-medium whitespace-nowrap"
                        >
                          Thanh toán ngay
                        </button>
                      )}
                      {order.status === 'PAID' && (
                        <div className="inline-flex items-center gap-space-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onNotify('success', `Đang tải hóa đơn VAT điện tử cho ${order.id}.`)
                            }
                            className="w-7 h-7 flex items-center justify-center rounded bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
                            title="Tải hóa đơn VAT"
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvoiceModalOrder(order)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
                            title="Xem chi tiết giao dịch"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                          </button>
                        </div>
                      )}
                      {order.status === 'EXPIRED' && (
                        <span className="h-7 px-space-sm inline-flex items-center bg-surface-container-low text-outline rounded text-xs cursor-not-allowed">
                          Đã hủy
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-space-sm text-[11px] text-on-surface-variant">
          <span>
            Hiển thị {filteredOrders.length} trên {orders.length} đơn hàng gần nhất
          </span>
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              disabled
              className="h-7 px-space-sm rounded bg-surface-container-low text-outline cursor-not-allowed font-medium"
            >
              Trước
            </button>
            <span className="px-space-sm py-1 bg-primary text-on-primary rounded font-semibold text-xs">
              1
            </span>
            <button
              type="button"
              disabled
              className="h-7 px-space-sm rounded bg-surface-container-low text-outline cursor-not-allowed font-medium"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Security & Support Footer Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pt-space-sm text-on-surface-variant">
        <div className="flex items-start gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">shield</span>
          <div>
            <h4 className="text-[13px] text-on-surface font-semibold">Tự động kích hoạt</h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
              Sau khi tiền vào tài khoản, hệ thống tự động ghi nhận thanh toán trong 30 giây mà
              không cần can thiệp thủ công.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">receipt_long</span>
          <div>
            <h4 className="text-[13px] text-on-surface font-semibold">Hóa đơn điện tử VAT</h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
              Hóa đơn hợp lệ theo Thông tư 78/2021/TT-BTC gửi thẳng về email doanh nghiệp sau khi
              thanh toán.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">support_agent</span>
          <div>
            <h4 className="text-[13px] text-on-surface font-semibold">Hỗ trợ kỹ thuật 24/7</h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
              Khi cần điều chỉnh hạn mức nhóm chuyên biệt hoặc xử lý giao dịch chậm, hotline Zalo kỹ
              thuật luôn sẵn sàng.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden border border-surface-container">
            <div className="px-5 py-3.5 bg-surface-container-low flex items-center justify-between">
              <h4 className="text-sm font-bold text-on-surface">
                Chi tiết giao dịch {invoiceModalOrder.id}
              </h4>
              <button
                type="button"
                onClick={() => setInvoiceModalOrder(null)}
                className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Gói đăng ký:</span>
                <span className="font-semibold text-on-surface">
                  {PLAN_SPECS[invoiceModalOrder.plan].name} ({invoiceModalOrder.cycle})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Số tiền thanh toán:</span>
                <span className="font-bold text-primary tabular-nums">
                  {invoiceModalOrder.amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Kênh thanh toán:</span>
                <span className="font-medium text-on-surface">
                  VietQR • {invoiceModalOrder.bankName || 'MBBank'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-on-surface-variant">Thời điểm xác nhận:</span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {invoiceModalOrder.paidAt}
                </span>
              </div>
            </div>
            <div className="px-5 py-3 bg-surface-container-low flex justify-end">
              <button
                type="button"
                onClick={() => setInvoiceModalOrder(null)}
                className="h-8 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
