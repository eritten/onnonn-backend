import React from "react";

export function LoadingButton({ loading, children, className = "btn-primary", ...props }) {
  return (
    <button
      className={className}
      disabled={loading || props.disabled}
      aria-busy={loading}
      aria-live="polite"
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </>
      ) : children}
    </button>
  );
}
