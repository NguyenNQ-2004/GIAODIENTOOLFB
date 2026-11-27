import {
  DEMO_SCHEMA_VERSION,
  LEGACY_STORAGE_KEYS,
  STORAGE_DB_KEY,
  STORAGE_SESSION_KEY,
} from '../config/demoConfig';
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
  PublishingTaskItem,
  Subscription,
  User,
} from '../types/domain';
import { addDaysIso, addMinutesIso, isFutureTimestamp, nowIso } from '../utils/dateTime';
import {
  classifyPaymentOrderIntent,
  computeDeviceConnectionStatus,
  computeSubscriptionUsage,
  generateId,
  isSubscriptionActive,
} from '../utils/formatters';
import {
  cancelTask as applyCancelTask,
  canCancelTask,
  canPauseTask,
  canRescheduleTask,
  canResumeTask,
  confirmTaskItem as applyConfirmTaskItem,
  deriveTaskStatus,
  pauseTask as applyPauseTask,
  resumeTask as applyResumeTask,
  retryAllFailedItems as applyRetryAllFailedItems,
  retryTaskItem as applyRetryTaskItem,
  validateRetryItem,
  validateUserConfirmItem,
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
import { demoMediaStorage } from './mediaStorage';

// Non-production prototype password lookup (in-memory only, never persisted to localStorage)
const DEMO_PASSWORDS: Record<string, string> = {
  'customer@demo.fbpostpro.local': 'Demo@1234',
  'expired@demo.fbpostpro.local': 'Demo@1234',
  'admin@demo.fbpostpro.local': 'Admin@1234',
};

interface PersistedEnvelope {
  schemaVersion: number;
  data: DemoDatabase;
}

export interface ReactiveStoreSnapshot {
  db: DemoDatabase;
  currentUserId: string | null;
  schemaMigrationNotice: string | null;
}

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

function isValidV3Database(candidate: unknown): candidate is DemoDatabase {
  if (!candidate || typeof candidate !== 'object') return false;
  const db = candidate as Partial<DemoDatabase>;
  if (
    !Array.isArray(db.users) ||
    !Array.isArray(db.plans) ||
    !Array.isArray(db.subscriptions) ||
    !Array.isArray(db.accounts) ||
    !Array.isArray(db.pages) ||
    !Array.isArray(db.groups) ||
    !Array.isArray(db.collections) ||
    !Array.isArray(db.collectionItems) ||
    !Array.isArray(db.posts) ||
    !Array.isArray(db.tasks) ||
    !Array.isArray(db.devices) ||
    !Array.isArray(db.orders) ||
    !Array.isArray(db.auditLogs)
  ) {
    return false;
  }

  // Validate canonical v3 field contracts on sample records
  const hasInvalidUser = db.users.some(
    (u) => !u || typeof (u as User).displayName !== 'string'
  );
  if (hasInvalidUser) return false;

  const hasInvalidPlan = db.plans.some(
    (p) =>
      !p ||
      typeof (p as Plan).monthlyPriceVnd !== 'number' ||
      typeof (p as Plan).yearlyPriceVnd !== 'number' ||
      typeof (p as Plan).maxSavedGroups !== 'number' ||
      typeof (p as Plan).maxScheduledTasks !== 'number'
  );
  if (hasInvalidPlan) return false;

  const hasInvalidSub = db.subscriptions.some(
    (s) => !s || typeof (s as Subscription).expiresAt !== 'string'
  );
  if (hasInvalidSub) return false;

  return true;
}

function ensureTenDraftSlotsPosts(posts: Post[], userId: string): Post[] {
  const ts = nowIso();
  const additions: Post[] = [];
  for (let slot = 1; slot <= 10; slot++) {
    const exists = posts.some(
      (p) => p.userId === userId && p.status === 'DRAFT' && p.slotNumber === slot
    );
    if (!exists) {
      additions.push({
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
  return additions.length > 0 ? [...posts, ...additions] : posts;
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
  private schemaMigrationNotice: string | null = null;
  private snapshot: ReactiveStoreSnapshot;
  private listeners = new Set<() => void>();
  private useStorage: boolean;
  private sessionPasswords: Record<string, string> = { ...DEMO_PASSWORDS };
  private resetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

  constructor(initialDb?: DemoDatabase, options?: { useStorage?: boolean }) {
    this.useStorage = options?.useStorage ?? !initialDb;

    if (initialDb) {
      this.db = initialDb;
    } else if (this.useStorage) {
      const { db, migrationNotice } = this.loadOrMigrateFromStorage();
      this.db = db;
      this.schemaMigrationNotice = migrationNotice;

      const savedSessionUserId = safeStorageGet(STORAGE_SESSION_KEY);
      if (savedSessionUserId && this.db.users.some((u) => u.id === savedSessionUserId)) {
        const user = this.db.users.find((u) => u.id === savedSessionUserId);
        if (user && user.status === 'ACTIVE') {
          this.currentUserId = savedSessionUserId;
        }
      }
    } else {
      this.db = createSeedDemoDatabase();
    }

    this.snapshot = {
      db: this.db,
      currentUserId: this.currentUserId,
      schemaMigrationNotice: this.schemaMigrationNotice,
    };
  }

  private loadOrMigrateFromStorage(): { db: DemoDatabase; migrationNotice: string | null } {
    const rawV3 = safeStorageGet(STORAGE_DB_KEY);
    const hasLegacyKeys = LEGACY_STORAGE_KEYS.some((key) => safeStorageGet(key) !== null);

    if (rawV3) {
      try {
        const parsed = JSON.parse(rawV3) as Partial<PersistedEnvelope>;
        if (
          parsed &&
          parsed.schemaVersion === DEMO_SCHEMA_VERSION &&
          isValidV3Database(parsed.data)
        ) {
          if (hasLegacyKeys) {
            LEGACY_STORAGE_KEYS.forEach((key) => safeStorageRemove(key));
          }
          return { db: parsed.data, migrationNotice: null };
        }
      } catch {
        // Fall through to clean reset
      }

      // Corrupt or outdated payload under current key
      LEGACY_STORAGE_KEYS.forEach((key) => safeStorageRemove(key));
      safeStorageRemove(STORAGE_SESSION_KEY);
      const fresh = createSeedDemoDatabase();
      this.writeStorageEnvelope(fresh, null);
      return {
        db: fresh,
        migrationNotice:
          'Dữ liệu DEMO cục bộ không tương thích hoặc bị hỏng đã được đặt lại sang cấu trúc chuẩn v3.',
      };
    }

    if (hasLegacyKeys) {
      LEGACY_STORAGE_KEYS.forEach((key) => safeStorageRemove(key));
      safeStorageRemove(STORAGE_SESSION_KEY);
      const fresh = createSeedDemoDatabase();
      this.writeStorageEnvelope(fresh, null);
      return {
        db: fresh,
        migrationNotice:
          'Dữ liệu DEMO từ phiên bản cũ (v1/v2) đã được tự động nâng cấp và đặt lại về dữ liệu mẫu chuẩn v3.',
      };
    }

    return { db: createSeedDemoDatabase(), migrationNotice: null };
  }

  private writeStorageEnvelope(db: DemoDatabase, sessionUserId: string | null): void {
    if (!this.useStorage) return;
    const envelope: PersistedEnvelope = {
      schemaVersion: DEMO_SCHEMA_VERSION,
      data: db,
    };
    safeStorageSet(STORAGE_DB_KEY, JSON.stringify(envelope));
    if (sessionUserId) {
      safeStorageSet(STORAGE_SESSION_KEY, sessionUserId);
    } else {
      safeStorageRemove(STORAGE_SESSION_KEY);
    }
  }

  /**
   * Structural-sharing immutable commit:
   * - Replaces `this.db` with a new top-level reference so all reactive selectors immediately update.
   * - Keeps untouched slices referentially stable (no full deep clone per mutation).
   * - Persists to localStorage and notifies subscribed React stores.
   */
  private commit(
    nextDb: DemoDatabase,
    nextUserId: string | null = this.currentUserId,
    nextNotice: string | null = this.schemaMigrationNotice
  ): void {
    this.db = nextDb;
    this.currentUserId = nextUserId;
    this.schemaMigrationNotice = nextNotice;
    this.snapshot = {
      db: this.db,
      currentUserId: this.currentUserId,
      schemaMigrationNotice: this.schemaMigrationNotice,
    };
    this.writeStorageEnvelope(this.db, this.currentUserId);
    this.listeners.forEach((listener) => listener());
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getStoreSnapshot = (): ReactiveStoreSnapshot => {
    return this.snapshot;
  };

  public getDatabaseSnapshot(): DemoDatabase {
    return this.db;
  }

  public getSchemaMigrationNotice(): string | null {
    return this.schemaMigrationNotice;
  }

  public dismissSchemaMigrationNotice(): void {
    if (!this.schemaMigrationNotice) return;
    this.commit(this.db, this.currentUserId, null);
  }

  /**
   * Verifies whether a media attachment ID is still referenced by any draft,
   * saved post, or publishing task item snapshot across the entire database.
   */
  public isMediaReferenced(mediaId: string): boolean {
    for (const post of this.db.posts) {
      if (post.media.some((m) => m.id === mediaId)) {
        return true;
      }
    }
    for (const task of this.db.tasks) {
      for (const item of task.items) {
        if (item.mediaSnapshots.some((m) => m.id === mediaId)) {
          return true;
        }
      }
    }
    return false;
  }

  private cleanupOrphanMediaIds(candidateIds: string[]): void {
    for (const mediaId of candidateIds) {
      if (!this.isMediaReferenced(mediaId)) {
        void demoMediaStorage.deleteMediaBlob(mediaId);
      }
    }
  }

  public resetDemoDatabase(): DemoDatabase {
    const freshDb = createSeedDemoDatabase();
    this.sessionPasswords = { ...DEMO_PASSWORDS };
    this.resetTokens.clear();
    if (this.useStorage) {
      safeStorageRemove(STORAGE_DB_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => safeStorageRemove(key));
    }
    void demoMediaStorage.clearAllDemoMedia();

    const nextUserId =
      this.currentUserId && freshDb.users.some((u) => u.id === this.currentUserId)
        ? this.currentUserId
        : null;

    this.commit(freshDb, nextUserId, null);
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
    const updatedUser: User = { ...user, lastLoginAt: ts, updatedAt: ts };
    const nextUsers = this.db.users.map((u) => (u.id === user.id ? updatedUser : u));
    const nextPosts = ensureTenDraftSlotsPosts(this.db.posts, user.id);

    this.commit({ ...this.db, users: nextUsers, posts: nextPosts }, user.id);
    return { ok: true, data: { user: updatedUser, isDemoSession: true } };
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
    const updatedUser: User = { ...user, lastLoginAt: ts, updatedAt: ts };
    const nextUsers = this.db.users.map((u) => (u.id === user.id ? updatedUser : u));
    const nextPosts = ensureTenDraftSlotsPosts(this.db.posts, user.id);

    this.commit({ ...this.db, users: nextUsers, posts: nextPosts }, user.id);
    return { ok: true, data: { user: updatedUser, isDemoSession: true } };
  }

  public register(req: RegisterRequest): ServiceResult<AuthSessionResponse> {
    const displayName = req.displayName.trim();
    const email = req.email.trim().toLowerCase();

    if (displayName.length < 2) {
      return { ok: false, error: 'Vui lòng nhập họ và tên hiển thị (tối thiểu 2 ký tự).' };
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
      displayName,
      avatarUrl: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerifiedAt: null,
      lastLoginAt: ts,
      createdAt: ts,
      updatedAt: ts,
    };

    this.sessionPasswords[email] = req.password;
    const nextUsers = [...this.db.users, newUser];
    const nextPosts = ensureTenDraftSlotsPosts(this.db.posts, newUser.id);

    // Grant 7-day Basic trial subscription in DEMO mode
    const basicPlan = this.db.plans.find((p) => p.code === 'BASIC') ?? this.db.plans[0];
    const nextSubscriptions = basicPlan
      ? [
          ...this.db.subscriptions,
          {
            id: generateId(),
            userId: newUser.id,
            planId: basicPlan.id,
            billingPeriod: 'MONTHLY' as const,
            status: 'ACTIVE' as const,
            startsAt: ts,
            expiresAt: addDaysIso(7),
            createdAt: ts,
            updatedAt: ts,
          },
        ]
      : this.db.subscriptions;

    this.commit(
      {
        ...this.db,
        users: nextUsers,
        posts: nextPosts,
        subscriptions: nextSubscriptions,
      },
      newUser.id
    );
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
    let nextUsers = this.db.users;
    if (user) {
      this.sessionPasswords[entry.email] = req.newPassword;
      const ts = nowIso();
      nextUsers = this.db.users.map((u) => (u.id === user.id ? { ...u, updatedAt: ts } : u));
    }
    this.resetTokens.delete(token);
    this.commit({ ...this.db, users: nextUsers });
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
    const ts = nowIso();
    const nextUsers = this.db.users.map((u) => (u.id === userId ? { ...u, updatedAt: ts } : u));
    this.commit({ ...this.db, users: nextUsers });
    return { ok: true, data: { message: 'Đã cập nhật mật khẩu trong phiên DEMO.' } };
  }

  public logout(): void {
    this.commit({ ...this.db }, null);
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
    const postsWithSlots = ensureTenDraftSlotsPosts(this.db.posts, userId);
    const existing = postsWithSlots.find(
      (p) => p.userId === userId && p.status === 'DRAFT' && p.slotNumber === slotNumber
    );
    if (!existing) return { ok: false, error: 'Không tìm thấy bài nháp.' };

    const removedMediaIds =
      patch.media !== undefined
        ? existing.media
            .filter((oldM) => !patch.media!.some((newM) => newM.id === oldM.id))
            .map((m) => m.id)
        : [];

    const updatedDraft: Post = {
      ...existing,
      content: patch.content !== undefined ? patch.content : existing.content,
      linkUrl: patch.linkUrl !== undefined ? patch.linkUrl : existing.linkUrl,
      media: patch.media !== undefined ? cloneMediaAttachments(patch.media) : existing.media,
      updatedAt: nowIso(),
    };

    const nextPosts = postsWithSlots.map((p) => (p.id === existing.id ? updatedDraft : p));
    this.commit({ ...this.db, posts: nextPosts });
    if (removedMediaIds.length > 0) {
      this.cleanupOrphanMediaIds(removedMediaIds);
    }
    return { ok: true, data: updatedDraft };
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

    this.commit({ ...this.db, posts: [savedPost, ...this.db.posts] });
    return { ok: true, data: savedPost };
  }

  public deleteSavedPost(userId: string, postId: string): ServiceResult<void> {
    const target = this.db.posts.find(
      (p) => p.id === postId && p.userId === userId && p.status === 'SAVED'
    );
    if (!target) return { ok: false, error: 'Không tìm thấy bài đã lưu.' };
    const candidateMediaIds = target.media.map((m) => m.id);
    const nextPosts = this.db.posts.filter((p) => p.id !== postId);
    this.commit({ ...this.db, posts: nextPosts });
    if (candidateMediaIds.length > 0) {
      this.cleanupOrphanMediaIds(candidateMediaIds);
    }
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
    if (plan && isSubscriptionActive(sub) && userGroups.length >= plan.maxSavedGroups) {
      return {
        ok: false,
        code: 'QUOTA_EXCEEDED',
        error: `Đã đạt hạn mức ${plan.maxSavedGroups} nhóm đã lưu của gói ${plan.name}.`,
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

    this.commit({ ...this.db, groups: [newGroup, ...this.db.groups] });
    return { ok: true, data: newGroup };
  }

  public updateGroup(
    userId: string,
    groupId: string,
    req: UpsertGroupRequest
  ): ServiceResult<FacebookGroup> {
    const existing = this.db.groups.find((g) => g.id === groupId && g.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy nhóm cần cập nhật.' };

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

    const updated: FacebookGroup = {
      ...existing,
      groupName,
      groupUrl: normalizedUrl,
      groupUid: resolvedUid,
      memberCount:
        req.memberCount !== undefined && req.memberCount !== null && req.memberCount >= 0
          ? Math.floor(req.memberCount)
          : null,
      requiresApproval: req.requiresApproval ?? null,
      notes: req.notes?.trim() || null,
      updatedAt: nowIso(),
    };

    const nextGroups = this.db.groups.map((g) => (g.id === groupId ? updated : g));
    this.commit({ ...this.db, groups: nextGroups });
    return { ok: true, data: updated };
  }

  public deleteGroup(userId: string, groupId: string): ServiceResult<void> {
    const exists = this.db.groups.some((g) => g.id === groupId && g.userId === userId);
    if (!exists) return { ok: false, error: 'Không tìm thấy nhóm để xóa.' };

    const nextGroups = this.db.groups.filter((g) => g.id !== groupId);
    const nextCollectionItems = this.db.collectionItems.filter((ci) => ci.groupId !== groupId);
    this.commit({
      ...this.db,
      groups: nextGroups,
      collectionItems: nextCollectionItems,
    });
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
    const newItems = uniqueGroupIds.map((groupId) => ({
      collectionId: col.id,
      groupId,
      createdAt: ts,
    }));

    this.commit({
      ...this.db,
      collections: [...this.db.collections, col],
      collectionItems: [...this.db.collectionItems, ...newItems],
    });
    return { ok: true, data: col };
  }

  public renameCollection(
    userId: string,
    collectionId: string,
    name: string
  ): ServiceResult<GroupCollection> {
    const existing = this.db.collections.find(
      (c) => c.id === collectionId && c.userId === userId
    );
    if (!existing) return { ok: false, error: 'Không tìm thấy bộ sưu tập.' };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Tên bộ sưu tập không được để trống.' };

    const updated: GroupCollection = { ...existing, name: trimmed, updatedAt: nowIso() };
    const nextCollections = this.db.collections.map((c) => (c.id === collectionId ? updated : c));
    this.commit({ ...this.db, collections: nextCollections });
    return { ok: true, data: updated };
  }

  public setCollectionGroups(
    userId: string,
    collectionId: string,
    groupIds: string[]
  ): ServiceResult<void> {
    const existing = this.db.collections.find(
      (c) => c.id === collectionId && c.userId === userId
    );
    if (!existing) return { ok: false, error: 'Không tìm thấy bộ sưu tập.' };

    const validUserGroupIds = new Set(
      this.db.groups.filter((g) => g.userId === userId).map((g) => g.id)
    );
    const uniqueGroupIds = Array.from(new Set(groupIds)).filter((id) =>
      validUserGroupIds.has(id)
    );

    const ts = nowIso();
    const filteredItems = this.db.collectionItems.filter(
      (ci) => ci.collectionId !== collectionId
    );
    const addedItems = uniqueGroupIds.map((groupId) => ({
      collectionId,
      groupId,
      createdAt: ts,
    }));
    const nextCollections = this.db.collections.map((c) =>
      c.id === collectionId ? { ...c, updatedAt: ts } : c
    );

    this.commit({
      ...this.db,
      collections: nextCollections,
      collectionItems: [...filteredItems, ...addedItems],
    });
    return { ok: true };
  }

  public deleteCollection(userId: string, collectionId: string): ServiceResult<void> {
    const exists = this.db.collections.some((c) => c.id === collectionId && c.userId === userId);
    if (!exists) return { ok: false, error: 'Không tìm thấy bộ sưu tập.' };

    // Deleting collection removes join rows only; groups remain intact.
    const nextCollections = this.db.collections.filter((c) => c.id !== collectionId);
    const nextCollectionItems = this.db.collectionItems.filter(
      (ci) => ci.collectionId !== collectionId
    );
    this.commit({
      ...this.db,
      collections: nextCollections,
      collectionItems: nextCollectionItems,
    });
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

    // Active subscription guard
    const sub = this.getUserSubscription(userId);
    const plan = this.getUserPlan(userId);
    if (!isSubscriptionActive(sub) || !plan) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Gói dịch vụ của bạn đã hết hạn hoặc chưa kích hoạt. Vui lòng gia hạn để tạo tác vụ.',
      };
    }

    if (req.pairs.length === 0) {
      return { ok: false, error: 'Vui lòng chọn ít nhất 1 cặp bài viết và đích đăng.' };
    }

    // Validate scheduledAt & concurrent SCHEDULED quota (maxScheduledTasks)
    // Immediate tasks do NOT consume maxScheduledTasks!
    let isScheduledFuture = false;
    if (req.scheduledAt) {
      if (!isFutureTimestamp(req.scheduledAt)) {
        return { ok: false, error: 'Thời gian lên lịch phải nằm ở tương lai.' };
      }
      isScheduledFuture = true;

      const usage = computeSubscriptionUsage({
        subscription: sub,
        plan,
        accounts: this.db.accounts.filter((a) => a.userId === userId),
        groups: this.db.groups.filter((g) => g.userId === userId),
        tasks: this.db.tasks.filter((t) => t.userId === userId),
      });

      if (usage.scheduledTasksUsed >= usage.scheduledTasksLimit) {
        return {
          ok: false,
          code: 'QUOTA_EXCEEDED',
          error: `Bạn đã đạt hạn mức ${usage.scheduledTasksLimit} tác vụ đang chờ lịch (SCHEDULED) của gói ${plan.name}. Hãy hủy bớt lịch chờ hoặc nâng cấp gói.`,
        };
      }
    }

    // Validate account for PAGE mode
    if (req.targetType === 'PAGE') {
      if (req.executionMode !== 'META_PAGE_API') {
        return {
          ok: false,
          error: 'Tác vụ đăng Fanpage phải sử dụng chế độ META_PAGE_API.',
        };
      }
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
    } else if (req.executionMode !== 'MANUAL_GROUP') {
      return {
        ok: false,
        error: 'Tác vụ đăng Nhóm Facebook phải sử dụng chế độ MANUAL_GROUP.',
      };
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
        // META_PAGE_API items start in PENDING (task derives to SCHEDULED or QUEUED awaiting Meta Graph API backend)
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
          status: 'PENDING',
          confirmationType: null,
          resultPostUrl: null,
          externalPostId: null,
          errorCode: null,
          errorMessage: null,
          attemptCount: 0,
          startedAt: null,
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

    this.commit({ ...this.db, tasks: [newTask, ...this.db.tasks] });
    return { ok: true, data: newTask };
  }

  public rescheduleTask(
    userId: string,
    req: RescheduleTaskRequest
  ): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === req.taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    if (!canRescheduleTask(task)) {
      return {
        ok: false,
        error: 'Chỉ có thể đổi lịch cho tác vụ hẹn giờ chưa bắt đầu thực hiện mục nào.',
      };
    }

    const sub = this.getUserSubscription(userId);
    const plan = this.getUserPlan(userId);
    if (!isSubscriptionActive(sub) || !plan) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Gói dịch vụ đã hết hạn. Vui lòng gia hạn để đổi lịch tác vụ.',
      };
    }

    if (!isFutureTimestamp(req.scheduledAt)) {
      return { ok: false, error: 'Thời gian lịch mới phải nằm ở tương lai.' };
    }

    // If resuming from PAUSED back to SCHEDULED, verify concurrent SCHEDULED quota
    if (task.status !== 'SCHEDULED') {
      const scheduledCount = this.db.tasks.filter(
        (t) => t.userId === userId && t.status === 'SCHEDULED'
      ).length;
      if (scheduledCount >= plan.maxScheduledTasks) {
        return {
          ok: false,
          code: 'QUOTA_EXCEEDED',
          error: `Đã đạt hạn mức ${plan.maxScheduledTasks} tác vụ đang chờ lịch (SCHEDULED) của gói ${plan.name}.`,
        };
      }
    }

    const ts = nowIso();
    const updated: PublishingTask = {
      ...task,
      scheduledAt: req.scheduledAt,
      status: 'SCHEDULED',
      updatedAt: ts,
    };
    const nextTasks = this.db.tasks.map((t) => (t.id === task.id ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  /**
   * DEMO scheduler trigger: transitions a SCHEDULED task to active when due (or simulated due in DEMO).
   * If subscription expired before execution time, marks pending items FAILED with SUBSCRIPTION_EXPIRED.
   */
  public triggerDueScheduledTaskDemo(
    userId: string,
    taskId: string
  ): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    if (task.status !== 'SCHEDULED') {
      return { ok: false, error: 'Chỉ có thể kích hoạt tác vụ đang ở trạng thái Đã lên lịch (SCHEDULED).' };
    }

    const ts = nowIso();
    const sub = this.getUserSubscription(userId);
    if (!isSubscriptionActive(sub)) {
      const failedItems: PublishingTaskItem[] = task.items.map((item) =>
        item.status === 'PENDING'
          ? {
              ...item,
              status: 'FAILED',
              errorCode: 'SUBSCRIPTION_EXPIRED',
              errorMessage: 'Gói dịch vụ đã hết hạn trước thời điểm tác vụ đến lịch chạy.',
              finishedAt: ts,
              updatedAt: ts,
            }
          : item
      );
      const failedTask: PublishingTask = {
        ...task,
        items: failedItems,
        status: deriveTaskStatus(failedItems),
        finishedAt: ts,
        updatedAt: ts,
      };
      const nextTasks = this.db.tasks.map((t) => (t.id === task.id ? failedTask : t));
      this.commit({ ...this.db, tasks: nextTasks });
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        data: failedTask,
        error: 'Gói dịch vụ đã hết hạn trước giờ chạy. Tác vụ chuyển sang Thất bại.',
      };
    }

    const nextItems: PublishingTaskItem[] = task.items.map((item) => {
      if (item.status !== 'PENDING') return item;
      if (task.executionMode === 'MANUAL_GROUP') {
        return {
          ...item,
          status: 'WAITING_CONFIRMATION',
          attemptCount: Math.max(1, item.attemptCount),
          startedAt: item.startedAt ?? ts,
          updatedAt: ts,
        };
      }
      // META_PAGE_API remains PENDING in QUEUED task awaiting backend Meta Graph API worker
      return {
        ...item,
        updatedAt: ts,
      };
    });

    const effectiveScheduledAt =
      task.scheduledAt && new Date(task.scheduledAt).getTime() <= new Date(ts).getTime()
        ? task.scheduledAt
        : ts;

    const updated: PublishingTask = {
      ...task,
      scheduledAt: effectiveScheduledAt,
      items: nextItems,
      status: deriveTaskStatus(nextItems, { isScheduledFuture: false }),
      startedAt: task.startedAt ?? ts,
      updatedAt: ts,
    };

    const nextTasks = this.db.tasks.map((t) => (t.id === task.id ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  public pauseTask(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    if (!canPauseTask(task)) {
      return { ok: false, error: 'Không thể tạm dừng tác vụ ở trạng thái hiện tại.' };
    }
    const updated = applyPauseTask(task, nowIso());
    const nextTasks = this.db.tasks.map((t) => (t.id === taskId ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  public resumeTask(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    if (!canResumeTask(task)) {
      return { ok: false, error: 'Chỉ có thể tiếp tục tác vụ đang ở trạng thái Tạm dừng.' };
    }

    const sub = this.getUserSubscription(userId);
    const plan = this.getUserPlan(userId);
    if (!isSubscriptionActive(sub) || !plan) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Gói dịch vụ đã hết hạn. Vui lòng gia hạn trước khi tiếp tục tác vụ.',
      };
    }

    const updated = applyResumeTask(task, nowIso());
    if (updated.status === 'SCHEDULED') {
      const scheduledCount = this.db.tasks.filter(
        (t) => t.userId === userId && t.status === 'SCHEDULED'
      ).length;
      if (scheduledCount >= plan.maxScheduledTasks) {
        return {
          ok: false,
          code: 'QUOTA_EXCEEDED',
          error: `Đã đạt hạn mức ${plan.maxScheduledTasks} tác vụ đang chờ lịch (SCHEDULED) của gói ${plan.name}.`,
        };
      }
    }

    const nextTasks = this.db.tasks.map((t) => (t.id === taskId ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  public cancelTask(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };
    if (!canCancelTask(task)) {
      return { ok: false, error: 'Không thể hủy tác vụ đã kết thúc hoặc đã bị hủy.' };
    }
    const updated = applyCancelTask(task, nowIso());
    const nextTasks = this.db.tasks.map((t) => (t.id === taskId ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  public confirmTaskItem(
    userId: string,
    req: ConfirmTaskItemRequest
  ): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === req.taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };

    const targetItem = task.items.find((i) => i.id === req.itemId);
    const ts = nowIso();
    const check = validateUserConfirmItem(task, targetItem, new Date(ts));
    if (!check.allowed) {
      return {
        ok: false,
        code: 'INVALID_TASK_TRANSITION',
        error: check.error ?? 'Thao tác xác nhận không hợp lệ cho trạng thái hiện tại.',
      };
    }

    const updated = applyConfirmTaskItem(
      task,
      {
        itemId: req.itemId,
        status: req.status,
        resultPostUrl: req.resultPostUrl,
        errorMessage: req.errorMessage,
        confirmationType: 'USER',
      },
      ts
    );

    const nextTasks = this.db.tasks.map((t) => (t.id === req.taskId ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  public retryTaskItem(
    userId: string,
    taskId: string,
    itemId: string
  ): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };

    const sub = this.getUserSubscription(userId);
    if (!isSubscriptionActive(sub)) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Gói dịch vụ đã hết hạn. Vui lòng gia hạn để thử lại mục thất bại.',
      };
    }

    const item = task.items.find((i) => i.id === itemId);
    const check = validateRetryItem(task, item);
    if (!check.allowed) {
      return {
        ok: false,
        code: 'INVALID_TASK_TRANSITION',
        error: check.error ?? 'Không thể thử lại mục này.',
      };
    }

    const updated = applyRetryTaskItem(task, itemId, nowIso());
    const nextTasks = this.db.tasks.map((t) => (t.id === taskId ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
    return { ok: true, data: updated };
  }

  public retryFailedItems(userId: string, taskId: string): ServiceResult<PublishingTask> {
    const task = this.db.tasks.find((t) => t.id === taskId && t.userId === userId);
    if (!task) return { ok: false, error: 'Không tìm thấy tác vụ.' };

    const sub = this.getUserSubscription(userId);
    if (!isSubscriptionActive(sub)) {
      return {
        ok: false,
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Gói dịch vụ đã hết hạn. Vui lòng gia hạn để thử lại các mục thất bại.',
      };
    }

    if (task.status === 'PAUSED' || task.status === 'CANCELLED' || task.status === 'SCHEDULED') {
      return {
        ok: false,
        code: 'INVALID_TASK_TRANSITION',
        error: 'Không thể thử lại khi tác vụ đang tạm dừng, đã hủy hoặc chưa đến lịch.',
      };
    }

    const hasFailed = task.items.some((i) => i.status === 'FAILED');
    if (!hasFailed) {
      return { ok: false, error: 'Tác vụ này không có mục thất bại nào để thử lại.' };
    }

    const updated = applyRetryAllFailedItems(task, nowIso());
    const nextTasks = this.db.tasks.map((t) => (t.id === taskId ? updated : t));
    this.commit({ ...this.db, tasks: nextTasks });
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
        code: 'QUOTA_EXCEEDED',
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

    this.commit({ ...this.db, accounts: [account, ...this.db.accounts] });
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
        code: 'QUOTA_EXCEEDED',
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

    this.commit({
      ...this.db,
      accounts: [demoAccount, ...this.db.accounts],
      pages: [demoPage, ...this.db.pages],
    });
    return { ok: true, data: { account: demoAccount, pages: [demoPage] } };
  }

  public refreshAccountStatus(
    userId: string,
    accountId: string
  ): ServiceResult<FacebookAccount> {
    const existing = this.db.accounts.find((a) => a.id === accountId && a.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy tài khoản.' };

    // Truthful refresh: never forces UNVERIFIED/DISCONNECTED/EXPIRED into CONNECTED
    const updated: FacebookAccount = { ...existing, updatedAt: nowIso() };
    const nextAccounts = this.db.accounts.map((a) => (a.id === accountId ? updated : a));
    this.commit({ ...this.db, accounts: nextAccounts });
    return { ok: true, data: updated };
  }

  public disconnectAccount(
    userId: string,
    accountId: string
  ): ServiceResult<FacebookAccount> {
    const existing = this.db.accounts.find((a) => a.id === accountId && a.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy tài khoản.' };

    const updated: FacebookAccount = {
      ...existing,
      status: 'DISCONNECTED',
      updatedAt: nowIso(),
    };
    const nextAccounts = this.db.accounts.map((a) => (a.id === accountId ? updated : a));
    this.commit({ ...this.db, accounts: nextAccounts });
    return { ok: true, data: updated };
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
    this.commit({ ...this.db, devices: [device, ...this.db.devices] });
    return { ok: true, data: device };
  }

  public checkDeviceConnection(
    userId: string,
    deviceId: string
  ): ServiceResult<ExtensionDevice> {
    const existing = this.db.devices.find((d) => d.id === deviceId && d.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy thiết bị.' };
    if (computeDeviceConnectionStatus(existing) === 'REVOKED') {
      return {
        ok: false,
        error: 'Thiết bị này đã bị thu hồi quyền truy cập và không thể kết nối lại.',
      };
    }
    const updated: ExtensionDevice = { ...existing, lastSeenAt: nowIso() };
    const nextDevices = this.db.devices.map((d) => (d.id === deviceId ? updated : d));
    this.commit({ ...this.db, devices: nextDevices });
    return { ok: true, data: updated };
  }

  public revokeDevice(userId: string, deviceId: string): ServiceResult<ExtensionDevice> {
    const existing = this.db.devices.find((d) => d.id === deviceId && d.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy thiết bị.' };
    if (existing.revokedAt) {
      return { ok: true, data: existing };
    }
    const updated: ExtensionDevice = { ...existing, revokedAt: nowIso() };
    const nextDevices = this.db.devices.map((d) => (d.id === deviceId ? updated : d));
    this.commit({ ...this.db, devices: nextDevices });
    return { ok: true, data: updated };
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
      req.billingPeriod === 'YEARLY' ? plan.yearlyPriceVnd : plan.monthlyPriceVnd;
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
    this.commit({ ...this.db, orders: [order, ...this.db.orders] });
    return { ok: true, data: order };
  }

  /**
   * Customer status check NEVER auto-marks an order as PAID.
   * Only checks expiry or returns current status.
   */
  public checkOrderStatus(userId: string, orderId: string): ServiceResult<PaymentOrder> {
    const existing = this.db.orders.find((o) => o.id === orderId && o.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

    if (existing.status === 'PENDING' && new Date(existing.expiresAt).getTime() <= Date.now()) {
      const expired: PaymentOrder = {
        ...existing,
        status: 'EXPIRED',
        updatedAt: nowIso(),
      };
      const nextOrders = this.db.orders.map((o) => (o.id === orderId ? expired : o));
      this.commit({ ...this.db, orders: nextOrders });
      return { ok: true, data: expired };
    }
    return { ok: true, data: existing };
  }

  public cancelPaymentOrder(userId: string, orderId: string): ServiceResult<PaymentOrder> {
    const existing = this.db.orders.find((o) => o.id === orderId && o.userId === userId);
    if (!existing) return { ok: false, error: 'Không tìm thấy đơn hàng.' };
    if (existing.status !== 'PENDING') {
      return { ok: false, error: 'Chỉ có thể hủy đơn hàng đang chờ thanh toán.' };
    }
    const cancelled: PaymentOrder = {
      ...existing,
      status: 'CANCELLED',
      updatedAt: nowIso(),
    };
    const nextOrders = this.db.orders.map((o) => (o.id === orderId ? cancelled : o));
    this.commit({ ...this.db, orders: nextOrders });
    return { ok: true, data: cancelled };
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

    const ts = nowIso();
    const updated: User = {
      ...target,
      displayName:
        req.displayName !== undefined && req.displayName.trim().length >= 2
          ? req.displayName.trim()
          : target.displayName,
      role: req.role ?? target.role,
      status: req.status ?? target.status,
      updatedAt: ts,
    };

    const nextUsers = this.db.users.map((u) => (u.id === target.id ? updated : u));
    const auditLog = {
      id: generateId(),
      actorUserId: adminUserId,
      action: 'ADMIN_UPDATE_USER',
      entityType: 'users',
      entityId: target.id,
      metadata: { role: updated.role, status: updated.status, displayName: updated.displayName },
      createdAt: ts,
    };

    this.commit({
      ...this.db,
      users: nextUsers,
      auditLogs: [auditLog, ...this.db.auditLogs],
    });
    return { ok: true, data: updated };
  }

  public upsertPlan(adminUserId: string, req: UpsertPlanRequest): ServiceResult<Plan> {
    const auth = this.ensureAdmin(adminUserId);
    if (!auth.ok) return { ok: false, error: auth.error };

    const code = req.code.trim().toUpperCase();
    const name = req.name.trim();
    if (!code || !name) {
      return { ok: false, error: 'Vui lòng nhập đầy đủ mã gói và tên gói.' };
    }
    if (req.monthlyPriceVnd < 0 || req.yearlyPriceVnd < 0) {
      return { ok: false, error: 'Giá gói không được âm.' };
    }
    if (
      req.maxFacebookAccounts < 1 ||
      req.maxSavedGroups < 1 ||
      req.maxScheduledTasks < 1
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

      const updated: Plan = {
        ...existing,
        code,
        name,
        monthlyPriceVnd: Math.round(req.monthlyPriceVnd),
        yearlyPriceVnd: Math.round(req.yearlyPriceVnd),
        maxFacebookAccounts: Math.floor(req.maxFacebookAccounts),
        maxSavedGroups: Math.floor(req.maxSavedGroups),
        maxScheduledTasks: Math.floor(req.maxScheduledTasks),
        isActive: req.isActive,
        updatedAt: ts,
      };
      const nextPlans = this.db.plans.map((p) => (p.id === req.id ? updated : p));
      const auditLog = {
        id: generateId(),
        actorUserId: adminUserId,
        action: 'ADMIN_UPDATE_PLAN',
        entityType: 'plans',
        entityId: updated.id,
        metadata: {
          code: updated.code,
          monthlyPriceVnd: updated.monthlyPriceVnd,
          yearlyPriceVnd: updated.yearlyPriceVnd,
          maxFacebookAccounts: updated.maxFacebookAccounts,
          maxSavedGroups: updated.maxSavedGroups,
          maxScheduledTasks: updated.maxScheduledTasks,
          isActive: updated.isActive,
        },
        createdAt: ts,
      };

      this.commit({
        ...this.db,
        plans: nextPlans,
        auditLogs: [auditLog, ...this.db.auditLogs],
      });
      return { ok: true, data: updated };
    }

    if (this.db.plans.some((p) => p.code === code)) {
      return { ok: false, error: `Mã gói "${code}" đã tồn tại.` };
    }

    const newPlan: Plan = {
      id: generateId(),
      code,
      name,
      monthlyPriceVnd: Math.round(req.monthlyPriceVnd),
      yearlyPriceVnd: Math.round(req.yearlyPriceVnd),
      maxFacebookAccounts: Math.floor(req.maxFacebookAccounts),
      maxSavedGroups: Math.floor(req.maxSavedGroups),
      maxScheduledTasks: Math.floor(req.maxScheduledTasks),
      isActive: req.isActive,
      createdAt: ts,
      updatedAt: ts,
    };

    const auditLog = {
      id: generateId(),
      actorUserId: adminUserId,
      action: 'ADMIN_CREATE_PLAN',
      entityType: 'plans',
      entityId: newPlan.id,
      metadata: {
        code: newPlan.code,
        monthlyPriceVnd: newPlan.monthlyPriceVnd,
        yearlyPriceVnd: newPlan.yearlyPriceVnd,
      },
      createdAt: ts,
    };

    this.commit({
      ...this.db,
      plans: [...this.db.plans, newPlan],
      auditLogs: [auditLog, ...this.db.auditLogs],
    });
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

    // Prevent double-confirmation
    if (order.status === 'PAID') {
      return {
        ok: false,
        code: 'ORDER_ALREADY_PAID',
        error: 'Đơn hàng này đã được xác nhận thanh toán trước đó và không thể xác nhận lại.',
      };
    }
    if (order.status !== 'PENDING') {
      return {
        ok: false,
        code: 'ORDER_NOT_PENDING',
        error: 'Chỉ có thể xác nhận đơn hàng đang ở trạng thái Chờ thanh toán (PENDING).',
      };
    }

    const now = new Date();
    const ts = now.toISOString();

    // Reject expired orders and transition them to EXPIRED
    if (new Date(order.expiresAt).getTime() <= now.getTime()) {
      const expiredOrder: PaymentOrder = {
        ...order,
        status: 'EXPIRED',
        updatedAt: ts,
      };
      const nextOrders = this.db.orders.map((o) => (o.id === order.id ? expiredOrder : o));
      this.commit({ ...this.db, orders: nextOrders });
      return {
        ok: false,
        code: 'ORDER_EXPIRED',
        error: 'Đơn hàng đã hết hạn thanh toán (expiresAt <= hiện tại) và không thể xác nhận.',
      };
    }

    const currentSub = this.getUserSubscription(order.userId);
    const intent = classifyPaymentOrderIntent(currentSub, order.planId, now);
    const durationDays = order.billingPeriod === 'YEARLY' ? 365 : 30;

    // Require explicit DEMO acknowledgement for unapproved mid-term CHANGE_PLAN policy
    if (intent === 'CHANGE_PLAN' && !req.acknowledgeUnapprovedPlanChangePolicy) {
      return {
        ok: false,
        code: 'PLAN_CHANGE_POLICY_CONFIRMATION_REQUIRED',
        error:
          'Chính sách đổi gói khi gói cũ còn hạn (bù trừ/cộng dồn) đang chờ chủ sản phẩm phê duyệt. Vui lòng đánh dấu xác nhận quy tắc tạm thời DEMO trước khi tiếp tục.',
      };
    }

    const paidOrder: PaymentOrder = {
      ...order,
      status: 'PAID',
      paidAt: ts,
      providerReference: req.providerReference?.trim() || `ADMIN-DEMO-${Date.now()}`,
      updatedAt: ts,
    };
    const nextOrders = this.db.orders.map((o) => (o.id === order.id ? paidOrder : o));

    let resultingSub: Subscription;
    let nextSubscriptions: Subscription[];
    const previousExpiresAt = currentSub?.expiresAt ?? null;

    if (intent === 'RENEWAL' && currentSub && isSubscriptionActive(currentSub, now)) {
      // Preserve remaining active time on renewal of the same plan
      const extendedExpiresAt = addDaysIso(durationDays, new Date(currentSub.expiresAt));
      resultingSub = {
        ...currentSub,
        billingPeriod: order.billingPeriod,
        expiresAt: extendedExpiresAt,
        status: 'ACTIVE',
        updatedAt: ts,
      };
      nextSubscriptions = this.db.subscriptions.map((s) =>
        s.id === currentSub.id ? resultingSub : s
      );
    } else {
      // PURCHASE or CHANGE_PLAN (or renewing an already-expired subscription)
      const deactivated = this.db.subscriptions.map((s) =>
        s.userId === order.userId && s.status === 'ACTIVE'
          ? { ...s, status: 'CANCELLED' as const, updatedAt: ts }
          : s
      );
      resultingSub = {
        id: generateId(),
        userId: order.userId,
        planId: order.planId,
        billingPeriod: order.billingPeriod,
        status: 'ACTIVE',
        startsAt: ts,
        expiresAt: addDaysIso(durationDays, now),
        createdAt: ts,
        updatedAt: ts,
      };
      nextSubscriptions = [resultingSub, ...deactivated];
    }

    const auditLog = {
      id: generateId(),
      actorUserId: adminUserId,
      action: 'ADMIN_CONFIRM_PAYMENT_DEMO',
      entityType: 'payment_orders',
      entityId: paidOrder.id,
      metadata: {
        intent,
        orderCode: paidOrder.orderCode,
        amountVnd: paidOrder.amountVnd,
        providerReference: paidOrder.providerReference,
        previousExpiresAt,
        newExpiresAt: resultingSub.expiresAt,
        ...(intent === 'CHANGE_PLAN'
          ? { planChangePolicyApplied: 'DEMO_IMMEDIATE_REPLACE_PENDING_OWNER_APPROVAL' }
          : {}),
      },
      createdAt: ts,
    };

    this.commit({
      ...this.db,
      orders: nextOrders,
      subscriptions: nextSubscriptions,
      auditLogs: [auditLog, ...this.db.auditLogs],
    });

    return { ok: true, data: { order: paidOrder, subscription: resultingSub } };
  }
}

export const mockAppService = new MockAppService();
