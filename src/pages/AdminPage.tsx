import React, { useMemo, useState } from 'react';
import { IS_DEMO_MODE } from '../config/demoConfig';
import { useApp } from '../state/AppContext';
import type { PaymentOrder, Plan, UserRole } from '../types/domain';
import { formatVietnamDate, formatVietnamDateTime } from '../utils/dateTime';
import { classifyPaymentOrderIntent, formatVnd, isSubscriptionActive } from '../utils/formatters';

type AdminTab = 'overview' | 'users' | 'plans' | 'payments';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    allUsers,
    allSubscriptions,
    allOrders,
    allTasks,
    allAccounts,
    allGroups,
    plans,
    adminUpdateUser,
    adminUpsertPlan,
    adminConfirmPaymentDemo,
    addToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Plan editor modal state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | undefined>(undefined);
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('299000');
  const [priceYearly, setPriceYearly] = useState('2990000');
  const [maxAccounts, setMaxAccounts] = useState('5');
  const [maxSavedGroups, setMaxSavedGroups] = useState('100');
  const [maxScheduled, setMaxScheduled] = useState('30');
  const [planActive, setPlanActive] = useState(true);

  // Admin DEMO payment confirmation modal
  const [confirmingOrder, setConfirmingOrder] = useState<PaymentOrder | null>(null);
  const [providerRef, setProviderRef] = useState('');
  const [acknowledgePlanChange, setAcknowledgePlanChange] = useState(false);

  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const userMap = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);

  // Real computed Admin KPIs (zero hardcoded numbers)
  const adminKpis = useMemo(() => {
    const activeSubs = allSubscriptions.filter((s) => isSubscriptionActive(s)).length;
    const paidOrders = allOrders.filter((o) => o.status === 'PAID');
    const pendingOrders = allOrders.filter((o) => o.status === 'PENDING').length;
    const totalRevenueVnd = paidOrders.reduce((sum, o) => sum + o.amountVnd, 0);
    return {
      totalUsers: allUsers.length,
      activeSubs,
      pendingOrders,
      totalRevenueVnd,
      totalTasks: allTasks.length,
    };
  }, [allUsers, allSubscriptions, allOrders, allTasks]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [allUsers, userSearch]);

  const filteredOrders = useMemo(() => {
    return allOrders
      .filter((o) => orderStatusFilter === 'ALL' || o.status === orderStatusFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allOrders, orderStatusFilter]);

  const confirmingOrderContext = useMemo(() => {
    if (!confirmingOrder) return null;
    const buyerSubs = allSubscriptions
      .filter((s) => s.userId === confirmingOrder.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const activeBuyerSub = buyerSubs.find((s) => isSubscriptionActive(s)) ?? buyerSubs[0] ?? null;
    const intent = classifyPaymentOrderIntent(activeBuyerSub, confirmingOrder.planId);
    const isExpired = new Date(confirmingOrder.expiresAt).getTime() <= Date.now();
    return { activeBuyerSub, intent, isExpired };
  }, [confirmingOrder, allSubscriptions]);

  const openCreatePlan = () => {
    setEditingPlanId(undefined);
    setPlanCode('');
    setPlanName('');
    setPriceMonthly('299000');
    setPriceYearly('2990000');
    setMaxAccounts('5');
    setMaxSavedGroups('100');
    setMaxScheduled('30');
    setPlanActive(true);
    setPlanModalOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlanId(plan.id);
    setPlanCode(plan.code);
    setPlanName(plan.name);
    setPriceMonthly(String(plan.monthlyPriceVnd));
    setPriceYearly(String(plan.yearlyPriceVnd));
    setMaxAccounts(String(plan.maxFacebookAccounts));
    setMaxSavedGroups(String(plan.maxSavedGroups));
    setMaxScheduled(String(plan.maxScheduledTasks));
    setPlanActive(plan.isActive);
    setPlanModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const res = adminUpsertPlan({
      id: editingPlanId,
      code: planCode,
      name: planName,
      monthlyPriceVnd: Number(priceMonthly) || 0,
      yearlyPriceVnd: Number(priceYearly) || 0,
      maxFacebookAccounts: Number(maxAccounts) || 1,
      maxSavedGroups: Number(maxSavedGroups) || 1,
      maxScheduledTasks: Number(maxScheduled) || 1,
      isActive: planActive,
    });
    if (!res.ok) {
      addToast('error', 'Không thể lưu gói dịch vụ', res.error);
      return;
    }
    addToast(
      'success',
      editingPlanId ? 'Đã cập nhật gói dịch vụ' : 'Đã tạo gói dịch vụ mới',
      `${res.data?.name} đã đồng bộ sang trang Gói dịch vụ.`
    );
    setPlanModalOpen(false);
  };

  const handleConfirmOrderDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingOrder) return;
    const res = adminConfirmPaymentDemo({
      orderId: confirmingOrder.id,
      providerReference: providerRef.trim() || undefined,
      acknowledgeUnapprovedPlanChangePolicy: acknowledgePlanChange,
    });
    if (!res.ok) {
      addToast('error', 'Không thể xác nhận thanh toán', res.error);
      return;
    }
    addToast(
      'success',
      'Đã xác nhận đơn thanh toán (DEMO)',
      `Đơn ${confirmingOrder.orderCode} đã chuyển PAID và cập nhật gói dịch vụ cho người dùng.`
    );
    setConfirmingOrder(null);
    setProviderRef('');
    setAcknowledgePlanChange(false);
  };

  return (
    <div className="space-y-5">
      {/* Header + 4 Strictly Scoped Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản trị hệ thống</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý người dùng, gói dịch vụ và đối soát đơn thanh toán DEMO.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(
            [
              { id: 'overview', label: 'Tổng quan' },
              { id: 'users', label: `Người dùng (${allUsers.length})` },
              { id: 'plans', label: `Gói dịch vụ (${plans.length})` },
              { id: 'payments', label: `Thanh toán (${adminKpis.pendingOrders} chờ)` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: 'Tổng người dùng', value: String(adminKpis.totalUsers), icon: 'group' },
              { label: 'Gói đang hoạt động', value: String(adminKpis.activeSubs), icon: 'verified' },
              {
                label: 'Doanh thu DEMO (PAID)',
                value: formatVnd(adminKpis.totalRevenueVnd),
                icon: 'payments',
              },
              { label: 'Tổng tác vụ toàn hệ thống', value: String(adminKpis.totalTasks), icon: 'task' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{kpi.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Ghi chú vận hành (DEMO)</h2>
            <p>
              Toàn bộ số liệu trên màn hình này được tính trực tiếp từ kho dữ liệu DEMO hiện tại,
              không sử dụng số liệu KPI cố định.
            </p>
            <p>
              Đơn hàng chờ thanh toán hiện tại: <strong>{adminKpis.pendingOrders}</strong>. Bạn có
              thể chuyển sang tab <strong>Thanh toán</strong> để xác nhận mô phỏng đơn hàng.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">Quản lý người dùng</h2>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="h-9 w-full sm:w-64 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái tài khoản</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái gói dịch vụ</th>
                  <th className="px-4 py-3 font-semibold">Dữ liệu</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const sub = allSubscriptions
                    .filter((s) => s.userId === u.id)
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                  const subActive = isSubscriptionActive(sub);
                  const plan = sub ? planMap.get(sub.planId) : null;
                  const accCount = allAccounts.filter((a) => a.userId === u.id).length;
                  const grpCount = allGroups.filter((g) => g.userId === u.id).length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {u.displayName} {isSelf && <span className="text-blue-600">(Bạn)</span>}
                        </p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Vai trò của ${u.displayName}`}
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => {
                            const res = adminUpdateUser({
                              userId: u.id,
                              role: e.target.value as UserRole,
                            });
                            if (!res.ok) {
                              addToast('error', 'Không thể đổi vai trò', res.error);
                            } else {
                              addToast('success', 'Đã cập nhật vai trò', `${u.displayName} → ${e.target.value}`);
                            }
                          }}
                          className="h-8 px-2 rounded border border-slate-200 bg-white text-xs font-semibold disabled:opacity-50"
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'ACTIVE' : 'LOCKED'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sub && plan ? (
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                subActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {plan.code} · {subActive ? 'ACTIVE' : sub.status}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Hết hạn: {formatVietnamDate(sub.expiresAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Chưa có gói</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {accCount} hồ sơ · {grpCount} nhóm
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => {
                            const nextStatus = u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
                            const res = adminUpdateUser({ userId: u.id, status: nextStatus });
                            if (!res.ok) {
                              addToast('error', 'Thao tác bị từ chối', res.error);
                            } else {
                              addToast(
                                'info',
                                nextStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
                                u.email
                              );
                            }
                          }}
                          className={`h-8 px-3 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.status === 'ACTIVE'
                              ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: PLANS CRUD */}
      {activeTab === 'plans' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Thay đổi tại đây sẽ cập nhật trực tiếp sang trang Gói dịch vụ của khách hàng.
            </p>
            <button
              type="button"
              onClick={openCreatePlan}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Thêm gói mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-bold">
                        {plan.code}
                      </span>
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {plan.isActive ? 'Đang mở bán' : 'Đã ẩn'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditPlan(plan)}
                    className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    Chỉnh sửa
                  </button>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p>
                    Giá tháng: <strong>{formatVnd(plan.monthlyPriceVnd)}</strong>
                  </p>
                  <p>
                    Giá năm: <strong>{formatVnd(plan.yearlyPriceVnd)}</strong>
                  </p>
                  <p>
                    Hạn mức: {plan.maxFacebookAccounts} hồ sơ · {plan.maxSavedGroups} nhóm ·{' '}
                    {plan.maxScheduledTasks} lịch chờ (SCHEDULED)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === 'payments' && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Đơn thanh toán toàn hệ thống</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ Admin mới có quyền xác nhận đơn PENDING trong môi trường DEMO.
              </p>
            </div>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              aria-label="Lọc trạng thái đơn"
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã đơn</th>
                  <th className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Gói / Chu kỳ</th>
                  <th className="px-4 py-3 font-semibold">Số tiền</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Thời gian tạo</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const buyer = userMap.get(ord.userId);
                  const plan = planMap.get(ord.planId);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {ord.orderCode}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{buyer?.displayName ?? ord.userId}</p>
                        <p className="text-[11px] text-slate-500">{buyer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {plan?.name ?? ord.planId} ({ord.billingPeriod})
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">
                        {formatVnd(ord.amountVnd)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ord.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatVietnamDateTime(ord.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ord.status === 'PENDING' && IS_DEMO_MODE ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingOrder(ord);
                              setProviderRef('');
                              setAcknowledgePlanChange(false);
                            }}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          >
                            Xác nhận (DEMO)
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            {ord.providerReference ?? '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Plan CRUD Modal */}
      {planModalOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPlanModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingPlanId ? 'Chỉnh sửa gói dịch vụ' : 'Tạo gói dịch vụ mới'}
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200/70"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã gói *</label>
                  <input
                    type="text"
                    required
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value)}
                    placeholder="PRO"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên gói *</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Gói Chuyên Nghiệp"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá tháng (VND)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá năm (VND)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Hồ sơ</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={maxAccounts}
                    onChange={(e) => setMaxAccounts(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Nhóm lưu</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={maxSavedGroups}
                    onChange={(e) => setMaxSavedGroups(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Lịch chờ</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={maxScheduled}
                    onChange={(e) => setMaxScheduled(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={planActive}
                  onChange={(e) => setPlanActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span className="font-semibold text-slate-700">Hiển thị gói trên trang Pricing</span>
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Lưu gói dịch vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin DEMO Payment Confirmation Modal */}
      {confirmingOrder && confirmingOrderContext && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmingOrder(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Xác nhận thanh toán DEMO — {confirmingOrder.orderCode}
              </h3>
            </div>
            <form onSubmit={handleConfirmOrderDemo} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Loại giao dịch</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      confirmingOrderContext.intent === 'RENEWAL'
                        ? 'bg-emerald-50 text-emerald-700'
                        : confirmingOrderContext.intent === 'CHANGE_PLAN'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {confirmingOrderContext.intent === 'RENEWAL'
                      ? 'Gia hạn (RENEWAL)'
                      : confirmingOrderContext.intent === 'CHANGE_PLAN'
                      ? 'Đổi gói giữa kỳ (CHANGE_PLAN)'
                      : 'Mua mới (PURCHASE)'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Xác nhận đơn <strong>{confirmingOrder.orderCode}</strong> ({formatVnd(confirmingOrder.amountVnd)}).
                  {confirmingOrderContext.intent === 'RENEWAL' && confirmingOrderContext.activeBuyerSub && (
                    <>
                      {' '}
                      Thời hạn mới sẽ cộng dồn từ ngày hết hạn hiện tại (
                      <strong>{formatVietnamDate(confirmingOrderContext.activeBuyerSub.expiresAt)}</strong>),
                      không làm mất thời gian còn lại.
                    </>
                  )}
                </p>
              </div>

              {confirmingOrderContext.isExpired && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  Đơn hàng này đã quá hạn ({formatVietnamDateTime(confirmingOrder.expiresAt)}). Hệ thống
                  sẽ từ chối xác nhận và chuyển đơn sang trạng thái EXPIRED.
                </div>
              )}

              {confirmingOrderContext.intent === 'CHANGE_PLAN' && !confirmingOrderContext.isExpired && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <p className="font-semibold">
                    Chính sách đổi gói giữa kỳ chưa được chủ sản phẩm phê duyệt
                  </p>
                  <p className="leading-relaxed">
                    Khách hàng đang có gói còn hiệu lực khác với gói của đơn này. Quy tắc hoàn trừ
                    hoặc cộng dồn thời gian còn lại cần được chốt trong Backend thật (xem{' '}
                    <code className="font-mono">docs/OPEN_QUESTIONS.md</code>).
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={acknowledgePlanChange}
                      onChange={(e) => setAcknowledgePlanChange(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-amber-700"
                    />
                    <span className="font-semibold">
                      Tôi hiểu đây là xác nhận mô phỏng DEMO cho đơn đổi gói giữa kỳ
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Mã tham chiếu giao dịch (tùy chọn)
                </label>
                <input
                  type="text"
                  value={providerRef}
                  onChange={(e) => setProviderRef(e.target.value)}
                  placeholder="Ví dụ: DEMO-BANK-REF-001"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingOrder(null)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Xác nhận đã thanh toán (DEMO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
