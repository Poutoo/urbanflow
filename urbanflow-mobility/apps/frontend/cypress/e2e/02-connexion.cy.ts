import { uniqueEmail } from '../support/utils'

describe('Connexion', () => {
  const password = 'MotDePasse123!'
  let email: string

  before(() => {
    email = uniqueEmail('login')
    cy.apiRegister(email, password, 'Utilisateur Connexion').its('status').should('eq', 201)
  })

  it('refuse une connexion avec un mauvais mot de passe (backend réel)', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type(email)
    cy.get('input[name="password"]').type('MauvaisMotDePasse')
    cy.contains('button', 'Se connecter').click()

    cy.contains('Email ou mot de passe incorrect').should('be.visible')
    cy.location('pathname').should('eq', '/login')
  })

  it("affiche une erreur de validation pour un email mal formé sans appel réseau", () => {
    cy.intercept('POST', '**/api/auth/login').as('login')

    cy.visit('/login')
    cy.get('input[name="email"]').type('pas-un-email')
    cy.get('input[name="password"]').type(password)
    cy.contains('button', 'Se connecter').click()

    cy.contains('Adresse email invalide').should('be.visible')
    cy.get('@login.all').should('have.length', 0)
  })

  it('connecte un utilisateur existant et redirige vers la carte', () => {
    cy.uiLogin(email, password)
    cy.location('pathname').should('eq', '/carte')

    // La session authentifiée débloque l'accès à la navigation principale
    cy.get('nav[aria-label="Navigation principale"]').should('be.visible')
    cy.contains('nav a', 'Carte').should('have.attr', 'aria-current', 'page')
  })
})
