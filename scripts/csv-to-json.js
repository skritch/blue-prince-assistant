// Usage: node scripts/csv-to-json.js
// Reads src/lib/data/rooms.csv and writes src/lib/data/rooms.json

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// --- CSV parser ---

function parseCSVLine(line) {
  const fields = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      fields.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur.trim())
  return fields
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
}

// --- Field transformers ---

function toTitleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Keyed by the raw CSV name (lowercased) for targeted fixes
const NAME_CORRECTIONS = {
  'tomb entrnace': 'Tomb Entrance',
  'walk in closet': 'Walk-In Closet'
}

function canonicalName(raw) {
  return NAME_CORRECTIONS[raw.toLowerCase()] ?? toTitleCase(raw)
}

function toSlug(name) {
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SECTION_COLORS = {
  Blue: 'blue', Purple: 'purple', Orange: 'orange',
  Green: 'green', Gold: 'gold', Red: 'red', Black: 'black',
}

function extractColor(section) {
  const seen = new Set()
  const colors = []
  for (const part of section.split(',')) {
    const m = part.match(/\((\w+)\)/)
    const c = m && SECTION_COLORS[m[1]]
    if (c && !seen.has(c)) { colors.push(c); seen.add(c) }
  }
  if (colors.length === 0) return null
  return colors
}

function extractDirectoryPage(section) {
  for (const part of section.split(',').map(s => s.trim())) {
    if (part === 'Additions') continue
    const numMatch = part.match(/^(\d+)/)
    if (numMatch) return parseInt(numMatch[1])
    if (part.startsWith('Blackprint')) return 'blackprint'
    if (part === 'Underground') return 'underground'
    if (part === 'Others') return 'other'
  }
  return null
}

function parseRarity(r) {
  const map = {
    commonplace: 'commonplace',
    standard: 'standard',
    unusual: 'unusual',
    rare: 'rare',
    na: 'special',
    '': 'special',
  }
  return map[r.toLowerCase()] ?? 'special'
}

function parseDoors(doorsStr) {
  const m = doorsStr.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

function parseGemCost(costStr) {
  const m = costStr.match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

function pageOrder(page) {
  if (typeof page === 'number') return page
  if (page === 'blackprint') return 90
  if (page === 'other') return 91
  if (page === 'underground') return 92
  return 99
}

// --- Main ---

const csvText = readFileSync(resolve(ROOT, 'src/lib/data/rooms.csv'), 'utf-8')
const rows = parseCSV(csvText)

const rooms = rows
  .filter(r => {
    const name = r['Room']?.trim()
    const num = r['#']?.trim()
    return name && num && /^\d+$/.test(num)
  })
  .map(r => {
    const name = canonicalName(r['Room'].trim())
    const slug = toSlug(name)
    const section = r['Column 1'] ?? ''
    const specialType = r['Special type'] ?? ''

    return {
      name,
      slug,
      assetPath: `rooms/${slug}.png`,
      color: extractColor(section),
      baseRarity: parseRarity(r['Rarity']),
      baseGemCost: parseGemCost(r['Gem cost']),
      doors: parseDoors(r['Doors']),
      directoryPage: extractDirectoryPage(section),
      roomNumber: parseInt(r['#']),
      deadEnd: specialType.includes('Dead-End'),
    }
  })
  .filter(r => r.directoryPage !== 'other' && r.directoryPage !== 'underground')
  .sort((a, b) => {
    const pd = pageOrder(a.directoryPage) - pageOrder(b.directoryPage)
    return pd !== 0 ? pd : a.roomNumber - b.roomNumber
  })

writeFileSync(
  resolve(ROOT, 'src/lib/data/rooms.json'),
  JSON.stringify(rooms, null, 2),
  'utf-8'
)

console.log(`Wrote ${rooms.length} rooms to rooms.json`)
