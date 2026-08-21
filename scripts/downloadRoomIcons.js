// Usage: node scripts/downloadRoomIcons.js
// Fetches all room icons from the Blue Prince wiki and saves them to src/assets/rooms/

import { createWriteStream, mkdirSync, existsSync, unlinkSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(SCRIPT_DIR, '../src/assets/rooms')
const CATEGORY_URL = 'https://blueprince.wiki.gg/wiki/Category:Room_icons'
const BASE_IMAGE_URL = 'https://blueprince.wiki.gg/images/'

mkdirSync(OUT_DIR, { recursive: true })

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function downloadFile(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  await pipeline(res.body, createWriteStream(dest))
}

const html = await fetchText(CATEGORY_URL)

// Extract all File: links from the category page
const fileNames = []
const re = /\/wiki\/File:([^"']+\.png)/gi
let m
while ((m = re.exec(html)) !== null) {
  const name = decodeURIComponent(m[1])
  if (!fileNames.includes(name)) fileNames.push(name)
}

console.log(`Found ${fileNames.length} files`)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let ok = 0, skipped = 0, fail = 0
let backoff = 5000
for (const name of fileNames) {
  const dest = resolve(OUT_DIR, name)
  if (existsSync(dest)) {
    console.log(`  – ${name} (already exists)`)
    skipped++
    continue
  }
  const url = BASE_IMAGE_URL + encodeURIComponent(name)
  try {
    await downloadFile(url, dest)
    console.log(`  ✓ ${name}`)
    ok++
    backoff = 5000
    await sleep(500)
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message} — waiting ${backoff / 1000}s`)
    if (existsSync(dest)) unlinkSync(dest)
    fail++
    await sleep(backoff)
    backoff = Math.min(backoff * 2, 60000)
  }
}

console.log(`\nDone: ${ok} downloaded, ${skipped} skipped, ${fail} failed`)
