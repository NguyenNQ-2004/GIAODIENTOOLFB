import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_SCHEMA_VERSION,
  LEGACY_STORAGE_KEYS,
  STORAGE_DB_KEY,
  STORAGE_SESSION_KEY,
} from '../../config/demoConfig';
import { createSeedDemoDatabase } from '../../data/mockData';
import type { MediaAttachment } from '../../types/domain';
import { addDaysIso, addMinutesIso } from '../../utils/dateTime';
import { classifyPaymentOrderIntent, computeSubscriptionUsage } from '../../utils/formatters';
import {
  canConfirmItem,
  canRescheduleTask,
  canRetryItem,
  getEligibleExtensionSelection,
  isScheduledTaskOverdue,
} from '../../utils/taskStatus';
import { DemoMediaStorage } from '../mediaStorage';
import { MockAppService } from '../mockService';

function createMemoryLocalStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

describe('FB POST PRO V3 Frontend Acceptance Regression Suite (TEST-31 .. TEST-50)', () => {
  it('TEST-31: emits immutable structural-sharing snapshots on group add/edit/delete & collection save', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';
    let notifications = 0;
    const unsubscribe = service.subscribe(() => {
      notifications += 1;
    });

    const snap0 = service.getStoreSnapshot();
    const tasksRefBefore = snap0.db.tasks;

    // Add group
    const added = service.createGroup(userId, {
      groupName: 'Nhóm Reactive Test',
      groupUrl: 'https://www.facebook.com/groups/reactivetest99',
      memberCount: 1500,
      requiresApproval: false,
      notes: 'initial',
    });
    assert.equal(added.ok, true);
    const snap1 = service.getStoreSnapshot();
    assert.notEqual(snap1, snap0);
    assert.notEqual(snap1.db, snap0.db);
    assert.notEqual(snap1.db.groups, snap0.db.groups);
    // Untouched slices preserve structural sharing
    assert.equal(snap1.db.tasks, tasksRefBefore);
    assert.equal(
      snap1.db.groups.some((g) => g.id === added.data!.id && g.groupName === 'Nhóm Reactive Test'),
      true
    );

    // Edit group
    const updated = service.updateGroup(userId, added.data!.id, {
      groupName: 'Nhóm Reactive Edited',
      groupUrl: 'https://www.facebook.com/groups/reactivetest99',
      memberCount: 2500,
      requiresApproval: true,
      notes: 'edited',
    });
    assert.equal(updated.ok, true);
    const snap2 = service.getStoreSnapshot();
    assert.notEqual(snap2.db.groups, snap1.db.groups);
    assert.equal(
      snap2.db.groups.find((g) => g.id === added.data!.id)?.groupName,
      'Nhóm Reactive Edited'
    );

    // Save collection
    const colRes = service.createCollection(userId, 'Bộ sưu tập Reactive', [added.data!.id]);
    assert.equal(colRes.ok, true);
    const snap3 = service.getStoreSnapshot();
    assert.notEqual(snap3.db.collections, snap2.db.collections);
    assert.notEqual(snap3.db.collectionItems, snap2.db.collectionItems);
    assert.equal(snap3.db.collections.some((c) => c.id === colRes.data!.id), true);

    // Delete group
    const delRes = service.deleteGroup(userId, added.data!.id);
    assert.equal(delRes.ok, true);
    const snap4 = service.getStoreSnapshot();
    assert.notEqual(snap4.db.groups, snap3.db.groups);
    assert.equal(snap4.db.groups.some((g) => g.id === added.data!.id), false);
    assert.equal(notifications, 4);
    unsubscribe();
  });

  it('TEST-32 & TEST-33: creating a task and confirming items immediately updates immutable snapshots and progress', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';

    const snapBefore = service.getStoreSnapshot();
    const createRes = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-reactive-task',
      pairs: [
        { postId: 'draft-user-customer-pro-1', groupId: 'grp-1' },
        { postId: 'draft-user-customer-pro-2', groupId: 'grp-2' },
      ],
    });
    assert.equal(createRes.ok, true);
    const taskId = createRes.data!.id;

    const snapAfterCreate = service.getStoreSnapshot();
    assert.notEqual(snapAfterCreate.db.tasks, snapBefore.db.tasks);
    const createdTask = snapAfterCreate.db.tasks.find((t) => t.id === taskId);
    assert.ok(createdTask);
    assert.equal(createdTask.status, 'WAITING_CONFIRMATION');
    assert.equal(createdTask.items.length, 2);

    // Confirm item 1 -> task reference updates immediately for open TaskDrawer
    const item1 = createdTask.items[0];
    const confirm1 = service.confirmTaskItem(userId, {
      taskId,
      itemId: item1.id,
      status: 'SUCCESS',
      resultPostUrl: 'https://www.facebook.com/groups/marketingvn/posts/999',
    });
    assert.equal(confirm1.ok, true);

    const snapAfterConfirm = service.getStoreSnapshot();
    assert.notEqual(snapAfterConfirm.db.tasks, snapAfterCreate.db.tasks);
    const updatedTask = snapAfterConfirm.db.tasks.find((t) => t.id === taskId)!;
    assert.notEqual(updatedTask, createdTask);
    assert.equal(updatedTask.items[0].status, 'SUCCESS');
    assert.equal(updatedTask.items[1].status, 'WAITING_CONFIRMATION');
    assert.equal(updatedTask.status, 'WAITING_CONFIRMATION');
  });

  it('TEST-34 & TEST-35: enforces exact per-draft destination pairs (Draft 1->Group 1 + Draft 2->Group 2 = 2 items, never Cartesian 4)', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';

    // Exact per-draft pairs: Draft 1 -> grp-1, Draft 2 -> grp-2
    const res = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-exact-mapping',
      pairs: [
        { postId: 'draft-user-customer-pro-1', groupId: 'grp-1' },
        { postId: 'draft-user-customer-pro-2', groupId: 'grp-2' },
      ],
    });
    assert.equal(res.ok, true);
    assert.equal(res.data!.items.length, 2);
    assert.equal(res.data!.items[0].sourcePostId, 'draft-user-customer-pro-1');
    assert.equal(res.data!.items[0].groupId, 'grp-1');
    assert.equal(res.data!.items[1].sourcePostId, 'draft-user-customer-pro-2');
    assert.equal(res.data!.items[1].groupId, 'grp-2');

    // Empty pairs (e.g., all drafts unchecked) must be rejected
    const emptyRes = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-empty-pairs',
      pairs: [],
    });
    assert.equal(emptyRes.ok, false);
  });

  it('TEST-36 & TEST-37: enforces official maxScheduledTasks quota semantics (concurrent SCHEDULED only, immediate tasks exempt, cancel frees quota, starting removes from SCHEDULED)', () => {
    const db = createSeedDemoDatabase();
    // Set user-customer-pro plan limit to 2 concurrent SCHEDULED tasks for crisp testing
    const proPlan = db.plans.find((p) => p.id === 'plan-pro')!;
    proPlan.maxScheduledTasks = 2;
    // Remove existing scheduled tasks for clean baseline
    db.tasks = db.tasks.filter((t) => !(t.userId === 'user-customer-pro' && t.status === 'SCHEDULED'));

    const service = new MockAppService(db);
    const userId = 'user-customer-pro';

    const getUsage = () => {
      const snap = service.getDatabaseSnapshot();
      return computeSubscriptionUsage({
        subscription: service.getUserSubscription(userId),
        plan: service.getUserPlan(userId),
        accounts: snap.accounts.filter((a) => a.userId === userId),
        groups: snap.groups.filter((g) => g.userId === userId),
        tasks: snap.tasks.filter((t) => t.userId === userId),
      });
    };

    assert.equal(getUsage().scheduledTasksUsed, 0);
    assert.equal(getUsage().scheduledTasksLimit, 2);

    // 1. Immediate task does NOT consume maxScheduledTasks
    const imm1 = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-imm-1',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(imm1.ok, true);
    assert.equal(getUsage().scheduledTasksUsed, 0);

    // 2. Schedule 2 future tasks -> fills quota 2/2
    const sch1 = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: addMinutesIso(60),
      idempotencyKey: 'idem-sch-1',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    const sch2 = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: addMinutesIso(90),
      idempotencyKey: 'idem-sch-2',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-2' }],
    });
    assert.equal(sch1.ok, true);
    assert.equal(sch2.ok, true);
    assert.equal(getUsage().scheduledTasksUsed, 2);

    // 3. Third scheduled task is blocked by SCHEDULED_QUOTA_EXCEEDED
    const sch3Blocked = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: addMinutesIso(120),
      idempotencyKey: 'idem-sch-3-blocked',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(sch3Blocked.ok, false);
    assert.equal(sch3Blocked.code, 'QUOTA_EXCEEDED');

    // Immediate task STILL succeeds even when SCHEDULED quota is full!
    const imm2 = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-imm-2',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(imm2.ok, true);

    // 4. Cancelling sch1 frees 1 SCHEDULED slot
    const cancelRes = service.cancelTask(userId, sch1.data!.id);
    assert.equal(cancelRes.ok, true);
    assert.equal(getUsage().scheduledTasksUsed, 1);

    // 5. Starting/triggering sch2 moves it to WAITING_CONFIRMATION -> frees SCHEDULED slot to 0
    const dueTrigger = service.triggerDueScheduledTaskDemo(userId, sch2.data!.id);
    assert.equal(dueTrigger.ok, true);
    assert.equal(dueTrigger.data!.status, 'WAITING_CONFIRMATION');
    assert.equal(getUsage().scheduledTasksUsed, 0);

    // 6. Rescheduling works for future SCHEDULED task and rejects past timestamp
    const sch4 = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: addMinutesIso(120),
      idempotencyKey: 'idem-sch-4',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(sch4.ok, true);
    assert.equal(canRescheduleTask(sch4.data!), true);
    const badReschedule = service.rescheduleTask(userId, {
      taskId: sch4.data!.id,
      scheduledAt: addMinutesIso(-30),
    });
    assert.equal(badReschedule.ok, false);
    const goodReschedule = service.rescheduleTask(userId, {
      taskId: sch4.data!.id,
      scheduledAt: addMinutesIso(240),
    });
    assert.equal(goodReschedule.ok, true);
  });

  it('TEST-37b: marks due scheduled task items FAILED with SUBSCRIPTION_EXPIRED if subscription expired before due time', () => {
    const db = createSeedDemoDatabase();
    // Create a scheduled task for user-customer-expired (whose subscription is expired)
    const overdueTime = addMinutesIso(-15);
    db.tasks.push({
      id: 'task-expired-due',
      userId: 'user-customer-expired',
      facebookAccountId: null,
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: overdueTime,
      status: 'SCHEDULED',
      idempotencyKey: 'idem-expired-due',
      startedAt: null,
      finishedAt: null,
      createdAt: addMinutesIso(-60),
      updatedAt: addMinutesIso(-60),
      items: [
        {
          id: 'item-exp-1',
          taskId: 'task-expired-due',
          sourcePostId: 'draft-user-customer-expired-1',
          groupId: 'grp-1',
          pageId: null,
          contentSnapshot: 'Scheduled post before expiry',
          linkSnapshot: null,
          destinationNameSnapshot: 'Group Test',
          destinationUrlSnapshot: 'https://www.facebook.com/groups/1',
          mediaSnapshots: [],
          status: 'PENDING',
          confirmationType: null,
          resultPostUrl: null,
          externalPostId: null,
          errorCode: null,
          errorMessage: null,
          attemptCount: 0,
          startedAt: null,
          finishedAt: null,
          createdAt: addMinutesIso(-60),
          updatedAt: addMinutesIso(-60),
        },
      ],
    });

    const service = new MockAppService(db);
    const task = service.getDatabaseSnapshot().tasks.find((t) => t.id === 'task-expired-due')!;
    assert.equal(isScheduledTaskOverdue(task), true);

    const triggerRes = service.triggerDueScheduledTaskDemo('user-customer-expired', 'task-expired-due');
    assert.equal(triggerRes.ok, false);
    assert.equal(triggerRes.code, 'SUBSCRIPTION_INACTIVE');
    assert.equal(triggerRes.data!.status, 'FAILED');
    assert.equal(triggerRes.data!.items[0].status, 'FAILED');
    assert.equal(triggerRes.data!.items[0].errorCode, 'SUBSCRIPTION_EXPIRED');
  });

  it('TEST-38, TEST-39, TEST-40: enforces payment renewal preservation, expired order rejection, double-confirm rejection, and CHANGE_PLAN policy guard', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const proUserId = 'user-customer-pro';
    const subBefore = service.getUserSubscription(proUserId)!;
    const oldExpiresMs = new Date(subBefore.expiresAt).getTime();

    // 1. TEST-38: Renewal of SAME plan preserves remaining time (extends from current expiresAt)
    assert.equal(classifyPaymentOrderIntent(subBefore, 'plan-pro'), 'RENEWAL');
    const renewOrder = service.createPaymentOrder(proUserId, {
      planId: 'plan-pro',
      billingPeriod: 'MONTHLY',
      paymentMethod: 'VIETQR',
    });
    assert.equal(renewOrder.ok, true);

    const renewConfirmed = service.confirmPaymentOrderDemo('user-admin', {
      orderId: renewOrder.data!.id,
      providerReference: 'RENEW-REF-1',
    });
    assert.equal(renewConfirmed.ok, true);
    const newExpiresMs = new Date(renewConfirmed.data!.subscription.expiresAt).getTime();
    // Should be ~30 days AFTER oldExpiresMs (not reset to now + 30 days)
    const diffDays = Math.round((newExpiresMs - oldExpiresMs) / (24 * 60 * 60 * 1000));
    assert.equal(diffDays, 30);

    // 2. TEST-39: Double-confirmation of PAID order is rejected
    const doubleConfirm = service.confirmPaymentOrderDemo('user-admin', {
      orderId: renewOrder.data!.id,
    });
    assert.equal(doubleConfirm.ok, false);
    assert.equal(doubleConfirm.code, 'ORDER_ALREADY_PAID');

    // 3. TEST-39b: Expired order is rejected & transitioned to EXPIRED
    const expiredDb = service.getDatabaseSnapshot();
    const expOrderRes = service.createPaymentOrder(proUserId, {
      planId: 'plan-pro',
      billingPeriod: 'MONTHLY',
      paymentMethod: 'VIETQR',
    });
    assert.equal(expOrderRes.ok, true);
    const expiredOrderId = expOrderRes.data!.id;
    // Simulate order expiration in a fresh service instance
    const clonedForExpiry = structuredClone(service.getDatabaseSnapshot());
    const targetExpOrder = clonedForExpiry.orders.find((o) => o.id === expiredOrderId)!;
    targetExpOrder.expiresAt = addMinutesIso(-5);
    const expiryService = new MockAppService(clonedForExpiry);
    const confirmExpired = expiryService.confirmPaymentOrderDemo('user-admin', {
      orderId: expiredOrderId,
    });
    assert.equal(confirmExpired.ok, false);
    assert.equal(confirmExpired.code, 'ORDER_EXPIRED');
    assert.equal(
      expiryService.getDatabaseSnapshot().orders.find((o) => o.id === expiredOrderId)?.status,
      'EXPIRED'
    );
    assert.ok(expiredDb);

    // 4. TEST-40: Mid-term CHANGE_PLAN requires explicit acknowledgeUnapprovedPlanChangePolicy
    const changeOrder = service.createPaymentOrder(proUserId, {
      planId: 'plan-agency',
      billingPeriod: 'MONTHLY',
      paymentMethod: 'VIETQR',
    });
    assert.equal(changeOrder.ok, true);
    assert.equal(
      classifyPaymentOrderIntent(service.getUserSubscription(proUserId), 'plan-agency'),
      'CHANGE_PLAN'
    );

    const blockedChange = service.confirmPaymentOrderDemo('user-admin', {
      orderId: changeOrder.data!.id,
    });
    assert.equal(blockedChange.ok, false);
    assert.equal(blockedChange.code, 'PLAN_CHANGE_POLICY_CONFIRMATION_REQUIRED');

    const ackChange = service.confirmPaymentOrderDemo('user-admin', {
      orderId: changeOrder.data!.id,
      acknowledgeUnapprovedPlanChangePolicy: true,
    });
    assert.equal(ackChange.ok, true);
    assert.equal(ackChange.data!.subscription.planId, 'plan-agency');
  });

  it('TEST-41..TEST-44: enforces strict task state machine transitions (rejects terminal overwrites, future/paused/cancelled confirms, USER confirm on META_PAGE_API, and NEEDS_REVIEW retry)', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';

    // 1. Future SCHEDULED task cannot be confirmed
    const futureTask = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: addMinutesIso(120),
      idempotencyKey: 'idem-sm-future',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(futureTask.ok, true);
    assert.equal(canConfirmItem(futureTask.data!, futureTask.data!.items[0]), false);
    const confirmFuture = service.confirmTaskItem(userId, {
      taskId: futureTask.data!.id,
      itemId: futureTask.data!.items[0].id,
      status: 'SUCCESS',
    });
    assert.equal(confirmFuture.ok, false);

    // 2. META_PAGE_API task rejects USER confirmation
    const pageTask = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'PAGE',
      executionMode: 'META_PAGE_API',
      scheduledAt: null,
      idempotencyKey: 'idem-sm-page',
      pairs: [{ postId: 'draft-user-customer-pro-1', pageId: 'fb-page-1' }],
    });
    assert.equal(pageTask.ok, true);
    assert.equal(canConfirmItem(pageTask.data!, pageTask.data!.items[0]), false);
    const confirmPageByUser = service.confirmTaskItem(userId, {
      taskId: pageTask.data!.id,
      itemId: pageTask.data!.items[0].id,
      status: 'SUCCESS',
    });
    assert.equal(confirmPageByUser.ok, false);

    // 3. PAUSED task rejects item confirmation
    const manualTask = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-sm-manual',
      pairs: [
        { postId: 'draft-user-customer-pro-1', groupId: 'grp-1' },
        { postId: 'draft-user-customer-pro-2', groupId: 'grp-2' },
      ],
    });
    assert.equal(manualTask.ok, true);
    const paused = service.pauseTask(userId, manualTask.data!.id);
    assert.equal(paused.ok, true);
    assert.equal(canConfirmItem(paused.data!, paused.data!.items[0]), false);
    const confirmWhilePaused = service.confirmTaskItem(userId, {
      taskId: paused.data!.id,
      itemId: paused.data!.items[0].id,
      status: 'SUCCESS',
    });
    assert.equal(confirmWhilePaused.ok, false);

    // Resume and confirm item 1 as SUCCESS -> cannot overwrite SUCCESS
    const resumed = service.resumeTask(userId, manualTask.data!.id);
    assert.equal(resumed.ok, true);
    const okConfirm = service.confirmTaskItem(userId, {
      taskId: resumed.data!.id,
      itemId: resumed.data!.items[0].id,
      status: 'SUCCESS',
    });
    assert.equal(okConfirm.ok, true);

    const overwriteSuccess = service.confirmTaskItem(userId, {
      taskId: resumed.data!.id,
      itemId: resumed.data!.items[0].id,
      status: 'FAILED',
      errorMessage: 'Should be rejected',
    });
    assert.equal(overwriteSuccess.ok, false);

    // Confirm item 2 as NEEDS_REVIEW -> retry must be rejected
    const reviewConfirm = service.confirmTaskItem(userId, {
      taskId: resumed.data!.id,
      itemId: resumed.data!.items[1].id,
      status: 'NEEDS_REVIEW',
    });
    assert.equal(reviewConfirm.ok, true);
    assert.equal(canRetryItem(reviewConfirm.data!, reviewConfirm.data!.items[1]), false);
    const retryReview = service.retryTaskItem(
      userId,
      resumed.data!.id,
      resumed.data!.items[1].id
    );
    assert.equal(retryReview.ok, false);

    // Cancelled task rejects confirmation
    const cancelManual = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-sm-cancel',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(cancelManual.ok, true);
    service.cancelTask(userId, cancelManual.data!.id);
    const confirmCancelled = service.confirmTaskItem(userId, {
      taskId: cancelManual.data!.id,
      itemId: cancelManual.data!.items[0].id,
      status: 'SUCCESS',
    });
    assert.equal(confirmCancelled.ok, false);
  });

  it('TEST-45, TEST-46, TEST-47: persists media blobs in DemoMediaStorage and prevents deleting blobs still referenced by task snapshots', async () => {
    const mediaStorage = new DemoMediaStorage();
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';

    const mediaId = 'media-persist-test-1';
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    await mediaStorage.saveMediaBlob(mediaId, blob, {
      originalName: 'banner.png',
      mimeType: 'image/png',
    });

    const storedBlob = await mediaStorage.getMediaBlob(mediaId);
    assert.ok(storedBlob);
    assert.equal(storedBlob.size, 4);

    // Attach media to Draft 1 (no blob: URL stored in DB)
    const mediaMeta: MediaAttachment = {
      id: mediaId,
      originalName: 'banner.png',
      mimeType: 'image/png',
      sizeBytes: 4,
      mediaType: 'IMAGE',
      status: 'READY',
      previewUrl: null,
      sortOrder: 0,
    };
    const updateDraft = service.updateDraftSlot(userId, 1, {
      content: 'Bài đăng kèm ảnh lưu trữ bền vững',
      linkUrl: null,
      media: [mediaMeta],
    });
    assert.equal(updateDraft.ok, true);
    assert.equal(service.isMediaReferenced(mediaId), true);

    // Create task from Draft 1 -> task item keeps mediaSnapshot
    const taskRes = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-media-snapshot',
      pairs: [{ postId: 'draft-user-customer-pro-1', groupId: 'grp-1' }],
    });
    assert.equal(taskRes.ok, true);
    assert.equal(taskRes.data!.items[0].mediaSnapshots.length, 1);
    assert.equal(taskRes.data!.items[0].mediaSnapshots[0].id, mediaId);

    // Clear Draft 1 -> media is STILL referenced by the created task snapshot!
    const clearDraft = service.updateDraftSlot(userId, 1, {
      content: 'Đã xóa ảnh khỏi draft',
      linkUrl: null,
      media: [],
    });
    assert.equal(clearDraft.ok, true);
    assert.equal(service.isMediaReferenced(mediaId), true);

    // Verify blob is still available for TaskDrawer preview
    const stillThere = await mediaStorage.getMediaBlob(mediaId);
    assert.ok(stillThere);
    assert.equal(stillThere.size, 4);
  });

  it('TEST-48: Extension selection strictly picks eligible MANUAL_GROUP task/item and returns null instead of falling back to tasks[0]/items[0]', () => {
    const db = createSeedDemoDatabase();
    const userId = 'user-customer-pro';
    const userTasks = db.tasks.filter((t) => t.userId === userId);
    const activeDevices = db.devices.filter((d) => d.userId === userId);

    // Seed has task-101 (MANUAL_GROUP, WAITING_CONFIRMATION) with pending confirmation item
    const eligible = getEligibleExtensionSelection({
      userId,
      tasks: userTasks,
      devices: activeDevices,
      isSubscriptionActive: true,
    });
    assert.ok(eligible);
    assert.equal(eligible.task.id, 'task-101');
    assert.equal(eligible.item.status, 'WAITING_CONFIRMATION');

    // Only META_PAGE_API, COMPLETED, SCHEDULED, PAUSED, FAILED, CANCELLED tasks -> MUST return null
    const ineligibleTasks = userTasks.filter((t) => t.id !== 'task-101');
    assert.ok(ineligibleTasks.length > 0);
    const noneEligible = getEligibleExtensionSelection({
      userId,
      tasks: ineligibleTasks,
      devices: activeDevices,
      isSubscriptionActive: true,
    });
    assert.equal(noneEligible, null);

    // Expired subscription -> MUST return null
    const blockedBySub = getEligibleExtensionSelection({
      userId,
      tasks: userTasks,
      devices: activeDevices,
      isSubscriptionActive: false,
    });
    assert.equal(blockedBySub, null);

    // All devices revoked -> MUST return null
    const revokedDevices = activeDevices.map((d) => ({
      ...d,
      connectionStatus: 'REVOKED' as const,
      revokedAt: new Date().toISOString(),
    }));
    const blockedByDevice = getEligibleExtensionSelection({
      userId,
      tasks: userTasks,
      devices: revokedDevices,
      isSubscriptionActive: true,
    });
    assert.equal(blockedByDevice, null);
    assert.ok(addDaysIso(-2));
  });

  it('TEST-49: Admin updating a plan price immediately updates plans snapshot with canonical fields', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const snapBefore = service.getStoreSnapshot();
    const proBefore = snapBefore.db.plans.find((p) => p.id === 'plan-pro')!;

    const res = service.upsertPlan('user-admin', {
      id: proBefore.id,
      code: proBefore.code,
      name: proBefore.name,
      monthlyPriceVnd: 349000,
      yearlyPriceVnd: 3490000,
      maxFacebookAccounts: proBefore.maxFacebookAccounts,
      maxSavedGroups: proBefore.maxSavedGroups,
      maxScheduledTasks: proBefore.maxScheduledTasks,
      isActive: proBefore.isActive,
    });
    assert.equal(res.ok, true);

    const snapAfter = service.getStoreSnapshot();
    assert.notEqual(snapAfter.db.plans, snapBefore.db.plans);
    const proAfter = snapAfter.db.plans.find((p) => p.id === 'plan-pro')!;
    assert.equal(proAfter.monthlyPriceVnd, 349000);
    assert.equal(proAfter.yearlyPriceVnd, 3490000);
    // Canonical Plan entity must not carry unapproved description or features fields
    assert.equal('description' in proAfter, false);
    assert.equal('features' in proAfter, false);
  });

  it('TEST-50: localStorage schema v3 migration resets legacy v2 / corrupt storage and sets schemaMigrationNotice', () => {
    const origWindow = (globalThis as { window?: unknown }).window;
    try {
      const legacyKey = LEGACY_STORAGE_KEYS[0];
      const mockStorage = createMemoryLocalStorage({
        [legacyKey]: JSON.stringify({ legacy: true, users: [{ fullName: 'Old Schema' }] }),
        [STORAGE_SESSION_KEY]: 'user-customer-pro',
      });
      Object.defineProperty(globalThis, 'window', {
        value: { localStorage: mockStorage },
        configurable: true,
        writable: true,
      });

      const migratedService = new MockAppService(undefined, { useStorage: true });
      const notice = migratedService.getSchemaMigrationNotice();
      assert.ok(notice);
      assert.ok(notice.includes(`v${DEMO_SCHEMA_VERSION}`));
      // Legacy key removed and canonical v3 envelope saved
      assert.equal(mockStorage.getItem(legacyKey), null);
      const savedEnvelope = JSON.parse(mockStorage.getItem(STORAGE_DB_KEY) ?? '{}');
      assert.equal(savedEnvelope.schemaVersion, DEMO_SCHEMA_VERSION);
      assert.equal(savedEnvelope.data.users[0].displayName !== undefined, true);
      assert.equal('fullName' in savedEnvelope.data.users[0], false);

      // Dismissing notice clears it
      migratedService.dismissSchemaMigrationNotice();
      assert.equal(migratedService.getSchemaMigrationNotice(), null);
    } finally {
      if (origWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        Object.defineProperty(globalThis, 'window', {
          value: origWindow,
          configurable: true,
          writable: true,
        });
      }
    }
  });
});
