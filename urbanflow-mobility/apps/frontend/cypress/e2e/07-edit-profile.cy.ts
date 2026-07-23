import { uniqueEmail } from '../support/utils'

describe('Édition du profil (nom + avatar)', () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('edit-profile')
    cy.apiRegister(email, password, 'Nom Initial').its('status').should('eq', 201)
  })

  beforeEach(() => {
    cy.uiLogin(email, password)
    cy.visit('/profil')
  })

  it('modifie le nom et sélectionne un avatar prédéfini, persisté après reload', () => {
    cy.get('button[aria-label="Modifier le profil"]').click()

    cy.get('#profile-name').clear().type('Nom Modifié')
    cy.get('button[aria-label="Avatar avatar-05"]').click()
    cy.contains('button', 'Enregistrer').click()

    cy.contains('Nom Modifié').should('be.visible')
    cy.get('img[alt="Avatar de Nom Modifié"]').should('have.attr', 'src', '/avatars/avatar-05.svg')

    cy.reload()
    cy.contains('Nom Modifié').should('be.visible')
    cy.get('img[alt="Avatar de Nom Modifié"]').should('have.attr', 'src', '/avatars/avatar-05.svg')
  })

  it("n'enregistre rien si on annule l'édition", () => {
    cy.get('button[aria-label="Modifier le profil"]').click()
    cy.get('#profile-name').clear().type('Ne Doit Pas Être Sauvé')
    cy.contains('button', 'Annuler').click()

    cy.contains('Ne Doit Pas Être Sauvé').should('not.exist')
    cy.get('button[aria-label="Modifier le profil"]').should('be.visible')
  })
})
