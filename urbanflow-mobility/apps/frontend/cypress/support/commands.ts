/// <reference types="cypress" />

const API_URL = Cypress.env('apiUrl') as string

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Crée un utilisateur directement via l'API backend (rapide, hors UI). */
      apiRegister(email: string, password: string, name?: string): Chainable<Cypress.Response<unknown>>
      /** Se connecte via le vrai formulaire de connexion (flux UI complet). */
      uiLogin(email: string, password: string): Chainable<void>
      /** Ouvre /carte avec le consentement géoloc pré-accepté et la position stubée (Paris). */
      visitCarte(): Chainable<void>
    }
  }
}

Cypress.Commands.add('apiRegister', (email: string, password: string, name = 'Utilisateur E2E') => {
  return cy.request({
    method: 'POST',
    url: `${API_URL}/auth/register`,
    body: { email, password, name },
    failOnStatusCode: false,
  })
})

Cypress.Commands.add('uiLogin', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('#adresse-e-mail').type(email)
  cy.get('#mot-de-passe').type(password)
  cy.contains('button', 'Se connecter').click()
  cy.location('pathname', { timeout: 10000 }).should('eq', '/carte')
})

Cypress.Commands.add('visitCarte', () => {
  cy.visit('/carte', {
    onBeforeLoad(win) {
      win.localStorage.setItem('geo_consent', 'true')
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
        (success: PositionCallback) => {
          success({
            coords: {
              latitude: 48.8566,
              longitude: 2.3522,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition)
        },
      )
    },
  })
})

export {}
