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
    // Point de départ déterministe : indépendant de la préférence système du
    // navigateur qui exécute les tests (CI ou poste local).
    cy.visit('/profil', { onBeforeLoad: (win) => win.localStorage.setItem('theme', 'light') })
    cy.get('html').should('not.have.class', 'dark')
  })

  it('active le mode sombre via le switch "Mode sombre" et applique la classe "dark" sur <html>', () => {
    cy.contains('Mode sombre').should('be.visible')
    cy.get('button[role="switch"][aria-label="Activer le mode sombre"]')
      .should('have.attr', 'aria-checked', 'false')
      .click()

    cy.get('html').should('have.class', 'dark')
    cy.get('button[role="switch"][aria-label="Activer le mode sombre"]').should(
      'have.attr',
      'aria-checked',
      'true',
    )
  })

  it('persiste le choix après rechargement de la page', () => {
    cy.get('button[role="switch"][aria-label="Activer le mode sombre"]').click()
    cy.get('html').should('have.class', 'dark')

    cy.reload()

    cy.get('html').should('have.class', 'dark')
    cy.get('button[role="switch"][aria-label="Activer le mode sombre"]').should(
      'have.attr',
      'aria-checked',
      'true',
    )
  })

  it('revient au mode clair en cliquant une seconde fois sur le switch', () => {
    cy.get('button[role="switch"][aria-label="Activer le mode sombre"]').click()
    cy.get('html').should('have.class', 'dark')

    cy.get('button[role="switch"][aria-label="Activer le mode sombre"]').click()
    cy.get('html').should('not.have.class', 'dark')
  })
})
