import { uniqueEmail } from '../support/utils'

describe('Inscription', () => {
  it('crée un compte avec email/mot de passe et redirige vers la connexion', () => {
    const email = uniqueEmail('register')

    cy.visit('/register')
    cy.contains('h2', 'Créer un compte').should('be.visible')

    cy.get('#nom-complet').type('Camille Test')
    cy.get('#adresse-e-mail').type(email)
    cy.get('#mot-de-passe').type('MotDePasse123!')

    cy.intercept('POST', '**/api/auth/register').as('register')
    cy.contains('button', 'Créer mon compte').click()
    cy.wait('@register').its('response.statusCode').should('eq', 201)

    cy.location('pathname').should('eq', '/login')
    cy.location('search').should('eq', '?registered=1')
  })

  it("affiche des erreurs de validation côté client sans appeler le backend", () => {
    cy.intercept('POST', '**/api/auth/register').as('register')

    cy.visit('/register')
    cy.get('#nom-complet').type('A')
    cy.get('#adresse-e-mail').type('pas-un-email')
    cy.get('#mot-de-passe').type('court')
    cy.contains('button', 'Créer mon compte').click()

    cy.contains('Le nom doit contenir au moins 2 caractères').should('be.visible')
    cy.contains('Adresse email invalide').should('be.visible')
    cy.contains('Au moins 8 caractères').should('be.visible')

    // Le formulaire est bloqué avant tout appel réseau
    cy.get('@register.all').should('have.length', 0)
  })

  it('refuse une inscription avec un email déjà utilisé (409 backend réel)', () => {
    const email = uniqueEmail('duplicate')

    cy.apiRegister(email, 'MotDePasse123!', 'Premier Compte').its('status').should('eq', 201)

    cy.visit('/register')
    cy.get('#nom-complet').type('Deuxième Compte')
    cy.get('#adresse-e-mail').type(email)
    cy.get('#mot-de-passe').type('AutreMotDePasse123!')

    cy.intercept('POST', '**/api/auth/register').as('register')
    cy.contains('button', 'Créer mon compte').click()
    cy.wait('@register').its('response.statusCode').should('eq', 409)

    cy.get('[role="alert"]').should('contain.text', 'Cette adresse email est déjà utilisée')
    cy.location('pathname').should('eq', '/register')
  })

  it('initie le flux OAuth Google au clic (mocké — pas de vrais identifiants Google en local)', () => {
    cy.intercept('POST', '**/api/auth/signin/google*', {
      statusCode: 200,
      body: { url: '/login' },
    }).as('googleSignin')

    cy.visit('/login')
    cy.contains('button', 'Continuer avec Google').click()

    cy.wait('@googleSignin').then((interception) => {
      expect(interception.request.body).to.include('callbackUrl')
    })
  })
})
