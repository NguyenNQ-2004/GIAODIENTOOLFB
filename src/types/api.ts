import type {
  BillingPeriod,
  FacebookAccount,
  FacebookGroup,
  FacebookPage,
  GroupCollection,
  MediaAttachment,
  PaymentMethod,
  PaymentOrder,
  Plan,
  Post,
  PublishingTask,
  TaskExecutionMode,
  TaskItemStatus,
  TaskTargetType,
  User,
  UserRole,
  UserStatus,
} from './domain';

/**
 * Request & Response DTOs mapped 1-to-1 with planned backend REST endpoints.
 */

export interface AuthSessionResponse {
  user: User;
  isDemoSession: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpsertGroupRequest {
  groupName: string;
  groupUrl: string;
  groupUid?: string | null;
  memberCount?: number | null;
  requiresApproval?: boolean | null;
  notes?: string | null;
}

export interface CsvImportRowResult {
  rowIndex: number;
  groupName: string;
  groupUrl: string;
  groupUid: string | null;
  memberCount: number | null;
  requiresApproval: boolean | null;
  notes: string | null;
  status: 'VALID' | 'DUPLICATE' | 'ERROR';
  reason?: string;
}

export interface SavePostTemplateRequest {
  savedName: string;
  content: string;
  linkUrl: string | null;
  media: MediaAttachment[];
}

export interface CreateTaskPairInput {
  postId: string;
  groupId?: string | null;
  pageId?: string | null;
}

export interface CreatePublishingTaskRequest {
  facebookAccountId: string | null;
  targetType: TaskTargetType;
  executionMode: TaskExecutionMode;
  scheduledAt: string | null;
  idempotencyKey: string;
  pairs: CreateTaskPairInput[];
}

export interface RescheduleTaskRequest {
  taskId: string;
  scheduledAt: string;
}

export interface ConfirmTaskItemRequest {
  taskId: string;
  itemId: string;
  status: Extract<TaskItemStatus, 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW'>;
  resultPostUrl?: string | null;
  errorMessage?: string | null;
}

export interface CreateManualProfileRequest {
  displayName: string;
  facebookUid?: string | null;
  avatarUrl?: string | null;
}

export interface CreatePaymentOrderRequest {
  planId: string;
  billingPeriod: BillingPeriod;
  paymentMethod: PaymentMethod;
}

export interface UpsertPlanRequest {
  id?: string;
  code: string;
  name: string;
  monthlyPriceVnd: number;
  yearlyPriceVnd: number;
  maxFacebookAccounts: number;
  maxSavedGroups: number;
  maxScheduledTasks: number;
  isActive: boolean;
}

export interface AdminUpdateUserRequest {
  userId: string;
  role?: UserRole;
  status?: UserStatus;
  displayName?: string;
}

export interface AdminConfirmPaymentRequest {
  orderId: string;
  providerReference?: string;
  /** Required when order changes plan while user still has an active subscription on a different plan */
  acknowledgeUnapprovedPlanChangePolicy?: boolean;
}

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface WorkspaceSnapshot {
  user: User;
  accounts: FacebookAccount[];
  pages: FacebookPage[];
  groups: FacebookGroup[];
  collections: GroupCollection[];
  collectionItems: { collectionId: string; groupId: string; createdAt: string }[];
  posts: Post[];
  tasks: PublishingTask[];
  orders: PaymentOrder[];
  plans: Plan[];
}
