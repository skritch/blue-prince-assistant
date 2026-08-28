

// A sparse named probability vector: maps string keys to numeric weights.
// Supports the arithmetic needed for combining draft probability distributions.
export class PVec {
  readonly data: Readonly<Record<string, number>>

  constructor(data: Record<string, number> = {}) {
    this.data = data
  }

  get(key: string): number {
    return this.data[key] ?? 0
  }

  // Return a new PVec with one key set (or overwritten).
  set(key: string, value: number): PVec {
    return new PVec({ ...this.data, [key]: value })
  }

  entries(): [string, number][] {
    return Object.entries(this.data)
  }

  get length(): number {
    return Object.keys(this.data).length
  }

  // Element-wise add — union of keys, summing values for shared keys.
  add(other: PVec): PVec {
    const result = { ...this.data }
    for (const [k, v] of Object.entries(other.data)) {
      result[k] = (result[k] ?? 0) + v
    }
    return new PVec(result)
  }

  // Multiply all values by a scalar.
  mult(s: number): PVec {
    const result: Record<string, number> = {}
    for (const [k, v] of Object.entries(this.data)) {
      result[k] = v * s
    }
    return new PVec(result)
  }

  mean(): number {
    return this.sum() / Object.values(this.data).length
  }

  static empty(): PVec {
    return new PVec()
  }

  sum(): number {
    return Object.values(this.data).reduce((s, v) => s + v, 0)
  }

}

// P(Binomial(n, p) >= k) — probability that at least k of n independent
// Bernoulli trials with success probability p come up heads.
export function binomialAtLeast(n: number, p: number, k: number): number {
  if (k <= 0) return 1
  if (k > n) return 0
  if (p <= 0) return 0
  if (p >= 1) return k <= n ? 1 : 0

  // Accumulate CDF P(X <= k-1) via iterative PMF to avoid factorial overflow.
  // pmf(j) = pmf(j-1) * (n-j+1)/j * p/(1-p)
  const odds = p / (1 - p)
  let pmf = Math.pow(1 - p, n)
  let cdf = pmf
  for (let j = 1; j < k; j++) {
    pmf *= (odds * (n - j + 1)) / j
    cdf += pmf
  }
  return 1 - cdf
}
