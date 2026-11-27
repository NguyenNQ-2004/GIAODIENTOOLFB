import type { CsvImportRowResult } from '../types/api';
import type { FacebookGroup } from '../types/domain';
import {
  extractNumericGroupUid,
  findDuplicateGroup,
  normalizeFacebookGroupUrl,
} from './validation';

export const EXPECTED_CSV_HEADERS = [
  'group_name',
  'group_url',
  'group_uid',
  'member_count',
  'requires_approval',
  'notes',
] as const;

/**
 * RFC-4180 compliant CSV parser handling quoted fields, escaped quotes (""),
 * embedded commas, and CRLF/LF newlines.
 */
export function parseCsvMatrix(csvText: string): string[][] {
  const cleaned = csvText.replace(/^\uFEFF/, ''); // strip UTF-8 BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (next === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export interface CsvParsePreview {
  validHeader: boolean;
  headerError?: string;
  rows: CsvImportRowResult[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
}

function parseOptionalBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (['true', '1', 'yes', 'có', 'co'].includes(v)) return true;
  if (['false', '0', 'no', 'không', 'khong'].includes(v)) return false;
  return null;
}

function parseOptionalInt(raw: string): number | null {
  const cleaned = raw.trim().replace(/[.,\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const num = Number.parseInt(cleaned, 10);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Parses and validates CSV text for Facebook group import.
 */
export function parseGroupsCsv(
  csvText: string,
  existingGroups: FacebookGroup[]
): CsvParsePreview {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length === 0) {
    return {
      validHeader: false,
      headerError: 'File CSV trống.',
      rows: [],
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
    };
  }

  const headers = matrix[0].map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('group_name');
  const urlIdx = headers.indexOf('group_url');
  const uidIdx = headers.indexOf('group_uid');
  const memberIdx = headers.indexOf('member_count');
  const approvalIdx = headers.indexOf('requires_approval');
  const notesIdx = headers.indexOf('notes');

  if (nameIdx === -1 || urlIdx === -1) {
    return {
      validHeader: false,
      headerError:
        'Thiếu cột bắt buộc. Header CSV cần có tối thiểu: group_name, group_url (tùy chọn: group_uid, member_count, requires_approval, notes).',
      rows: [],
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
    };
  }

  const seenUrls = new Set<string>();
  const seenUids = new Set<string>();
  const results: CsvImportRowResult[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const cols = matrix[i];
    const groupName = (cols[nameIdx] ?? '').trim();
    const rawUrl = (cols[urlIdx] ?? '').trim();
    const rawUid = uidIdx >= 0 ? (cols[uidIdx] ?? '').trim() : '';
    const rawMembers = memberIdx >= 0 ? (cols[memberIdx] ?? '').trim() : '';
    const rawApproval = approvalIdx >= 0 ? (cols[approvalIdx] ?? '').trim() : '';
    const rawNotes = notesIdx >= 0 ? (cols[notesIdx] ?? '').trim() : '';

    const normalizedUrl = normalizeFacebookGroupUrl(rawUrl);
    const groupUid = rawUid || (normalizedUrl ? extractNumericGroupUid(normalizedUrl) : null);
    const memberCount = parseOptionalInt(rawMembers);
    const requiresApproval = parseOptionalBool(rawApproval);
    const notes = rawNotes || null;

    if (!groupName) {
      results.push({
        rowIndex: i + 1,
        groupName,
        groupUrl: rawUrl,
        groupUid,
        memberCount,
        requiresApproval,
        notes,
        status: 'ERROR',
        reason: 'Thiếu tên nhóm (group_name).',
      });
      continue;
    }

    if (!normalizedUrl) {
      results.push({
        rowIndex: i + 1,
        groupName,
        groupUrl: rawUrl,
        groupUid,
        memberCount,
        requiresApproval,
        notes,
        status: 'ERROR',
        reason: 'URL nhóm Facebook không hợp lệ (phải có dạng facebook.com/groups/...).',
      });
      continue;
    }

    const existingDup = findDuplicateGroup(existingGroups, normalizedUrl, groupUid);
    const lowerUrl = normalizedUrl.toLowerCase();
    const intraFileDup = seenUrls.has(lowerUrl) || Boolean(groupUid && seenUids.has(groupUid));

    if (existingDup || intraFileDup) {
      results.push({
        rowIndex: i + 1,
        groupName,
        groupUrl: normalizedUrl,
        groupUid,
        memberCount,
        requiresApproval,
        notes,
        status: 'DUPLICATE',
        reason: existingDup
          ? `Trùng với nhóm đã có: "${existingDup.groupName}".`
          : 'Trùng lặp ngay trong file CSV.',
      });
      continue;
    }

    seenUrls.add(lowerUrl);
    if (groupUid) seenUids.add(groupUid);

    results.push({
      rowIndex: i + 1,
      groupName,
      groupUrl: normalizedUrl,
      groupUid,
      memberCount,
      requiresApproval,
      notes,
      status: 'VALID',
    });
  }

  return {
    validHeader: true,
    rows: results,
    validCount: results.filter((r) => r.status === 'VALID').length,
    duplicateCount: results.filter((r) => r.status === 'DUPLICATE').length,
    errorCount: results.filter((r) => r.status === 'ERROR').length,
  };
}

/**
 * Neutralizes CSV formula injection (Excel/Sheets) by prefixing cells
 * beginning with =, +, -, @, tab, or carriage return with a single quote.
 */
export function sanitizeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportGroupsToCsv(groups: FacebookGroup[]): string {
  const headerLine = EXPECTED_CSV_HEADERS.join(',');
  const lines = groups.map((g) =>
    [
      sanitizeCsvCell(g.groupName),
      sanitizeCsvCell(g.groupUrl),
      sanitizeCsvCell(g.groupUid),
      sanitizeCsvCell(g.memberCount),
      sanitizeCsvCell(g.requiresApproval === null ? '' : g.requiresApproval ? 'true' : 'false'),
      sanitizeCsvCell(g.notes),
    ].join(',')
  );
  return `\uFEFF${[headerLine, ...lines].join('\r\n')}`;
}

export function generateSampleGroupsCsv(): string {
  const sample = [
    EXPECTED_CSV_HEADERS.join(','),
    'Cộng đồng Marketing Việt Nam,https://www.facebook.com/groups/marketingvn2026,,45000,true,Nhóm chia sẻ kiến thức',
    'Hội Kinh Doanh Online TP.HCM,https://www.facebook.com/groups/109283746512,109283746512,18500,false,Không cần duyệt bài',
  ];
  return `\uFEFF${sample.join('\r\n')}`;
}
