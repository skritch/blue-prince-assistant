export function partition<T>(arr: T[], pred: (x: T) => boolean): [T[], T[]] {
  const pass: T[] = [], fail: T[] = []
  for (const x of arr) (pred(x) ? pass : fail).push(x)
  return [pass, fail]
}