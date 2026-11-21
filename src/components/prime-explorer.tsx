"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GapChart, type GapPoint } from "@/components/gap-chart";
import { GapStepChart } from "@/components/gap-step-chart";
import { PrimeStepChart } from "@/components/prime-step-chart";
import { LoadingNote, LoadingOverlay } from "@/components/loading-overlay";
import { RangeForm, DEFAULT_RANGE_END, DEFAULT_RANGE_START } from "@/components/range-form";
import { useAfterPaint } from "@/components/use-after-paint";
import { mean, median, primeRows, type FormulaId, type PrimeRow } from "@/lib/primes";

const DEFAULT_START = DEFAULT_RANGE_START;
const DEFAULT_END = DEFAULT_RANGE_END;

function formatDecimal(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function PrimeExplorer() {
  const work = useAfterPaint({
    applied: { start: DEFAULT_START, end: DEFAULT_END },
    formula: "cipolla" as FormulaId,
  });
  const { applied, formula } = work.value;
  const { busy, finish, generation } = work;

  const rows = useMemo(
    () => primeRows(applied.start, applied.end, formula),
    [applied, formula],
  );
  const comparison = useMemo(() => {
    const original = absoluteGaps(primeRows(applied.start, applied.end, "cipolla"));
    const corrected = absoluteGaps(primeRows(applied.start, applied.end, "corrected"));
    return { original, corrected };
  }, [applied]);
  const comparable = useMemo(
    () => rows.filter((row) => row.gap !== null && row.predicted !== null),
    [rows],
  );
  const gaps = useMemo(() => comparable.map((row) => row.gap as number), [comparable]);
  const points: GapPoint[] = useMemo(
    () =>
      comparable.flatMap((row) =>
        row.prime === null || row.gap === null ? [] : [{ n: row.n, prime: row.prime, gap: row.gap }],
      ),
    [comparable],
  );
  const primePoints = useMemo(
    () => rows.flatMap((row) => (row.prime == null ? [] : [{ n: row.n, prime: row.prime }])),
    [rows],
  );
  const last = rows[rows.length - 1];
  const smallest = extreme(comparable, "min");
  const largest = extreme(comparable, "max");
  const drawn = useRef(new Set<string>());
  const markChart = useCallback(
    (id: string) => {
      drawn.current.add(`${generation}:${id}`);
      const needed = [
        primePoints.length > 0 ? "primes" : null,
        points.length > 0 ? "distribution" : null,
        points.length > 0 ? "steps" : null,
      ].filter((id): id is string => id !== null);
      if (needed.every((id) => drawn.current.has(`${generation}:${id}`))) finish(generation);
    },
    [finish, generation, points.length, primePoints.length],
  );
  const markPrimes = useCallback(() => markChart("primes"), [markChart]);
  const markDistribution = useCallback(() => markChart("distribution"), [markChart]);
  const markSteps = useCallback(() => markChart("steps"), [markChart]);

  useEffect(() => {
    if (!busy || primePoints.length > 0 || points.length > 0) return;
    finish(generation);
  }, [busy, finish, generation, points.length, primePoints.length]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-8">
      <header className="border-b border-[#e4dccb] pb-8">
        <p className="text-xs tracking-[0.22em] text-[#5c564c] uppercase">Prime number theorem</p>
        <h2 className="mt-3 text-4xl leading-tight font-medium sm:text-5xl">
          n from {applied.start.toLocaleString("en-US")} to {applied.end.toLocaleString("en-US")}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5c564c]">
          The nth prime for every index in the range, the estimate of that prime, and how far the
          estimate misses.
        </p>
        <div className="mt-6 rounded-lg border border-[#e4dccb] bg-[#fffaf3] px-5 py-4">
          <label className="flex flex-col gap-1 text-sm text-[#5c564c]">
            Formula
            <select
              className="w-full max-w-xl rounded-md border border-[#e4dccb] bg-white px-3 py-2 text-base text-[#1c1915]"
              value={formula}
              disabled={busy}
              onChange={(event) =>
                work.commit({ applied, formula: event.target.value as FormulaId })
              }
            >
              <option value="cipolla">Original, n (ln n + ln ln n − 1)</option>
              <option value="corrected">Gap-corrected, n (ln n + ln ln n − 1 + 3.8 / (ln n)²)</option>
              <option value="lisqrt">Square-root correction, inverse of li(x) − ½ li(√x)</option>
              <option value="riemann">Riemann explicit, inverse of R(x) − Σ li(x^ρ)</option>
              <option value="willans">Willans exact, truncated sum</option>
            </select>
          </label>
          <Formula formula={formula} />
          <p className="mt-2 text-[#5c564c]">
            Gap = prime − estimate. A positive gap means the real prime is larger than the estimate.
            There is no 0th prime. Formulas that use ln ln n are undefined at n = 1. Willans&apos;
            formula is defined for every n ≥ 1 and returns the exact prime.
          </p>
          {comparison.original !== null && comparison.corrected !== null && (
            <p className="mt-2 text-[#5c564c]">
              On this range the mean absolute gap is {formatDecimal(comparison.original)} for the
              original formula and {formatDecimal(comparison.corrected)} for the gap-corrected
              formula. The 3.8 / (ln n)² term follows that gap. Past it, the miss oscillates. Taking
              the inverse of Riemann&apos;s R function and removing the first 40 zeta-zero waves
              brings the mean absolute gap on n = 2 to 10,000 down to 17.6, from 33.8 and 246.
              Inverting li(x) − ½ li(√x) = n takes only logarithms and has no limit on n. On n = 2
              to 100,000 its mean absolute gap is 162, and the miss keeps growing much more slowly
              than the 3.8 fit.
              Willans&apos; formula is exact, so its gap is 0. The published sum runs to 2^n and
              tests primes with factorials. Every term from the nth prime on is 0, and for n ≥ 6
              that prime lies below n (ln n + ln ln n), so the sum stops there. The factorial test
              counts the same primes a sieve counts.
            </p>
          )}
        </div>
        <RangeForm
          disabled={busy}
          onApply={(start, end) => work.commit({ applied: { start, end }, formula })}
        />
        {busy && <LoadingNote label="Computing primes, gaps, and the chart…" />}
      </header>

      <div className="relative">
        {busy && <LoadingOverlay label="Computing primes, gaps, and the chart…" />}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Indexes"
          value={`${applied.start.toLocaleString("en-US")}–${applied.end.toLocaleString("en-US")}`}
          detail={
            last?.prime == null
              ? "no prime in this range"
              : `p_${applied.end.toLocaleString("en-US")} = ${last.prime.toLocaleString("en-US")}`
          }
        />
        <Stat
          label="Mean gap"
          value={gaps.length === 0 ? "—" : formatDecimal(mean(gaps))}
          detail={gaps.length === 0 ? "no defined gaps" : `median ${formatDecimal(median(gaps))}`}
        />
        <Stat
          label="Smallest gap"
          value={smallest ? formatDecimal(smallest.gap as number) : "—"}
          detail={smallest ? `n = ${smallest.n}, prime ${smallest.prime}` : "no defined gaps"}
        />
        <Stat
          label="Largest gap"
          value={largest ? formatDecimal(largest.gap as number) : "—"}
          detail={largest ? `n = ${largest.n}, prime ${largest.prime}` : "no defined gaps"}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-medium">All primes</h2>
        <p className="mt-1 text-[#5c564c]">
          {rows.length.toLocaleString("en-US")} rows, n = {applied.start.toLocaleString("en-US")}{" "}
          through {applied.end.toLocaleString("en-US")}. Scroll the table to read them.
        </p>
        <PrimeTable rows={rows} start={applied.start} end={applied.end} />
      </section>

      <section className="mt-14 border-t border-[#e4dccb] pt-10">
        <h2 className="text-2xl font-medium">Prime at each n</h2>
        <p className="mt-2 max-w-2xl text-[#5c564c]">
          {primePoints.length === 0
            ? "This range has no primes to chart."
            : `The prime at every index from n = ${primePoints[0].n.toLocaleString("en-US")} to n = ${primePoints[primePoints.length - 1].n.toLocaleString("en-US")}. Each step of the line is the change from one index to the next.`}
        </p>
        {primePoints.length > 0 && (
          <div className="mt-6 rounded-lg border border-[#e4dccb] bg-[#fffaf3] p-4 sm:p-6">
            <PrimeStepChart points={primePoints} generation={generation} onReady={markPrimes} />
          </div>
        )}
      </section>

      <section className="mt-14 border-t border-[#e4dccb] pt-10">
        <h2 className="text-2xl font-medium">Distribution of the gap</h2>
        <p className="mt-2 max-w-2xl text-[#5c564c]">
          {points.length === 0
            ? "This range has no defined gaps, so there is nothing to chart."
            : `How the ${points.length.toLocaleString("en-US")} defined gaps cluster. Bars count primes in each gap range. The curve is a smoothed density scaled to the tallest bar, and the ticks along the baseline mark every prime.`}
        </p>
        {points.length > 0 && (
          <div className="mt-6 rounded-lg border border-[#e4dccb] bg-[#fffaf3] p-4 sm:p-6">
            <GapChart
              points={points}
              generation={generation}
              onReady={markDistribution}
            />
          </div>
        )}
      </section>

      <section className="mt-14 border-t border-[#e4dccb] pt-10">
        <h2 className="text-2xl font-medium">Gap at each n</h2>
        <p className="mt-2 max-w-2xl text-[#5c564c]">
          {points.length === 0
            ? "This range has no defined gaps, so there is nothing to chart."
            : `The gap at every index from n = ${points[0].n.toLocaleString("en-US")} to n = ${points[points.length - 1].n.toLocaleString("en-US")}. Each step of the line is the change from one index to the next.`}
        </p>
        {points.length > 0 && (
          <div className="mt-6 rounded-lg border border-[#e4dccb] bg-[#fffaf3] p-4 sm:p-6">
            <GapStepChart
              points={points}
              generation={generation}
              onReady={markSteps}
            />
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

const ROW_HEIGHT = 36;

function PrimeTable({ rows, start, end }: { rows: PrimeRow[]; start: number; end: number }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(512);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = 0;
    setScrollTop(0);
    const measure = () => setViewport(scroller.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [rows]);

  const from = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 12);
  const count = Math.ceil(viewport / ROW_HEIGHT) + 24;
  const slice = rows.slice(from, from + count);
  const padTop = from * ROW_HEIGHT;
  const padBottom = Math.max(0, (rows.length - from - slice.length) * ROW_HEIGHT);

  return (
    <div
      ref={scrollerRef}
      className="mt-4 max-h-[32rem] overflow-auto rounded-lg border border-[#e4dccb] bg-[#fffaf3]"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">
          Prime index, prime, predicted nth prime, and gap for n from {start} to {end}
        </caption>
        <thead className="sticky top-0 z-10 bg-[#f7f1e6] text-[#5c564c]">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              n
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Prime p<sub>n</sub>
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Predicted
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Gap
            </th>
          </tr>
        </thead>
        <tbody>
          {padTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={4} style={{ height: padTop, padding: 0, border: 0 }} />
            </tr>
          )}
          {slice.map((row) => (
            <tr
              key={row.n}
              className="box-border border-t border-[#e4dccb]"
              style={{ height: ROW_HEIGHT }}
            >
              <td className="num px-4">{row.n}</td>
              <td className="num px-4">{row.prime === null ? "—" : row.prime.toLocaleString("en-US")}</td>
              <td className="num px-4">{row.predicted === null ? "—" : formatDecimal(row.predicted)}</td>
              <td
                className={`num px-4 ${
                  row.gap === null ? "" : row.gap >= 0 ? "text-[#9a3412]" : "text-[#1d4e89]"
                }`}
              >
                {row.gap === null ? "—" : formatDecimal(row.gap)}
              </td>
            </tr>
          ))}
          {padBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={4} style={{ height: padBottom, padding: 0, border: 0 }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function absoluteGaps(rows: PrimeRow[]): number | null {
  const gaps = rows.flatMap((row) => (row.gap === null ? [] : [Math.abs(row.gap)]));
  if (gaps.length === 0) return null;
  return mean(gaps);
}

function Formula({ formula }: { formula: FormulaId }) {
  if (formula === "willans") {
    return (
      <p className="mt-4 text-2xl">
        p<span className="text-base align-sub">n</span>
        <span className="px-2 text-[#5c564c]">=</span>1 + Σ
        <span className="text-base align-sub">i=1</span>
        <span className="text-base align-super">B(n)</span>
        <span className="text-[#5c564c]"> ⌊</span>
        (n / (1+π(i)))
        <span className="text-base align-super">1/n</span>
        <span className="text-[#5c564c]">⌋</span>
        <span className="mt-2 block text-base text-[#5c564c]">
          B(n) = 2^n for n &lt; 6, and ⌈n (ln n + ln ln n)⌉ after that.
        </span>
      </p>
    );
  }
  if (formula === "lisqrt") {
    return (
      <p className="mt-4 text-2xl">
        li(x) − ½ li(√x) = n
        <span className="px-2 text-base text-[#5c564c]">and p_n is that x</span>
      </p>
    );
  }
  if (formula === "riemann") {
    return (
      <p className="mt-4 text-2xl">
        R(x) − Σ<span className="text-base align-sub">ρ</span> li(x
        <span className="text-base align-super">ρ</span>) = n
        <span className="px-2 text-base text-[#5c564c]">and p_n is that x</span>
      </p>
    );
  }
  return (
    <p className="mt-4 text-2xl">
      p<span className="text-base align-sub">n</span>
      <span className="px-2 text-[#5c564c]">=</span>
      n<span className="text-[#5c564c]"> (</span>ln n + ln ln n − 1
      {formula === "corrected" && (
        <>
          <span className="text-[#5c564c]"> + </span>
          3.8 / (ln n)
          <span className="text-base align-super">2</span>
        </>
      )}
      <span className="text-[#5c564c]">)</span>
    </p>
  );
}

function extreme(rows: PrimeRow[], which: "min" | "max"): PrimeRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => {
    const gap = row.gap as number;
    const bestGap = best.gap as number;
    return which === "min" ? (gap < bestGap ? row : best) : gap > bestGap ? row : best;
  });
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-[#e4dccb] bg-[#fffaf3] px-4 py-3">
      <p className="text-xs tracking-wide text-[#5c564c] uppercase">{label}</p>
      <p className="num mt-1 text-2xl">{value}</p>
      <p className="mt-1 text-sm text-[#5c564c]">{detail}</p>
    </div>
  );
}
