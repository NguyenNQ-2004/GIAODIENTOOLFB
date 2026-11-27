import type { FacebookGroup, MediaAttachment, Post } from '../types/domain';

export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_MEDIA_PER_POST = 10;

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates that a draft/post has publishable content:
 * non-empty text OR valid http(s) link OR at least one READY media attachment.
 */
export function hasPublishableContent(post: Pick<Post, 'content' | 'linkUrl' | 'media'>): boolean {
  const hasText = post.content.trim().length > 0;
  const hasValidLink = Boolean(post.linkUrl && isValidHttpUrl(post.linkUrl));
  const hasReadyMedia = post.media.some((m) => m.status === 'READY');
  return hasText || hasValidLink || hasReadyMedia;
}

export function validatePostForPublish(post: Pick<Post, 'content' | 'linkUrl' | 'media'>): {
  valid: boolean;
  error?: string;
} {
  if (post.linkUrl && post.linkUrl.trim().length > 0 && !isValidHttpUrl(post.linkUrl)) {
    return {
      valid: false,
      error: 'Link đính kèm phải bắt đầu bằng http:// hoặc https://',
    };
  }
  const hasPendingOrFailedMedia = post.media.some((m) => m.status !== 'READY');
  if (hasPendingOrFailedMedia) {
    return {
      valid: false,
      error: 'Có tệp media chưa sẵn sàng hoặc bị lỗi. Vui lòng xóa hoặc tải lại.',
    };
  }
  if (!hasPublishableContent(post)) {
    return {
      valid: false,
      error: 'Bài viết cần có ít nhất nội dung văn bản, ảnh/video hợp lệ, hoặc link hợp lệ.',
    };
  }
  return { valid: true };
}

/**
 * Normalizes a Facebook Group URL for duplicate comparison and storage.
 */
export function normalizeFacebookGroupUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^(www\.|m\.|mbasic\.|web\.)?facebook\.com\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return null;
    }
  }
  try {
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.toLowerCase();
    const isFacebookHost =
      hostname === 'facebook.com' ||
      hostname === 'www.facebook.com' ||
      hostname === 'm.facebook.com' ||
      hostname === 'mbasic.facebook.com' ||
      hostname === 'web.facebook.com' ||
      hostname === 'fb.com' ||
      hostname === 'www.fb.com';
    if (!isFacebookHost) return null;

    const match = parsed.pathname.match(/^\/groups\/([^/?#]+)/i);
    if (!match || !match[1]) return null;
    const slugOrId = match[1].trim();
    if (!slugOrId) return null;
    return `https://www.facebook.com/groups/${slugOrId}`;
  } catch {
    return null;
  }
}

/**
 * Extracts a numeric Facebook Group UID from a group URL if present.
 * Returns null if the URL uses a slug instead of a numeric UID (never fabricates a UID).
 */
export function extractNumericGroupUid(groupUrl: string): string | null {
  const normalized = normalizeFacebookGroupUrl(groupUrl);
  if (!normalized) return null;
  const match = normalized.match(/\/groups\/(\d+)$/);
  return match ? match[1] : null;
}

export function findDuplicateGroup(
  existingGroups: FacebookGroup[],
  candidateUrl: string,
  candidateUid: string | null,
  excludeGroupId?: string
): FacebookGroup | undefined {
  const normalizedCandidateUrl = normalizeFacebookGroupUrl(candidateUrl)?.toLowerCase();
  const trimmedUid = candidateUid?.trim() || null;

  return existingGroups.find((g) => {
    if (excludeGroupId && g.id === excludeGroupId) return false;
    const existingNormalized = (
      normalizeFacebookGroupUrl(g.groupUrl) ?? g.groupUrl.trim()
    ).toLowerCase();
    if (normalizedCandidateUrl && existingNormalized === normalizedCandidateUrl) {
      return true;
    }
    if (trimmedUid && g.groupUid && g.groupUid.trim() === trimmedUid) {
      return true;
    }
    return false;
  });
}

export function validateMediaFileInput(file: {
  name: string;
  type: string;
  size: number;
}): {
  valid: boolean;
  mediaType?: 'IMAGE' | 'VIDEO';
  error?: string;
} {
  if (ALLOWED_IMAGE_MIMES.has(file.type)) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Ảnh "${file.name}" vượt quá giới hạn 20MB.`,
      };
    }
    return { valid: true, mediaType: 'IMAGE' };
  }
  if (ALLOWED_VIDEO_MIMES.has(file.type)) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return {
        valid: false,
        error: `Video "${file.name}" vượt quá giới hạn 100MB.`,
      };
    }
    return { valid: true, mediaType: 'VIDEO' };
  }
  return {
    valid: false,
    error: `Định dạng tệp "${file.name}" không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, GIF, MP4, WEBM, MOV.`,
  };
}

export function cloneMediaAttachments(media: MediaAttachment[]): MediaAttachment[] {
  return media.map((m, idx) => ({
    ...m,
    sortOrder: idx,
  }));
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: 'Mật khẩu phải có tối thiểu 8 ký tự.' };
  }
  return { valid: true };
}
