import React from 'react';

/** Decorative brand symbol. Label the surrounding link or heading instead. */
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo.svg" width="256" height="176" alt="" aria-hidden="true" draggable={false} className={`block shrink-0 object-contain ${className}`} />
  );
}
