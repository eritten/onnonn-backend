import React, { useRef } from "react";

export function OTPInput({ value, onChange, idPrefix = "otp-digit" }) {
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
    <div className="flex gap-2" role="group" aria-label="One-time passcode">
      {digits.map((digit, index) => (
        <input
          key={index}
          id={`${idPrefix}-${index}`}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={digit.trim()}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          name={`${idPrefix}-${index}`}
          maxLength={1}
          className="field h-14 w-12 text-center text-lg"
          aria-label={`Verification code digit ${index + 1}`}
          onChange={(event) => updateDigit(index, event.target.value.replace(/\D/g, ""))}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!pasted) {
              return;
            }
            event.preventDefault();
            onChange(pasted);
            const nextIndex = Math.min(pasted.length - 1, 5);
            refs.current[nextIndex]?.focus();
          }}
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
