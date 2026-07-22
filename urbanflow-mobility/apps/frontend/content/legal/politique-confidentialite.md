# Politique de confidentialité

*Dernière mise à jour : 22/07/2026*

UrbanFlow Mobility est un projet étudiant non commercial. Cette politique explique quelles données sont collectées, pourquoi, combien de temps elles sont conservées, et quels sont vos droits — conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.

**Responsable du traitement :** DEHU Thibault — contact@poutoo.dev

## 1. Données collectées

| Donnée | Quand | Base légale |
|---|---|---|
| Email, mot de passe (haché) | Inscription | Exécution du contrat (fourniture du service) |
| Nom, prénom (si connexion Google) | Connexion OAuth Google | Exécution du contrat |
| Position géographique (GPS) | Recherche d'itinéraire | **Consentement explicite** (modale dédiée au premier lancement) |
| Adresses favorites (domicile, travail) | Ajout manuel par vous | Exécution du contrat |
| Historique de trajets et CO₂ économisé | Utilisation de l'app | Exécution du contrat |
| Préférences (modes de transport, accessibilité PMR, mode sombre) | Paramètres | Exécution du contrat |

Votre position GPS n'est **jamais stockée** sans votre consentement explicite, et n'est utilisée que pour calculer vos itinéraires — elle n'est ni revendue, ni partagée à des fins publicitaires, ni utilisée pour vous profiler.

## 2. Pourquoi ces données sont collectées

Uniquement pour faire fonctionner le service : vous authentifier, calculer des itinéraires multimodaux pertinents près de vous, et vous permettre de suivre votre empreinte CO₂ personnelle. Aucune donnée n'est utilisée à des fins publicitaires ou revendue à des tiers.

## 3. Durée de conservation

Vos données sont conservées pendant la durée de vie de votre compte, **plus 3 ans après sa suppression ou sa dernière utilisation**, pour des raisons de preuve et de sécurité. Vous pouvez demander la suppression anticipée de votre compte et de vos données à tout moment (voir section 6).

## 4. Sous-traitants et destinataires des données

Vos données transitent ou sont stockées chez les prestataires suivants, tous soumis à des obligations contractuelles de confidentialité :

| Sous-traitant | Rôle | Localisation |
|---|---|---|
| Supabase | Hébergement de la base de données (PostgreSQL) | Union européenne |
| Hetzner | Hébergement du serveur applicatif | Allemagne (UE) |
| Vercel | Hébergement de l'application web | États-Unis (clauses contractuelles types) |
| Google LLC | Authentification, si vous choisissez "Continuer avec Google" | États-Unis (clauses contractuelles types) |

Les données transmises aux APIs de transport (IDFM PRIM, GBFS Vélib', Géovélo) et de météo (OpenWeatherMap) se limitent à des coordonnées GPS ponctuelles nécessaires au calcul d'un itinéraire — aucune donnée d'identification personnelle (email, nom) ne leur est transmise.

## 5. Cookies

UrbanFlow Mobility n'utilise **aucun cookie publicitaire ni traceur tiers à des fins de mesure d'audience**. Les seuls cookies déposés sont strictement nécessaires au fonctionnement du service et ne requièrent pas de consentement, conformément aux recommandations de la CNIL :

| Cookie | Finalité | Durée |
|---|---|---|
| `__Secure-authjs.session-token` | Maintenir votre session connectée | Session / 7 jours (refresh token) |
| `__Host-authjs.csrf-token` | Protection contre les attaques CSRF | Session |
| `__Secure-authjs.callback-url` | Redirection après connexion | Session |
| `__vercel_live_token`, `__vercel_toolbar` | Outils techniques de la plateforme d'hébergement Vercel | Session |

Aucun de ces cookies ne permet de vous suivre d'un site à un autre.

## 6. Vos droits

Conformément au RGPD, vous disposez des droits suivants sur vos données : accès, rectification, effacement, limitation du traitement, portabilité, et opposition. Vous pouvez également retirer votre consentement à la géolocalisation à tout moment depuis les paramètres de l'application, sans que cela affecte la licéité du traitement effectué avant ce retrait.

Pour exercer ces droits, contactez contact@poutoo.dev. Vous disposez également du droit d'introduire une réclamation auprès de la CNIL ([www.cnil.fr](https://www.cnil.fr)) si vous estimez que vos droits ne sont pas respectés.

## 7. Mineurs

Conformément à l'article 45 de la loi Informatique et Libertés (transposant l'article 8 du RGPD), l'âge à partir duquel un mineur peut consentir seul au traitement de ses données personnelles est fixé à **15 ans** en France. Si vous avez moins de 15 ans, l'inscription et l'utilisation d'UrbanFlow Mobility nécessitent le consentement d'un titulaire de l'autorité parentale.

## 8. Sécurité

Les mots de passe sont hachés avec argon2 (jamais stockés en clair). Les communications sont chiffrées (HTTPS/TLS). L'accès aux données est protégé par authentification JWT. Le serveur applicatif est sécurisé (pare-feu à deux niveaux, authentification par clé SSH uniquement, mises à jour de sécurité automatiques).

## 9. Modifications

Cette politique peut être mise à jour ; la date de dernière modification en haut de page en fait foi. En cas de changement substantiel, vous en serez informé via l'application.