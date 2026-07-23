import { uniqueEmail } from '../support/utils'

describe('Mode sombre', () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('dark-mode')
    cy.apiRegister(email, password, 'Utilisateur Mode Sombre').its('status').should('eq', 201)
  })

  beforeEach(() => {
    cy.uiLogin(email, password)
    cy.visit('/profil')
    // Point de départ déterministe : action explicite plutôt que pré-remplissage du
    // localStorage — le thème est aussi synchronisé depuis le backend au montage.
    cy.contains('button[role="radio"]', 'Clair').click()
    cy.get('html').should('not.have.class', 'dark')
  })

  it('active le mode sombre via le contrôle "Sombre" et applique la classe "dark" sur <html>', () => {
    cy.contains('Mode sombre').should('be.visible')
    cy.contains('button[role="radio"]', 'Sombre')
      .should('have.attr', 'aria-checked', 'false')
      .click()

    cy.get('html').should('have.class', 'dark')
    cy.contains('button[role="radio"]', 'Sombre').should('have.attr', 'aria-checked', 'true')
  })

  it('persiste le choix après rechargement de la page', () => {
    cy.contains('button[role="radio"]', 'Sombre').click()
    cy.get('html').should('have.class', 'dark')

    cy.reload()

    cy.get('html').should('have.class', 'dark')
    cy.contains('button[role="radio"]', 'Sombre').should('have.attr', 'aria-checked', 'true')
  })

  it('revient au mode clair en cliquant sur le contrôle "Clair"', () => {
    cy.contains('button[role="radio"]', 'Sombre').click()
    cy.get('html').should('have.class', 'dark')

    cy.contains('button[role="radio"]', 'Clair').click()
    cy.get('html').should('not.have.class', 'dark')
  })
})
