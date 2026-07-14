import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    // Mobile-first (contrainte C2 du dossier — viewport 375px+)
    viewportWidth: 390,
    viewportHeight: 844,
    video: false,
    defaultCommandTimeout: 8000,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    env: {
      apiUrl: 'http://localhost:3001/api',
    },
  },
})
