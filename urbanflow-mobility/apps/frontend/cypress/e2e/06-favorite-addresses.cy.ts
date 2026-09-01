import { uniqueEmail } from '../support/utils'

describe('Adresses favorites', () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('favorites')
    cy.apiRegister(email, password, 'Utilisateur Adresses').its('status').should('eq', 201)
  })

  beforeEach(() => {
    cy.uiLogin(email, password)
    cy.visit('/profil')
  })

  it("n'affiche aucune adresse favorite pour un utilisateur qui vient d'être créé", () => {
    cy.contains('ADRESSES FAVORITES').should('be.visible')
    cy.contains('button', 'Ajouter une adresse').should('be.visible')
    cy.get('[aria-label^="Supprimer "]').should('not.exist')
  })

  it('ajoute une adresse favorite réelle (backend non stubé) et la retrouve après rechargement', () => {
    cy.intercept('GET', '**/api/places*', { fixture: 'places-suggestions.json' }).as('places')

    cy.contains('button', 'Ajouter une adresse').click()

    // L'id du champ vient du prop `label` de <Input> (dérivé automatiquement)
    // — on cible par le <label> visible pour rester robuste à son implémentation.
    cy.contains('label', 'Libellé').invoke('attr', 'for').then((forId) => {
      cy.get(`#${forId}`).type('Tour Eiffel')
    })

    cy.contains('label', 'Adresse').invoke('attr', 'for').then((forId) => {
      cy.get(`#${forId}`).type('Tour Eiffel')
    })
    cy.wait('@places')
    cy.contains('button', 'Tour Eiffel, Paris').click()

    // Pas de stub sur /favorite-addresses : on veut la vraie création en base
    cy.intercept('POST', '**/api/favorite-addresses').as('createAddress')
    cy.contains('button', 'Enregistrer').click()
    cy.wait('@createAddress').its('response.statusCode').should('eq', 201)

    cy.contains('Tour Eiffel').should('be.visible')
    cy.contains('Tour Eiffel, Paris').should('be.visible')
    cy.contains('button', 'Ajouter une adresse').should('be.visible') // le formulaire s'est refermé

    // Persistance réelle : toujours là après un rechargement complet de la page
    cy.reload()
    cy.contains('Tour Eiffel', { timeout: 10000 }).should('be.visible')
    cy.contains('Tour Eiffel, Paris').should('be.visible')
  })

  it('supprime une adresse favorite réelle et elle disparaît après rechargement', () => {
    cy.contains('Tour Eiffel', { timeout: 10000 }).should('be.visible')

    // Cypress confirme automatiquement window.confirm() (retourne true) sans stub explicite.
    cy.intercept('DELETE', '**/api/favorite-addresses/*').as('deleteAddress')
    cy.get('[aria-label="Supprimer Tour Eiffel"]').click()
    cy.wait('@deleteAddress').its('response.statusCode').should('eq', 204)

    cy.contains('Tour Eiffel').should('not.exist')

    cy.reload()
    cy.contains('Tour Eiffel', { timeout: 10000 }).should('not.exist')
    cy.contains('button', 'Ajouter une adresse').should('be.visible')
  })
})
