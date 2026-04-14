import React, { useEffect, useId, useRef } from "react";

export function Modal({ open, title, children, onClose, className = "" }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    lastFocusedRef.current = document.activeElement;

    const timer = window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      firstFocusable?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      lastFocusedRef.current?.focus?.();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-6" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`panel w-full max-w-3xl p-6 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id={titleId} className="text-xl font-semibold">{title}</h3>
          <button className="btn-secondary px-3 py-2" onClick={onClose} aria-label={`Close ${title}`}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
