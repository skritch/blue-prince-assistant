import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

// --- CSV parser ---
// Source: https://docs.google.com/spreadsheets/d/1-c3mLC4gOdG_QrPF4wsFHCehfO2yZ1De_LrXOKzhU8Y/edit?gid=0#gid=0

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

// Rarity corrections for rooms with incorrect data in CSV
const RARITY_CORRECTIONS = {
  'wine-cellar': 'unusual',
  'coat-check': 'standard'
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

// Rooms that appear in multiple sections — override to their canonical page
const PAGE_OVERRIDES = {
  'classroom': 7,
}

// Ad-hoc door count overrides where the CSV value is wrong or missing
const DOOR_OVERRIDES = {
  'her-ladyships-chamber': 1,
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

const DESCRIPTION_BLOCKLIST = new Set(['none', 'puzzle', 'no room description'])

function parseDescription(str) {
  const s = str?.trim()
  if (!s || DESCRIPTION_BLOCKLIST.has(s.toLowerCase())) return null
  return s.charAt(0).toUpperCase() + s.slice(1)
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

const csvText = readFileSync(resolve(SCRIPT_DIR, '../src/data/rooms.csv'), 'utf-8')
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
    const dirPage = PAGE_OVERRIDES[toSlug(name)] ?? extractDirectoryPage(section)

    return {
      name,
      slug,
      assetPath: `rooms/${slug}.png`,
      color: extractColor(section),
      baseRarity: RARITY_CORRECTIONS[slug] ?? parseRarity(r['Rarity']),
      baseGemCost: parseGemCost(r['Gem cost']),
      doors: DOOR_OVERRIDES[slug] ?? parseDoors(r['Doors']),
      directoryPage: dirPage,
      roomNumber: parseInt(r['#']),
      description: parseDescription(r['Room description']),
      tags: [
        specialType.includes('Dead-End') && 'dead-end',
        specialType.includes('Mechanical') && 'mechanical',
        specialType.includes('Tomorrow') && 'tomorrow',
        specialType.includes('Drafting') && 'drafting',
        dirPage == 9 && 'outer',
      ].filter(Boolean),
    }
  })
  .filter(r => r.directoryPage !== 'other' && r.directoryPage !== 'underground' && r.directoryPage !== 'blackprint')
  .sort((a, b) => {
    const pd = pageOrder(a.directoryPage) - pageOrder(b.directoryPage)
    return pd !== 0 ? pd : a.roomNumber - b.roomNumber
  })

writeFileSync(
  resolve(SCRIPT_DIR, '../src/data/rooms.json'),
  JSON.stringify(rooms, null, 2),
  'utf-8'
)

console.log(`Wrote ${rooms.length} rooms to rooms.json`)
