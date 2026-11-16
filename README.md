# Au Fil des Âges : dispositif d'accompagnement

Plateforme qui met en relation les personnes âgées de Mayotte avec du personnel de santé et
des particuliers (soins, ménage, courses, présence à domicile).

## Infos projet

### Architecture

```
Navigateur ──HTTPS──▶ alwaysdata : un seul programme Node.js (backend/app.js)
                          ├── /api/...  → API Express ──SQL (pg)──▶ PostgreSQL alwaysdata
                          └── le reste  → site Vue 3 construit (dist/)
Base gérée dans le navigateur avec phpPgAdmin (fourni par alwaysdata)
```

| Partie | Technologie | Rôle |
| --- | --- | --- |
| Site | Vue 3, Vite, Vue Router, Pinia, Bootstrap 5 | Pages et composants affichés dans le navigateur |
| Serveur | Node.js, Express 5 | API `/api/...` + envoi du site construit |
| Base de données | PostgreSQL (alwaysdata), paquet `pg` | Comptes, profils, demandes, missions, avis, messages, adhérents |
| Comptes | `bcryptjs` + `jsonwebtoken` | Mots de passe hachés, jeton JWT dans un cookie httpOnly |
| Emails | `nodemailer` + SMTP alwaysdata | Mot de passe oublié, alertes SOS à l'administrateur |
| Hébergement | alwaysdata (France) | Site + base au même endroit |
| Outil base | phpPgAdmin (alwaysdata) | Créer les tables, consulter et importer les données |

Avant : Supabase (base + comptes) et Render (hébergement). Le passage à alwaysdata est
détaillé dans [DEPLOIEMENT.md](DEPLOIEMENT.md).

### Sécurité et RGPD

- **Mots de passe** : jamais stockés en clair, seulement leur empreinte bcrypt
  ([backend/services/motDePasse.service.js](backend/services/motDePasse.service.js)).
- **Connexion** : jeton JWT signé par le serveur (`JWT_SECRET`), rangé dans un cookie
  `httpOnly` illisible par le JavaScript de la page, donc pas volable par un script injecté
  ([backend/services/jeton.service.js](backend/services/jeton.service.js)). Un changement
  de mot de passe déconnecte les autres appareils.
- **Rôles** : `senior` (personne âgée), `sante` (personnel de santé), `particulier`, et
  l'administrateur (`utilisateurs.est_admin`). Le middleware
  [backend/middleware/session.js](backend/middleware/session.js) vérifie le jeton, relit le
  compte en base à chaque requête, et fournit `requireAuth` et `exigerRole(...)`.
- **Qui voit quoi** (avant : règles RLS de Supabase, maintenant dans le serveur,
  [backend/controllers/data.controller.js](backend/controllers/data.controller.js)) :
  une demande ou une mission n'est visible et modifiable que par ses deux participants ;
  on ne modifie que son propre profil ; téléphone et adresse restent masqués tant qu'aucune
  demande n'est acceptée ; messages SOS et adhérents sont réservés à l'administrateur ; un
  intervenant non validé par l'administrateur n'apparaît pas dans la recherche.
- **Injections SQL** : toutes les requêtes sont paramétrées (`$1, $2…`), voir
  [backend/db.js](backend/db.js) et [backend/models/](backend/models/).
- **Autres protections** : contrôle de l'origine des requêtes (CSRF), limitation des
  tentatives de connexion et d'inscription, en-têtes de sécurité, secrets uniquement dans
  `.env` (ignoré par git).

## Démarrage local

```bash
npm install
copy .env.example .env      # puis remplir DATABASE_URL et JWT_SECRET
npm run dev:full
```

Le site est sur `http://localhost:5173`, l'API sur `http://localhost:3001` : le serveur Vite
redirige `/api` vers Express. Pour lancer séparément : `npm run dev` et `npm run server`.

Pour tester comme en production (Express sert aussi le site) : `npm run build`, puis
`npm start` et ouvrir `http://localhost:3001`.

La base se crée en exécutant [backend/sql/schema.sql](backend/sql/schema.sql) dans phpPgAdmin (onglet SQL).

