

// A sparse immutable vector, indexed by named keys rather than positions.
export class KeyedVec<K extends string | number = string> {
  readonly data: ReadonlyMap<K, number>

  constructor(data?: Map<K, number>) {
    this.data = data ?? new Map()
  }

  get(key: K): number {
    return this.data.get(key) ?? 0
  }

  set(key: K, value: number): KeyedVec<K> {
    const next = new Map(this.data)
    next.set(key, value)
    return new KeyedVec(next)
  }

  entries(): [K, number][] {
    return [...this.data.entries()]
  }

  values(): number[] {
    return [...this.data.values()]
  }


  get length(): number {
    return this.data.size
  }

  // Element-wise add — union of keys, summing values for shared keys.
  add(other: KeyedVec<K>): KeyedVec<K> {
    const result = new Map(this.data)
    for (const [k, v] of other.data) {
      result.set(k, (result.get(k) ?? 0) + v)
    }
    return new KeyedVec(result)
  }

  // Multiply all values by a scalar.
  mult(s: number): KeyedVec<K> {
    const result = new Map<K, number>()
    for (const [k, v] of this.data) {
      result.set(k, v * s)
    }
    return new KeyedVec(result)
  }

  mean(): number {
    return this.sum() / this.data.size
  }

  static empty<K extends string | number = string>(): KeyedVec<K> {
    return new KeyedVec<K>()
  }

  sum(): number {
    let s = 0
    for (const v of this.data.values()) s += v
    return s
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
