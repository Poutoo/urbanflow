import { uniqueEmail } from '../support/utils'

describe('Empreinte CO₂ et badge éco-mobile', () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('co2')
    cy.apiRegister(email, password, 'Utilisateur CO2').its('status').should('eq', 201)
  })

  it("n'affiche aucun badge tant qu'aucun trajet n'a été enregistré", () => {
    cy.uiLogin(email, password)
    cy.visit('/profil')

    cy.contains('Pas encore de badge éco-mobile').should('be.visible')
  })

  it('enregistre un trajet écologique (backend réel) et met à jour le dashboard + le badge', () => {
    cy.uiLogin(email, password)

    cy.intercept('GET', '**/api/places*', { fixture: 'places-suggestions.json' }).as('places')
    cy.visitCarte()
    cy.get('input[aria-label="Destination"]').type('Tour Eiffel')
    cy.wait('@places')
    cy.get('[role="listbox"]').should('be.visible')

    cy.intercept('POST', '**/api/routes/search', { fixture: 'route-search-result-co2.json' }).as(
      'routesSearch',
    )
    cy.contains('[role="option"]', 'Tour Eiffel').click()
    cy.wait('@routesSearch')

    // Stratégie écologique sélectionnée par défaut — trajet à vélo, 6.4 kg de CO₂ économisés
    cy.contains('button', "Démarrer l'itinéraire écologique").should('be.visible')

    // Pas de stub sur /co2/record : on veut le vrai enregistrement en base
    cy.intercept('POST', '**/api/co2/record').as('co2Record')
    cy.contains('button', "Démarrer l'itinéraire écologique").click()
    cy.wait('@co2Record').its('response.statusCode').should('be.oneOf', [200, 201])

    cy.location('pathname').should('eq', '/itineraires/actif')
    cy.contains('En route · Écologique').should('be.visible')

    // Dashboard CO₂ — la semaine reflète le trajet qui vient d'être enregistré
    cy.visit('/empreinte')
    cy.contains('6.4 kg', { timeout: 10000 }).should('be.visible')
    cy.contains('CO₂ évité cette semaine').should('be.visible')
    cy.contains('Objectif mensuel').should('be.visible')
    cy.contains('6.4 / 40 kg').should('be.visible')
    // primaryMode = 'velo' (sectionModeKey mappe bss_rent/bike -> 'velo')
    cy.contains('Vélo').should('be.visible')

    // Badge éco-mobile — palier 1 "Éco-débutant" franchi (seuil 5 kg)
    cy.visit('/profil')
    cy.contains('🌱').should('be.visible')
    cy.contains('Éco-débutant').should('be.visible')
    cy.contains('6.4 / 25 kg pour 🌿 Éco-mobile').should('be.visible')
  })
})
