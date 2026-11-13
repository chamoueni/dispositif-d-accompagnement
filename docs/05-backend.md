# 05 — Backend (`backend/`)

Le backend est un serveur **Express 5** écrit en JavaScript (modules ES). C'est le seul intermédiaire entre le site et les bases de données : le navigateur n'a aucune clé d'accès secrète à Supabase (voir [01-architecture.md](01-architecture.md)).

## 1. Organisation des dossiers

Depuis novembre 2026, le code suit le découpage classique **routes → controllers → services / models**, avec les middlewares et la configuration à part.

```
backend/
├── app.js            point d'entrée : crée le serveur, branche middlewares et routes, démarre l'écoute
├── config/           réglages et connexions
│   ├── env.js            charge le fichier .env (dotenv)
│   ├── constantes.js     ADMIN_EMAIL, rôles, statuts, longueur minimale des mots de passe
│   ├── origines.js       adresses autorisées à appeler l'API (SITE_URL, CORS_ORIGINS, localhost)
│   └── supabase.js       connexion Supabase : client « service role » + client par utilisateur
├── middleware/       contrôles exécutés avant les routes
│   ├── securite.js       CORS, en-têtes de sécurité, contrôle de l'origine (CSRF)
│   ├── session.js        retrouve l'utilisateur à partir du cookie ; requireAuth
│   ├── admin.js          verifierAdmin : réservé au compte administrateur
│   ├── limiteurs.js      limites de tentatives par adresse IP
│   ├── configurationAuth.js  503 si l'authentification n'est pas configurée
│   └── erreurs.js        404 « Route API introuvable », gestionnaire d'erreurs final
├── routes/           adresses de l'API → fonction du contrôleur
│   ├── auth.routes.js        /api/auth/...
│   ├── admin.routes.js       /api/admin/comptes
│   ├── data.routes.js        /api/data
│   ├── adherents.routes.js   /api/adherents
│   └── sante.routes.js       /api/sante
├── controllers/      traitement de chaque requête et réponse JSON
│   ├── auth.controller.js    inscription, connexion, session, déconnexion, mots de passe
│   ├── admin.controller.js   création / suppression de comptes par l'admin
│   ├── data.controller.js    données métier : une « action » par opération
│   ├── adherents.controller.js  liste, ajout, modification, suppression d'adhérents
│   └── sante.controller.js   bilan de santé
├── services/         règles de gestion réutilisables
│   ├── session.service.js    chiffrement, cookie, création / révocation des sessions
│   ├── profil.service.js     lecture (et création si besoin) du profil connecté
│   ├── confidentialite.service.js  masquage du téléphone et de l'adresse, comptes de démo
│   ├── demande.service.js    changement de statut d'une demande (code d'arrivée, mission)
│   └── validation.service.js contrôle des données reçues
├── models/
│   └── adherent.model.js     accès aux adhérents : table Supabase « adherents »
└── package.json          {"type": "module"}
```

| Question | Réponse |
|---|---|
| À quoi servent les routes ? | Associer une adresse et une méthode HTTP (GET, POST, PUT, DELETE) à une fonction de contrôleur, avec les middlewares propres à cette route. |
| Pourquoi séparer les controllers ? | Le fichier de routes se lit comme un sommaire de l'API ; le contrôleur contient le traitement (contrôle des données, appel à la base, réponse). |
| Où sont les traitements métier ? | Dans `services/` (confidentialité des profils, cycle de vie des demandes, sessions). |
| Où se trouve la connexion à la base ? | Dans `config/supabase.js` (PostgreSQL, la seule base du projet). |
| Où sont les middlewares ? | Dans `middleware/`, branchés dans `app.js` ou dans les fichiers de routes. |

## 2. Démarrage

Commande : `npm start` ou `npm run server` (soit `node backend/app.js`, voir [package.json](../package.json)).

Déroulé dans `app.js` :

1. `import './config/env.js'` charge le fichier `.env`.
2. `express()` crée l'application ; en production, `trust proxy` (Render est un proxy HTTPS).
3. Middlewares pour toutes les requêtes, dans l'ordre : CORS, `express.json` (1 Mo maximum), `cookie-parser`, en-têtes de sécurité, contrôle de l'origine, session (`/api`).
4. Routes : `/api/auth`, `/api/admin`, `/api/data`, `/api/adherents`, `/api/sante`.
5. `404` JSON pour une adresse `/api` inconnue, puis gestionnaire d'erreurs final (`500`).
6. `app.listen(port)` avec `port = Number(process.env.PORT) || 3001`.

## 3. Les routes

| Méthode et adresse | Protection | Contrôleur |
|---|---|---|
| `POST /api/auth/register` | origine, 5 / heure | `auth.inscrire` |
| `POST /api/auth/login` | origine, 10 / 15 min | `auth.connecter` |
| `GET /api/auth/session` | connecté | `auth.sessionCourante` |
| `POST /api/auth/logout` | origine | `auth.deconnecter` |
| `POST /api/auth/forgot-password` | origine, 4 / heure | `auth.motDePasseOublie` |
| `POST /api/auth/recovery/verify` | origine, 4 / heure | `auth.verifierLienReinitialisation` |
| `POST /api/auth/recovery` | origine, 4 / heure | `auth.reinitialiserMotDePasse` |
| `PUT /api/auth/password` | origine, connecté | `auth.changerMotDePasse` |
| `POST /api/data` | origine ; connecté sauf `avis.list` et `contact.create` | `data.traiterAction` |
| `GET, POST /api/adherents`, `PUT, DELETE /api/adherents/:id` | administrateur | `adherents.*` |
| `POST /api/admin/comptes`, `DELETE /api/admin/comptes/:id` | administrateur | `admin.creerCompte`, `admin.supprimerCompte` |
| `GET /api/sante` | public | `sante.bilanSante` |

