#!/usr/bin/env node
const { spawnSync } = require('child_process')
const path = require('path')

const [, , mode, ...rest] = process.argv

if (mode !== 'open' && mode !== 'run') {
  console.error('Usage: node scripts/run-cypress.js <open|run> [cypress args...]')
  process.exit(1)
}

// Electron (utilisé par Cypress pour piloter le navigateur) refuse de démarrer si
// ELECTRON_RUN_AS_NODE est déjà positionnée dans l'environnement : le binaire
// tourne alors comme un simple process Node et rejette les flags de Cypress
// ("bad option: --smoke-test"). On la retire ici, dans un process Node
// indépendant, avant de spawner le binaire Cypress. La retirer depuis
// cypress.config.ts fait planter Electron (STATUS_ILLEGAL_INSTRUCTION) : ce
// fichier est chargé par le même binaire qui a besoin de cette variable pour
// son propre bootstrap "run as node".
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const binDir = path.join(__dirname, '..', 'node_modules', '.bin')
env.PATH = `${binDir}${path.delimiter}${env.PATH ?? env.Path ?? ''}`

const result = spawnSync('cypress', [mode, ...rest], {
  stdio: 'inherit',
  shell: true,
  env,
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
