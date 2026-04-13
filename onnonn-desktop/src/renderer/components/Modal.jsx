import React from "react";

export function Modal({ open, title, children, onClose, className = "" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-6" onClick={onClose}>
      <div className={`panel w-full max-w-3xl p-6 ${className}`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button className="btn-secondary px-3 py-2" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
