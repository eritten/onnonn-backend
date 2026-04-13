import React, { useRef } from "react";

export function OTPInput({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function updateDigit(index, nextValue) {
    const chars = value.padEnd(6, "").split("");
    chars[index] = nextValue;
    onChange(chars.join("").trimEnd());
    if (nextValue && refs.current[index + 1]) {
      refs.current[index + 1].focus();
    }
  }

  return (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={digit.trim()}
          inputMode="numeric"
          maxLength={1}
          className="field h-14 w-12 text-center text-lg"
          onChange={(event) => updateDigit(index, event.target.value.replace(/\D/g, ""))}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index].trim() && refs.current[index - 1]) {
              refs.current[index - 1].focus();
            }
          }}
        />
      ))}
    </div>
  );
}
