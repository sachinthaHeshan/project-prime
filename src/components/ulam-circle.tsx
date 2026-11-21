"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingNote, LoadingOverlay } from "@/components/loading-overlay";
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
        </div>
      </div>
      </div>
    </div>
  );
}

function UlamCanvas({
  points,
  sides,
  generation = 0,
  onReady,
}: {
  points: UlamPoint[];
  sides: number;
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
    };

    draw();
    onReady?.(generation);
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [generation, onReady, points]);

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
