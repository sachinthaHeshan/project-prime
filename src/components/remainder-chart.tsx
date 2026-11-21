"use client";

import * as d3 from "d3";
import { useEffect, useId, useRef, useState } from "react";

type Tip = {
  x: number;
  y: number;
  remainder: number;
  count: number;
  share: number;
};

const MARGIN = { top: 24, right: 24, bottom: 48, left: 64 };
export const REMAINDER_DIVISOR_MAX = 1000;

/** How many primes leave each remainder when divided by `divisor`. */
export function remainderCounts(primes: number[], divisor: number): number[] {
  const counts = Array.from({ length: divisor }, () => 0);
  for (const prime of primes) counts[prime % divisor] += 1;
  return counts;
}

export function RemainderChart({
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
  const [divisor, setDivisor] = useState(10);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl) return;
    const counts = remainderCounts(primes, divisor);

    const draw = () => {
      const width = wrap.clientWidth;
      const height = 420;
      const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
      const innerHeight = height - MARGIN.top - MARGIN.bottom;
      const svg = d3.select(svgEl);
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const bars = counts.map((count, remainder) => ({ remainder, count }));
      const x = d3
        .scaleLinear()
        .domain([-0.5, divisor - 0.5])
        .range([0, innerWidth]);
      const barWidth = Math.max(innerWidth / divisor - (divisor > 40 ? 0 : 4), 1);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(bars, (item) => item.count) ?? 1])
        .nice()
        .range([innerHeight, 0]);
      const root = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      const total = primes.length || 1;

      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(() => ""))
        .call((axis) => axis.select(".domain").remove())
        .call((axis) =>
          axis.selectAll("line").attr("stroke", "#e4dccb").attr("stroke-dasharray", "2 4"),
        );

      root
        .selectAll("rect")
        .data(bars)
        .join("rect")
        .attr("x", (item) => x(item.remainder) - barWidth / 2)
        .attr("y", (item) => y(item.count))
        .attr("width", barWidth)
        .attr("height", (item) => innerHeight - y(item.count))
        .attr("rx", barWidth > 6 ? 3 : 0)
        .attr("fill", `url(#${gradientId})`)
        .attr("stroke", "#7c2d12")
        .attr("stroke-opacity", barWidth > 3 ? 0.35 : 0)
        .on("mousemove", (event, item) => {
          const pointer = d3.pointer(event, wrap);
          setTip({
            x: pointer[0],
            y: pointer[1],
            remainder: item.remainder,
            count: item.count,
            share: item.count / total,
          });
        })
        .on("mouseleave", () => setTip(null));

      const bottom = d3.axisBottom(x).tickFormat((value) => d3.format(",")(value as number));
      if (divisor <= 20) bottom.tickValues(d3.range(divisor));
      else bottom.ticks(10);
      root
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(bottom)
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
        .text("Remainder");
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Primes");
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [divisor, generation, gradientId, onReady, primes]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <DivisorForm onApply={setDivisor} />
      <svg ref={svgRef} role="img" aria-label="Histogram of prime remainders">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#f6e4d8" />
          </linearGradient>
        </defs>
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-xs shadow-sm"
          style={{ left: tip.x + 12, top: Math.max(tip.y - 56, 8) }}
        >
          <p className="num text-sm text-[#1c1915]">Remainder {tip.remainder.toLocaleString("en-US")}</p>
          <p className="mt-1 text-[#5c564c]">
            {tip.count.toLocaleString("en-US")} prime{tip.count === 1 ? "" : "s"} ·{" "}
            {(tip.share * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}

function DivisorForm({ onApply }: { onApply: (divisor: number) => void }) {
  const [text, setText] = useState("10");
  const [error, setError] = useState<string | null>(null);

  function applyDivisor() {
    const divisor = Number(text);
    if (text.trim() === "" || !Number.isInteger(divisor)) {
      setError("Enter a whole number.");
      return;
    }
    if (divisor < 2 || divisor > REMAINDER_DIVISOR_MAX) {
      setError(`The divisor must be a whole number from 2 to ${REMAINDER_DIVISOR_MAX.toLocaleString("en-US")}.`);
      return;
    }
    setError(null);
    onApply(divisor);
  }

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        applyDivisor();
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
        Divide by
        <input
          className="num w-28 rounded-md border border-[#e4dccb] bg-white px-3 py-2 text-base text-[#1c1915]"
          inputMode="numeric"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-[#1c1915] px-4 py-2 text-sm text-[#fffaf3]"
      >
        Update
      </button>
      {error && <p className="w-full text-sm text-[#9a3412]">{error}</p>}
    </form>
  );
}
