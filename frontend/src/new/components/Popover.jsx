import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 12;

/**
 * Click-opened popover anchored to the left of `anchor` (falls back to below it on
 * narrow screens). Closes on outside click or Esc.
 */
export default function Popover({ anchor, onClose, label, children, className = '' }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    const fitsLeft = a.left - p.width - GAP > 8;
    const top = fitsLeft
      ? Math.min(Math.max(8, a.top + a.height / 2 - p.height / 2), window.innerHeight - p.height - 8)
      : Math.min(a.bottom + GAP, window.innerHeight - p.height - 8);
    const left = fitsLeft ? a.left - p.width - GAP : Math.max(8, Math.min(a.left, window.innerWidth - p.width - 8));
    setStyle({ top, left, visibility: 'visible' });
  }, [anchor]);

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !anchor?.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onScroll = (e) => {
      if (!ref.current?.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div ref={ref} className={`tp-popover ${className}`} style={style} role="dialog" aria-label={label}>
      {children}
    </div>,
    document.body
  );
}
