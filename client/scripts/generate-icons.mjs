// Generates PWA app icons from the source koru-bean mark
// (design/assets/logo-primary.svg) into client/public/icons.
// Run from the client package: `npm run icons`.
// The SVG in /design/assets stays the source of truth; these PNGs are build artifacts.
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../design/assets/logo-primary.svg')
const maskableSrc = resolve(here, '../../design/assets/logo-maskable.svg')
const outDir = resolve(here, '../public/icons')

mkdirSync(outDir, { recursive: true })
const svg = readFileSync(src)

// Render the vector at high density first, then downscale for a crisp result.
for (const size of [192, 512]) {
  const out = resolve(outDir, `icon-${size}.png`)
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(out)
  console.info(`wrote ${out}`)
}

// Maskable icon (full-bleed, safe-zone padding) for a clean Android home-screen icon.
const maskableOut = resolve(outDir, 'icon-maskable-512.png')
await sharp(readFileSync(maskableSrc), { density: 600 }).resize(512, 512).png().toFile(maskableOut)
console.info(`wrote ${maskableOut}`)
