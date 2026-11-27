import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { DemoDatabase } from '../data/mockData';
import { mockAppService } from '../services/mockService';
import type {
  AdminConfirmPaymentRequest,
  AdminUpdateUserRequest,
  ChangePasswordRequest,
  ConfirmTaskItemRequest,
  CreateManualProfileRequest,
  CreatePaymentOrderRequest,
  CreatePublishingTaskRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SavePostTemplateRequest,
  ServiceResult,
  UpsertGroupRequest,
  UpsertPlanRequest,
} from '../types/api';
import type {
  ExtensionDevice,
  FacebookAccount,
  FacebookGroup,
  FacebookPage,
  GroupCollection,
  GroupCollectionItem,
  MediaAttachment,
  PaymentOrder,
  Plan,
  Post,
  PublishingTask,
  Subscription,
  User,
} from '../types/domain';
import type {
  DeviceViewModel,
  SubscriptionUsageSummary,
  ToastMessage,
  ToastType,
} from '../types/viewModels';
import {
  computeDeviceConnectionStatus,
  computeSubscriptionUsage,
  generateId,
} from '../utils/formatters';

interface AppContextValue {
  // Session
  currentUser: User | null;
  // User-scoped workspace data
  accounts: FacebookAccount[];
  pages: FacebookPage[];
  groups: FacebookGroup[];
  collections: GroupCollection[];
  collectionItems: GroupCollectionItem[];
  draftPosts: Post[];
  savedPosts: Post[];
  tasks: PublishingTask[];
  devices: DeviceViewModel[];
  orders: PaymentOrder[];
  plans: Plan[];
  activePlans: Plan[];
  subscription: Subscription | null;
  currentPlan: Plan | null;
  usageSummary: SubscriptionUsageSummary;
  // Admin-scoped full dataset (only populated when currentUser.role === 'ADMIN')
  allUsers: User[];
  allSubscriptions: Subscription[];
  allOrders: PaymentOrder[];
  allTasks: PublishingTask[];
  allAccounts: FacebookAccount[];
  allGroups: FacebookGroup[];
  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastType, title: string, description?: string) => void;
  dismissToast: (id: string) => void;
  // Auth actions
  login: (req: LoginRequest) => ServiceResult<User>;
  loginAsDemoUser: (userId: string) => ServiceResult<User>;
  register: (req: RegisterRequest) => ServiceResult<User>;
  forgotPassword: (req: ForgotPasswordRequest) => ServiceResult<{ resetTokenPreview: string }>;
  resetPassword: (req: ResetPasswordRequest) => ServiceResult<{ message: string }>;
  changePassword: (req: ChangePasswordRequest) => ServiceResult<{ message: string }>;
  logout: () => void;
  resetDemoData: () => void;
  // Post actions
  updateDraftSlot: (
    slotNumber: number,
    patch: { content?: string; linkUrl?: string | null; media?: MediaAttachment[] }
  ) => ServiceResult<Post>;
  resetDraftSlot: (slotNumber: number) => ServiceResult<Post>;
  savePostTemplate: (req: SavePostTemplateRequest) => ServiceResult<Post>;
  deleteSavedPost: (postId: string) => ServiceResult<void>;
  // Group & Collection actions
  createGroup: (req: UpsertGroupRequest) => ServiceResult<FacebookGroup>;
  updateGroup: (groupId: string, req: UpsertGroupRequest) => ServiceResult<FacebookGroup>;
  deleteGroup: (groupId: string) => ServiceResult<void>;
  importGroups: (
    rows: UpsertGroupRequest[]
  ) => ServiceResult<{ inserted: FacebookGroup[]; skippedCount: number }>;
  createCollection: (name: string, groupIds: string[]) => ServiceResult<GroupCollection>;
  renameCollection: (collectionId: string, name: string) => ServiceResult<GroupCollection>;
  setCollectionGroups: (collectionId: string, groupIds: string[]) => ServiceResult<void>;
  deleteCollection: (collectionId: string) => ServiceResult<void>;
  // Task actions
  createTask: (req: CreatePublishingTaskRequest) => ServiceResult<PublishingTask>;
  pauseTask: (taskId: string) => ServiceResult<PublishingTask>;
  resumeTask: (taskId: string) => ServiceResult<PublishingTask>;
  cancelTask: (taskId: string) => ServiceResult<PublishingTask>;
  confirmTaskItem: (req: ConfirmTaskItemRequest) => ServiceResult<PublishingTask>;
  retryTaskItem: (taskId: string, itemId: string) => ServiceResult<PublishingTask>;
  retryFailedItems: (taskId: string) => ServiceResult<PublishingTask>;
  // Account & Device actions
  createManualProfile: (req: CreateManualProfileRequest) => ServiceResult<FacebookAccount>;
  simulateDemoOAuthConnect: (
    displayName: string
  ) => ServiceResult<{ account: FacebookAccount; pages: FacebookPage[] }>;
  refreshAccountStatus: (accountId: string) => ServiceResult<FacebookAccount>;
  disconnectAccount: (accountId: string) => ServiceResult<FacebookAccount>;
  syncPages: (accountId: string) => ServiceResult<{ pages: FacebookPage[]; message: string }>;
  connectExtensionDevice: (deviceName: string) => ServiceResult<ExtensionDevice>;
  checkDeviceConnection: (deviceId: string) => ServiceResult<ExtensionDevice>;
  revokeDevice: (deviceId: string) => ServiceResult<ExtensionDevice>;
  // Billing actions
  createPaymentOrder: (req: CreatePaymentOrderRequest) => ServiceResult<PaymentOrder>;
  checkOrderStatus: (orderId: string) => ServiceResult<PaymentOrder>;
  cancelPaymentOrder: (orderId: string) => ServiceResult<PaymentOrder>;
  // Admin actions
  adminUpdateUser: (req: AdminUpdateUserRequest) => ServiceResult<User>;
  adminUpsertPlan: (req: UpsertPlanRequest) => ServiceResult<Plan>;
  adminConfirmPaymentDemo: (
    req: AdminConfirmPaymentRequest
  ) => ServiceResult<{ order: PaymentOrder; subscription: Subscription }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [revision, setRevision] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = generateId();
    setToasts((prev) => [...prev.slice(-4), { id, type, title, description }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const db: DemoDatabase = useMemo(() => {
    void revision;
    return mockAppService.getDatabaseSnapshot();
  }, [revision]);

  const currentUser = useMemo(() => {
    void revision;
    return mockAppService.getCurrentUser();
  }, [revision]);

  const userId = currentUser?.id ?? null;

  // Strictly user-scoped slices
  const accounts = useMemo(
    () => (userId ? db.accounts.filter((a) => a.userId === userId) : []),
    [db, userId]
  );
  const pages = useMemo(
    () => (userId ? db.pages.filter((p) => p.userId === userId) : []),
    [db, userId]
  );
  const groups = useMemo(
    () => (userId ? db.groups.filter((g) => g.userId === userId) : []),
    [db, userId]
  );
  const collections = useMemo(
    () => (userId ? db.collections.filter((c) => c.userId === userId) : []),
    [db, userId]
  );
  const collectionItems = useMemo(() => {
    if (!userId) return [];
    const colIds = new Set(collections.map((c) => c.id));
    return db.collectionItems.filter((ci) => colIds.has(ci.collectionId));
  }, [db, userId, collections]);

  const draftPosts = useMemo(() => {
    if (!userId) return [];
    return db.posts
      .filter((p) => p.userId === userId && p.status === 'DRAFT' && p.slotNumber !== null)
      .sort((a, b) => (a.slotNumber ?? 0) - (b.slotNumber ?? 0));
  }, [db, userId]);

  const savedPosts = useMemo(() => {
    if (!userId) return [];
    return db.posts
      .filter((p) => p.userId === userId && p.status === 'SAVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [db, userId]);

  const tasks = useMemo(() => {
    if (!userId) return [];
    return db.tasks
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db, userId]);

  const devices = useMemo<DeviceViewModel[]>(() => {
    if (!userId) return [];
    return db.devices
      .filter((d) => d.userId === userId)
      .map((d) => ({
        ...d,
        connectionStatus: computeDeviceConnectionStatus(d),
      }));
  }, [db, userId]);

  const orders = useMemo(() => {
    if (!userId) return [];
    return db.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db, userId]);

  const plans = useMemo(() => [...db.plans], [db]);
  const activePlans = useMemo(() => db.plans.filter((p) => p.isActive), [db]);

  const subscription = useMemo(
    () => (userId ? mockAppService.getUserSubscription(userId) : null),
    [userId, revision]
  );

  const currentPlan = useMemo(
    () => (userId ? mockAppService.getUserPlan(userId) : null),
    [userId, revision]
  );

  const usageSummary = useMemo(
    () =>
      computeSubscriptionUsage({
        subscription,
        plan: currentPlan,
        accounts,
        groups,
        tasks,
      }),
    [subscription, currentPlan, accounts, groups, tasks]
  );

  const isAdmin = currentUser?.role === 'ADMIN';

  // Wrapped mutators that bump revision on change
  const login = useCallback(
    (req: LoginRequest): ServiceResult<User> => {
      const res = mockAppService.login(req);
      bump();
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      return { ok: true, data: res.data.user };
    },
    [bump]
  );

  const loginAsDemoUser = useCallback(
    (targetUserId: string): ServiceResult<User> => {
      const res = mockAppService.loginAsDemoUser(targetUserId);
      bump();
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      return { ok: true, data: res.data.user };
    },
    [bump]
  );

  const register = useCallback(
    (req: RegisterRequest): ServiceResult<User> => {
      const res = mockAppService.register(req);
      bump();
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      return { ok: true, data: res.data.user };
    },
    [bump]
  );

  const forgotPassword = useCallback((req: ForgotPasswordRequest) => {
    return mockAppService.forgotPassword(req);
  }, []);

  const resetPassword = useCallback(
    (req: ResetPasswordRequest) => {
      const res = mockAppService.resetPassword(req);
      bump();
      return res;
    },
    [bump]
  );

  const changePassword = useCallback(
    (req: ChangePasswordRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.changePassword(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const logout = useCallback(() => {
    mockAppService.logout();
    bump();
  }, [bump]);

  const resetDemoData = useCallback(() => {
    mockAppService.resetDemoDatabase();
    bump();
    addToast('info', 'Đã đặt lại dữ liệu DEMO', 'Toàn bộ dữ liệu mẫu đã được khôi phục về mặc định.');
  }, [bump, addToast]);

  const updateDraftSlot = useCallback(
    (
      slotNumber: number,
      patch: { content?: string; linkUrl?: string | null; media?: MediaAttachment[] }
    ) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.updateDraftSlot(userId, slotNumber, patch);
      bump();
      return res;
    },
    [userId, bump]
  );

  const resetDraftSlot = useCallback(
    (slotNumber: number) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.resetDraftSlot(userId, slotNumber);
      bump();
      return res;
    },
    [userId, bump]
  );

  const savePostTemplate = useCallback(
    (req: SavePostTemplateRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.savePostTemplate(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const deleteSavedPost = useCallback(
    (postId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.deleteSavedPost(userId, postId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const createGroup = useCallback(
    (req: UpsertGroupRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.createGroup(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const updateGroup = useCallback(
    (groupId: string, req: UpsertGroupRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.updateGroup(userId, groupId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.deleteGroup(userId, groupId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const importGroups = useCallback(
    (rows: UpsertGroupRequest[]) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.importGroups(userId, rows);
      bump();
      return res;
    },
    [userId, bump]
  );

  const createCollection = useCallback(
    (name: string, groupIds: string[]) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.createCollection(userId, name, groupIds);
      bump();
      return res;
    },
    [userId, bump]
  );

  const renameCollection = useCallback(
    (collectionId: string, name: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.renameCollection(userId, collectionId, name);
      bump();
      return res;
    },
    [userId, bump]
  );

  const setCollectionGroups = useCallback(
    (collectionId: string, groupIds: string[]) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.setCollectionGroups(userId, collectionId, groupIds);
      bump();
      return res;
    },
    [userId, bump]
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.deleteCollection(userId, collectionId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const createTask = useCallback(
    (req: CreatePublishingTaskRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.createTask(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const pauseTask = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.pauseTask(userId, taskId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const resumeTask = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.resumeTask(userId, taskId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const cancelTask = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.cancelTask(userId, taskId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const confirmTaskItem = useCallback(
    (req: ConfirmTaskItemRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.confirmTaskItem(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const retryTaskItem = useCallback(
    (taskId: string, itemId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.retryTaskItem(userId, taskId, itemId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const retryFailedItems = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.retryFailedItems(userId, taskId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const createManualProfile = useCallback(
    (req: CreateManualProfileRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.createManualProfile(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const simulateDemoOAuthConnect = useCallback(
    (displayName: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.simulateDemoOAuthConnect(userId, displayName);
      bump();
      return res;
    },
    [userId, bump]
  );

  const refreshAccountStatus = useCallback(
    (accountId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.refreshAccountStatus(userId, accountId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const disconnectAccount = useCallback(
    (accountId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.disconnectAccount(userId, accountId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const syncPages = useCallback(
    (accountId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.syncPages(userId, accountId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const connectExtensionDevice = useCallback(
    (deviceName: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.connectExtensionDevice(userId, deviceName);
      bump();
      return res;
    },
    [userId, bump]
  );

  const checkDeviceConnection = useCallback(
    (deviceId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.checkDeviceConnection(userId, deviceId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const revokeDevice = useCallback(
    (deviceId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.revokeDevice(userId, deviceId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const createPaymentOrder = useCallback(
    (req: CreatePaymentOrderRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.createPaymentOrder(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const checkOrderStatus = useCallback(
    (orderId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.checkOrderStatus(userId, orderId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const cancelPaymentOrder = useCallback(
    (orderId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.cancelPaymentOrder(userId, orderId);
      bump();
      return res;
    },
    [userId, bump]
  );

  const adminUpdateUser = useCallback(
    (req: AdminUpdateUserRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.updateUser(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const adminUpsertPlan = useCallback(
    (req: UpsertPlanRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.upsertPlan(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const adminConfirmPaymentDemo = useCallback(
    (req: AdminConfirmPaymentRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      const res = mockAppService.confirmPaymentOrderDemo(userId, req);
      bump();
      return res;
    },
    [userId, bump]
  );

  const value: AppContextValue = {
    currentUser,
    accounts,
    pages,
    groups,
    collections,
    collectionItems,
    draftPosts,
    savedPosts,
    tasks,
    devices,
    orders,
    plans,
    activePlans,
    subscription,
    currentPlan,
    usageSummary,
    allUsers: isAdmin ? db.users : [],
    allSubscriptions: isAdmin ? db.subscriptions : [],
    allOrders: isAdmin ? db.orders : [],
    allTasks: isAdmin ? db.tasks : [],
    allAccounts: isAdmin ? db.accounts : [],
    allGroups: isAdmin ? db.groups : [],
    toasts,
    addToast,
    dismissToast,
    login,
    loginAsDemoUser,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,
    resetDemoData,
    updateDraftSlot,
    resetDraftSlot,
    savePostTemplate,
    deleteSavedPost,
    createGroup,
    updateGroup,
    deleteGroup,
    importGroups,
    createCollection,
    renameCollection,
    setCollectionGroups,
    deleteCollection,
    createTask,
    pauseTask,
    resumeTask,
    cancelTask,
    confirmTaskItem,
    retryTaskItem,
    retryFailedItems,
    createManualProfile,
    simulateDemoOAuthConnect,
    refreshAccountStatus,
    disconnectAccount,
    syncPages,
    connectExtensionDevice,
    checkDeviceConnection,
    revokeDevice,
    createPaymentOrder,
    checkOrderStatus,
    cancelPaymentOrder,
    adminUpdateUser,
    adminUpsertPlan,
    adminConfirmPaymentDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
