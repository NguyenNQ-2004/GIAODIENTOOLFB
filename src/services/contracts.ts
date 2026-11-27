import type {
  AdminConfirmPaymentRequest,
  AdminUpdateUserRequest,
  AuthSessionResponse,
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
  ExtensionDevice,
  FacebookAccount,
  FacebookGroup,
  FacebookPage,
  GroupCollection,
  MediaAttachment,
  PaymentOrder,
  Plan,
  Post,
  PublishingTask,
  Subscription,
  User,
} from '../types/domain';

/**
 * Service layer contracts mapped 1-to-1 to the planned REST API backend.
 */

export interface AuthServiceContract {
  /** POST /api/auth/login */
  login(req: LoginRequest): ServiceResult<AuthSessionResponse>;
  /** DEMO helper — signs into a specific prototype account */
  loginAsDemoUser(userId: string): ServiceResult<AuthSessionResponse>;
  /** POST /api/auth/register */
  register(req: RegisterRequest): ServiceResult<AuthSessionResponse>;
  /** POST /api/auth/forgot-password */
  forgotPassword(req: ForgotPasswordRequest): ServiceResult<{ resetTokenPreview: string }>;
  /** POST /api/auth/reset-password */
  resetPassword(req: ResetPasswordRequest): ServiceResult<{ message: string }>;
  /** POST /api/auth/change-password */
  changePassword(userId: string, req: ChangePasswordRequest): ServiceResult<{ message: string }>;
  /** POST /api/auth/logout */
  logout(): void;
  /** GET /api/auth/me */
  getCurrentUser(): User | null;
}

export interface PostServiceContract {
  /** PATCH /api/posts/drafts/:slotNumber */
  updateDraftSlot(
    userId: string,
    slotNumber: number,
    patch: { content?: string; linkUrl?: string | null; media?: MediaAttachment[] }
  ): ServiceResult<Post>;
  /** DELETE /api/posts/drafts/:slotNumber (reset slot) */
  resetDraftSlot(userId: string, slotNumber: number): ServiceResult<Post>;
  /** POST /api/posts/saved */
  savePostTemplate(userId: string, req: SavePostTemplateRequest): ServiceResult<Post>;
  /** DELETE /api/posts/saved/:postId */
  deleteSavedPost(userId: string, postId: string): ServiceResult<void>;
}

export interface GroupServiceContract {
  /** POST /api/groups */
  createGroup(userId: string, req: UpsertGroupRequest): ServiceResult<FacebookGroup>;
  /** PATCH /api/groups/:groupId */
  updateGroup(
    userId: string,
    groupId: string,
    req: UpsertGroupRequest
  ): ServiceResult<FacebookGroup>;
  /** DELETE /api/groups/:groupId */
  deleteGroup(userId: string, groupId: string): ServiceResult<void>;
  /** POST /api/groups/import */
  importGroups(
    userId: string,
    rows: UpsertGroupRequest[]
  ): ServiceResult<{ inserted: FacebookGroup[]; skippedCount: number }>;
  /** POST /api/group-collections */
  createCollection(
    userId: string,
    name: string,
    groupIds: string[]
  ): ServiceResult<GroupCollection>;
  /** PATCH /api/group-collections/:collectionId */
  renameCollection(
    userId: string,
    collectionId: string,
    name: string
  ): ServiceResult<GroupCollection>;
  /** PUT /api/group-collections/:collectionId/groups */
  setCollectionGroups(
    userId: string,
    collectionId: string,
    groupIds: string[]
  ): ServiceResult<void>;
  /** DELETE /api/group-collections/:collectionId */
  deleteCollection(userId: string, collectionId: string): ServiceResult<void>;
}

