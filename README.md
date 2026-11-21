# Project Prime

An interactive nth-prime explorer for comparing prime-number formulas, measuring their errors, and viewing prime distributions as polygonal Ulam spirals.

The application is built with Next.js, React, TypeScript, Tailwind CSS, and D3.

<img width="3024" height="2540" alt="Project Prime graphical distribution" src="https://github.com/user-attachments/assets/4ffcbe01-bb3c-4ffd-a937-3c7c5ce74c24" />
<img width="3024" height="4638" alt="Project Prime formula testing" src="https://github.com/user-attachments/assets/dc2b8acb-5dd3-4fb3-892f-395a033458a9" />

## System features

### Formula testing

- Choose one of five nth-prime formulas.
- Set an inclusive index range from `0` through `100,000`.
- View the real prime, predicted value, and signed gap for every index.
- Review the mean, median, smallest, and largest gap.
- Scroll through large ranges in a virtualized table. Only visible rows are rendered.
- Inspect an interactive D3 histogram, density curve, mean marker, and sampled prime rug.
- Plot the prime at every index immediately after the table, with `n` on the horizontal axis and the prime on the vertical axis.
- Follow the gap at every index, with `n` on the horizontal axis and the gap on the vertical axis.
- Count how often each number appears in the primes. That histogram defaults to digits 0–9 and can be set anywhere from 0 to 1,000.
- Count primes by remainder. Enter a divisor from 2 to 1,000. The last histogram shows every remainder from 0 to one less than that divisor, and how many primes leave it.
- Keep the current result visible when an invalid range is entered.
- See a loading overlay while primes, estimates, statistics, and the chart are being calculated.

The displayed gap is:

```text
gap = actual prime - predicted value
```

A positive gap means that the formula predicted a number below the real prime. A negative gap means that it predicted above the real prime.

There is no 0th prime. Formulas containing `ln ln n` are undefined at `n = 0` and `n = 1`.

### Graphical distribution

- Place integers on a polygonal Ulam spiral.
- Change the range from `0` through `100,000`.
- Change the polygon from 3 through 20 sides.
- Use 4 sides for the classic square Ulam spiral.
- Use 3 sides for a triangular spiral or 20 sides for a nearly circular spiral.
- Hover over a point to see its integer and whether it is prime or composite.
- Turn on Advanced analyze and choose Line analyzer. Start analyze draws semi-transparent red lines through prime dots that share a straight line. A spiral with `s` sides is checked in `2s` directions, so four sides checks eight directions. Min dots sets how many primes a line needs. Min and max line width set how thin or thick those lines are drawn; lines with more primes are wider.
- Green dots are prime; pale dots are composite.
- See a loading state until the canvas has finished drawing.

The spiral starts with `1` at the center. Zero is not placed. For an `s`-sided spiral, the walk turns by `2π/s`, and its leg length increases after every `s - 2` turns.

## Formula reference

The selector contains estimates and an exact method. An estimate can be extremely close without always landing on a prime. An exact method must still do prime-counting work; there is no known constant-cost formula that returns the exact nth prime for arbitrary `n`.

### 1. Original prime-number-theorem estimate

```text
p_n ≈ n (ln n + ln ln n - 1)
```

This is the first part of Cipolla's asymptotic expansion. It is fast and uses only elementary logarithms, but its absolute miss grows with `n`.

Examples:

- `n = 10`: estimate `21.366`; actual prime `29`; gap `7.634`
- `n = 100`: estimate `513.235`; actual prime `541`; gap `27.765`
- `n = 1,000`: estimate `7,840.400`; actual prime `7,919`; gap `78.600`

### 2. Gap-corrected estimate

```text
p_n ≈ n (ln n + ln ln n - 1 + 3.8 / (ln n)^2)
```

The added term was fitted to the observed gap on the application's smaller ranges. It substantially improves those ranges, but it is empirical rather than an exact theorem and eventually drifts as `n` becomes large.

Examples:

- `n = 10`: estimate `28.533`; actual prime `29`; gap `0.467`
- `n = 100`: estimate `531.153`; actual prime `541`; gap `9.847`
- `n = 1,000`: estimate `7,920.036`; actual prime `7,919`; gap `-1.036`

### 3. Square-root logarithmic-integral correction

```text
li(x) - 1/2 li(sqrt(x)) = n
p_n ≈ x
```

Here `li` is the logarithmic integral. The application solves the equation with a short Newton iteration. The `li(x)` term approximates the number of primes up to `x`; subtracting half of `li(√x)` applies the first prime-power correction. This method uses no sieve to produce its estimate and is suitable for arbitrarily large positive `n` within the numeric precision of the runtime.

Examples:

- `n = 10`: estimate `26.094`; actual prime `29`; gap `2.906`
- `n = 100`: estimate `522.613`; actual prime `541`; gap `18.387`
- `n = 1,000`: estimate `7,886.994`; actual prime `7,919`; gap `32.006`

