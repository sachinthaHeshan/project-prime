"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

export type PrimePoint = {
  n: number;
  prime: number;
};

type Tip = {
  x: number;
  y: number;
  n: number;
  prime: number;
};

const MARGIN = { top: 24, right: 24, bottom: 48, left: 76 };

export function PrimeStepChart({
  points,
  generation = 0,
  onReady,
}: {
  points: PrimePoint[];
  generation?: number;
  onReady?: (generation: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const placedRef = useRef<Array<PrimePoint & { px: number; py: number }>>([]);
  const [tip, setTip] = useState<Tip | null>(null);

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

      const lowest = d3.min(points, (point) => point.prime) ?? 0;
      const highest = d3.max(points, (point) => point.prime) ?? 0;
      const span = Math.max(highest - lowest, 1);
      const y = d3
        .scaleLinear()
        .domain([Math.max(0, lowest - span * 0.06), highest + span * 0.06])
        .range([innerHeight, 0]);
      const x = d3
        .scaleLinear()
        .domain(d3.extent(points, (point) => point.n) as [number, number])
        .range([0, innerWidth]);

      const root = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(() => ""))
        .call((axis) => axis.select(".domain").remove())
        .call((axis) =>
          axis.selectAll("line").attr("stroke", "#e4dccb").attr("stroke-dasharray", "2 4"),
        );

      const line = d3
        .line<PrimePoint>()
        .x((point) => x(point.n))
        .y((point) => y(point.prime));
      root
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", "#1f6e56")
        .attr("stroke-width", 1.6)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);

      placedRef.current = points.map((point) => ({
        ...point,
        px: MARGIN.left + x(point.n),
        py: MARGIN.top + y(point.prime),
      }));

      root
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat((value) => d3.format(",")(value as number)))
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 12))
        .call((axis) => axis.selectAll("line, path").attr("stroke", "#c9bfae"));
      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat((value) => d3.format(",")(value as number)))
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 12))
        .call((axis) => axis.selectAll("line, path").attr("stroke", "#c9bfae"));

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("n");
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Prime");
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [generation, onReady, points]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        role="img"
        aria-label="Line chart of the prime at every index n"
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
            n: nearest.n,
            prime: nearest.prime,
          });
        }}
        onMouseLeave={() => setTip(null)}
      />
      {tip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-xs shadow-sm"
          style={{ left: tip.x + 12, top: Math.max(tip.y - 52, 8) }}
        >
          <p className="num text-sm text-[#1c1915]">n = {tip.n.toLocaleString("en-US")}</p>
          <p className="num mt-1 text-[#5c564c]">Prime {tip.prime.toLocaleString("en-US")}</p>
        </div>
      )}
    </div>
  );
}
