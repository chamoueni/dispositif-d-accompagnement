# Documentation du projet « Dispositif d'accompagnement »

Cette documentation décrit le projet **tel qu'il est dans le code**. Elle s'adresse à un développeur qui le découvre. Quand une information n'existe pas dans le dépôt, c'est écrit : « Non trouvé dans le code ».

## Sommaire

| N° | Fichier | Contenu |
|---|---|---|
| 01 | [Architecture générale](01-architecture.md) | Les grandes parties, comment elles communiquent, l'arborescence |
| 02 | [Frontend](02-frontend.md) | Démarrage, routes, état, formulaires, chaque page |
| 03 | [Composants](03-html-composants.md) | Hiérarchie, props, événements, rôle de chaque composant |
| 04 | [CSS et design](04-css-design.md) | Fichiers de style, variables, responsive, accessibilité |
| 05 | [Backend](05-backend.md) | Le serveur Express et ses 7 routes |
| 06 | [Base de données](06-base-de-donnees.md) | Tables, règles RLS, requêtes, écarts avec le MCD |
| 07 | [Authentification et sécurité](07-authentification-securite.md) | Connexion, rôles, failles, données personnelles |
| 08 | [Flux complets](08-flux-complets.md) | Le parcours de chaque fonctionnalité, du clic à l'écran |
| 09 | [Analyse fichier par fichier](09-analyse-fichiers.md) | Les fichiers et fonctions clés expliqués |
| 10 | [Technologies](10-technologies.md) | Bibliothèques, versions, services externes |
| 11 | [Déploiement](11-deploiement.md) | Lancer en local, variables d'environnement, mise en production |
| 12 | [Où modifier quoi](12-ou-modifier-quoi.md) | « Je veux… » → fichiers à ouvrir |
| 13 | [Glossaire](13-glossaire.md) | Les termes techniques expliqués simplement |

**Par où commencer** : lire 01, puis 08 (les flux), puis garder 12 sous la main.

---

## Infos projet

### Objectif

Mettre en relation des personnes âgées de Mayotte avec des intervenants capables de les aider : personnel de santé pour les soins, particuliers pour les courses et le ménage.

### Nom

Le propriétaire appelle le dispositif **« Au Fil des Âges »**. Ce nom **n'apparaît pas dans le code** : l'interface affiche « Dispositif d'accompagnement » (`frontend/src/components/AppNav.vue`, `frontend/src/App.vue`) et l'onglet du navigateur « Dispositif d'accompagnement personnalisé » (`index.html`).

### Public cible

Des personnes âgées, souvent sur téléphone et avec une connexion parfois lente. D'où : texte assez grand, mode confort, lecture à voix haute, dictée, interface en français, shimaoré et kibushi, bouton SOS permanent.

### Acteurs

| Acteur | Valeur dans le code | Ce qu'il fait |
|---|---|---|
| Personne âgée | `role = 'senior'` | Cherche un intervenant, envoie des demandes, choisit une formule |
| Personnel de santé | `role = 'sante'` | Propose des soins, gère ses disponibilités, répond aux demandes |
| Particulier | `role = 'particulier'` | Propose courses et/ou ménage, gère ses disponibilités, répond aux demandes |
| Administrateur | compte dont l'e-mail est égal à la constante `ADMIN_EMAIL` | Gère comptes, adhérents et messages, suit les demandes |

### Services

| Service | Situation dans le code |
|---|---|
| Soins | Réservable. Proposé par tout compte de rôle `sante` (`type_service = 'soins'`). |
| Coursier (courses) | Réservable. Case cochée par un particulier (`services` contient `coursier`). |
| Ménage | Réservable. Case cochée par un particulier (`services` contient `menage`). |
| Service de garde, soutien psychologique | **Présentés** sur l'accueil et la page Services, mais non réservables. |
| Aide à domicile, déplacement, compagnie | Proposés dans l'assistant de besoin, marqués indisponibles (`disponible: false`). |

### Stack (vérifiée dans le code)

| Couche | Technologie |
|---|---|
| Frontend | Vite 8 + Vue 3, Vue Router, Pinia, vue-i18n, Bootstrap 5 (Sass), Leaflet |
| Backend | Node.js + Express 5, dans `backend/` |
| Base de données et comptes | Supabase (PostgreSQL, Supabase Auth, règles RLS, une fonction Edge) |
| Déploiement | Code sur GitHub ; hébergement Render indiqué par le propriétaire, **sans fichier de configuration dans le dépôt** |

### Liens

| Lien | Valeur |
|---|---|
| Dépôt GitHub | `https://github.com/chamoueni/dispositif-d-accompagnement` (dépôt distant `origin`) |
| Site déployé | **Non trouvé dans le code** — à compléter |
| API déployée | **Non trouvée dans le code** — à compléter (valeur de `VITE_API_URL`) |
| Projet Supabase | Non trouvé dans le code (adresse dans `.env`, non versionné) |

### Lancer le projet

```bash
npm install
copy .env.example .env      # puis remplir les valeurs
npm run dev:full            # frontend sur le port 5173, API sur le port 3001
```

Détail et variables dans [11-deploiement.md](11-deploiement.md).

### Structure

