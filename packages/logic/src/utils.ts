export function partition<T>(arr: T[], pred: (x: T) => boolean): [T[], T[]] {
  const pass: T[] = [], fail: T[] = []
  for (const x of arr) (pred(x) ? pass : fail).push(x)
  return [pass, fail]
}


export function removeFirst<T>(arr: T[], pred: (x: T) => boolean) {
  const firstIdx = arr.findIndex(pred)
  if (firstIdx != -1) {
    arr = [...arr.slice(0, firstIdx), ...arr.slice(firstIdx)]
  }
  return arr
}

export function toSlug(str: string): string {
  return str.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}