# Documentation du projet « Dispositif d'accompagnement »

Cette documentation décrit le projet **tel qu'il est dans le code**. Elle s'adresse à un développeur qui le découvre. Quand une information n'existe pas dans le dépôt, c'est écrit : « Non trouvé dans le code ».

> **Mise à jour de novembre 2026 : migration vers alwaysdata.** Le projet a quitté Supabase (base + comptes) et Render (hébergement). Tout tourne maintenant chez **alwaysdata** : une base **PostgreSQL**, un site **front** (fichiers statiques) et un site **back** (API Node.js), hébergés séparément. Les comptes sont gérés par le serveur lui-même (mots de passe hachés avec bcrypt, connexion par jeton JWT). Le pas-à-pas de la mise en ligne est dans [../DEPLOIEMENT.md](../DEPLOIEMENT.md).

## Sommaire

| N° | Fichier | Contenu |
|---|---|---|
| 01 | [Architecture générale](01-architecture.md) | Les grandes parties, comment elles communiquent, l'arborescence |
| 02 | [Frontend](02-frontend.md) | Démarrage, routes, état, formulaires, chaque page |
| 03 | [Composants](03-html-composants.md) | Hiérarchie, props, événements, rôle de chaque composant |
| 04 | [CSS et design](04-css-design.md) | Fichiers de style, variables, responsive, accessibilité |
| 05 | [Backend](05-backend.md) | Le serveur Express : routes, contrôleurs, services, modèles SQL |
| 06 | [Base de données](06-base-de-donnees.md) | Tables PostgreSQL, contrôles d'accès, requêtes, écarts avec le MCD |
| 07 | [Authentification et sécurité](07-authentification-securite.md) | Connexion, rôles, protections, données personnelles |
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

Le propriétaire appelle le dispositif **« Au Fil des Âges »**. Ce nom apparaît dans les **emails** envoyés par le serveur ([email.service.js](../backend/services/email.service.js)) ; l'interface, elle, affiche « Dispositif d'accompagnement » (`frontend/src/components/AppNav.vue`, `frontend/src/App.vue`) et l'onglet du navigateur « Dispositif d'accompagnement personnalisé » (`frontend/index.html`).

### Public cible

Des personnes âgées, souvent sur téléphone et avec une connexion parfois lente. D'où : texte assez grand, mode confort, lecture à voix haute, dictée, interface en français, shimaoré et kibushi, bouton SOS permanent.

### Acteurs

| Acteur | Valeur dans le code | Ce qu'il fait |
|---|---|---|
| Personne âgée | `profiles.role = 'senior'` | Cherche un intervenant, envoie des demandes, choisit une formule |
| Personnel de santé | `profiles.role = 'sante'` | Propose des soins, gère ses disponibilités, répond aux demandes |
| Particulier | `profiles.role = 'particulier'` | Propose courses et/ou ménage, gère ses disponibilités, répond aux demandes |
| Administrateur | `utilisateurs.est_admin = true` (rôle `admin` côté serveur) | Gère comptes, adhérents et messages, valide les profils, suit les demandes |

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
| Base de données | PostgreSQL 17 (alwaysdata), interrogée avec le paquet `pg` (requêtes SQL paramétrées) |
| Comptes | Gérés par le backend : `bcryptjs` (mots de passe) + `jsonwebtoken` (JWT dans un cookie httpOnly) |
| Emails | `nodemailer` + serveur SMTP d'alwaysdata |
| Hébergement | alwaysdata : un site front (Apache, fichiers statiques) et un site back (Node.js), séparés |
| Surveillance | Robot « Mlezi » (GitHub Actions) |

### Liens

| Lien | Valeur |
|---|---|
| Dépôt GitHub | `https://github.com/chamoueni/dispositif-d-accompagnement` (dépôt distant `origin`) |
| Site déployé (front) | `https://moustakim.alwaysdata.net/fil` |
| API déployée (back) | `https://moustakim.alwaysdata.net/fil/api` (bilan : `/fil/api/sante`) |
| Base de données | `postgresql-moustakim.alwaysdata.net`, base `moustakim_aufildesages` (identifiants dans `.env`, non versionné) |

### Lancer le projet

```bash
npm install
copy .env.example .env      # puis remplir DATABASE_URL et JWT_SECRET
npm run dev:full            # frontend sur le port 5173, API sur le port 3001
```

Détail et variables dans [11-deploiement.md](11-deploiement.md).

### Structure

```
frontend/src/            Frontend Vue
  pages/        29 vues, une par route
  components/   25 composants réutilisables (dont 4 pour l'admin)
  services/api.js  point de passage unique vers l'API (fetch('/api/...'))
  stores/       auth, accessibilité, admin, adhérents
  composables/  logique réutilisable (voix, thème, connexion, intervenants)
  data/store.js fonctions métier (appellent l'API) + constantes
  router/       routes et garde de navigation
  locales/      traductions fr / shi / kib
  styles/       feuilles CSS
backend/         Backend Express (API)
  db.js         connexion PostgreSQL (pg) et transactions
  sql/          schema.sql (tables) et import-supabase.sql (transfert)
  routes/ controllers/ services/ models/ middleware/ config/
supabase/       Ancien schéma Supabase, gardé comme référence historique
frontend/public/         favicon et emplacements des fichiers audio
```