Toutes les routes `/api/auth/*` passent d'abord par `verifierConfigurationAuth` (503 si les variables nécessaires manquent).

## 4. Sessions et autorisation

- **Session** : à la connexion, `services/session.service.js` enregistre les jetons Supabase chiffrés (AES-256-GCM) dans la table `auth_sessions` et pose un cookie httpOnly. Pour chaque requête, `middleware/session.js` retrouve la session, rouvre le client Supabase de l'utilisateur et place `req.authSession` et `req.supabase`.
- **Connecté** : `requireAuth` répond `401` si personne n'est connecté.
- **Administrateur** : `verifierAdmin` répond `401` (non connecté) ou `403` (autre compte que `ADMIN_EMAIL`).
- Les requêtes de données utilisent `req.supabase` : la base applique alors ses règles RLS à l'utilisateur. La clé « service role » (`supabaseAdmin`) ne sert qu'aux sessions, aux actions de l'administrateur et à la copie des adhérents.

## 5. Gestion des erreurs

Chaque contrôleur est entouré d'un `try … catch (error) { next(error) }`. `middleware/erreurs.js` reçoit ces erreurs, écrit seulement leur type dans la console et répond `500` avec `{ message: 'Une erreur serveur est survenue.' }`. Le détail technique n'est jamais envoyé au navigateur.

Format constant des erreurs : `{ "message": "..." }`.

## 6. Sécurité : constats

| Constat | Détail |
|---|---|
| CORS et origine | Seules les origines listées (`SITE_URL`, `CORS_ORIGINS`, localhost en développement) sont acceptées ; les requêtes qui modifient des données sans en-tête `Origin` autorisé sont refusées (403). |
| Limites de débit | 10 connexions / 15 min, 5 inscriptions / heure, 4 réinitialisations / heure, par adresse IP (`middleware/limiteurs.js`). |
| En-têtes | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en HTTPS (`middleware/securite.js`). |
| Coordonnées des profils | Téléphone et adresse envoyés seulement à la personne elle-même, à l'administrateur et aux personnes liées par une demande acceptée ou terminée (`services/confidentialite.service.js`). |
| Mots de passe | 8 caractères minimum (`MOT_DE_PASSE_MIN` dans `config/constantes.js`). |
| E-mail de l'admin en dur | `ADMIN_EMAIL` est dans `backend/config/constantes.js`, `frontend/src/stores/auth.js`, `supabase/schema.sql` et la fonction Edge. Changer d'administrateur demande de modifier les quatre. |
| Clé « service role » | Cantonnée au serveur (`config/supabase.js`). |

## 7. Vie privée des profils et comptes de démonstration

La base laisse tout utilisateur connecté lire tous les profils (c'est nécessaire à la recherche). Le serveur filtre donc ce qu'il renvoie dans les actions `profiles.list` et `profiles.find` :

| Règle | Fonction | Effet |
|---|---|---|
| Coordonnées | `contactsAutorises()`, `masquerCoordonnees()` | `telephone` et `adresse` vidés (et `contact_masque: true`) sauf pour soi-même, l'administrateur et les personnes liées par une demande `acceptee` ou `terminee` |
| Comptes de démo | `visibleDansLaListe()` | les profils dont le nom contient « (démo) » n'apparaissent dans la liste (recherche, carte) que pour l'administrateur et les autres comptes de démo |

## 8. Stockage des adhérents : table PostgreSQL `adherents`

Les adhérents sont rangés dans la même base que tout le reste : la table `adherents` de Supabase/PostgreSQL. `models/adherent.model.js` reçoit le client de l'administrateur connecté (`req.supabase`) : la base applique donc ses règles RLS, qui réservent la table à l'administrateur, en plus du contrôle `verifierAdmin` de la route.

| Fonction (`models/adherent.model.js`) | Requête Supabase |
|---|---|
| `obtenirAdherents` | `from('adherents').select('*').order('created_at')` |
| `ajouterAdherent` | `insert({ id, ...champs }).select().single()` |
| `modifierAdherent` | `update({ ...champs, updated_at }).eq('id', id)` (renvoie `null` si introuvable → 404) |
| `supprimerAdherent` | `delete().eq('id', id)` (renvoie `false` si introuvable → 404) |

- L'e-mail est enregistré en minuscules ; un index unique (`adherents_email_unique`) empêche deux adhérents d'avoir le même e-mail. PostgreSQL renvoie alors l'erreur `23505`, transformée en `409` par le contrôleur.
- Un identifiant qui n'est pas un UUID reçoit directement un `404`.

**Historique.** Les adhérents étaient d'abord dans un fichier JSON (effacé par Render à chaque redéploiement), puis dans MongoDB Atlas avec une copie dans Supabase. MongoDB a été retiré en novembre 2026 : les adhérents sont des données structurées comme les autres, et une seule base est plus simple à sécuriser, sauvegarder et expliquer. Les données étaient identiques dans les deux bases au moment du passage (migration `supabase/migrations/20261112_adherents_sans_mongodb.sql`).

## À retenir

- Point d'entrée : `backend/app.js`. Découpage routes → controllers → services / models, middlewares et configuration à part.
- Toutes les données passent par le serveur ; le navigateur n'a qu'un cookie de session.
- Routes d'administration protégées par `verifierAdmin`.
- Une seule base : Supabase/PostgreSQL, adhérents compris.
