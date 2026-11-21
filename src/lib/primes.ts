import { fitLinearPrime, linearPredicted } from "@/lib/linear-prime";
import { liSqrtPrime } from "@/lib/li-prime";
import { riemannPrime } from "@/lib/riemann";
import { willansBound, willansCount, willansPrime } from "@/lib/willans";

export type PrimeRow = {
  n: number;
  prime: number | null;
  predicted: number | null;
  gap: number | null;
};

export type UlamPoint = {
  n: number;
  x: number;
  y: number;
  prime: boolean;
};

/**
 * Polygonal Ulam spiral for integers from `start` through `end`.
 * 1 is the center. The walk turns by a full circle divided into `sides`
 * equal turns, starting to the right. The leg grows by one after every
 * `sides - 2` turns, which is the square Ulam spiral when `sides` is 4.
 * 0 is not on the spiral.
 */
export function ulamPoints(start: number, end: number, sides = 4): UlamPoint[] {
  const from = Math.max(1, start);
  if (end < from) return [];
  const edgeCount = Math.min(20, Math.max(3, Math.trunc(sides)));

  const prime = new Uint8Array(end + 1);
  prime.fill(1);
  prime[0] = 0;
  prime[1] = 0;
  for (let i = 2; i * i <= end; i++) {
    if (!prime[i]) continue;
    for (let j = i * i; j <= end; j += i) prime[j] = 0;
  }

  const dirs: Array<[number, number]> =
    edgeCount === 4
      ? [
          [1, 0],
          [0, -1],
          [-1, 0],
          [0, 1],
        ]
      : Array.from({ length: edgeCount }, (_, index) => {
          const angle = (-2 * Math.PI * index) / edgeCount;
          return [Math.cos(angle), Math.sin(angle)];
        });
  let x = 0;
  let y = 0;
  let n = 1;
  let dir = 0;
  let leg = 1;
  const coords: Array<[number, number]> = [];
  coords[1] = [0, 0];
  const repeat = edgeCount - 2;

  while (n < end) {
    for (let turn = 0; turn < repeat && n < end; turn++) {
      const [dx, dy] = dirs[dir];
      for (let step = 0; step < leg && n < end; step++) {
        x += dx;
        y += dy;
        n += 1;
        coords[n] = [x, y];
      }
      dir = (dir + 1) % edgeCount;
    }
    leg += 1;
  }

  const points: UlamPoint[] = [];
  for (let value = from; value <= end; value++) {
    const coord = coords[value];
    points.push({ n: value, x: coord[0], y: coord[1], prime: prime[value] === 1 });
  }
  return points;
}

/** Primes from 2 through `limit`, inclusive. */
export function primesUpTo(limit: number): number[] {
  if (limit < 2) return [];
  const composite = new Uint8Array(limit + 1);
  const primes: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (composite[i]) continue;
    primes.push(i);
    const step = i;
    for (let j = i * i; j <= limit; j += step) composite[j] = 1;
  }
  return primes;
}

/** The first `count` primes, p_1 through p_count. */
export function firstPrimes(count: number): number[] {
  if (count < 1) return [];
  let limit = 32;
  if (count >= 6) {
    const ln = Math.log(count);
    limit = Math.ceil(count * (ln + Math.log(ln)) * 1.25);
  }
  let primes = primesUpTo(limit);
  while (primes.length < count) {
    limit = Math.ceil(limit * 1.5);
    primes = primesUpTo(limit);
  }
  return primes.slice(0, count);
}

export type FormulaId = "cipolla" | "corrected" | "lisqrt" | "riemann" | "willans" | "linear";

/**
 * The gap of n (ln n + ln ln n − 1) tracks about 3.8 n / (ln n)^2
 * for n from 2 through 10,000. Adding that term is the corrected estimate.
 */
export const GAP_CORRECTION = 3.8;

/**
 * Estimate of the nth prime. Undefined at n = 0 and n = 1 because ln ln n
 * is not a real number.
 */
export function predictedPrime(
  n: number,
  formula: FormulaId = "cipolla",
  guess?: number,
): number | null {
  if (formula === "willans") {
    if (n < 1) return null;
    return willansPrime(n, willansCount(willansBound(n)));
  }
  if (n < 2 || formula === "linear") return null;
  if (formula === "lisqrt") return liSqrtPrime(n, guess);
  if (formula === "riemann") return riemannPrime(n, guess);
  const ln = Math.log(n);
  const lnln = Math.log(ln);
  const correction = formula === "corrected" ? GAP_CORRECTION / (ln * ln) : 0;
  return n * (ln + lnln - 1 + correction);
}

/** One row per index from `from` through `to`, inclusive. n = 0 has no prime. */
export function primeRows(from: number, to: number, formula: FormulaId = "cipolla"): PrimeRow[] {
  const primes = firstPrimes(Math.max(to, 0));
  const willans =
    formula === "willans" && to >= 1 ? willansCount(willansBound(Math.max(to, 1))) : null;
  const linearSamples: Array<{ n: number; prime: number }> = [];
  if (formula === "linear") {
    for (let n = Math.max(from, 1); n <= to; n++) linearSamples.push({ n, prime: primes[n - 1] });
  }
  const linear = formula === "linear" ? fitLinearPrime(linearSamples) : null;
  const rows: PrimeRow[] = [];
  let guess = 5;
  for (let n = from; n <= to; n++) {
    const prime = n >= 1 ? primes[n - 1] : null;
    const predicted =
      willans !== null && n >= 1
        ? willansPrime(n, willans)
        : linear !== null && prime != null
          ? linearPredicted(n, linear)
          : prime === null || prime === undefined
            ? null
            : predictedPrime(n, formula, guess);
    if (predicted !== null && (formula === "riemann" || formula === "lisqrt")) guess = predicted;
    rows.push({
      n,
      prime: prime ?? null,
      predicted,
      gap: predicted === null || prime == null ? null : prime - predicted,
    });
  }
  return rows;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}
