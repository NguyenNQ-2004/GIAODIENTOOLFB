import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSeedDemoDatabase } from '../../data/mockData';
import { addMinutesIso } from '../../utils/dateTime';
import { computeSubscriptionUsage } from '../../utils/formatters';
import { MockAppService } from '../mockService';

describe('MockAppService business flow integrity', () => {
  it('enforces user isolation on logout and login switch (TEST-30)', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const loginPro = service.loginAsDemoUser('user-customer-pro');
    assert.equal(loginPro.ok, true);
    assert.equal(service.getCurrentUser()?.id, 'user-customer-pro');

    service.logout();
    assert.equal(service.getCurrentUser(), null);

    const loginExpired = service.loginAsDemoUser('user-customer-expired');
    assert.equal(loginExpired.ok, true);
    const db = service.getDatabaseSnapshot();
    const expiredGroups = db.groups.filter((g) => g.userId === 'user-customer-expired');
    assert.equal(expiredGroups.length, 0);
  });

  it('blocks task creation when subscription is expired and reports exact zero usage', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-expired';
    const db = service.getDatabaseSnapshot();
    const usage = computeSubscriptionUsage({
      subscription: service.getUserSubscription(userId),
      plan: service.getUserPlan(userId),
      accounts: db.accounts.filter((a) => a.userId === userId),
      groups: db.groups.filter((g) => g.userId === userId),
      tasks: db.tasks.filter((t) => t.userId === userId),
    });
    assert.equal(usage.isActive, false);
    assert.equal(usage.accountsUsed, 0);
    assert.equal(usage.groupsUsed, 0);
    assert.equal(usage.scheduledTodayUsed, 0);

    const taskRes = service.createTask(userId, {
      facebookAccountId: null,
      targetType: 'GROUP',
      executionMode: 'MANUAL_GROUP',
      scheduledAt: null,
      idempotencyKey: 'idem-expired',
      pairs: [{ postId: `draft-${userId}-1`, groupId: 'grp-1' }],
    });
    assert.equal(taskRes.ok, false);
    assert.equal(taskRes.code, 'SUBSCRIPTION_INACTIVE');
  });

  it('deduplicates task creation by idempotencyKey and enforces Fanpage canPublish=true', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';

    // Reject canPublish = false page (fb-page-2)
    const blockedPageRes = service.createTask(userId, {
      facebookAccountId: 'fb-acc-1',
      targetType: 'PAGE',
      executionMode: 'META_PAGE_API',
      scheduledAt: addMinutesIso(60),
      idempotencyKey: 'idem-bad-page',
      pairs: [{ postId: 'draft-user-customer-pro-1', pageId: 'fb-page-2' }],
    });
    assert.equal(blockedPageRes.ok, false);

    // Valid task + duplicate submit returns identical task id
    const req = {
      facebookAccountId: 'fb-acc-1',
      targetType: 'GROUP' as const,
      executionMode: 'MANUAL_GROUP' as const,
      scheduledAt: null,
      idempotencyKey: 'idem-unique-1',
      pairs: [
        { postId: 'draft-user-customer-pro-1', groupId: 'grp-1' },
        { postId: 'draft-user-customer-pro-2', groupId: 'grp-2' },
      ],
    };
    const first = service.createTask(userId, req);
    const second = service.createTask(userId, req);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(first.data?.id, second.data?.id);
    assert.equal(first.data?.items.length, 2);
  });

  it('preserves groups when deleting a collection and supports many-to-many collections', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const userId = 'user-customer-pro';
    const beforeGroupsCount = service
      .getDatabaseSnapshot()
      .groups.filter((g) => g.userId === userId).length;

    const createColRes = service.createCollection(userId, 'New Col', ['grp-1', 'grp-2']);
    assert.equal(createColRes.ok, true);
    const delRes = service.deleteCollection(userId, createColRes.data!.id);
    assert.equal(delRes.ok, true);

    const afterGroupsCount = service
      .getDatabaseSnapshot()
      .groups.filter((g) => g.userId === userId).length;
    assert.equal(afterGroupsCount, beforeGroupsCount);
  });

  it('never auto-marks payment PAID from customer check; only Admin DEMO confirmation marks PAID', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const orderRes = service.createPaymentOrder('user-customer-expired', {
      planId: 'plan-pro',
      billingPeriod: 'MONTHLY',
      paymentMethod: 'VIETQR',
    });
    assert.equal(orderRes.ok, true);
    const orderId = orderRes.data!.id;

    // Customer checks status -> remains PENDING
    const checked = service.checkOrderStatus('user-customer-expired', orderId);
    assert.equal(checked.ok, true);
    assert.equal(checked.data?.status, 'PENDING');

    // Non-admin cannot confirm
    const nonAdminConfirm = service.confirmPaymentOrderDemo('user-customer-pro', { orderId });
    assert.equal(nonAdminConfirm.ok, false);

    // Admin confirms DEMO payment -> order PAID & subscription ACTIVE
    const adminConfirm = service.confirmPaymentOrderDemo('user-admin', {
      orderId,
      providerReference: 'DEMO-REF-99',
    });
    assert.equal(adminConfirm.ok, true);
    assert.equal(adminConfirm.data?.order.status, 'PAID');
    assert.equal(adminConfirm.data?.subscription.status, 'ACTIVE');
  });

  it('blocks admin self-lock, preserves disconnected account, and blocks revoked device reconnect', () => {
    const service = new MockAppService(createSeedDemoDatabase());
    const selfLock = service.updateUser('user-admin', {
      userId: 'user-admin',
      status: 'LOCKED',
    });
    assert.equal(selfLock.ok, false);

    // Manual account refresh stays UNVERIFIED
    const refreshed = service.refreshAccountStatus('user-customer-pro', 'fb-acc-2');
    assert.equal(refreshed.ok, true);
    assert.equal(refreshed.data?.status, 'UNVERIFIED');

    // Disconnect keeps record with status DISCONNECTED
    const disconnected = service.disconnectAccount('user-customer-pro', 'fb-acc-1');
    assert.equal(disconnected.ok, true);
    assert.equal(disconnected.data?.status, 'DISCONNECTED');

    // Revoked device cannot check connection back online
    const revoked = service.revokeDevice('user-customer-pro', 'dev-1');
    assert.equal(revoked.ok, true);
    const recheck = service.checkDeviceConnection('user-customer-pro', 'dev-1');
    assert.equal(recheck.ok, false);
  });
});
