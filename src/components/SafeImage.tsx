import React, { useState } from 'react';

interface SafeImageProps {
  src?: string;
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
  fallbackClassName = 'bg-primary-container/15 text-primary-container',
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