```
frontend/src/            Frontend Vue
  pages/        25 vues, une par route
  components/   23 composants réutilisables (dont 3 pour l'admin)
  stores/       auth, accessibilité, admin, adhérents
  composables/  logique réutilisable (voix, thème, connexion, intervenants)
  data/store.js toutes les requêtes Supabase métier
  router/       routes et garde de navigation
  locales/      traductions fr / shi / kib
  styles/       feuilles CSS
backend/         Backend Express (7 routes)
supabase/       schema.sql (tables + règles RLS) et la fonction Edge
frontend/public/         favicon et emplacements des fichiers audio
```

---

## Écarts avec la conception

Synthèse des différences entre le code et la conception d'origine (cahier des charges, MCD). Le détail est dans [06-base-de-donnees.md](06-base-de-donnees.md) § 6 et [10-technologies.md](10-technologies.md) § 7.

### Modèle de données

| Entité du MCD | Dans le code |
|---|---|
| UTILISATEUR | `auth.users` + table `profiles` |
| PERSONNE_AGEE, PERSONNEL_SANTE, PARTICULIER | Pas de tables : une colonne `profiles.role` |
| DISPONIBILITE | Pas de table : colonne `profiles.disponibilites` (`jsonb`) |
| SERVICE | Pas de table : colonne `profiles.services` (`text[]`) et `demandes.type_service` |
| DEMANDE | Table `demandes` (avec en plus `urgence`, `code_arrivee`, statut `terminee`) |
| MISE_EN_RELATION | Table `mises_en_relation` |
| AVIS_EVALUATION | Table `avis` : texte libre sur le dispositif, sans note, sans lien avec un intervenant |
| NOTIFICATION | **Absente** |
| — | Tables ajoutées : `messages_contact`, `adherents` |

### Fonctionnalités prévues et absentes

- **Notifications** aux utilisateurs.
- **Validation des profils** par l'administrateur : pas de statut « en attente » ; un intervenant est visible dès son inscription.
- **Suspension d'un compte** : la colonne `actif` existe mais ne bloque rien.
- **Suppression de son compte** par l'utilisateur.
- **Disponibilités saisies à l'inscription** : elles se saisissent dans le profil.
- **Filtre par jour ou créneau** dans la recherche (présent seulement dans l'assistant).
- **Annulation automatique** d'une demande sans réponse.
- **Coordonnées masquées jusqu'à l'acceptation** : le téléphone de l'intervenant est affiché dès la recherche.

### Fonctionnalités présentes et non prévues

Formules d'accompagnement avec paiement simulé, assistant de besoin, carte de Mayotte, code d'arrivée, historique, bouton SOS (urgence 112 et message à l’équipe), messages de contact, trois langues, lecture et dictée vocales, mode confort, thème sombre, gestion des adhérents.

### Technique

- Base **PostgreSQL** (Supabase) et non MySQL.
- Le navigateur accède **directement** à la base, protégée par des règles RLS ; l'API Express n'est qu'un complément.
- Hachage des mots de passe et jetons délégués à Supabase Auth.

---

## Problèmes et incohérences repérés

Classés par importance. Chaque point renvoie au document qui le détaille.

**Sécurité**

1. Tout utilisateur connecté peut lire le téléphone et l'adresse de tous les profils — [06](06-base-de-donnees.md) § 3.
2. Les règles RLS ne contrôlent pas les changements de statut ni le rôle — [06](06-base-de-donnees.md) § 3.

**Fiabilité**

6. L'acceptation d'une demande fait trois écritures qui ne sont pas groupées — [08](08-flux-complets.md) § 7.
7. Les adhérents sont stockés dans un fichier JSON sur le disque du serveur, suivi par Git — [05](05-backend.md) § 8.
8. Plusieurs actions n'affichent aucun message en cas d'échec — [02](02-frontend.md) § 6.
9. La page Assistant est publique mais ne peut rien afficher à un visiteur non connecté — [02](02-frontend.md) § 8.
10. Aucun test automatisé.

**Cohérence**

11. Le `README.md` de la racine cite des fichiers qui n'existent plus — [01](01-architecture.md) § 5.
12. Un sous-dossier non suivi duplique tout le dépôt, avec son propre `.env` — [01](01-architecture.md) § 5.
13. L'e-mail de l'administrateur est écrit en dur dans quatre fichiers — [05](05-backend.md) § 7.
14. L'accueil envoie un paramètre `?ville=` que la page de recherche ne lit pas — [02](02-frontend.md) § 8.
15. Les limites annoncées par les formules ne sont appliquées nulle part — [08](08-flux-complets.md) § 14.
16. Le compteur et les marqueurs de l'accueil sont réservés aux connectés, que le routeur redirige hors de l'accueil — [02](02-frontend.md) § 8.
17. `MayotteSymbol.vue` et `frontend/public/icons.svg` ne sont plus utilisés — [09](09-analyse-fichiers.md).

## À retenir

- Frontend Vue qui parle directement à Supabase ; petit backend Express en complément.
- Trois rôles en base, plus un administrateur reconnu par son e-mail.
- Le modèle de données est plus simple que le MCD : une table `profiles` regroupe utilisateurs, services et disponibilités.
- Les priorités d'amélioration sont la protection des routes du backend et le resserrement des règles RLS.
