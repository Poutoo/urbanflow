import { uniqueEmail } from '../support/utils'

describe("Recherche d'itinéraire", () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('itineraire')
    cy.apiRegister(email, password, 'Utilisateur Itinéraire').its('status').should('eq', 201)
  })

  beforeEach(() => {
    cy.uiLogin(email, password)
  })

  it('recherche un itinéraire multimodal, compare les stratégies et démarre le trajet sélectionné', () => {
    cy.intercept('GET', '**/api/places*', { fixture: 'places-suggestions.json' }).as('places')

    cy.visitCarte()
    cy.get('input[aria-label="Destination"]').type('Tour Eiffel')
    cy.wait('@places')
    cy.get('[role="listbox"]').should('be.visible')

    cy.intercept('POST', '**/api/routes/search', { fixture: 'route-search-result.json' }).as(
      'routesSearch',
    )
    cy.contains('[role="option"]', 'Tour Eiffel').click()

    cy.location('pathname').should('eq', '/itineraires')
    cy.wait('@routesSearch')

    // Les 3 stratégies sont affichées, écologique recommandée par défaut
    cy.contains('Recommandé · Le plus vert').scrollIntoView().should('be.visible')
    cy.contains('Rapide').scrollIntoView().should('be.visible')
    cy.contains('Écologique').scrollIntoView().should('be.visible')
    cy.contains('Économique').scrollIntoView().should('be.visible')
    cy.contains('button', "Démarrer l'itinéraire écologique").should('be.visible')

    // Changement de sélection vers la stratégie rapide
    cy.contains('Rapide').scrollIntoView().click()
    cy.contains('button', "Démarrer l'itinéraire rapide").should('be.visible')

    cy.intercept('POST', '**/api/co2/record', { statusCode: 200, body: {} }).as('co2Record')
    cy.contains('button', "Démarrer l'itinéraire rapide").click()

    cy.wait('@co2Record').its('request.body').should('deep.equal', {
      co2SavedKg: 0.9,
      co2EmittedKg: 0.45,
      distanceKm: 5.2,
      primaryMode: 'bus',
      strategy: 'fast',
      durationMin: 20,
    })

    cy.location('pathname').should('eq', '/itineraires/actif')
    cy.location('search').should('eq', '?strategy=fast')
    cy.contains('En route · Rapide').should('be.visible')
  })

  it('affiche un message clair si aucune adresse ne correspond à la recherche', () => {
    cy.intercept('POST', '**/api/routes/search', {
      statusCode: 404,
      body: { statusCode: 404, message: 'Aucun itinéraire trouvé', error: 'Not Found' },
    }).as('routesSearchNotFound')

    cy.visit('/itineraires?toAddress=Adresse+Introuvable+XYZ&fromLat=48.8566&fromLng=2.3522&toLat=48.9&toLng=2.4')
    cy.wait('@routesSearchNotFound')

    cy.contains('Aucun itinéraire trouvé pour ce trajet').should('be.visible')
  })
})
