import React, { useState } from 'react';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  fallbackIcon?: string;
  className?: string;
  fallbackClassName?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackText,
  fallbackIcon = 'image',
  className = 'w-full h-full object-cover',
  fallbackClassName = 'bg-blue-50 text-blue-700',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center font-semibold select-none ${fallbackClassName} ${className}`}
        aria-label={alt}
      >
        {fallbackText ? (
          <span>{fallbackText}</span>
        ) : (
          <span className="material-symbols-outlined text-[18px]">{fallbackIcon}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
};
