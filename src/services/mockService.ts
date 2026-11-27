import { createSeedDemoDatabase, type DemoDatabase } from '../data/mockData';
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
  PublishingTaskItem,
  Subscription,
  User,
} from '../types/domain';
import { addDaysIso, addMinutesIso, isFutureTimestamp, nowIso } from '../utils/dateTime';
import {
  computeDeviceConnectionStatus,
  computeSubscriptionUsage,
  generateId,
  isSubscriptionActive,
} from '../utils/formatters';
import {
  cancelTask as applyCancelTask,
  confirmTaskItem as applyConfirmTaskItem,
  deriveTaskStatus,
  pauseTask as applyPauseTask,
  resumeTask as applyResumeTask,
  retryAllFailedItems as applyRetryAllFailedItems,
  retryTaskItem as applyRetryTaskItem,
} from '../utils/taskStatus';
import {
  cloneMediaAttachments,
  extractNumericGroupUid,
  findDuplicateGroup,
  isValidEmail,
  normalizeFacebookGroupUrl,
  validatePasswordStrength,
  validatePostForPublish,
} from '../utils/validation';
import type {
  AccountServiceContract,
  AdminServiceContract,
  AuthServiceContract,
  BillingServiceContract,
  GroupServiceContract,
  PostServiceContract,
  TaskServiceContract,
} from './contracts';

const STORAGE_DB_KEY = 'fbpostpro_demo_db_v2';
const STORAGE_SESSION_KEY = 'fbpostpro_demo_session_user_id_v2';

// Non-production prototype password lookup (in-memory only, never persisted to localStorage)
const DEMO_PASSWORDS: Record<string, string> = {
  'customer@demo.fbpostpro.local': 'Demo@1234',
  'expired@demo.fbpostpro.local': 'Demo@1234',
  'admin@demo.fbpostpro.local': 'Admin@1234',
};

function safeStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / private mode errors in prototype
  }
}

