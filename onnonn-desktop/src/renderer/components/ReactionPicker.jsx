import React from "react";

const reactions = [
  { emoji: "\u{1F44D}", label: "Thumbs up" },
  { emoji: "\u{1F44F}", label: "Clapping hands" },
  { emoji: "\u2764\uFE0F", label: "Heart" },
  { emoji: "\u{1F602}", label: "Laughing" },
  { emoji: "\u{1F62E}", label: "Surprised" },
  { emoji: "\u270B", label: "Raised hand" }
];

export function ReactionPicker({ onSelect }) {
  const handleKeyDown = (event, index) => {
    const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll("button") || []);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      buttons[(index + 1) % buttons.length]?.focus();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      buttons[0]?.closest("[role='menu']")?.parentElement?.querySelector("button")?.focus();
    }
  };

  return (
    <div className="absolute bottom-[110%] left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-2xl border border-brand-800 bg-brand-900 p-3 shadow-panel" role="menu" aria-label="Meeting reactions">
      {reactions.map((reaction, index) => (
        <button
          key={reaction.label}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-950 text-2xl transition hover:scale-110 hover:bg-brand-accent/15"
          title={reaction.label}
          aria-label={reaction.label}
          role="menuitem"
          onClick={() => onSelect(reaction)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <span className="sr-only">{reaction.label}</span>
          {reaction.emoji}
        </button>
      ))}
    </div>
  );
}
