#!/usr/bin/env node
// Dérive les icônes PWA "any" (manifest.json) à partir du logo officiel
// public/logo-mark.png (courbe de flux + feuille, fond transparent — export
// du pack urbanflow-favicon-pack/, cf. apps/frontend/urbanflow-favicon-pack/README.md).
// public/icon-192.png et public/icon-512.png sont aussi fournis tels quels
// (non régénérés ici) : le manifest les référence directement à la racine.
//
// Les variantes maskable (icons/icon-maskable-*.png) et l'apple-touch-icon
// (icons/apple-touch-icon.png) ne sont PAS régénérées par ce script : ce
// sont des exports directs du pack de favicons (safe zone et fond gérés par
// le designer), à remplacer en recopiant le pack le cas échéant plutôt qu'en
// relançant ce script.
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const OUT_DIR = path.join(PUBLIC_DIR, 'icons')

const ICON_SIZES = [72, 96, 128, 144, 152, 384]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const logoBuffer = fs.readFileSync(path.join(PUBLIC_DIR, 'logo-mark.png'))

  // Icônes "any" — rendu direct du logo (fond transparent)
  for (const size of ICON_SIZES) {
    await sharp(logoBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}.png`))
  }

  console.log(`Icônes générées dans ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
