import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FacebookGroup } from '../../types/domain';
import { exportGroupsToCsv, parseGroupsCsv, sanitizeCsvCell } from '../csv';
import {
  buildCalendarMonthGrid,
  computeCountdown,
  isFutureTimestamp,
  vietnamDatetimeLocalToIso,
} from '../dateTime';
import { computeDeviceConnectionStatus } from '../formatters';
import {
  extractNumericGroupUid,
  normalizeFacebookGroupUrl,
  validatePostForPublish,
} from '../validation';

describe('validation utilities', () => {
  it('accepts image-only, link-only, and text-only posts, and rejects empty posts', () => {
    assert.equal(
      validatePostForPublish({ content: '', linkUrl: null, media: [] }).valid,
      false
    );
    assert.equal(
      validatePostForPublish({ content: 'Hello', linkUrl: null, media: [] }).valid,
      true
    );
    assert.equal(
      validatePostForPublish({ content: '', linkUrl: 'https://example.com', media: [] }).valid,
      true
    );
    assert.equal(
      validatePostForPublish({
        content: '',
        linkUrl: null,
        media: [
          {
            id: 'm1',
            originalName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            mediaType: 'IMAGE',
            status: 'READY',
            previewUrl: 'blob:demo',
            sortOrder: 0,
          },
        ],
      }).valid,
      true
    );
    assert.equal(
      validatePostForPublish({ content: 'Hi', linkUrl: 'ftp://invalid', media: [] }).valid,
      false
    );
  });

  it('normalizes Facebook group URLs and extracts numeric UID only when present', () => {
    assert.equal(
      normalizeFacebookGroupUrl('https://m.facebook.com/groups/123456789/?ref=share'),
      'https://www.facebook.com/groups/123456789'
    );
    assert.equal(extractNumericGroupUid('https://www.facebook.com/groups/123456789'), '123456789');
    assert.equal(extractNumericGroupUid('https://www.facebook.com/groups/marketingvn'), null);
    assert.equal(normalizeFacebookGroupUrl('https://example.com/groups/123'), null);
  });
});

describe('CSV import & safe export', () => {
  const existing: FacebookGroup[] = [
    {
      id: 'g1',
      userId: 'u1',
      groupUid: '111222',
      groupName: 'Existing Group',
      groupUrl: 'https://www.facebook.com/groups/111222',
      avatarUrl: null,
      memberCount: 5000,
      requiresApproval: false,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('classifies valid, duplicate, and invalid rows cleanly', () => {
    const csv = [
      'group_name,group_url,group_uid,member_count,requires_approval,notes',
      'New Group,https://www.facebook.com/groups/newgroup,,1200,true,"Ghi chú, có dấu phẩy"',
      'Dup Group,https://www.facebook.com/groups/111222,,,,',
      'Bad URL,https://notfacebook.com/abc,,,,',
    ].join('\n');

    const preview = parseGroupsCsv(csv, existing);
    assert.equal(preview.validHeader, true);
    assert.equal(preview.validCount, 1);
    assert.equal(preview.duplicateCount, 1);
    assert.equal(preview.errorCount, 1);
    assert.equal(preview.rows[0].notes, 'Ghi chú, có dấu phẩy');
    assert.equal(preview.rows[0].groupUid, null);
  });

  it('protects against CSV formula injection on export', () => {
    assert.equal(sanitizeCsvCell('=CMD|test'), "'=CMD|test");
    assert.equal(sanitizeCsvCell('+SUM(A1:A2)'), "'+SUM(A1:A2)");
    assert.equal(sanitizeCsvCell('-1+1'), "'-1+1");
    assert.equal(sanitizeCsvCell('@HYPERLINK("x")'), `"'@HYPERLINK(""x"")"`);

    const exported = exportGroupsToCsv([
      { ...existing[0], groupName: '=EVIL()', notes: 'Normal' },
    ]);
    assert.ok(exported.includes("'=EVIL()"));
  });
});

describe('dateTime & device formatters', () => {
  it('converts GMT+7 datetime-local to ISO UTC and checks future timestamps', () => {
    const iso = vietnamDatetimeLocalToIso('2030-05-10T14:30');
    assert.equal(iso, '2030-05-10T07:30:00.000Z');
    assert.equal(isFutureTimestamp(iso!, new Date('2026-01-01T00:00:00.000Z')), true);
    assert.equal(isFutureTimestamp('2020-01-01T00:00:00.000Z', new Date('2026-01-01T00:00:00.000Z')), false);
  });

  it('computes countdown & dynamic calendar grid accurately', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const active = computeCountdown('2026-06-01T10:05:30.000Z', now);
    assert.equal(active.isExpired, false);
    assert.equal(active.formatted, '05:30');

    const expired = computeCountdown('2026-06-01T09:59:00.000Z', now);
    assert.equal(expired.isExpired, true);
    assert.equal(expired.formatted, '00:00');

    const cells = buildCalendarMonthGrid(2026, 5, now); // June 2026
    assert.equal(cells.length % 7, 0);
    assert.equal(cells.filter((c) => c.inCurrentMonth).length, 30);
  });

  it('computes device connection status without resurrecting revoked devices', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    assert.equal(
      computeDeviceConnectionStatus(
        { lastSeenAt: '2026-06-01T09:59:00.000Z', revokedAt: '2026-06-01T09:59:30.000Z' },
        now
      ),
      'REVOKED'
    );
    assert.equal(
      computeDeviceConnectionStatus({ lastSeenAt: '2026-06-01T09:58:00.000Z', revokedAt: null }, now),
      'CONNECTED'
    );
    assert.equal(
      computeDeviceConnectionStatus({ lastSeenAt: '2026-06-01T09:00:00.000Z', revokedAt: null }, now),
      'OFFLINE'
    );
  });
});
