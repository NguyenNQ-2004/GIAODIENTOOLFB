import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
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
  RescheduleTaskRequest,
  ResetPasswordRequest,
  SavePostTemplateRequest,
  ServiceResult,
  UpsertGroupRequest,
  UpsertPlanRequest,
} from '../types/api';
import type {
  AuditLog,
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
  // Session & schema migration status
  currentUser: User | null;
  schemaMigrationNotice: string | null;
  dismissSchemaMigrationNotice: () => void;
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
  allAuditLogs: AuditLog[];
  // Media helper
  isMediaReferenced: (mediaId: string) => boolean;
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
  rescheduleTask: (req: RescheduleTaskRequest) => ServiceResult<PublishingTask>;
  triggerDueScheduledTaskDemo: (taskId: string) => ServiceResult<PublishingTask>;
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
  // Tear-free subscription to immutable structural-sharing snapshots
  const storeSnapshot = useSyncExternalStore(
    mockAppService.subscribe,
    mockAppService.getStoreSnapshot,
    mockAppService.getStoreSnapshot
  );
  const { db, currentUserId, schemaMigrationNotice } = storeSnapshot;

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const currentUser = useMemo(
    () => (currentUserId ? db.users.find((u) => u.id === currentUserId) ?? null : null),
    [db.users, currentUserId]
  );

  const userId = currentUser?.id ?? null;

  // Strictly user-scoped slices — depend directly on immutable slice references
  const accounts = useMemo(
    () => (userId ? db.accounts.filter((a) => a.userId === userId) : []),
    [db.accounts, userId]
  );
  const pages = useMemo(
    () => (userId ? db.pages.filter((p) => p.userId === userId) : []),
    [db.pages, userId]
  );
  const groups = useMemo(
    () => (userId ? db.groups.filter((g) => g.userId === userId) : []),
    [db.groups, userId]
  );
  const collections = useMemo(
    () => (userId ? db.collections.filter((c) => c.userId === userId) : []),
    [db.collections, userId]
  );
  const collectionItems = useMemo(() => {
    if (!userId) return [];
    const colIds = new Set(collections.map((c) => c.id));
    return db.collectionItems.filter((ci) => colIds.has(ci.collectionId));
  }, [db.collectionItems, userId, collections]);

  const draftPosts = useMemo(() => {
    if (!userId) return [];
    return db.posts
      .filter((p) => p.userId === userId && p.status === 'DRAFT' && p.slotNumber !== null)
      .sort((a, b) => (a.slotNumber ?? 0) - (b.slotNumber ?? 0));
  }, [db.posts, userId]);

  const savedPosts = useMemo(() => {
    if (!userId) return [];
    return db.posts
      .filter((p) => p.userId === userId && p.status === 'SAVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [db.posts, userId]);

  const tasks = useMemo(() => {
    if (!userId) return [];
    return db.tasks
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.tasks, userId]);

  const devices = useMemo<DeviceViewModel[]>(() => {
    if (!userId) return [];
    return db.devices
      .filter((d) => d.userId === userId)
      .map((d) => ({
        ...d,
        connectionStatus: computeDeviceConnectionStatus(d),
      }));
  }, [db.devices, userId]);

  const orders = useMemo(() => {
    if (!userId) return [];
    return db.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.orders, userId]);

  const plans = useMemo(() => [...db.plans], [db.plans]);
  const activePlans = useMemo(() => db.plans.filter((p) => p.isActive), [db.plans]);

  const subscription = useMemo(() => {
    if (!userId) return null;
    const userSubs = db.subscriptions
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return userSubs[0] ?? null;
  }, [db.subscriptions, userId]);

  const currentPlan = useMemo(() => {
    if (!subscription) return null;
    return db.plans.find((p) => p.id === subscription.planId) ?? null;
  }, [db.plans, subscription]);

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

  const dismissSchemaMigrationNotice = useCallback(() => {
    mockAppService.dismissSchemaMigrationNotice();
  }, []);

  const isMediaReferenced = useCallback((mediaId: string) => {
    return mockAppService.isMediaReferenced(mediaId);
  }, []);

  // Auth actions
  const login = useCallback((req: LoginRequest): ServiceResult<User> => {
    const res = mockAppService.login(req);
    if (!res.ok || !res.data) return { ok: false, error: res.error, code: res.code };
    return { ok: true, data: res.data.user };
  }, []);

  const loginAsDemoUser = useCallback((targetUserId: string): ServiceResult<User> => {
    const res = mockAppService.loginAsDemoUser(targetUserId);
    if (!res.ok || !res.data) return { ok: false, error: res.error, code: res.code };
    return { ok: true, data: res.data.user };
  }, []);

  const register = useCallback((req: RegisterRequest): ServiceResult<User> => {
    const res = mockAppService.register(req);
    if (!res.ok || !res.data) return { ok: false, error: res.error, code: res.code };
    return { ok: true, data: res.data.user };
  }, []);

  const forgotPassword = useCallback((req: ForgotPasswordRequest) => {
    return mockAppService.forgotPassword(req);
  }, []);

  const resetPassword = useCallback((req: ResetPasswordRequest) => {
    return mockAppService.resetPassword(req);
  }, []);

  const changePassword = useCallback(
    (req: ChangePasswordRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.changePassword(userId, req);
    },
    [userId]
  );

  const logout = useCallback(() => {
    mockAppService.logout();
  }, []);

  const resetDemoData = useCallback(() => {
    mockAppService.resetDemoDatabase();
    addToast('info', 'Đã đặt lại dữ liệu DEMO', 'Toàn bộ dữ liệu mẫu đã được khôi phục về mặc định.');
  }, [addToast]);

  // Post actions
  const updateDraftSlot = useCallback(
    (
      slotNumber: number,
      patch: { content?: string; linkUrl?: string | null; media?: MediaAttachment[] }
    ) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.updateDraftSlot(userId, slotNumber, patch);
    },
    [userId]
  );

  const resetDraftSlot = useCallback(
    (slotNumber: number) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.resetDraftSlot(userId, slotNumber);
    },
    [userId]
  );

  const savePostTemplate = useCallback(
    (req: SavePostTemplateRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.savePostTemplate(userId, req);
    },
    [userId]
  );

  const deleteSavedPost = useCallback(
    (postId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.deleteSavedPost(userId, postId);
    },
    [userId]
  );

  // Group & Collection actions
  const createGroup = useCallback(
    (req: UpsertGroupRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.createGroup(userId, req);
    },
    [userId]
  );

  const updateGroup = useCallback(
    (groupId: string, req: UpsertGroupRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.updateGroup(userId, groupId, req);
    },
    [userId]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.deleteGroup(userId, groupId);
    },
    [userId]
  );

  const importGroups = useCallback(
    (rows: UpsertGroupRequest[]) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.importGroups(userId, rows);
    },
    [userId]
  );

  const createCollection = useCallback(
    (name: string, groupIds: string[]) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.createCollection(userId, name, groupIds);
    },
    [userId]
  );

  const renameCollection = useCallback(
    (collectionId: string, name: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.renameCollection(userId, collectionId, name);
    },
    [userId]
  );

  const setCollectionGroups = useCallback(
    (collectionId: string, groupIds: string[]) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.setCollectionGroups(userId, collectionId, groupIds);
    },
    [userId]
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.deleteCollection(userId, collectionId);
    },
    [userId]
  );

  // Task actions
  const createTask = useCallback(
    (req: CreatePublishingTaskRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.createTask(userId, req);
    },
    [userId]
  );

  const rescheduleTask = useCallback(
    (req: RescheduleTaskRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.rescheduleTask(userId, req);
    },
    [userId]
  );

  const triggerDueScheduledTaskDemo = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.triggerDueScheduledTaskDemo(userId, taskId);
    },
    [userId]
  );

  const pauseTask = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.pauseTask(userId, taskId);
    },
    [userId]
  );

  const resumeTask = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.resumeTask(userId, taskId);
    },
    [userId]
  );

  const cancelTask = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.cancelTask(userId, taskId);
    },
    [userId]
  );

  const confirmTaskItem = useCallback(
    (req: ConfirmTaskItemRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.confirmTaskItem(userId, req);
    },
    [userId]
  );

  const retryTaskItem = useCallback(
    (taskId: string, itemId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.retryTaskItem(userId, taskId, itemId);
    },
    [userId]
  );

  const retryFailedItems = useCallback(
    (taskId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.retryFailedItems(userId, taskId);
    },
    [userId]
  );

  // Account & Device actions
  const createManualProfile = useCallback(
    (req: CreateManualProfileRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.createManualProfile(userId, req);
    },
    [userId]
  );

  const simulateDemoOAuthConnect = useCallback(
    (displayName: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.simulateDemoOAuthConnect(userId, displayName);
    },
    [userId]
  );

  const refreshAccountStatus = useCallback(
    (accountId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.refreshAccountStatus(userId, accountId);
    },
    [userId]
  );

  const disconnectAccount = useCallback(
    (accountId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.disconnectAccount(userId, accountId);
    },
    [userId]
  );

  const syncPages = useCallback(
    (accountId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.syncPages(userId, accountId);
    },
    [userId]
  );

  const connectExtensionDevice = useCallback(
    (deviceName: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.connectExtensionDevice(userId, deviceName);
    },
    [userId]
  );

  const checkDeviceConnection = useCallback(
    (deviceId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.checkDeviceConnection(userId, deviceId);
    },
    [userId]
  );

  const revokeDevice = useCallback(
    (deviceId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.revokeDevice(userId, deviceId);
    },
    [userId]
  );

  // Billing actions
  const createPaymentOrder = useCallback(
    (req: CreatePaymentOrderRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.createPaymentOrder(userId, req);
    },
    [userId]
  );

  const checkOrderStatus = useCallback(
    (orderId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.checkOrderStatus(userId, orderId);
    },
    [userId]
  );

  const cancelPaymentOrder = useCallback(
    (orderId: string) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.cancelPaymentOrder(userId, orderId);
    },
    [userId]
  );

  // Admin actions
  const adminUpdateUser = useCallback(
    (req: AdminUpdateUserRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.updateUser(userId, req);
    },
    [userId]
  );

  const adminUpsertPlan = useCallback(
    (req: UpsertPlanRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.upsertPlan(userId, req);
    },
    [userId]
  );

  const adminConfirmPaymentDemo = useCallback(
    (req: AdminConfirmPaymentRequest) => {
      if (!userId) return { ok: false, error: 'Chưa đăng nhập.' };
      return mockAppService.confirmPaymentOrderDemo(userId, req);
    },
    [userId]
  );

  const value: AppContextValue = {
    currentUser,
    schemaMigrationNotice,
    dismissSchemaMigrationNotice,
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
    allAuditLogs: isAdmin ? db.auditLogs : [],
    isMediaReferenced,
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
    rescheduleTask,
    triggerDueScheduledTaskDemo,
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
