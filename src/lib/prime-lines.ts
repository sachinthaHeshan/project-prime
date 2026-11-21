import type { UlamPoint } from "@/lib/primes";

export type SpiralLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  count: number;
};

/**
 * Prime dots that share a straight line.
 * A spiral with `sides` sides is checked along `2 * sides` compass directions.
 * Opposite directions describe the same line, so each alignment is kept once.
 * Four sides therefore checks the eight directions of the square lattice:
 * the rows, the columns, and both diagonals, each way.
 */
export function spiralPrimeLines(points: UlamPoint[], sides: number, minDots: number): SpiralLine[] {
  const primes = points.filter((point) => point.prime);
  const edge = Math.min(20, Math.max(3, Math.trunc(sides)));
  const lines: SpiralLine[] = [];
  const directions = lineDirections(edge);

  for (const [dx, dy] of directions) {
    const groups = new Map<number, UlamPoint[]>();
    for (const point of primes) {
      const key =
        edge === 4
          ? point.x * dy - point.y * dx
          : Math.round((point.x * dy - point.y * dx) / 0.45);
      const group = groups.get(key);
      if (group) group.push(point);
      else groups.set(key, [point]);
    }

    for (const group of groups.values()) {
      if (group.length < minDots) continue;
      let minProj = Infinity;
      let maxProj = -Infinity;
      let start = group[0];
      let end = group[0];
      for (const point of group) {
        const projection = point.x * dx + point.y * dy;
        if (projection < minProj) {
          minProj = projection;
          start = point;
        }
        if (projection > maxProj) {
          maxProj = projection;
          end = point;
        }
      }
      lines.push({
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        count: group.length,
      });
    }
  }

  return lines;
}

function lineDirections(sides: number): Array<[number, number]> {
  if (sides === 4) {
    return [
      [1, 0],
      [1, -1],
      [0, -1],
      [1, 1],
    ];
  }
  return Array.from({ length: sides }, (_, index) => {
    const angle = (-Math.PI * index) / sides;
    return [Math.cos(angle), Math.sin(angle)] as [number, number];
  });
}
