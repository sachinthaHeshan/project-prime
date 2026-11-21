export type LinearFit = {
  slope: number;
  intercept: number;
  count: number;
};

/** Least-squares line prime ≈ intercept + slope · n. */
export function fitLinearPrime(points: Array<{ n: number; prime: number }>): LinearFit | null {
  if (points.length === 0) return null;
  let sumN = 0;
  let sumPrime = 0;
  for (const point of points) {
    sumN += point.n;
    sumPrime += point.prime;
  }
  const count = points.length;
  const meanN = sumN / count;
  const meanPrime = sumPrime / count;
  let covariance = 0;
  let variance = 0;
  for (const point of points) {
    const dn = point.n - meanN;
    covariance += dn * (point.prime - meanPrime);
    variance += dn * dn;
  }
  const slope = variance === 0 ? 0 : covariance / variance;
  return { slope, intercept: meanPrime - slope * meanN, count };
}

export function linearPredicted(n: number, fit: LinearFit): number {
  return fit.intercept + fit.slope * n;
}
