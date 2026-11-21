"use client";

import * as d3 from "d3";
import { useEffect, useId, useRef, useState } from "react";

type Tip = {
  x: number;
  y: number;
  digit: number;
  count: number;
  share: number;
};

const MARGIN = { top: 24, right: 24, bottom: 48, left: 64 };
export const DIGIT_AXIS_MAX = 1000;

/** How often each integer from `min` through `max` appears in the primes' digits. */
export function numberUseCounts(
  primes: number[],
  min: number,
  max: number,
  endsOnly = false,
): number[] {
  const counts = Array.from({ length: max - min + 1 }, () => 0);
  for (const prime of primes) {
    const text = String(prime);
    if (endsOnly) {
      for (let length = 1; length <= text.length; length++) {
        const suffix = text.slice(-length);
        if (length > 1 && suffix.startsWith("0")) continue;
        const value = Number(suffix);
        if (value > max) break;
        if (value >= min) counts[value - min] += 1;
      }
      continue;
    }
    for (let start = 0; start < text.length; start++) {
      if (text[start] === "0") {
        if (min <= 0) counts[-min] += 1;
        continue;
      }
      let value = 0;
      for (let end = start; end < text.length; end++) {
        value = value * 10 + text.charCodeAt(end) - 48;
        if (value > max) break;
        if (value >= min) counts[value - min] += 1;
      }
    }
  }
  return counts;
}

export function DigitChart({
  primes,
  generation = 0,
  onReady,
}: {
  primes: number[];
  generation?: number;
  onReady?: (generation: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId().replace(/:/g, "");
  const [tip, setTip] = useState<Tip | null>(null);
  const [axis, setAxis] = useState({ min: 0, max: 9 });
  const [endsOnly, setEndsOnly] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl) return;
    const counts = numberUseCounts(primes, axis.min, axis.max, endsOnly);

    const draw = () => {
      const width = wrap.clientWidth;
      const height = 420;
      const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
      const innerHeight = height - MARGIN.top - MARGIN.bottom;
      const svg = d3.select(svgEl);
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const numbers = counts.map((count, index) => ({ number: axis.min + index, count }));
      const span = Math.max(axis.max - axis.min, 1);
      const x = d3
        .scaleLinear()
        .domain([axis.min - 0.5, axis.max + 0.5])
        .range([0, innerWidth]);
      const barWidth = Math.max(innerWidth / (span + 1) - (span > 40 ? 0 : 4), 1);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(numbers, (item) => item.count) ?? 1])
        .nice()
        .range([innerHeight, 0]);
      const root = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      const total = counts.reduce((sum, count) => sum + count, 0) || 1;

      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(() => ""))
        .call((axis) => axis.select(".domain").remove())
        .call((axis) =>
          axis.selectAll("line").attr("stroke", "#e4dccb").attr("stroke-dasharray", "2 4"),
        );

      root
        .selectAll("rect")
        .data(numbers)
        .join("rect")
        .attr("x", (item) => x(item.number) - barWidth / 2)
        .attr("y", (item) => y(item.count))
        .attr("width", barWidth)
        .attr("height", (item) => innerHeight - y(item.count))
        .attr("rx", 3)
        .attr("fill", `url(#${gradientId})`)
        .attr("stroke", "#145744")
        .attr("stroke-opacity", 0.35)
        .on("mousemove", (event, item) => {
          const pointer = d3.pointer(event, wrap);
          setTip({
            x: pointer[0],
            y: pointer[1],
            digit: item.number,
            count: item.count,
            share: item.count / total,
          });
        })
        .on("mouseleave", () => setTip(null));

      root
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(Math.min(axis.max - axis.min + 1, 10))
            .tickFormat((value) => d3.format(",")(value as number)),
        )
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 13))
        .call((axis) => axis.selectAll("line, path").attr("stroke", "#c9bfae"));
      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(",")))
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 12))
        .call((axis) => axis.selectAll("line, path").attr("stroke", "#c9bfae"));

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Number");
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Times used");
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [axis.max, axis.min, endsOnly, generation, gradientId, onReady, primes]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <DigitAxisForm onApply={(min, max) => setAxis({ min, max })} />
        <button
          type="button"
          aria-pressed={endsOnly}
          className={`rounded-md border px-4 py-2 text-sm ${
            endsOnly
              ? "border-[#1c1915] bg-[#1c1915] text-[#fffaf3]"
              : "border-[#e4dccb] bg-white text-[#1c1915]"
          }`}
          onClick={() => setEndsOnly((value) => !value)}
        >
          End digits only
        </button>
      </div>
      <svg ref={svgRef} role="img" aria-label="Histogram of how often each number appears in the primes">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f9e7e" />
            <stop offset="100%" stopColor="#d8efe6" />
          </linearGradient>
        </defs>
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-xs shadow-sm"
          style={{ left: tip.x + 12, top: Math.max(tip.y - 56, 8) }}
        >
          <p className="num text-sm text-[#1c1915]">{tip.digit.toLocaleString("en-US")}</p>
          <p className="mt-1 text-[#5c564c]">
            {tip.count.toLocaleString("en-US")} time{tip.count === 1 ? "" : "s"} ·{" "}
            {(tip.share * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

function DigitAxisForm({ onApply }: { onApply: (min: number, max: number) => void }) {
  const [minText, setMinText] = useState("0");
  const [maxText, setMaxText] = useState("9");
  const [error, setError] = useState<string | null>(null);

  function applyAxis() {
    const min = Number(minText);
    const max = Number(maxText);
    if (minText.trim() === "" || maxText.trim() === "" || !Number.isInteger(min) || !Number.isInteger(max)) {
      setError("X min and max must be whole numbers.");
      return;
    }
    if (min < 0 || max > DIGIT_AXIS_MAX) {
      setError(`X min and max must be from 0 to ${DIGIT_AXIS_MAX.toLocaleString("en-US")}.`);
      return;
    }
    if (max < min) {
      setError("X max must be at least the X min.");
      return;
    }
    setError(null);
    onApply(min, max);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        applyAxis();
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
        X min
        <input
          className="num w-24 rounded-md border border-[#e4dccb] bg-white px-3 py-2 text-base text-[#1c1915]"
          inputMode="numeric"
          value={minText}
          onChange={(event) => setMinText(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
        X max
        <input
          className="num w-24 rounded-md border border-[#e4dccb] bg-white px-3 py-2 text-base text-[#1c1915]"
          inputMode="numeric"
          value={maxText}
          onChange={(event) => setMaxText(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-[#1c1915] px-4 py-2 text-sm text-[#fffaf3]"
      >
        Update axis
      </button>
      {error && <p className="w-full text-sm text-[#9a3412]">{error}</p>}
    </form>
  );
}