## Scripts npm

| Commande | Effet |
| --- | --- |
| `npm run dev:full` | Site (Vite) + serveur (Express) en développement |
| `npm run build` | Construit le site dans `dist/` (+ pages SEO, sitemap) |
| `npm start` | Lance le serveur : API + site construit (utilisé par alwaysdata) |
| `npm run lint` | Vérifie le code avec ESLint |

## Structure du projet

```
frontend/       Le site (Vue 3 + Vite)
  src/
    services/api.js   point de passage unique vers l'API (fetch('/api/...'))
    pages/ components/ stores/ data/ router/ ...
  scripts/      génération des pages SEO après le build
backend/        Le serveur (Node.js + Express)
  app.js        point d'entrée : middlewares, routes, envoi du site
  db.js         connexion PostgreSQL (pg) + transactions
  sql/          schema.sql (tables) et import-supabase.sql (transfert des données)
  config/ middleware/ routes/ controllers/ services/ models/
supabase/       Ancienne base Supabase : gardée comme référence jusqu'à la fin de la migration
docs/           Documentation détaillée (commencer par docs/README.md)
DEPLOIEMENT.md  Mise en ligne sur alwaysdata, étape par étape
```

Le serveur suit le découpage **routes → controllers → services / models** : la route dit
quel contrôleur appeler, le contrôleur vérifie les droits et les données reçues, le model
contient le SQL d'une table.

## API REST

| Méthode | Route | Accès | Effet |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | Inscription |
| POST | `/api/auth/login` | public | Connexion (pose le cookie) |
| GET | `/api/auth/session` | connecté | Utilisateur connecté |
| POST | `/api/auth/logout` | public | Déconnexion |
| POST | `/api/auth/forgot-password` | public | Envoie un lien de réinitialisation |
| POST | `/api/auth/recovery` | public | Nouveau mot de passe depuis le lien |
| PUT | `/api/auth/password` | connecté | Changement de mot de passe |
| POST | `/api/data` | selon l'action | Profils, demandes, missions, avis, messages |
| GET, POST, PUT, DELETE | `/api/adherents[/:id]` | admin | Gestion des adhérents |
| POST, DELETE | `/api/admin/comptes[/:id]` | admin | Création / suppression de comptes |
| GET | `/api/sante` | public | État du serveur et de la base |

Pour tester avec Postman : se connecter avec `/api/auth/login`, puis envoyer le jeton du
cookie `dispositif_session` dans l'en-tête `Authorization: Bearer <jeton>`. Les requêtes
POST/PUT/DELETE doivent avoir l'en-tête `Origin: http://localhost:5173` (protection CSRF).

## Lecture ligne par ligne du flux principal

### Backend

Dans `backend/app.js`, `express()` crée l'application ; les middlewares de
`backend/middleware/` (CORS, `express.json()`, cookies, sécurité, session) s'appliquent à
chaque requête, puis les fichiers de `backend/routes/` envoient chaque adresse vers son
contrôleur. Pour les adhérents, `routes/adherents.routes.js` vérifie que l'utilisateur est
l'administrateur (`verifierAdmin`), `controllers/adherents.controller.js` contrôle les champs
(`validerAdherent()`) et appelle `models/adherent.model.js`, qui exécute la requête SQL
paramétrée sur la table `adherents` via `requete()` de `backend/db.js`.
`middleware/erreurs.js` transforme les erreurs inattendues en réponse HTTP 500. Toute autre
adresse que `/api/...` renvoie le site Vue (`dist/`).

### Frontend

Dans `frontend/src/stores/adherents.js`, `defineStore()` crée l'état Pinia.
`chargerAdherents()`, `creerAdherent()`, `modifierAdherent()` et `supprimerAdherent()`
appellent `apiRequest()` de `frontend/src/services/api.js` (GET, POST, PUT, DELETE), qui
exécute `fetch()`, ajoute les en-têtes JSON et convertit les erreurs HTTP en exceptions, puis
mettent à jour l'état réactif. Le cookie de connexion est joint automatiquement par le navigateur.

## Vérifications

```bash
npm run lint
npm run build
```
