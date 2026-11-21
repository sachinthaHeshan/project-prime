"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingNote, LoadingOverlay } from "@/components/loading-overlay";
import { spiralPrimeLines, type SpiralLine } from "@/lib/prime-lines";
import {
  DEFAULT_RANGE_END,
  DEFAULT_RANGE_START,
  DEFAULT_SPIRAL_SIDES,
  RangeForm,
} from "@/components/range-form";
import { useAfterPaint } from "@/components/use-after-paint";
import { ulamPoints, type UlamPoint } from "@/lib/primes";

type Placed = UlamPoint & { px: number; py: number };

const SHAPE_NAMES: Record<number, string> = {
  3: "triangle",
  4: "square",
  5: "pentagon",
  6: "hexagon",
  7: "heptagon",
  8: "octagon",
  9: "nonagon",
  10: "decagon",
  12: "dodecagon",
  20: "icosagon",
};

function shapeName(sides: number) {
  return SHAPE_NAMES[sides] ?? `${sides}-sided shape`;
}

export function UlamCircle() {
  const work = useAfterPaint({
    start: DEFAULT_RANGE_START,
    end: DEFAULT_RANGE_END,
    sides: DEFAULT_SPIRAL_SIDES,
  });
  const range = work.value;
  const { busy, finish, generation } = work;
  const points = useMemo(
    () => ulamPoints(range.start, range.end, range.sides),
    [range],
  );

  useEffect(() => {
    if (!busy || points.length > 0) return;
    finish(generation);
  }, [busy, finish, generation, points.length]);
  const primeCount = points.reduce((count, point) => count + (point.prime ? 1 : 0), 0);
  const [advanced, setAdvanced] = useState(false);
  const [analyzer, setAnalyzer] = useState<"line" | "shape">("line");
  const [minWidth, setMinWidth] = useState("1.5");
  const [maxWidth, setMaxWidth] = useState("7");
  const [minDots, setMinDots] = useState("4");
  const [lineError, setLineError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ key: string; lines: SpiralLine[] } | null>(null);
  const rangeKey = `${range.start}:${range.end}:${range.sides}`;
  const lines = analysis?.key === rangeKey ? analysis.lines : null;
  const stroke = useMemo(() => {
    const min = Number(minWidth);
    const max = Number(maxWidth);
    return {
      min: Number.isFinite(min) ? min : 1.5,
      max: Number.isFinite(max) ? max : 7,
    };
  }, [maxWidth, minWidth]);

  function startLineAnalysis() {
    const min = Number(minWidth);
    const max = Number(maxWidth);
    const dots = Number(minDots);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
      setLineError("Line width must be greater than 0.");
      setAnalysis(null);
      return;
    }
    if (min > max) {
      setLineError("Min line width must be at most the max line width.");
      setAnalysis(null);
      return;
    }
    if (!Number.isInteger(dots) || dots < 2) {
      setLineError("Min dots must be a whole number of at least 2.");
      setAnalysis(null);
      return;
    }
    setLineError(null);
    setAnalysis({ key: rangeKey, lines: spiralPrimeLines(points, range.sides, dots) });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-8">
      <header>
        <h2 className="text-4xl leading-tight font-medium sm:text-5xl">Ulam circle</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5c564c]">
          Integers from the start through the end, wound in a spiral whose sides you choose. Four
          sides is Ulam&apos;s square. Three is a triangle, and each step up to 20 adds another
          side. 1 sits at the center. Primes are marked in green.
        </p>
        <RangeForm
          className="mt-6"
          includeSides
          disabled={busy}
          onApply={(start, end, sides = DEFAULT_SPIRAL_SIDES) =>
            work.commit({ start, end, sides })
          }
        />
        {busy && <LoadingNote label="Placing numbers on the spiral…" />}
      </header>

      <div className="relative">
        {busy && <LoadingOverlay label="Placing numbers on the spiral…" />}
      <p className="mt-6 text-[#5c564c]">
        {shapeName(range.sides)} spiral, {range.sides} sides. {points.length.toLocaleString("en-US")}{" "}
        numbers, {primeCount.toLocaleString("en-US")} primes.
        {range.start < 1 ? " 0 is not placed on the spiral." : ""}
      </p>

      <div className="mt-4 rounded-lg border border-[#e4dccb] bg-[#fffaf3] p-4 sm:p-6">
        {points.length === 0 ? (
          <p className="text-[#5c564c]">This range has no integers to place on the spiral.</p>
        ) : (
          <UlamCanvas
            points={points}
            sides={range.sides}
            lines={advanced && analyzer === "line" ? lines : null}
            minWidth={stroke.min}
            maxWidth={stroke.max}
            generation={generation}
            onReady={finish}
          />
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#5c564c]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1f6e56]" />
            Prime
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c9bfae]" />
            Composite
          </span>
          {lines && advanced && analyzer === "line" && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-0.5 w-4 bg-[#9a3412]/70" />
              Aligned primes
            </span>
          )}
        </div>
        <div className="mt-4 border-t border-[#e4dccb] pt-4">
          <button
            type="button"
            aria-pressed={advanced}
            disabled={busy}
            className={`rounded-md border px-4 py-2 text-sm ${
              advanced
                ? "border-[#1c1915] bg-[#1c1915] text-[#fffaf3]"
                : "border-[#e4dccb] bg-[#fffaf3] text-[#1c1915]"
            } disabled:opacity-50`}
            onClick={() => setAdvanced((value) => !value)}
          >
            Advanced analyze {advanced ? "on" : "off"}
          </button>
          {advanced && (
            <div className="mt-4">
              <label className="flex max-w-xs flex-col gap-1 text-sm text-[#5c564c]">
                Analyzer
                <select
                  className="rounded-md border border-[#e4dccb] bg-white px-3 py-2 text-base text-[#1c1915]"
                  value={analyzer}
                  disabled={busy}
                  onChange={(event) => setAnalyzer(event.target.value as "line" | "shape")}
                >
                  <option value="line">Line analyzer</option>
                  <option value="shape">Shape analyzer</option>
                </select>
              </label>
              {analyzer === "line" ? (
                <form
                  className="mt-4 flex flex-wrap items-end gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    startLineAnalysis();
                  }}
                >
                  <p className="w-full text-sm text-[#5c564c]">
                    A {range.sides}-sided spiral is checked in {range.sides * 2} directions. Four
                    sides uses the eight square directions. A line is drawn when at least the
                    minimum number of primes sit on it. More primes make a wider, stronger red line.
                  </p>
                  <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
                    Min dots
                    <input
                      className="num w-24 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-base text-[#1c1915]"
                      inputMode="numeric"
                      value={minDots}
                      disabled={busy}
                      onChange={(event) => setMinDots(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
                    Min line width
                    <input
                      className="num w-24 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-base text-[#1c1915]"
                      inputMode="decimal"
                      value={minWidth}
                      disabled={busy}
                      onChange={(event) => setMinWidth(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
                    Max line width
                    <input
                      className="num w-24 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-base text-[#1c1915]"
                      inputMode="decimal"
                      value={maxWidth}
                      disabled={busy}
                      onChange={(event) => setMaxWidth(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || points.length === 0}
                    className="rounded-md bg-[#1c1915] px-4 py-2 text-sm text-[#fffaf3] disabled:opacity-50"
                  >
                    Start analyze
                  </button>
                  {lineError && <p className="w-full text-sm text-[#9a3412]">{lineError}</p>}
                  {lines && (
                    <p className="w-full text-sm text-[#5c564c]">
                      {lines.length.toLocaleString("en-US")} lines in {range.sides * 2} directions.
                    </p>
                  )}
                </form>
              ) : (
                <p className="mt-4 text-sm text-[#5c564c]">Shape analyzer is not ready yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function UlamCanvas({
  points,
  sides,
  lines,
  minWidth,
  maxWidth,
  generation = 0,
  onReady,
}: {
  points: UlamPoint[];
  sides: number;
  lines: SpiralLine[] | null;
  minWidth: number;
  maxWidth: number;
  generation?: number;
  onReady?: (generation: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placedRef = useRef<Placed[]>([]);
  const [hover, setHover] = useState<{ n: number; prime: boolean; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const draw = () => {
      const width = wrap.clientWidth;
      const height = Math.min(width, 720);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      const pad = 16;
      const spanX = Math.max(maxX - minX, 1);
      const spanY = Math.max(maxY - minY, 1);
      const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
      const originX = (width - (minX + maxX) * scale) / 2;
      const originY = (height - (minY + maxY) * scale) / 2;
      const placed: Placed[] = points.map((point) => ({
        ...point,
        px: originX + point.x * scale,
        py: originY + point.y * scale,
      }));
      placedRef.current = placed;

      ctx.fillStyle = "#fffaf3";
      ctx.fillRect(0, 0, width, height);

      const dot = Math.max(1.1, Math.min(3.2, Math.min(width, height) / (Math.max(spanX, spanY) * 1.6)));
      for (const point of placed) {
        if (point.prime) continue;
        ctx.beginPath();
        ctx.fillStyle = "#c9bfae";
        ctx.arc(point.px, point.py, dot * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const point of placed) {
        if (!point.prime) continue;
        ctx.beginPath();
        ctx.fillStyle = "#1f6e56";
        ctx.arc(point.px, point.py, dot, 0, Math.PI * 2);
        ctx.fill();
      }

      if (lines && lines.length > 0) {
        const richest = Math.max(...lines.map((line) => line.count));
        const poorest = Math.min(...lines.map((line) => line.count));
        ctx.lineCap = "round";
        for (const line of lines) {
          const span = richest - poorest;
          const weight = span === 0 ? 1 : (line.count - poorest) / span;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(154, 52, 18, ${0.28 + weight * 0.42})`;
          ctx.lineWidth = minWidth + weight * (maxWidth - minWidth);
          ctx.moveTo(originX + line.x1 * scale, originY + line.y1 * scale);
          ctx.lineTo(originX + line.x2 * scale, originY + line.y2 * scale);
          ctx.stroke();
        }
      }
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [generation, lines, maxWidth, minWidth, onReady, points]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${shapeName(sides)} spiral of integers, ${sides} sides, with primes in green`}
        onMouseMove={(event) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          let nearest: Placed | null = null;
          let best = 12;
          for (const point of placedRef.current) {
            const distance = Math.hypot(point.px - x, point.py - y);
            if (distance < best) {
              best = distance;
              nearest = point;
            }
          }
          setHover(
            nearest
              ? { n: nearest.n, prime: nearest.prime, x: nearest.px, y: nearest.py }
              : null,
          );
        }}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-3 py-2 text-xs shadow-sm"
          style={{ left: hover.x + 12, top: Math.max(hover.y - 36, 8) }}
        >
          <p className="num text-sm text-[#1c1915]">{hover.n.toLocaleString("en-US")}</p>
          <p className="text-[#5c564c]">{hover.prime ? "Prime" : "Composite"}</p>
        </div>
      )}
    </div>
  );
}
