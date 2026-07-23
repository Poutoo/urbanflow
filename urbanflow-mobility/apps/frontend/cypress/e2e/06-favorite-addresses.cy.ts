import { uniqueEmail } from '../support/utils'

describe('Adresses favorites', () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('favorite-addresses')
    cy.apiRegister(email, password, 'Utilisateur Adresses').its('status').should('eq', 201)
  })

  beforeEach(() => {
    cy.uiLogin(email, password)
    cy.visit('/profil')
  })

  it('ajoute une adresse favorite réelle puis la supprime', () => {
    cy.intercept('GET', '**/api/places*', { fixture: 'places-suggestions.json' }).as('places')

    cy.contains('ADRESSES FAVORITES').should('be.visible')
    cy.contains('button', 'Ajouter une adresse').click()

    cy.get('input[aria-label="Libellé de l\'adresse"]').type('Bureau annexe')
    cy.get('input[aria-label="Adresse"]').type('Tour Eiffel')
    cy.wait('@places')
    cy.contains('button', 'Tour Eiffel, Paris').click()

    cy.contains('button', 'Ajouter').click()

    // L'adresse créée apparaît dans la liste, persistée côté backend (pas de mock sur le POST).
    cy.contains('Bureau annexe').should('be.visible')
    cy.contains('Tour Eiffel, Paris').should('be.visible')

    // Rechargement : la persistance est bien côté backend, pas seulement en mémoire locale.
    cy.reload()
    cy.contains('Bureau annexe').should('be.visible')

    // Suppression réelle via le mode "Gérer"
    cy.contains('button', 'Gérer').click()
    cy.get('button[aria-label="Supprimer Bureau annexe"]').click()
    cy.contains('Bureau annexe').should('not.exist')

    cy.reload()
    cy.contains('Bureau annexe').should('not.exist')
  })

  it("propose l'adresse ajoutée en sélection rapide dans la recherche d'itinéraire", () => {
    cy.intercept('GET', '**/api/places*', { fixture: 'places-suggestions.json' }).as('places')

    cy.contains('button', 'Ajouter une adresse').click()
    cy.get('input[aria-label="Libellé de l\'adresse"]').type('Bureau annexe')
    cy.get('input[aria-label="Adresse"]').type('Tour Eiffel')
    cy.wait('@places')
    cy.contains('button', 'Tour Eiffel, Paris').click()
    cy.contains('button', 'Ajouter').click()
    cy.contains('Bureau annexe').should('be.visible')

    cy.visitCarte()
    cy.contains('button', 'Bureau annexe').should('be.visible').click()

    cy.location('pathname').should('eq', '/itineraires')
  })
})
