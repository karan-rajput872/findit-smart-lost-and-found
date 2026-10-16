import React, { useState, useEffect } from 'react';
import { getItemFallbackImage, getOfflineSvgFallback } from '../../utils/imageUtils';
import { resolveItemImageUrl } from '../../services/api';

interface ItemImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  category?: string;
  itemType?: string;
  className?: string;
}

export const ItemImage: React.FC<ItemImageProps> = ({
  src,
  alt,
  category,
  itemType,
  className = '',
  ...props
}) => {
  const primaryFallback = getItemFallbackImage(alt, category, itemType);
  const resolvedSrc = resolveItemImageUrl(src);
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    return resolvedSrc || primaryFallback;
  });
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Sync if src prop changes
  useEffect(() => {
    const updated = resolveItemImageUrl(src);
    if (updated) {
      setCurrentSrc(updated);
      setFailedAttempts(0);
    } else {
      setCurrentSrc(primaryFallback);
    }
  }, [src, primaryFallback]);

  const handleError = () => {
    if (failedAttempts === 0) {
      setFailedAttempts(1);
      if (currentSrc !== primaryFallback) {
        setCurrentSrc(primaryFallback);
      } else {
        setCurrentSrc(getOfflineSvgFallback(alt, category));
      }
    } else {
      // Ultimate guaranteed fallback: zero-network offline SVG
      setCurrentSrc(getOfflineSvgFallback(alt, category));
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
};