---

## Écarts avec la conception

Synthèse des différences entre le code et la conception d'origine (cahier des charges, MCD). Le détail est dans [06-base-de-donnees.md](06-base-de-donnees.md) § 6 et [10-technologies.md](10-technologies.md) § 7.

### Modèle de données

| Entité du MCD | Dans le code |
|---|---|
| UTILISATEUR | Table `utilisateurs` (email, mot de passe haché, `est_admin`) + table `profiles` (même identifiant) |
| PERSONNE_AGEE, PERSONNEL_SANTE, PARTICULIER | Pas de tables : une colonne `profiles.role` |
| DISPONIBILITE | Pas de table : colonne `profiles.disponibilites` (`jsonb`) |
| SERVICE | Pas de table : colonne `profiles.services` (`text[]`) et `demandes.type_service` |
| DEMANDE | Table `demandes` (avec en plus `urgence`, `code_arrivee`, statut `terminee`) |
| MISE_EN_RELATION | Table `mises_en_relation` |
| AVIS_EVALUATION | Table `avis` : texte libre sur le dispositif, sans note, sans lien avec un intervenant |
| NOTIFICATION | **Absente** |
| — | Tables ajoutées : `messages_contact`, `adherents`, `jetons_reinitialisation` |

### Fonctionnalités prévues et absentes

- **Notifications** aux utilisateurs (seuls les emails « mot de passe oublié » et l'alerte SOS à l'administrateur existent).
- **Suspension d'un compte** : la colonne `actif` existe mais ne bloque rien.
- **Suppression de son compte** par l'utilisateur (l'administrateur peut supprimer un compte).
- **Disponibilités saisies à l'inscription** : elles se saisissent dans le profil.
- **Filtre par jour ou créneau** dans la recherche (présent seulement dans l'assistant).
- **Annulation automatique** d'une demande sans réponse.
- **Confirmation de l'email à l'inscription** : le compte est actif tout de suite.

### Fonctionnalités présentes et non prévues

Formules d'accompagnement avec paiement simulé, assistant de besoin, carte de Mayotte, code d'arrivée, historique, bouton SOS (urgence 112 et message à l'équipe), messages de contact, trois langues, lecture et dictée vocales, mode confort, thème sombre, gestion des adhérents, validation des profils d'intervenants par l'administrateur, coordonnées masquées jusqu'à l'acceptation d'une demande.

### Technique

- Base **PostgreSQL** et non MySQL.
- Le navigateur ne parle **qu'à l'API Express** (`/api/...`) ; seul le serveur accède à la base.
- Les contrôles d'accès (qui voit et modifie quoi) sont **dans le code du serveur**, plus dans des règles de la base (RLS) comme avec Supabase.

---

## Problèmes et incohérences repérés

Classés par importance. Chaque point renvoie au document qui le détaille.

**Réglé lors de la migration (novembre 2026)** : routes protégées par rôle, coordonnées masquées sans demande acceptée, acceptation d'une demande groupée dans une transaction, adhérents dans la base, administrateur reconnu par une colonne de la base (plus d'email écrit en dur), README de la racine à jour.

**Sécurité**

1. Toute nouvelle route doit refaire elle-même les contrôles d'accès : il n'y a plus de filet de sécurité dans la base (RLS) — [07](07-authentification-securite.md) § 3.
2. Pas de confirmation de l'adresse email à l'inscription — [07](07-authentification-securite.md) § 6.

**Fiabilité**

3. Plusieurs actions n'affichent aucun message en cas d'échec — [02](02-frontend.md) § 6.
4. La page Assistant est publique mais ne peut rien afficher à un visiteur non connecté — [02](02-frontend.md) § 8.
5. Aucun test automatisé dans le dépôt (les tests de la migration ont été faits à part).

**Cohérence**

6. L'accueil envoie un paramètre `?ville=` que la page de recherche ne lit pas (elle lit `?type=`) — [02](02-frontend.md) § 8.
7. Les limites annoncées par les formules ne sont appliquées nulle part — [08](08-flux-complets.md) § 14.
8. Le compteur et les marqueurs de l'accueil sont réservés aux connectés, que le routeur redirige hors de l'accueil — [02](02-frontend.md) § 8.
9. `MayotteSymbol.vue` et `frontend/public/icons.svg` ne sont plus utilisés — [09](09-analyse-fichiers.md).

## À retenir

- Deux sites séparés chez alwaysdata : le front (fichiers statiques) et le back (API Express), plus une base PostgreSQL.
- Le navigateur ne parle qu'à l'API ; l'API est la seule à lire et écrire dans la base, avec des requêtes SQL paramétrées.
- Trois rôles en base, plus un administrateur reconnu par `utilisateurs.est_admin`.
- Le modèle de données est plus simple que le MCD : une table `profiles` regroupe rôles, services et disponibilités.
