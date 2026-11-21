/**
 * Imaginary parts of the first 40 zeros of the Riemann zeta function
 * on the critical line.
 */
const ZETA_ZEROS = [
  14.134725142, 21.022039639, 25.01085758, 30.424876126, 32.935061588, 37.586178159,
  40.918719012, 43.327073281, 48.005150881, 49.773832478, 52.970321478, 56.446247698,
  59.347044003, 60.831778525, 65.112544048, 67.079810529, 69.546401711, 72.067157674,
  75.704690699, 77.144840339, 79.33737502, 82.910380854, 84.735492981, 87.425274613,
  88.809111208, 92.491899271, 94.651344041, 95.870634228, 98.831194218, 101.317851006,
  103.72553804, 105.446623052, 107.168611184, 111.029535543, 111.874659177, 114.320220915,
  116.226680321, 118.790782866, 121.370125002, 122.946829294,
];

const EULER = 0.5772156649015328606;

const mobius = new Int8Array(50);
const least = new Uint8Array(50);
const sievePrimes: number[] = [];
mobius[1] = 1;
for (let i = 2; i < mobius.length; i++) {
  if (least[i] === 0) {
    least[i] = i;
    sievePrimes.push(i);
    mobius[i] = -1;
  }
  for (const prime of sievePrimes) {
    const value = prime * i;
    if (value >= mobius.length) break;
    least[value] = prime;
    if (i % prime === 0) break;
    mobius[value] = -mobius[i];
  }
}

function eiReal(x: number): number {
  let sum = 0;
  let term = x;
  for (let k = 1; k < 200; k++) {
    sum += term / k;
    term *= x / (k + 1);
    if (k > 16 && Math.abs(term) < 1e-14 * (Math.abs(sum) + 1)) break;
  }
  return EULER + Math.log(Math.abs(x)) + sum;
}

function logarithmicIntegral(x: number): number {
  if (x <= 1) return 0;
  return eiReal(Math.log(x));
}

/** Riemann's smooth prime-counting function R(x). */
function riemannR(x: number): number {
  let sum = 0;
  for (let k = 1; k < mobius.length; k++) {
    if (mobius[k] === 0) continue;
    const root = Math.exp(Math.log(x) / k);
    if (root <= 1) break;
    sum += (mobius[k] / k) * logarithmicIntegral(root);
  }
  return sum;
}

function multiply(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

function divide(a: [number, number], b: [number, number]): [number, number] {
  const denom = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / denom, (a[1] * b[0] - a[0] * b[1]) / denom];
}

/**
 * Oscillation Σ_ρ li(x^ρ), summed over the first zeros and their conjugates.
 * This is the part of the prime-count gap that a smooth formula cannot see.
 */
function zeroOscillation(x: number): number {
  const ln = Math.log(x);
  let sum = 0;
  for (const height of ZETA_ZEROS) {
    const z: [number, number] = [0.5 * ln, height * ln];
    const magnitude = Math.exp(z[0]);
    const exponential: [number, number] = [magnitude * Math.cos(z[1]), magnitude * Math.sin(z[1])];
    let term: [number, number] = [1, 0];
    let series: [number, number] = [1, 0];
    const inverse = divide([1, 0], z);
    for (let m = 1; m <= 8; m++) {
      term = [term[0] * m, term[1] * m];
      term = multiply(term, inverse);
      if (Math.hypot(term[0], term[1]) > 2) break;
      series = [series[0] + term[0], series[1] + term[1]];
    }
    const value = multiply(divide(exponential, z), series);
    sum += 2 * value[0];
  }
  return sum;
}

function primeCount(x: number): number {
  return riemannR(x) - zeroOscillation(x);
}

/**
 * nth-prime estimate from inverting R(x) − Σ li(x^ρ) = n.
 * `guess` should be the previous estimate when walking n in order.
 */
export function riemannPrime(n: number, guess?: number): number {
  const ln = Math.log(n);
  let x = guess ?? n * (ln + Math.log(ln));
  if (!Number.isFinite(x) || x < 2.5) x = 5;
  for (let step = 0; step < 10; step++) {
    const slope = 1 / Math.log(x);
    let next = x - (primeCount(x) - n) / slope;
    if (!Number.isFinite(next) || next < 2.5) next = 2.5;
    if (Math.abs(next - x) < 0.02) return next;
    x = next;
  }
  return x;
}
