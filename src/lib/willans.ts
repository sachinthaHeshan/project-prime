/**
 * Willans' formula for the nth prime:
 *
 *   p_n = 1 + Σ_{i=1}^{2^n} ⌊ (n / Σ_{j=1}^{i} ⌊cos²(π ((j−1)!+1)/j)⌋ )^{1/n} ⌋
 *
 * The inner sum is 1 + π(i): the j = 1 term is 1, and Wilson's theorem makes
 * every later term 1 exactly when j is prime. For every n ≥ 1 the power is
 * below 2, so each floor is 1 when 1+π(i) ≤ n and 0 after that. The last 1
 * sits at i = p_n − 1, and every term from the nth prime through 2^n is 0.
 *
 * Rosser's bound says p_n < n (ln n + ln ln n) for n ≥ 6, so the sum can stop
 * there and still match the sum to 2^n. The factorial test is the prime count,
 * so a sieve builds the same inner sum. The value is still the exact prime.
 */

export function willansBound(n: number): number {
  if (n < 6) return 2 ** n;
  const ln = Math.log(n);
  return Math.ceil(n * (ln + Math.log(ln))) + 2;
}

/** count[i] = 1 + π(i), the inner sum of Willans' formula through i. */
export function willansCount(limit: number): Uint32Array {
  const count = new Uint32Array(limit + 1);
  if (limit < 1) return count;
  count[1] = 1;
  const composite = new Uint8Array(limit + 1);
  let primes = 0;
  for (let i = 2; i <= limit; i++) {
    if (!composite[i]) {
      primes += 1;
      const step = i;
      for (let j = i * i; j <= limit; j += step) composite[j] = 1;
    }
    count[i] = primes + 1;
  }
  return count;
}

/**
 * Evaluate the truncated sum. The summand is 1 for every i with count[i] ≤ n
 * and 0 after the first miss, so the total is the last such i.
 */
export function willansPrime(n: number, count: Uint32Array): number {
  const limit = Math.min(willansBound(n), count.length - 1);
  let lo = 1;
  let hi = Math.max(limit, 1);
  let last = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (mid <= limit && count[mid] <= n) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return 1 + last;
}
