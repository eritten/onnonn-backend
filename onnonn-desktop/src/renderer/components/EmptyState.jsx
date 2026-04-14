import React from "react";

export function EmptyState({ title, description, action }) {
  return (
    <div className="panel flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center" role="status" aria-live="polite">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-accent/15 text-3xl" aria-hidden="true">○</div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-brand-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