function safeStorageRemove(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

function ensureTenDraftSlots(db: DemoDatabase, userId: string): void {
  const ts = nowIso();
  for (let slot = 1; slot <= 10; slot++) {
    const exists = db.posts.some(
      (p) => p.userId === userId && p.status === 'DRAFT' && p.slotNumber === slot
    );
    if (!exists) {
      db.posts.push({
        id: `draft-${userId}-${slot}`,
        userId,
        slotNumber: slot,
        savedName: null,
        content: '',
        linkUrl: null,
        status: 'DRAFT',
        media: [],
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }
}

export class MockAppService
  implements
    AuthServiceContract,
    PostServiceContract,
    GroupServiceContract,
    TaskServiceContract,
    AccountServiceContract,
    BillingServiceContract,
    AdminServiceContract
{
  private db: DemoDatabase;
  private currentUserId: string | null = null;
  private sessionPasswords: Record<string, string> = { ...DEMO_PASSWORDS };
  private resetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

  constructor(initialDb?: DemoDatabase) {
    if (initialDb) {
      this.db = initialDb;
    } else {
      const saved = safeStorageGet(STORAGE_DB_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as DemoDatabase;
          if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.plans)) {
            this.db = parsed;
          } else {
            this.db = createSeedDemoDatabase();
          }
        } catch {
          this.db = createSeedDemoDatabase();
        }
      } else {
        this.db = createSeedDemoDatabase();
      }
      const savedSessionUserId = safeStorageGet(STORAGE_SESSION_KEY);
      if (savedSessionUserId && this.db.users.some((u) => u.id === savedSessionUserId)) {
        const user = this.db.users.find((u) => u.id === savedSessionUserId);
        if (user && user.status === 'ACTIVE') {
          this.currentUserId = savedSessionUserId;
        }
      }
    }
  }

  private persist(): void {
    safeStorageSet(STORAGE_DB_KEY, JSON.stringify(this.db));
    if (this.currentUserId) {
      safeStorageSet(STORAGE_SESSION_KEY, this.currentUserId);
    } else {
      safeStorageRemove(STORAGE_SESSION_KEY);
    }
  }

  public getDatabaseSnapshot(): DemoDatabase {
    return this.db;
  }

  public resetDemoDatabase(): DemoDatabase {
    this.db = createSeedDemoDatabase();
    this.sessionPasswords = { ...DEMO_PASSWORDS };
    this.resetTokens.clear();
    safeStorageRemove(STORAGE_DB_KEY);
    if (this.currentUserId && !this.db.users.some((u) => u.id === this.currentUserId)) {
      this.currentUserId = null;
      safeStorageRemove(STORAGE_SESSION_KEY);
    }
    this.persist();
    return this.db;
  }

  public getUserSubscription(userId: string): Subscription | null {
    const subs = this.db.subscriptions
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return subs[0] ?? null;
  }

  public getUserPlan(userId: string): Plan | null {
    const sub = this.getUserSubscription(userId);
    if (!sub) return null;
    return this.db.plans.find((p) => p.id === sub.planId) ?? null;
  }

  // ==================== AUTH ====================

  public getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    return this.db.users.find((u) => u.id === this.currentUserId) ?? null;
  }

  public login(req: LoginRequest): ServiceResult<AuthSessionResponse> {
    const email = req.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return { ok: false, error: 'Vui lòng nhập địa chỉ email hợp lệ.' };
    }
    if (!req.password) {
      return { ok: false, error: 'Vui lòng nhập mật khẩu.' };
    }

    const user = this.db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      return {
        ok: false,
        error: 'Email hoặc mật khẩu không chính xác. Bạn có thể dùng nút đăng nhập DEMO bên dưới.',
      };
    }
    if (user.status === 'LOCKED') {
      return {
        ok: false,
        error: 'Tài khoản này đang bị tạm khóa bởi quản trị viên.',
      };
    }

    const expectedPassword = this.sessionPasswords[email];
    if (!expectedPassword || req.password !== expectedPassword) {
      return {
        ok: false,
        error: 'Email hoặc mật khẩu không chính xác.',
      };
    }

    const ts = nowIso();
    user.lastLoginAt = ts;
    user.updatedAt = ts;
    ensureTenDraftSlots(this.db, user.id);
    this.currentUserId = user.id;
    this.persist();

    return { ok: true, data: { user, isDemoSession: true } };
  }

  public loginAsDemoUser(userId: string): ServiceResult<AuthSessionResponse> {
    const user = this.db.users.find((u) => u.id === userId);
    if (!user) {
      return { ok: false, error: 'Không tìm thấy tài khoản demo.' };
    }
    if (user.status === 'LOCKED') {
      return {
        ok: false,
        error: 'Tài khoản demo này đang bị khóa. Hãy mở khóa trong Admin hoặc đặt lại dữ liệu demo.',
      };
    }
    const ts = nowIso();
    user.lastLoginAt = ts;
    user.updatedAt = ts;
    ensureTenDraftSlots(this.db, user.id);
    this.currentUserId = user.id;
    this.persist();
    return { ok: true, data: { user, isDemoSession: true } };
  }

  public register(req: RegisterRequest): ServiceResult<AuthSessionResponse> {
    const fullName = req.fullName.trim();
    const email = req.email.trim().toLowerCase();

    if (fullName.length < 2) {
      return { ok: false, error: 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).' };
    }
    if (!isValidEmail(email)) {
      return { ok: false, error: 'Địa chỉ email không hợp lệ.' };
    }
    const passCheck = validatePasswordStrength(req.password);
    if (!passCheck.valid) {
      return { ok: false, error: passCheck.error };
    }
    if (this.db.users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, error: 'Email này đã tồn tại trong hệ thống DEMO.' };
    }

    const ts = nowIso();
    const newUser: User = {
      id: generateId(),
      email,
      fullName,
      avatarUrl: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerifiedAt: null,
      lastLoginAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };

    this.db.users.push(newUser);
    this.sessionPasswords[email] = req.password;
    ensureTenDraftSlots(this.db, newUser.id);

    // Grant 7-day Basic trial subscription in DEMO mode
    const basicPlan = this.db.plans.find((p) => p.code === 'BASIC') ?? this.db.plans[0];
    if (basicPlan) {
      this.db.subscriptions.push({
        id: generateId(),
        userId: newUser.id,
        planId: basicPlan.id,
        billingPeriod: 'MONTHLY',
        status: 'ACTIVE',
        startsAt: ts,
        endsAt: addDaysIso(7),
        createdAt: ts,
        updatedAt: ts,
      });
    }

    this.currentUserId = newUser.id;
    this.persist();
    return { ok: true, data: { user: newUser, isDemoSession: true } };
  }

  public forgotPassword(
    req: ForgotPasswordRequest
  ): ServiceResult<{ resetTokenPreview: string }> {
    const email = req.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return { ok: false, error: 'Vui lòng nhập địa chỉ email hợp lệ.' };
    }
    const token = `demo-reset-${generateId().slice(0, 8)}`;
    this.resetTokens.set(token, {
      email,
      expiresAt: Date.now() + 15 * 60_000,
    });
    return { ok: true, data: { resetTokenPreview: token } };
  }

  public resetPassword(req: ResetPasswordRequest): ServiceResult<{ message: string }> {
    const token = req.token.trim();
    if (!token) {
      return { ok: false, error: 'Mã khôi phục không hợp lệ hoặc đã thiếu.' };
    }
    const passCheck = validatePasswordStrength(req.newPassword);
    if (!passCheck.valid) {
      return { ok: false, error: passCheck.error };
    }
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      return {
        ok: false,
        error: 'Mã khôi phục không tồn tại hoặc đã hết hạn (hãy gửi lại yêu cầu quên mật khẩu).',
      };
    }

    const user = this.db.users.find((u) => u.email.toLowerCase() === entry.email);
    if (user) {
      this.sessionPasswords[entry.email] = req.newPassword;
      user.updatedAt = nowIso();
    }
    this.resetTokens.delete(token);
    this.persist();
    return {
      ok: true,
      data: { message: 'Đặt lại mật khẩu thành công (mô phỏng DEMO). Bạn có thể đăng nhập lại.' },
    };
  }

  public changePassword(
    userId: string,
    req: ChangePasswordRequest
  ): ServiceResult<{ message: string }> {
    const user = this.db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'Không tìm thấy người dùng.' };

    const email = user.email.toLowerCase();
    const expected = this.sessionPasswords[email];
    if (expected && req.currentPassword !== expected) {
      return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };
    }
    const passCheck = validatePasswordStrength(req.newPassword);
    if (!passCheck.valid) return { ok: false, error: passCheck.error };

    this.sessionPasswords[email] = req.newPassword;
    user.updatedAt = nowIso();
    this.persist();
    return { ok: true, data: { message: 'Đã cập nhật mật khẩu trong phiên DEMO.' } };
  }

  public logout(): void {
    this.currentUserId = null;
    this.persist();
  }

  // ==================== POSTS & DRAFTS ====================

  public updateDraftSlot(
    userId: string,
    slotNumber: number,
    patch: { content?: string; linkUrl?: string | null; media?: MediaAttachment[] }
  ): ServiceResult<Post> {
    if (slotNumber < 1 || slotNumber > 10) {
      return { ok: false, error: 'Slot bài nháp không hợp lệ (1..10).' };
    }
    ensureTenDraftSlots(this.db, userId);
    const draft = this.db.posts.find(
      (p) => p.userId === userId && p.status === 'DRAFT' && p.slotNumber === slotNumber
    );
    if (!draft) return { ok: false, error: 'Không tìm thấy bài nháp.' };

    if (patch.content !== undefined) draft.content = patch.content;
    if (patch.linkUrl !== undefined) draft.linkUrl = patch.linkUrl;
    if (patch.media !== undefined) draft.media = cloneMediaAttachments(patch.media);
    draft.updatedAt = nowIso();
    this.persist();
    return { ok: true, data: { ...draft } };
  }

  public resetDraftSlot(userId: string, slotNumber: number): ServiceResult<Post> {
    return this.updateDraftSlot(userId, slotNumber, {
      content: '',
      linkUrl: null,
      media: [],
    });
  }

  public savePostTemplate(userId: string, req: SavePostTemplateRequest): ServiceResult<Post> {
    const savedName = req.savedName.trim();
    if (!savedName) {
      return { ok: false, error: 'Vui lòng nhập tên cho bài viết lưu mẫu.' };
    }
    const validation = validatePostForPublish({
      content: req.content,
      linkUrl: req.linkUrl,
      media: req.media,
    });
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const ts = nowIso();
    const savedPost: Post = {
      id: generateId(),
      userId,
      slotNumber: null,
      savedName,
      content: req.content,
      linkUrl: req.linkUrl?.trim() || null,
      status: 'SAVED',
      media: cloneMediaAttachments(req.media),
      createdAt: ts,
      updatedAt: ts,
    };

    this.db.posts.unshift(savedPost);
    this.persist();
    return { ok: true, data: savedPost };
  }

  public deleteSavedPost(userId: string, postId: string): ServiceResult<void> {
    const idx = this.db.posts.findIndex(
      (p) => p.id === postId && p.userId === userId && p.status === 'SAVED'
    );
    if (idx === -1) return { ok: false, error: 'Không tìm thấy bài đã lưu.' };
    this.db.posts.splice(idx, 1);
    this.persist();
    return { ok: true };
  }

  // ==================== GROUPS & COLLECTIONS ====================

  public createGroup(userId: string, req: UpsertGroupRequest): ServiceResult<FacebookGroup> {
    const groupName = req.groupName.trim();
    if (!groupName) return { ok: false, error: 'Vui lòng nhập tên nhóm Facebook.' };

    const normalizedUrl = normalizeFacebookGroupUrl(req.groupUrl);
    if (!normalizedUrl) {
      return {
        ok: false,
        error: 'URL nhóm không hợp lệ. Ví dụ: https://www.facebook.com/groups/tennhom',
      };
    }

    const userGroups = this.db.groups.filter((g) => g.userId === userId);
    const plan = this.getUserPlan(userId);
    const sub = this.getUserSubscription(userId);
    if (plan && isSubscriptionActive(sub) && userGroups.length >= plan.maxGroups) {
      return {
        ok: false,
        error: `Đã đạt hạn mức ${plan.maxGroups} nhóm của gói ${plan.name}.`,
      };
    }

    const resolvedUid = req.groupUid?.trim() || extractNumericGroupUid(normalizedUrl) || null;
    const duplicate = findDuplicateGroup(userGroups, normalizedUrl, resolvedUid);
    if (duplicate) {
      return {
        ok: false,
        error: `Nhóm này đã tồn tại trong danh sách ("${duplicate.groupName}").`,
      };
    }

    const ts = nowIso();
    const newGroup: FacebookGroup = {
      id: generateId(),
      userId,
      groupUid: resolvedUid,
      groupName,
      groupUrl: normalizedUrl,
      avatarUrl: null,
      memberCount:
        req.memberCount !== undefined && req.memberCount !== null && req.memberCount >= 0
          ? Math.floor(req.memberCount)
          : null,
      requiresApproval: req.requiresApproval ?? null,
      notes: req.notes?.trim() || null,
      createdAt: ts,
      updatedAt: ts,
    };

    this.db.groups.unshift(newGroup);
    this.persist();
    return { ok: true, data: newGroup };
  }

  public updateGroup(
    userId: string,
    groupId: string,
    req: UpsertGroupRequest
  ): ServiceResult<FacebookGroup> {
    const group = this.db.groups.find((g) => g.id === groupId && g.userId === userId);
    if (!group) return { ok: false, error: 'Không tìm thấy nhóm cần cập nhật.' };

    const groupName = req.groupName.trim();
    if (!groupName) return { ok: false, error: 'Tên nhóm không được để trống.' };

    const normalizedUrl = normalizeFacebookGroupUrl(req.groupUrl);
    if (!normalizedUrl) {
      return {
        ok: false,
        error: 'URL nhóm không hợp lệ. Ví dụ: https://www.facebook.com/groups/tennhom',
      };
    }

    const resolvedUid = req.groupUid?.trim() || extractNumericGroupUid(normalizedUrl) || null;
    const userGroups = this.db.groups.filter((g) => g.userId === userId);
    const duplicate = findDuplicateGroup(userGroups, normalizedUrl, resolvedUid, groupId);
    if (duplicate) {
      return {
        ok: false,
        error: `URL hoặc UID trùng với nhóm "${duplicate.groupName}".`,
      };
    }

    group.groupName = groupName;
    group.groupUrl = normalizedUrl;
    group.groupUid = resolvedUid;
    group.memberCount =
      req.memberCount !== undefined && req.memberCount !== null && req.memberCount >= 0
        ? Math.floor(req.memberCount)
        : null;
    group.requiresApproval = req.requiresApproval ?? null;
    group.notes = req.notes?.trim() || null;
    group.updatedAt = nowIso();

    this.persist();
    return { ok: true, data: { ...group } };
  }

  public deleteGroup(userId: string, groupId: string): ServiceResult<void> {
    const idx = this.db.groups.findIndex((g) => g.id === groupId && g.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy nhóm để xóa.' };
    this.db.groups.splice(idx, 1);
    this.db.collectionItems = this.db.collectionItems.filter((ci) => ci.groupId !== groupId);
    this.persist();
    return { ok: true };
  }

  public importGroups(
    userId: string,
    rows: UpsertGroupRequest[]
  ): ServiceResult<{ inserted: FacebookGroup[]; skippedCount: number }> {
    const inserted: FacebookGroup[] = [];
    let skippedCount = 0;

    for (const row of rows) {
      const res = this.createGroup(userId, row);
      if (res.ok && res.data) {
        inserted.push(res.data);
      } else {
        skippedCount += 1;
      }
    }

    return { ok: true, data: { inserted, skippedCount } };
  }

  public createCollection(
    userId: string,
    name: string,
    groupIds: string[]
  ): ServiceResult<GroupCollection> {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Vui lòng nhập tên bộ sưu tập nhóm.' };

    const validUserGroupIds = new Set(
      this.db.groups.filter((g) => g.userId === userId).map((g) => g.id)
    );
    const uniqueGroupIds = Array.from(new Set(groupIds)).filter((id) =>
      validUserGroupIds.has(id)
    );
    if (uniqueGroupIds.length === 0) {
      return {
        ok: false,
        error: 'Vui lòng chọn ít nhất 1 nhóm để lưu vào bộ sưu tập.',
      };
    }

    const ts = nowIso();
    const col: GroupCollection = {
      id: generateId(),
      userId,
      name: trimmed,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.collections.push(col);
    for (const groupId of uniqueGroupIds) {
      this.db.collectionItems.push({
        collectionId: col.id,
        groupId,
        createdAt: ts,
      });
    }
    this.persist();
    return { ok: true, data: col };
  }

  public renameCollection(
    userId: string,
    collectionId: string,
    name: string
  ): ServiceResult<GroupCollection> {
    const col = this.db.collections.find(
      (c) => c.id === collectionId && c.userId === userId
    );
    if (!col) return { ok: false, error: 'Không tìm thấy bộ sưu tập.' };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Tên bộ sưu tập không được để trống.' };
    col.name = trimmed;
    col.updatedAt = nowIso();
    this.persist();
    return { ok: true, data: { ...col } };
  }

  public setCollectionGroups(
    userId: string,
    collectionId: string,
    groupIds: string[]
  ): ServiceResult<void> {
    const col = this.db.collections.find(
      (c) => c.id === collectionId && c.userId === userId
    );
    if (!col) return { ok: false, error: 'Không tìm thấy bộ sưu tập.' };

    const validUserGroupIds = new Set(
      this.db.groups.filter((g) => g.userId === userId).map((g) => g.id)
    );
    const uniqueGroupIds = Array.from(new Set(groupIds)).filter((id) =>
      validUserGroupIds.has(id)
    );

    const ts = nowIso();
    this.db.collectionItems = this.db.collectionItems.filter(
      (ci) => ci.collectionId !== collectionId
    );
    for (const groupId of uniqueGroupIds) {
      this.db.collectionItems.push({
        collectionId,
        groupId,
        createdAt: ts,
      });
    }
    col.updatedAt = ts;
    this.persist();
    return { ok: true };
  }

  public deleteCollection(userId: string, collectionId: string): ServiceResult<void> {
    const idx = this.db.collections.findIndex(
      (c) => c.id === collectionId && c.userId === userId
    );
    if (idx === -1) return { ok: false, error: 'Không tìm thấy bộ sưu tập.' };
    // Deleting collection removes join rows only; groups remain intact.
    this.db.collections.splice(idx, 1);
    this.db.collectionItems = this.db.collectionItems.filter(
      (ci) => ci.collectionId !== collectionId
    );
    this.persist();
    return { ok: true };
  }

  // ==================== TASKS ====================

  public createTask(
    userId: string,
    req: CreatePublishingTaskRequest
  ): ServiceResult<PublishingTask> {
    // Idempotency guard against double submit
    const existingByKey = this.db.tasks.find(
      (t) => t.userId === userId && t.idempotencyKey === req.idempotencyKey
    );
    if (existingByKey) {
      return { ok: true, data: existingByKey };
    }

    // Subscription & daily quota guard
    const sub = this.getUserSubscription(userId);
    const plan = this.getUserPlan(userId);
    if (!isSubscriptionActive(sub) || !plan) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Gói dịch vụ của bạn đã hết hạn hoặc chưa kích hoạt. Vui lòng gia hạn để tạo tác vụ.',
      };
    }

    const usage = computeSubscriptionUsage({
      subscription: sub,
      plan,
      accounts: this.db.accounts.filter((a) => a.userId === userId),
      groups: this.db.groups.filter((g) => g.userId === userId),
      tasks: this.db.tasks.filter((t) => t.userId === userId),
    });

    if (usage.scheduledTodayUsed >= usage.scheduledTodayLimit) {
      return {
        ok: false,
        code: 'QUOTA_EXCEEDED',
        error: `Bạn đã dùng hết hạn mức ${usage.scheduledTodayLimit} tác vụ/ngày của gói ${plan.name}.`,
      };
    }

    if (req.pairs.length === 0) {
      return { ok: false, error: 'Vui lòng chọn ít nhất 1 cặp bài viết và đích đăng.' };
    }

    // Validate scheduledAt if present
    let isScheduledFuture = false;
    if (req.scheduledAt) {
      if (!isFutureTimestamp(req.scheduledAt)) {
        return { ok: false, error: 'Thời gian lên lịch phải nằm ở tương lai.' };
      }
      isScheduledFuture = true;
    }

    // Validate account for PAGE mode
    if (req.targetType === 'PAGE') {
      if (!req.facebookAccountId) {
        return { ok: false, error: 'Vui lòng chọn tài khoản Facebook quản lý Fanpage.' };
      }
      const account = this.db.accounts.find(
        (a) => a.id === req.facebookAccountId && a.userId === userId
      );
      if (!account || account.connectionType !== 'META_OAUTH' || account.status !== 'CONNECTED') {
        return {
          ok: false,
          error: 'Tài khoản Facebook chưa kết nối Meta OAuth hợp lệ để đăng Fanpage.',
        };
      }
    }

    const ts = nowIso();
    const taskId = generateId();
    const items: PublishingTaskItem[] = [];

    for (const pair of req.pairs) {
      const post = this.db.posts.find((p) => p.id === pair.postId && p.userId === userId);
      if (!post) {
        return { ok: false, error: 'Không tìm thấy bài viết nguồn đã chọn.' };
      }
      const postCheck = validatePostForPublish(post);
      if (!postCheck.valid) {
        return { ok: false, error: postCheck.error };
      }

      if (req.targetType === 'GROUP') {
        if (!pair.groupId || pair.pageId) {
          return { ok: false, error: 'Cặp đích đăng nhóm không hợp lệ.' };
        }
        const group = this.db.groups.find((g) => g.id === pair.groupId && g.userId === userId);
        if (!group) {
          return { ok: false, error: 'Không tìm thấy nhóm Facebook đã chọn.' };
        }
        items.push({
          id: generateId(),
          taskId,
          sourcePostId: post.id,
          groupId: group.id,
          pageId: null,
          contentSnapshot: post.content,
          linkSnapshot: post.linkUrl,
          destinationNameSnapshot: group.groupName,
          destinationUrlSnapshot: group.groupUrl,
          mediaSnapshots: cloneMediaAttachments(post.media),
          status: isScheduledFuture ? 'PENDING' : 'WAITING_CONFIRMATION',
          confirmationType: null,
          resultPostUrl: null,
          externalPostId: null,
          errorCode: null,
          errorMessage: null,
          attemptCount: isScheduledFuture ? 0 : 1,
          startedAt: isScheduledFuture ? null : ts,
          finishedAt: null,
          createdAt: ts,
          updatedAt: ts,
        });
      } else {
        if (!pair.pageId || pair.groupId) {
          return { ok: false, error: 'Cặp đích đăng Fanpage không hợp lệ.' };
        }
        const page = this.db.pages.find(
          (pg) =>
            pg.id === pair.pageId &&
            pg.userId === userId &&
            pg.facebookAccountId === req.facebookAccountId
        );
        if (!page) {
          return { ok: false, error: 'Fanpage không thuộc tài khoản Facebook đang chọn.' };
        }
        if (!page.canPublish) {
          return {
            ok: false,
            error: `Fanpage "${page.pageName}" không có quyền đăng bài (canPublish = false).`,
          };
        }
        items.push({
          id: generateId(),
          taskId,
          sourcePostId: post.id,
          groupId: null,
          pageId: page.id,
          contentSnapshot: post.content,
          linkSnapshot: post.linkUrl,
          destinationNameSnapshot: page.pageName,
          destinationUrlSnapshot: page.pageUrl,
          mediaSnapshots: cloneMediaAttachments(post.media),
          status: isScheduledFuture ? 'PENDING' : 'WAITING_CONFIRMATION',
          confirmationType: null,
          resultPostUrl: null,
          externalPostId: null,
          errorCode: null,
          errorMessage: null,
          attemptCount: isScheduledFuture ? 0 : 1,
          startedAt: isScheduledFuture ? null : ts,
          finishedAt: null,
          createdAt: ts,
          updatedAt: ts,
        });
      }
    }

    const derivedStatus = deriveTaskStatus(items, { isScheduledFuture });
    const newTask: PublishingTask = {
      id: taskId,
      userId,
      facebookAccountId: req.facebookAccountId,
      targetType: req.targetType,
      executionMode: req.executionMode,
      scheduledAt: req.scheduledAt,
      status: derivedStatus,
      idempotencyKey: req.idempotencyKey,
      startedAt: isScheduledFuture ? null : ts,
      finishedAt: null,
      createdAt: ts,
      updatedAt: ts,
      items,
    };

    this.db.tasks.unshift(newTask);
    this.persist();
    return { ok: true, data: newTask };
  }

  public pauseTask(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const idx = this.db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    const updated = applyPauseTask(this.db.tasks[idx], nowIso());
    this.db.tasks[idx] = updated;
    this.persist();
    return { ok: true, data: updated };
  }

  public resumeTask(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const idx = this.db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    const updated = applyResumeTask(this.db.tasks[idx], nowIso());
    this.db.tasks[idx] = updated;
    this.persist();
    return { ok: true, data: updated };
  }

  public cancelTask(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const idx = this.db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    const updated = applyCancelTask(this.db.tasks[idx], nowIso());
    this.db.tasks[idx] = updated;
    this.persist();
    return { ok: true, data: updated };
  }

  public confirmTaskItem(
    userId: string,
    req: ConfirmTaskItemRequest
  ): ServiceResult<PublishingTask> {
    const idx = this.db.tasks.findIndex((t) => t.id === req.taskId && t.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    const updated = applyConfirmTaskItem(
      this.db.tasks[idx],
      {
        itemId: req.itemId,
        status: req.status,
        resultPostUrl: req.resultPostUrl,
        errorMessage: req.errorMessage,
        confirmationType: 'USER',
      },
      nowIso()
    );
    this.db.tasks[idx] = updated;
    this.persist();
    return { ok: true, data: updated };
  }

  public retryTaskItem(
    userId: string,
    taskId: string,
    itemId: string
  ): ServiceResult<PublishingTask> {
    const idx = this.db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    const item = this.db.tasks[idx].items.find((i) => i.id === itemId);
    if (!item || item.status !== 'FAILED') {
      return { ok: false, error: 'Chỉ có thể thử lại các mục đang ở trạng thái Thất bại.' };
    }
    const updated = applyRetryTaskItem(this.db.tasks[idx], itemId, nowIso());
    this.db.tasks[idx] = updated;
    this.persist();
    return { ok: true, data: updated };
  }

  public retryFailedItems(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const idx = this.db.tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    const hasFailed = this.db.tasks[idx].items.some((i) => i.status === 'FAILED');
    if (!hasFailed) {
      return { ok: false, error: 'Tác vụ này không có mục thất bại nào để thử lại.' };
    }
    const updated = applyRetryAllFailedItems(this.db.tasks[idx], nowIso());
    this.db.tasks[idx] = updated;
    this.persist();
    return { ok: true, data: updated };
  }

  // ==================== ACCOUNTS & EXTENSION DEVICES ====================

  public createManualProfile(
    userId: string,
    req: CreateManualProfileRequest
  ): ServiceResult<FacebookAccount> {
    const displayName = req.displayName.trim();
    if (!displayName) {
      return { ok: false, error: 'Vui lòng nhập tên hiển thị của hồ sơ Facebook.' };
    }
    const activeAccounts = this.db.accounts.filter(
      (a) => a.userId === userId && a.status !== 'DISCONNECTED'
    );
    const plan = this.getUserPlan(userId);
    const sub = this.getUserSubscription(userId);
    if (plan && isSubscriptionActive(sub) && activeAccounts.length >= plan.maxFacebookAccounts) {
      return {
        ok: false,
        error: `Đã đạt giới hạn ${plan.maxFacebookAccounts} hồ sơ Facebook của gói ${plan.name}.`,
      };
    }

    const ts = nowIso();
    const account: FacebookAccount = {
      id: generateId(),
      userId,
      facebookUid: req.facebookUid?.trim() || null,
      displayName,
      avatarUrl: req.avatarUrl?.trim() || null,
      connectionType: 'MANUAL_PROFILE',
      status: 'UNVERIFIED',
      lastConnectedAt: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.accounts.unshift(account);
    this.persist();
    return { ok: true, data: account };
  }

  public simulateDemoOAuthConnect(
    userId: string,
    displayName: string
  ): ServiceResult<{ account: FacebookAccount; pages: FacebookPage[] }> {
    const trimmed = displayName.trim();
    if (!trimmed) {
      return { ok: false, error: 'Vui lòng nhập tên hồ sơ DEMO.' };
    }
    const activeAccounts = this.db.accounts.filter(
      (a) => a.userId === userId && a.status !== 'DISCONNECTED'
    );
    const plan = this.getUserPlan(userId);
    const sub = this.getUserSubscription(userId);
    if (plan && isSubscriptionActive(sub) && activeAccounts.length >= plan.maxFacebookAccounts) {
      return {
        ok: false,
        error: `Đã đạt giới hạn ${plan.maxFacebookAccounts} hồ sơ Facebook của gói ${plan.name}.`,
      };
    }

    const ts = nowIso();
    const accId = generateId();
    const demoAccount: FacebookAccount = {
      id: accId,
      userId,
      facebookUid: null, // Prototype mode does not invent a real Meta UID
      displayName: `${trimmed} (DEMO)`,
      avatarUrl: null,
      connectionType: 'META_OAUTH',
      status: 'CONNECTED',
      lastConnectedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };

    const demoPage: FacebookPage = {
      id: generateId(),
      userId,
      facebookAccountId: accId,
      pageUid: `demo-page-${accId.slice(0, 8)}`,
      pageName: `Fanpage Mẫu — ${trimmed}`,
      avatarUrl: null,
      pageUrl: 'https://www.facebook.com',
      canPublish: true,
      createdAt: ts,
      updatedAt: ts,
    };

    this.db.accounts.unshift(demoAccount);
    this.db.pages.unshift(demoPage);
    this.persist();
    return { ok: true, data: { account: demoAccount, pages: [demoPage] } };
  }

  public refreshAccountStatus(
    userId: string,
    accountId: string
  ): ServiceResult<FacebookAccount> {
    const account = this.db.accounts.find((a) => a.id === accountId && a.userId === userId);
    if (!account) return { ok: false, error: 'Không tìm thấy tài khoản.' };

    // Truthful refresh: never forces UNVERIFIED/DISCONNECTED/EXPIRED into CONNECTED
    account.updatedAt = nowIso();
    this.persist();
    return { ok: true, data: { ...account } };
  }

  public disconnectAccount(
    userId: string,
    accountId: string
  ): ServiceResult<FacebookAccount> {
    const account = this.db.accounts.find((a) => a.id === accountId && a.userId === userId);
    if (!account) return { ok: false, error: 'Không tìm thấy tài khoản.' };

    account.status = 'DISCONNECTED';
    account.updatedAt = nowIso();
    this.persist();
    return { ok: true, data: { ...account } };
  }

  public syncPages(
    userId: string,
    accountId: string
  ): ServiceResult<{ pages: FacebookPage[]; message: string }> {
    const account = this.db.accounts.find((a) => a.id === accountId && a.userId === userId);
    if (!account) return { ok: false, error: 'Không tìm thấy tài khoản.' };
    if (account.connectionType !== 'META_OAUTH' || account.status !== 'CONNECTED') {
      return {
        ok: false,
        error: 'Chỉ có thể đồng bộ Fanpage cho tài khoản đã kết nối Meta OAuth.',
      };
    }
    const existingPages = this.db.pages.filter(
      (p) => p.userId === userId && p.facebookAccountId === accountId
    );
    return {
      ok: true,
      data: {
        pages: existingPages,
        message:
          'Chế độ DEMO: Chưa kết nối Meta Graph API thực tế. Hiển thị danh sách Fanpage mẫu hiện có.',
      },
    };
  }

  public connectExtensionDevice(
    userId: string,
    deviceName: string
  ): ServiceResult<ExtensionDevice> {
    const trimmed = deviceName.trim();
    if (!trimmed) return { ok: false, error: 'Vui lòng nhập tên thiết bị.' };
    const ts = nowIso();
    const device: ExtensionDevice = {
      id: generateId(),
      userId,
      deviceName: trimmed,
      extensionVersion: '1.0.0-preview',
      lastSeenAt: ts,
      revokedAt: null,
      createdAt: ts,
    };
    this.db.devices.unshift(device);
    this.persist();
    return { ok: true, data: device };
  }

  public checkDeviceConnection(
    userId: string,
    deviceId: string
  ): ServiceResult<ExtensionDevice> {
    const device = this.db.devices.find((d) => d.id === deviceId && d.userId === userId);
    if (!device) return { ok: false, error: 'Không tìm thấy thiết bị.' };
    if (computeDeviceConnectionStatus(device) === 'REVOKED') {
      return {
        ok: false,
        error: 'Thiết bị này đã bị thu hồi quyền truy cập và không thể kết nối lại.',
      };
    }
    device.lastSeenAt = nowIso();
    this.persist();
    return { ok: true, data: { ...device } };
  }

  public revokeDevice(userId: string, deviceId: string): ServiceResult<ExtensionDevice> {
    const device = this.db.devices.find((d) => d.id === deviceId && d.userId === userId);
    if (!device) return { ok: false, error: 'Không tìm thấy thiết bị.' };
    if (!device.revokedAt) {
      device.revokedAt = nowIso();
      this.persist();
    }
    return { ok: true, data: { ...device } };
  }

  // ==================== BILLING & PAYMENT ORDERS ====================

  public createPaymentOrder(
    userId: string,
    req: CreatePaymentOrderRequest
  ): ServiceResult<PaymentOrder> {
    const plan = this.db.plans.find((p) => p.id === req.planId && p.isActive);
    if (!plan) {
      return { ok: false, error: 'Gói dịch vụ không tồn tại hoặc đã ngừng kinh doanh.' };
    }
    const ts = nowIso();
    const amountVnd =
      req.billingPeriod === 'YEARLY' ? plan.priceYearlyVnd : plan.priceMonthlyVnd;
    const shortCode = generateId().replace(/-/g, '').slice(0, 6).toUpperCase();
    const order: PaymentOrder = {
      id: generateId(),
      userId,
      planId: plan.id,
      orderCode: `FPP-DEMO-${shortCode}`,
      amountVnd,
      billingPeriod: req.billingPeriod,
      paymentMethod: req.paymentMethod,
      providerReference: null,
      status: 'PENDING',
      paidAt: null,
      expiresAt: addMinutesIso(15),
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.orders.unshift(order);
    this.persist();
    return { ok: true, data: order };
  }

  /**
   * Customer status check NEVER auto-marks an order as PAID.
   * Only checks expiry or returns current status.
   */
  public checkOrderStatus(userId: string, orderId: string): ServiceResult<PaymentOrder> {
    const order = this.db.orders.find((o) => o.id === orderId && o.userId === userId);
    if (!order) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

    if (order.status === 'PENDING' && new Date(order.expiresAt).getTime() <= Date.now()) {
      order.status = 'EXPIRED';
      order.updatedAt = nowIso();
      this.persist();
    }
    return { ok: true, data: { ...order } };
  }

  public cancelPaymentOrder(userId: string, orderId: string): ServiceResult<PaymentOrder> {
    const order = this.db.orders.find((o) => o.id === orderId && o.userId === userId);
    if (!order) return { ok: false, error: 'Không tìm thấy đơn hàng.' };
    if (order.status !== 'PENDING') {
      return { ok: false, error: 'Chỉ có thể hủy đơn hàng đang chờ thanh toán.' };
    }
    order.status = 'CANCELLED';
    order.updatedAt = nowIso();
    this.persist();
    return { ok: true, data: { ...order } };
  }

  // ==================== ADMIN ====================

  private ensureAdmin(adminUserId: string): ServiceResult<User> {
    const admin = this.db.users.find((u) => u.id === adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      return { ok: false, error: 'Bạn không có quyền quản trị viên.' };
    }
    return { ok: true, data: admin };
  }

  public updateUser(adminUserId: string, req: AdminUpdateUserRequest): ServiceResult<User> {
    const auth = this.ensureAdmin(adminUserId);
    if (!auth.ok) return { ok: false, error: auth.error };

    const target = this.db.users.find((u) => u.id === req.userId);
    if (!target) return { ok: false, error: 'Không tìm thấy người dùng.' };

    if (target.id === adminUserId && req.status === 'LOCKED') {
      return { ok: false, error: 'Quản trị viên không thể tự khóa tài khoản của chính mình.' };
    }
    if (target.id === adminUserId && req.role && req.role !== 'ADMIN') {
      return { ok: false, error: 'Không thể tự hạ quyền quản trị của chính mình.' };
    }

    if (req.fullName !== undefined && req.fullName.trim().length >= 2) {
      target.fullName = req.fullName.trim();
    }
    if (req.role) target.role = req.role;
    if (req.status) target.status = req.status;
    target.updatedAt = nowIso();

    this.db.auditLogs.unshift({
      id: generateId(),
      actorUserId: adminUserId,
      action: 'ADMIN_UPDATE_USER',
      entityType: 'users',
      entityId: target.id,
      metadata: { role: target.role, status: target.status },
      createdAt: nowIso(),
    });

    this.persist();
    return { ok: true, data: { ...target } };
  }

  public upsertPlan(adminUserId: string, req: UpsertPlanRequest): ServiceResult<Plan> {
    const auth = this.ensureAdmin(adminUserId);
    if (!auth.ok) return { ok: false, error: auth.error };

    const code = req.code.trim().toUpperCase();
    const name = req.name.trim();
    if (!code || !name) {
      return { ok: false, error: 'Vui lòng nhập đầy đủ mã gói và tên gói.' };
    }
    if (req.priceMonthlyVnd < 0 || req.priceYearlyVnd < 0) {
      return { ok: false, error: 'Giá gói không được âm.' };
    }
    if (
      req.maxFacebookAccounts < 1 ||
      req.maxGroups < 1 ||
      req.maxScheduledTasksPerDay < 1
    ) {
      return { ok: false, error: 'Các hạn mức gói phải lớn hơn hoặc bằng 1.' };
    }

    const ts = nowIso();
    if (req.id) {
      const existing = this.db.plans.find((p) => p.id === req.id);
      if (!existing) return { ok: false, error: 'Không tìm thấy gói dịch vụ.' };
      if (this.db.plans.some((p) => p.code === code && p.id !== req.id)) {
        return { ok: false, error: `Mã gói "${code}" đã tồn tại.` };
      }
      existing.code = code;
      existing.name = name;
      existing.description = req.description.trim();
      existing.priceMonthlyVnd = Math.round(req.priceMonthlyVnd);
      existing.priceYearlyVnd = Math.round(req.priceYearlyVnd);
      existing.maxFacebookAccounts = Math.floor(req.maxFacebookAccounts);
      existing.maxGroups = Math.floor(req.maxGroups);
      existing.maxScheduledTasksPerDay = Math.floor(req.maxScheduledTasksPerDay);
      existing.features = req.features.map((f) => f.trim()).filter(Boolean);
      existing.isActive = req.isActive;
      existing.updatedAt = ts;

      this.persist();
      return { ok: true, data: { ...existing } };
    }

    if (this.db.plans.some((p) => p.code === code)) {
      return { ok: false, error: `Mã gói "${code}" đã tồn tại.` };
    }

    const newPlan: Plan = {
      id: generateId(),
      code,
      name,
      description: req.description.trim(),
      priceMonthlyVnd: Math.round(req.priceMonthlyVnd),
      priceYearlyVnd: Math.round(req.priceYearlyVnd),
      maxFacebookAccounts: Math.floor(req.maxFacebookAccounts),
      maxGroups: Math.floor(req.maxGroups),
      maxScheduledTasksPerDay: Math.floor(req.maxScheduledTasksPerDay),
      features: req.features.map((f) => f.trim()).filter(Boolean),
      isActive: req.isActive,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.plans.push(newPlan);
    this.persist();
    return { ok: true, data: newPlan };
  }

  public confirmPaymentOrderDemo(
    adminUserId: string,
    req: AdminConfirmPaymentRequest
  ): ServiceResult<{ order: PaymentOrder; subscription: Subscription }> {
    const auth = this.ensureAdmin(adminUserId);
    if (!auth.ok) return { ok: false, error: auth.error };

    const order = this.db.orders.find((o) => o.id === req.orderId);
    if (!order) return { ok: false, error: 'Không tìm thấy đơn hàng.' };
    if (order.status !== 'PENDING') {
      return { ok: false, error: 'Chỉ có thể xác nhận đơn hàng đang ở trạng thái Chờ thanh toán.' };
    }

    const ts = nowIso();
    order.status = 'PAID';
    order.paidAt = ts;
    order.providerReference = req.providerReference?.trim() || `ADMIN-DEMO-${Date.now()}`;
    order.updatedAt = ts;

    // Deactivate old active subscriptions for that user and activate new one
    for (const sub of this.db.subscriptions) {
      if (sub.userId === order.userId && sub.status === 'ACTIVE') {
        sub.status = 'CANCELLED';
        sub.updatedAt = ts;
      }
    }

    const durationDays = order.billingPeriod === 'YEARLY' ? 365 : 30;
    const subscription: Subscription = {
      id: generateId(),
      userId: order.userId,
      planId: order.planId,
      billingPeriod: order.billingPeriod,
      status: 'ACTIVE',
      startsAt: ts,
      endsAt: addDaysIso(durationDays),
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.subscriptions.unshift(subscription);

    this.db.auditLogs.unshift({
      id: generateId(),
      actorUserId: adminUserId,
      action: 'ADMIN_CONFIRM_PAYMENT_DEMO',
      entityType: 'payment_orders',
      entityId: order.id,
      metadata: {
        orderCode: order.orderCode,
        amountVnd: order.amountVnd,
        providerReference: order.providerReference,
      },
      createdAt: ts,
    });

    this.persist();
    return { ok: true, data: { order: { ...order }, subscription } };
  }
}

export const mockAppService = new MockAppService();
