"use client";

import * as d3 from "d3";
import { useEffect, useId, useRef, useState } from "react";

export type GapPoint = {
  n: number;
  prime: number;
  gap: number;
};

type Tip = {
  x: number;
  y: number;
  from: number;
  to: number;
  count: number;
  share: number;
};

const MARGIN = { top: 28, right: 24, bottom: 78, left: 56 };

export function GapChart({
  points,
  generation = 0,
  onReady,
}: {
  points: GapPoint[];
  generation?: number;
  onReady?: (generation: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || points.length === 0) return;

    const gaps = points.map((point) => point.gap);

    const draw = () => {
      const width = wrap.clientWidth;
      const height = 460;
      const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
      const innerHeight = height - MARGIN.top - MARGIN.bottom;

      const svg = d3.select(svgEl);
      svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const min = d3.min(gaps) ?? 0;
      const max = d3.max(gaps) ?? 0;
      const pad = Math.max((max - min) * 0.06, 0.4);
      const x = d3
        .scaleLinear()
        .domain([min - pad, max + pad])
        .range([0, innerWidth]);

      const binDomain: [number, number] = min === max ? [min - 0.5, max + 0.5] : [min, max];
      const bins = d3
        .bin<GapPoint, number>()
        .value((point) => point.gap)
        .domain(binDomain)
        .thresholds(min === max ? 1 : 18)(points)
        .filter((bin) => (bin.x1 ?? 0) > (bin.x0 ?? 0));

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (bin) => bin.length) ?? 1])
        .nice()
        .range([innerHeight, 0]);

      const root = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

      root
        .append("g")
        .attr("class", "grid")
        .call(
          d3
            .axisLeft(y)
            .ticks(6)
            .tickSize(-innerWidth)
            .tickFormat(() => ""),
        )
        .call((axis) => axis.select(".domain").remove())
        .call((axis) =>
          axis.selectAll("line").attr("stroke", "#e4dccb").attr("stroke-dasharray", "2 4"),
        );

      const bandwidth = silverman(gaps);
      const [x0, x1] = x.domain();
      const samples = d3.range(x0, x1, (x1 - x0) / 160);
      const density = kernelDensity(epanechnikov(bandwidth), samples, gaps);
      const densityPeak = d3.max(density, (sample) => sample[1]) || 1;
      const countPeak = d3.max(bins, (bin) => bin.length) ?? 1;
      const densityLine = d3
        .line<[number, number]>()
        .curve(d3.curveMonotoneX)
        .x((sample) => x(sample[0]))
        .y((sample) => y((sample[1] / densityPeak) * countPeak));

      root
        .selectAll("rect.bin")
        .data(bins)
        .join("rect")
        .attr("class", "bin")
        .attr("x", (bin) => x(bin.x0 ?? 0) + 1)
        .attr("y", (bin) => y(bin.length))
        .attr("width", (bin) => Math.max(x(bin.x1 ?? 0) - x(bin.x0 ?? 0) - 2, 0))
        .attr("height", (bin) => innerHeight - y(bin.length))
        .attr("rx", 3)
        .attr("fill", `url(#${gradientId})`)
        .attr("stroke", "#145744")
        .attr("stroke-opacity", 0.35)
        .on("mousemove", (event, bin) => {
          const bounds = wrap.getBoundingClientRect();
          const pointer = d3.pointer(event, wrap);
          setTip({
            x: Math.min(pointer[0], bounds.width - 180),
            y: pointer[1],
            from: bin.x0 ?? 0,
            to: bin.x1 ?? 0,
            count: bin.length,
            share: bin.length / points.length,
          });
        })
        .on("mouseleave", () => setTip(null));

      root
        .append("path")
        .datum(density)
        .attr("fill", "none")
        .attr("stroke", "#c2410c")
        .attr("stroke-width", 2.25)
        .attr("d", densityLine);

      const average = d3.mean(gaps) ?? 0;
      root
        .append("line")
        .attr("x1", x(average))
        .attr("x2", x(average))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#1c1915")
        .attr("stroke-dasharray", "4 4")
        .attr("stroke-width", 1.25);

      root
        .append("text")
        .attr("x", x(average) + 6)
        .attr("y", 12)
        .attr("fill", "#1c1915")
        .attr("font-size", 12)
        .text(`mean ${average.toFixed(2)}`);

      const rug = root.append("g").attr("transform", `translate(0,${innerHeight + 36})`);
      const rugStep = Math.max(1, Math.ceil(points.length / 500));
      const rugPoints = rugStep === 1 ? points : points.filter((_, index) => index % rugStep === 0);
      rug
        .selectAll("line")
        .data(rugPoints)
        .join("line")
        .attr("x1", (point) => x(point.gap))
        .attr("x2", (point) => x(point.gap))
        .attr("y1", 0)
        .attr("y2", 10)
        .attr("stroke", "#1c1915")
        .attr("stroke-opacity", Math.min(0.45, 30 / points.length));

      root
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat((value) => d3.format(".1f")(value as number)))
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 12))
        .call((axis) => axis.selectAll("line, path").attr("stroke", "#c9bfae"));

      root
        .append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")))
        .call((axis) => axis.selectAll("text").attr("fill", "#5c564c").attr("font-size", 12))
        .call((axis) => axis.selectAll("line, path").attr("stroke", "#c9bfae"));

      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 6)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Gap  (prime − predicted)");

      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#5c564c")
        .attr("font-size", 13)
        .text("Primes in bin");
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [generation, gradientId, onReady, points]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg ref={svgRef} role="img" aria-label="Histogram of the gap between each prime and its estimate">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f9e7e" />
            <stop offset="100%" stopColor="#d8efe6" />
          </linearGradient>
        </defs>
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 w-44 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-xs shadow-sm"
          style={{ left: tip.x + 12, top: Math.max(tip.y - 56, 8) }}
        >
          <p className="font-medium text-[#1c1915]">
            {tip.from.toFixed(2)} to {tip.to.toFixed(2)}
          </p>
          <p className="mt-1 text-[#5c564c]">
            {tip.count} prime{tip.count === 1 ? "" : "s"} · {(tip.share * 100).toFixed(1)}%
          </p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#5c564c]">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-[#2f9e7e]" />
          Histogram
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-4 bg-[#c2410c]" />
          Density
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-px border-l border-dashed border-[#1c1915]" />
          Mean gap
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-px bg-[#1c1915]/40" />
          Each prime
        </span>
      </div>
    </div>
  );
}

function silverman(values: number[]): number {
  const n = values.length;
  const sd = d3.deviation(values) ?? 1;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = d3.quantileSorted(sorted, 0.25) ?? sorted[0];
  const q3 = d3.quantileSorted(sorted, 0.75) ?? sorted[sorted.length - 1];
  const iqr = q3 - q1;
  const scale = Math.min(sd, iqr / 1.34) || sd || 1;
  return 0.9 * scale * n ** (-1 / 5);
}

function epanechnikov(bandwidth: number) {
  return (value: number) => {
    const x = value / bandwidth;
    return Math.abs(x) <= 1 ? (0.75 * (1 - x * x)) / bandwidth : 0;
  };
}

function kernelDensity(
  kernel: (value: number) => number,
  samples: number[],
  data: number[],
): [number, number][] {
  return samples.map((sample) => {
    let total = 0;
    for (const value of data) total += kernel(sample - value);
    return [sample, total / data.length];
  });
}
