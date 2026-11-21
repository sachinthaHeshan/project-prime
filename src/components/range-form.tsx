"use client";

import { useState } from "react";

export const DEFAULT_RANGE_START = 0;
export const DEFAULT_RANGE_END = 1000;
export const MAX_RANGE_END = 100000;
export const MIN_SPIRAL_SIDES = 3;
export const MAX_SPIRAL_SIDES = 20;
export const DEFAULT_SPIRAL_SIDES = 4;

export function RangeForm({
  onApply,
  className = "mt-6",
  disabled = false,
  includeSides = false,
}: {
  onApply: (start: number, end: number, sides?: number) => void;
  className?: string;
  disabled?: boolean;
  includeSides?: boolean;
}) {
  const [startText, setStartText] = useState(String(DEFAULT_RANGE_START));
  const [endText, setEndText] = useState(String(DEFAULT_RANGE_END));
  const [sidesText, setSidesText] = useState(String(DEFAULT_SPIRAL_SIDES));
  const [error, setError] = useState<string | null>(null);

  function applyRange() {
    const start = Number(startText);
    const end = Number(endText);
    if (
      startText.trim() === "" ||
      endText.trim() === "" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end)
    ) {
      setError("Start and end must be whole numbers.");
      return;
    }
    if (start < 0 || end < 0) {
      setError("Start and end must be 0 or greater.");
      return;
    }
    if (end < start) {
      setError("End must be at least the start.");
      return;
    }
    if (end > MAX_RANGE_END) {
      setError(`End can be at most ${MAX_RANGE_END.toLocaleString("en-US")}.`);
      return;
    }
    let sides: number | undefined;
    if (includeSides) {
      sides = Number(sidesText);
      if (sidesText.trim() === "" || !Number.isInteger(sides)) {
        setError("Sides must be a whole number.");
        return;
      }
      if (sides < MIN_SPIRAL_SIDES || sides > MAX_SPIRAL_SIDES) {
        setError(`Sides must be from ${MIN_SPIRAL_SIDES} to ${MAX_SPIRAL_SIDES}.`);
        return;
      }
    }
    setError(null);
    onApply(start, end, sides);
  }

  return (
    <form
      className={`flex flex-wrap items-end gap-3 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        applyRange();
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
        Start
        <input
          className="num w-28 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-base text-[#1c1915]"
          inputMode="numeric"
          value={startText}
          disabled={disabled}
          onChange={(event) => setStartText(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
        End
        <input
          className="num w-28 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-base text-[#1c1915]"
          inputMode="numeric"
          value={endText}
          disabled={disabled}
          onChange={(event) => setEndText(event.target.value)}
        />
      </label>
      {includeSides && (
        <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
          Sides
          <input
            className="num w-20 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-base text-[#1c1915]"
            inputMode="numeric"
            value={sidesText}
            disabled={disabled}
            onChange={(event) => setSidesText(event.target.value)}
          />
        </label>
      )}
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-[#1c1915] px-4 py-2 text-sm text-[#fffaf3] disabled:opacity-50"
      >
        Update range
      </button>
      {error && <p className="w-full text-sm text-[#9a3412]">{error}</p>}
    </form>
  );
}