On `n = 2` through `100,000`, its measured mean absolute gap is approximately `162`.

### 4. Riemann explicit estimate

```text
R(x) - sum over rho of li(x^rho) = n
p_n ≈ x
```

`R(x)` is Riemann's smooth prime-counting function and `rho` represents non-trivial zeros of the zeta function. The implementation:

1. evaluates Riemann's `R` function with Möbius-weighted logarithmic integrals;
2. subtracts oscillations from the first 40 critical-line zeta zeros;
3. inverts the resulting count with Newton iteration.

This is the most accurate estimator in the application on the studied range, but it is more computationally expensive than the elementary and square-root methods.

Examples from a sequential calculation:

- `n = 10`: estimate `28.729`; actual prime `29`; gap `0.271`
- `n = 100`: estimate `540.936`; actual prime `541`; gap `0.064`
- `n = 1,000`: estimate `7,924.013`; actual prime `7,919`; gap `-5.013`

On `n = 2` through `10,000`, its measured mean absolute gap is approximately `17.5`.

### 5. Willans exact formula, truncated

The published Willans formula is:

```text
p_n = 1 + sum from i=1 to 2^n of
      floor((n / sum from j=1 to i of
      floor(cos^2(pi ((j - 1)! + 1) / j)))^(1/n))
```

Wilson's theorem makes the inner floor identify primes. The formula is exact, but directly evaluating factorials through `2^n` is impractical.

This project evaluates an equivalent reduced form:

```text
p_n = 1 + sum from i=1 to B(n) of floor((n / (1 + pi(i)))^(1/n))

B(n) = 2^n                              when n < 6
B(n) = ceil(n (ln n + ln ln n))         when n >= 6
```

Why the reduction remains exact:

- The inner Willans sum is `1 + π(i)`.
- Each outer term is `1` while `1 + π(i) <= n`, then `0`.
- Every term from the nth prime onward is therefore zero.
- Rosser's upper bound places `p_n` below `n(ln n + ln ln n)` for `n >= 6`.
- A sieve calculates the same prime-count sequence without repeated factorials.

Examples:

- `n = 10`: result `29`; actual prime `29`; gap `0`
- `n = 100`: result `541`; actual prime `541`; gap `0`
- `n = 1,000`: result `7,919`; actual prime `7,919`; gap `0`

This method is exact, not a constant-time closed form. Its reduced computation is essentially prime counting.

## Example comparison

For `n = 1,000`, where the real prime is `7,919`:

| Formula | Result | Gap |
| --- | ---: | ---: |
| Original | 7,840.400 | 78.600 |
| Gap-corrected | 7,920.036 | -1.036 |
| Square-root correction | 7,886.994 | 32.006 |
| Riemann explicit | 7,924.013 | -5.013 |
| Willans reduced | 7,919.000 | 0.000 |

## Performance

- A sieve generates the real primes used as the comparison baseline.
- Formula results are memoized until the selected range or formula changes.
- The large table is virtualized instead of creating up to 100,001 DOM rows.
- The chart uses all gaps for its histogram and density calculation but limits the rug to at most 500 marks.
- Long work is deferred by one browser task so the loading indicator can paint first.
- Generation tokens prevent an old chart or canvas draw from clearing a newer loading state.

The UI intentionally caps ranges at `100,000` to keep interactive browser work responsive. That UI cap is separate from the mathematical domain of the approximation formulas.

## Technology

- [Next.js](https://nextjs.org/) 16 App Router
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [D3](https://d3js.org/) 7
- HTML canvas for polygonal spirals

## Run locally

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # start the development server
npm run build    # create a production build
npm run start    # run the production build
npm run lint     # run ESLint
```

## Project structure

```text
src/
├── app/                    # App Router page, layout, and global theme
├── components/
│   ├── app-tabs.tsx        # Formula and graphical tabs
│   ├── prime-explorer.tsx  # Formula controls, statistics, and virtual table
│   ├── gap-chart.tsx       # D3 gap distribution
│   ├── ulam-circle.tsx     # Polygonal spiral canvas
│   └── range-form.tsx      # Validated range and side inputs
└── lib/
    ├── primes.ts           # Sieve, rows, estimates, and spiral coordinates
    ├── li-prime.ts         # Square-root logarithmic-integral estimator
    ├── riemann.ts          # Riemann explicit estimator
    └── willans.ts          # Reduced exact Willans evaluation
```

## Notes and limitations

- Predictions are shown as decimals even when they happen to be integers.
- Except for the reduced Willans method, a prediction is not guaranteed to be prime.
- JavaScript numbers use IEEE-754 double precision, so extremely large indices eventually lose integer precision.
- The Riemann estimator uses only the first 40 zeta zeros; adding more zeros may improve detail but increases cost.
- The gap-corrected formula is a range-derived fit and should not be treated as a universal bound.

## License

No license has been added. Copyright remains with the repository owner.
