/**
 * Estimate of the nth prime from Riemann's first correction to the prime count:
 * li(x) − ½ li(√x) = n, and p_n is that x.
 *
 * li(x) alone already follows the primes for every n. Subtracting half the
 * integral at the square root removes most of the bias, and inverting it takes
 * only logarithms. There is no sieve and no upper bound on n.
 */
const EULER = 0.5772156649015328606;

function exponentialIntegral(x: number): number {
  let sum = 0;
  let term = x;
  for (let k = 1; k < 80; k++) {
    sum += term / k;
    term *= x / (k + 1);
    if (k > 12 && Math.abs(term) < 1e-15 * (Math.abs(sum) + 1)) break;
  }
  return EULER + Math.log(Math.abs(x)) + sum;
}

function logarithmicIntegral(x: number): number {
  if (x <= 1) return 0;
  return exponentialIntegral(Math.log(x));
}

function primeCount(x: number): number {
  return logarithmicIntegral(x) - 0.5 * logarithmicIntegral(Math.sqrt(x));
}

export function liSqrtPrime(n: number, guess?: number): number {
  const ln = Math.log(n);
  let x = guess ?? n * (ln + Math.log(ln) - 1);
  if (!Number.isFinite(x) || x < 3) x = 3;
  for (let step = 0; step < 8; step++) {
    const logX = Math.log(x);
    const slope = (1 / logX) * (1 - 0.5 / Math.sqrt(x));
    if (!(slope > 0)) break;
    const next = x - (primeCount(x) - n) / slope;
    if (!Number.isFinite(next) || next < 2) break;
    if (Math.abs(next - x) < 1e-8 * x) return next;
    x = next;
  }
  return x;
}
