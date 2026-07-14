#!/usr/bin/env node
// Dérive le jeu d'icônes PWA (manifest.json) à partir du logo officiel fourni
// dans public/logo.svg (pin + feuille + trace de trajet, fond dégradé Ocean
// Blue). public/icon-192.png et public/icon-512.png sont aussi fournis tels
// quels (non régénérés ici) : le manifest les référence directement à la
// racine. Ce script ne comble que les tailles manquantes + les variantes
// maskable + l'apple-touch-icon, à partir de la même source vectorielle.
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const OUT_DIR = path.join(PUBLIC_DIR, 'icons')
const PRIMARY = '#1A5F7A'

const ICON_SIZES = [72, 96, 128, 144, 152, 384]
const MASKABLE_SIZES = [192, 512]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const svgBuffer = fs.readFileSync(path.join(PUBLIC_DIR, 'logo.svg'))

  // Icônes "any" — rendu direct du logo (fond arrondi + pin + feuille + trace)
  for (const size of ICON_SIZES) {
    await sharp(svgBuffer, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}.png`))
  }

  // Icônes maskable — le logo garde son propre cadre arrondi (coins
  // transparents), donc on le réduit et le centre sur un fond plein
  // bord-à-bord pour rester dans la safe zone (~80%) quel que soit le
  // masque (cercle, squircle...) appliqué par l'OS.
  for (const size of MASKABLE_SIZES) {
    const inner = Math.round(size * 0.72)
    const logoResized = await sharp(svgBuffer, { density: 384 })
      .resize(inner, inner)
      .png()
      .toBuffer()

    await sharp({
      create: { width: size, height: size, channels: 4, background: PRIMARY },
    })
      .composite([{ input: logoResized, gravity: 'center' }])
      .png()
      .toFile(path.join(OUT_DIR, `icon-maskable-${size}.png`))
  }

  // Apple touch icon — iOS affiche les zones transparentes en noir, donc
  // fond aplati sur la couleur primaire plutôt que des coins transparents.
  await sharp(svgBuffer, { density: 384 })
    .resize(180, 180)
    .flatten({ background: PRIMARY })
    .png()
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'))

  console.log(`Icônes générées dans ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
