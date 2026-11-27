import React, { useEffect, useState } from 'react';
import { demoMediaStorage } from '../services/mediaStorage';
import type { MediaAttachment } from '../types/domain';

interface MediaPreviewProps {
  media: MediaAttachment;
  className?: string;
}

/**
 * Resolves a MediaAttachment's preview cleanly from IndexedDB / memory cache by stable media.id.
 * Never assumes a serialized blob: URL survives reload; displays an honest unavailable state if missing.
 */
export const MediaPreview: React.FC<MediaPreviewProps> = ({
  media,
  className = 'w-full h-full object-cover',
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    demoMediaStorage
      .getMediaPreviewUrl(media.id)
      .then((url) => {
        if (cancelled) return;
        if (url) {
          setResolvedUrl(url);
          setStatus('ready');
        } else if (media.previewUrl && /^https?:\/\//i.test(media.previewUrl)) {
          setResolvedUrl(media.previewUrl);
          setStatus('ready');
        } else {
          setResolvedUrl(null);
          setStatus('unavailable');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl(null);
          setStatus('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [media.id, media.previewUrl]);

  if (status === 'loading') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-[11px]">
        Đang tải...
      </div>
    );
  }

  if (status === 'unavailable' || !resolvedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 text-amber-800 p-2 text-center">
        <span className="material-symbols-outlined text-[20px]">broken_image</span>
        <span className="text-[10px] font-semibold leading-tight mt-0.5">
          Tệp không còn khả dụng
        </span>
      </div>
    );
  }

  if (media.mediaType === 'VIDEO') {
    return (
      <video
        src={resolvedUrl}
        controls
        className={className}
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={media.originalName}
      className={className}
      onError={() => setStatus('unavailable')}
    />
  );
};
