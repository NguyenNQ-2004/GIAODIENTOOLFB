import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublishingTask, PublishingTaskItem } from '../../types/domain';
import {
  cancelTask,
  confirmTaskItem,
  deriveTaskStatus,
  getTaskProgress,
  pauseTask,
  resumeTask,
  retryTaskItem,
} from '../taskStatus';

function makeItem(overrides: Partial<PublishingTaskItem> = {}): PublishingTaskItem {
  return {
    id: overrides.id ?? 'item-1',
    taskId: 'task-1',
    sourcePostId: 'post-1',
    groupId: 'grp-1',
    pageId: null,
    contentSnapshot: 'Test content',
    linkSnapshot: null,
    destinationNameSnapshot: 'Group A',
    destinationUrlSnapshot: 'https://www.facebook.com/groups/groupa',
    mediaSnapshots: [],
    status: 'WAITING_CONFIRMATION',
    confirmationType: null,
    resultPostUrl: null,
    externalPostId: null,
    errorCode: null,
    errorMessage: null,
    attemptCount: 1,
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTask(items: PublishingTaskItem[], overrides: Partial<PublishingTask> = {}): PublishingTask {
  return {
    id: 'task-1',
    userId: 'u-1',
    facebookAccountId: 'acc-1',
    targetType: 'GROUP',
    executionMode: 'MANUAL_GROUP',
    scheduledAt: null,
    status: deriveTaskStatus(items),
    idempotencyKey: 'idem-1',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items,
    ...overrides,
  };
}

describe('taskStatus state machine', () => {
  it('derives all canonical aggregate states accurately', () => {
    assert.equal(deriveTaskStatus([makeItem({ status: 'PENDING' })], { isScheduledFuture: true }), 'SCHEDULED');
    assert.equal(deriveTaskStatus([makeItem({ status: 'PENDING' })]), 'QUEUED');
    assert.equal(deriveTaskStatus([makeItem({ status: 'PROCESSING' })]), 'RUNNING');
    assert.equal(deriveTaskStatus([makeItem({ status: 'WAITING_CONFIRMATION' })]), 'WAITING_CONFIRMATION');
    assert.equal(deriveTaskStatus([makeItem({ status: 'WAITING_CONFIRMATION' })], { isPaused: true }), 'PAUSED');
    assert.equal(deriveTaskStatus([makeItem({ status: 'SUCCESS' })]), 'COMPLETED');
    assert.equal(
      deriveTaskStatus([makeItem({ id: '1', status: 'SUCCESS' }), makeItem({ id: '2', status: 'FAILED' })]),
      'PARTIAL_FAILED'
    );
    assert.equal(deriveTaskStatus([makeItem({ status: 'FAILED' })]), 'FAILED');
    assert.equal(
      deriveTaskStatus([makeItem({ id: '1', status: 'SUCCESS' }), makeItem({ id: '2', status: 'NEEDS_REVIEW' })]),
      'NEEDS_REVIEW'
    );
    assert.equal(deriveTaskStatus([makeItem({ status: 'CANCELLED' })]), 'CANCELLED');
  });

  it('pauses into PAUSED and resumes cleanly', () => {
    const task = makeTask([makeItem({ status: 'WAITING_CONFIRMATION' })]);
    const paused = pauseTask(task, '2026-01-01T01:00:00.000Z');
    assert.equal(paused.status, 'PAUSED');
    const resumed = resumeTask(paused, '2026-01-01T01:05:00.000Z');
    assert.equal(resumed.status, 'WAITING_CONFIRMATION');
  });

  it('confirms per item without marking remaining items complete', () => {
    const task = makeTask([
      makeItem({ id: 'i1', status: 'WAITING_CONFIRMATION' }),
      makeItem({ id: 'i2', status: 'WAITING_CONFIRMATION' }),
    ]);
    const afterFirst = confirmTaskItem(
      task,
      { itemId: 'i1', status: 'SUCCESS', resultPostUrl: 'https://www.facebook.com/groups/a/posts/1' },
      '2026-01-01T01:00:00.000Z'
    );
    assert.equal(afterFirst.status, 'WAITING_CONFIRMATION');
    assert.equal(getTaskProgress(afterFirst.items).completed, 1);
    assert.equal(afterFirst.items[0].confirmationType, 'USER');

    const afterSecond = confirmTaskItem(
      afterFirst,
      { itemId: 'i2', status: 'FAILED', errorMessage: 'Blocked by group' },
      '2026-01-01T01:02:00.000Z'
    );
    assert.equal(afterSecond.status, 'PARTIAL_FAILED');
    assert.equal(afterSecond.finishedAt, '2026-01-01T01:02:00.000Z');
  });

  it('cancels unfinished items, preserves terminal items, and marks PROCESSING as NEEDS_REVIEW', () => {
    const task = makeTask([
      makeItem({ id: 'i1', status: 'SUCCESS' }),
      makeItem({ id: 'i2', status: 'PROCESSING' }),
      makeItem({ id: 'i3', status: 'PENDING' }),
    ]);
    const cancelled = cancelTask(task, '2026-01-01T02:00:00.000Z');
    assert.equal(cancelled.items[0].status, 'SUCCESS');
    assert.equal(cancelled.items[1].status, 'NEEDS_REVIEW');
    assert.equal(cancelled.items[2].status, 'CANCELLED');
    assert.equal(cancelled.status, 'NEEDS_REVIEW');
  });

  it('retries only FAILED items and increments attemptCount', () => {
    const task = makeTask([
      makeItem({ id: 'i1', status: 'SUCCESS', attemptCount: 1 }),
      makeItem({ id: 'i2', status: 'FAILED', attemptCount: 1 }),
    ]);
    const afterRetrySuccess = retryTaskItem(task, 'i1', '2026-01-01T03:00:00.000Z');
    assert.equal(afterRetrySuccess.items[0].status, 'SUCCESS');
    assert.equal(afterRetrySuccess.items[0].attemptCount, 1);

    const afterRetryFailed = retryTaskItem(task, 'i2', '2026-01-01T03:00:00.000Z');
    assert.equal(afterRetryFailed.items[1].status, 'WAITING_CONFIRMATION');
    assert.equal(afterRetryFailed.items[1].attemptCount, 2);
    assert.equal(afterRetryFailed.status, 'WAITING_CONFIRMATION');
  });
});
