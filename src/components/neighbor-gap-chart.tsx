"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

export type NeighborGap = {
  n: number;
  prime: number;
  previous: number | null;
  next: number | null;
};

type Placed = NeighborGap & { px: number; py: number };

type Tip = {
  x: number;
  y: number;
  prime: number;
  previous: number | null;
  next: number | null;
};

const MARGIN = { top: 24, right: 24, bottom: 48, left: 64 };
const NEXT_COLOR = "#b91c1c";
const PREVIOUS_COLOR = "#1d4ed8";

export function NeighborGapChart({
  points,
  generation = 0,
  onReady,
}: {
  points: NeighborGap[];
  generation?: number;
  onReady?: (generation: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const placedRef = useRef<Placed[]>([]);
  const [tip, setTip] = useState<Tip | null>(null);
  const [series, setSeries] = useState<"next" | "previous">("next");

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || points.length === 0) return;

    const draw = () => {
      const width = wrap.clientWidth;
      const height = 420;
      const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
      const innerHeight = height - MARGIN.top - MARGIN.bottom;
      const svg = d3.select(svgEl);
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const gapOf = (point: NeighborGap) => (series === "next" ? point.next : point.previous);
      const gaps = points.flatMap((point) => {
        const gap = gapOf(point);
        return gap == null ? [] : [gap];
      });
      const highest = d3.max(gaps) ?? 1;
      const y = d3
        .scaleLinear()
        .domain([0, highest])
        .nice()
        .range([innerHeight, 0]);
      const x = d3
        .scaleLinear()
        .domain(d3.extent(points, (point) => point.prime) as [number, number])
        .range([0, innerWidth]);
      const root = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(() => ""))
        .call((axis) => axis.select(".domain").remove())
        .call((axis) =>
          axis.selectAll("line").attr("stroke", "#e4dccb").attr("stroke-dasharray", "2 4"),
        );

      const line = (value: (point: NeighborGap) => number | null) =>
        d3
          .line<NeighborGap>()
          .defined((point) => value(point) !== null)
          .x((point) => x(point.prime))
          .y((point) => y(value(point) as number));

      root
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", series === "next" ? NEXT_COLOR : PREVIOUS_COLOR)
        .attr("stroke-width", 1.6)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line(gapOf));

      placedRef.current = points.map((point) => ({
        ...point,
        px: MARGIN.left + x(point.prime),
        py: MARGIN.top + y(gapOf(point) ?? 0),
      }));

      root
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat((value) => d3.format(",")(value as number)))
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 12))
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
        .text("Prime");
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Gap");
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [generation, onReady, points, series]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Which prime gap to show">
        <SeriesButton
          pressed={series === "next"}
          color={NEXT_COLOR}
          label="Gap to next"
          onClick={() => setSeries("next")}
        />
        <SeriesButton
          pressed={series === "previous"}
          color={PREVIOUS_COLOR}
          label="Gap to previous"
          onClick={() => setSeries("previous")}
        />
      </div>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Gaps from each prime to the next and previous prime"
        onMouseMove={(event) => {
          const svg = svgRef.current;
          const placed = placedRef.current;
          if (!svg || placed.length === 0) return;
          const rect = svg.getBoundingClientRect();
          const scale = rect.width / svg.viewBox.baseVal.width || 1;
          const pointer = (event.clientX - rect.left) / scale;
          let low = 0;
          let high = placed.length - 1;
          while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (placed[mid].px < pointer) low = mid + 1;
            else high = mid;
          }
          const next = placed[low];
          const previous = placed[Math.max(0, low - 1)];
          const nearest =
            Math.abs(previous.px - pointer) < Math.abs(next.px - pointer) ? previous : next;
          setTip({
            x: nearest.px * scale,
            y: nearest.py * scale,
            prime: nearest.prime,
            previous: nearest.previous,
            next: nearest.next,
          });
        }}
        onMouseLeave={() => setTip(null)}
      />
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-xs shadow-sm"
          style={{ left: tip.x + 12, top: Math.max(tip.y - 72, 8) }}
        >
          <p className="num text-sm text-[#1c1915]">Prime {tip.prime.toLocaleString("en-US")}</p>
          <p className="mt-1" style={{ color: series === "next" ? NEXT_COLOR : PREVIOUS_COLOR }}>
            {series === "next" ? "Next" : "Previous"}{" "}
            {(series === "next" ? tip.next : tip.previous)?.toLocaleString("en-US") ?? "—"}
          </p>
        </div>
      )}
    </div>
  );
}

function SeriesButton({
  pressed,
  color,
  label,
  onClick,
}: {
  pressed: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
        pressed ? "border-[#1c1915] bg-[#1c1915] text-[#fffaf3]" : "border-[#e4dccb] bg-white text-[#1c1915]"
      }`}
      onClick={onClick}
    >
      <span className="inline-block h-0.5 w-4" style={{ background: pressed ? "#fffaf3" : color }} />
      {label}
    </button>
  );
}