export interface TaskServiceContract {
  /** POST /api/tasks */
  createTask(userId: string, req: CreatePublishingTaskRequest): ServiceResult<PublishingTask>;
  /** PATCH /api/tasks/:taskId/schedule */
  rescheduleTask(userId: string, req: RescheduleTaskRequest): ServiceResult<PublishingTask>;
  /** DEMO scheduler event: marks a due SCHEDULED task ready (checks subscription validity) */
  triggerDueScheduledTaskDemo(userId: string, taskId: string): ServiceResult<PublishingTask>;
  /** POST /api/tasks/:taskId/pause */
  pauseTask(userId: string, taskId: string): ServiceResult<PublishingTask>;
  /** POST /api/tasks/:taskId/resume */
  resumeTask(userId: string, taskId: string): ServiceResult<PublishingTask>;
  /** POST /api/tasks/:taskId/cancel */
  cancelTask(userId: string, taskId: string): ServiceResult<PublishingTask>;
  /** POST /api/tasks/:taskId/items/:itemId/confirm */
  confirmTaskItem(userId: string, req: ConfirmTaskItemRequest): ServiceResult<PublishingTask>;
  /** POST /api/tasks/:taskId/items/:itemId/retry */
  retryTaskItem(userId: string, taskId: string, itemId: string): ServiceResult<PublishingTask>;
  /** POST /api/tasks/:taskId/retry-failed */
  retryFailedItems(userId: string, taskId: string): ServiceResult<PublishingTask>;
}

export interface AccountServiceContract {
  /** POST /api/facebook-accounts/manual */
  createManualProfile(
    userId: string,
    req: CreateManualProfileRequest
  ): ServiceResult<FacebookAccount>;
  /** POST /api/facebook-accounts/oauth/demo (Prototype simulation only) */
  simulateDemoOAuthConnect(userId: string, displayName: string): ServiceResult<{
    account: FacebookAccount;
    pages: FacebookPage[];
  }>;
  /** POST /api/facebook-accounts/:accountId/refresh */
  refreshAccountStatus(userId: string, accountId: string): ServiceResult<FacebookAccount>;
  /** POST /api/facebook-accounts/:accountId/disconnect */
  disconnectAccount(userId: string, accountId: string): ServiceResult<FacebookAccount>;
  /** POST /api/facebook-accounts/:accountId/sync-pages */
  syncPages(userId: string, accountId: string): ServiceResult<{
    pages: FacebookPage[];
    message: string;
  }>;
  /** POST /api/extension/devices/connect (Demo preview connection) */
  connectExtensionDevice(userId: string, deviceName: string): ServiceResult<ExtensionDevice>;
  /** POST /api/extension/devices/:deviceId/heartbeat */
  checkDeviceConnection(userId: string, deviceId: string): ServiceResult<ExtensionDevice>;
  /** POST /api/extension/devices/:deviceId/revoke */
  revokeDevice(userId: string, deviceId: string): ServiceResult<ExtensionDevice>;
}

export interface BillingServiceContract {
  /** POST /api/payments/orders */
  createPaymentOrder(
    userId: string,
    req: CreatePaymentOrderRequest
  ): ServiceResult<PaymentOrder>;
  /** GET /api/payments/orders/:orderId/status — NEVER auto-marks PAID */
  checkOrderStatus(userId: string, orderId: string): ServiceResult<PaymentOrder>;
  /** POST /api/payments/orders/:orderId/cancel */
  cancelPaymentOrder(userId: string, orderId: string): ServiceResult<PaymentOrder>;
}

export interface AdminServiceContract {
  /** PATCH /api/admin/users/:userId */
  updateUser(adminUserId: string, req: AdminUpdateUserRequest): ServiceResult<User>;
  /** POST /api/admin/plans & PATCH /api/admin/plans/:planId */
  upsertPlan(adminUserId: string, req: UpsertPlanRequest): ServiceResult<Plan>;
  /** POST /api/admin/payments/:orderId/confirm-demo */
  confirmPaymentOrderDemo(
    adminUserId: string,
    req: AdminConfirmPaymentRequest
  ): ServiceResult<{ order: PaymentOrder; subscription: Subscription }>;
}
