# 05 — Backend (`backend/`)

Le backend est un serveur **Express 5** écrit en JavaScript (modules ES). C'est le **seul** intermédiaire entre le site et la base de données PostgreSQL : le navigateur n'a aucun accès à la base (voir [01-architecture.md](01-architecture.md)). En ligne, il tourne sur son propre site alwaysdata (Node.js), à l'adresse `https://moustakim.alwaysdata.net/fil/api`.

## 1. Organisation des dossiers

Le code suit le découpage classique **routes → controllers → services / models**, avec les middlewares, la configuration et l'accès à la base à part.

```
backend/
├── app.js            point d'entrée : middlewares, routes, sous-dossier du site, démarrage
├── db.js             connexion PostgreSQL (pool « pg »), requete(), requeteUne(), transaction()
├── sql/
│   ├── schema.sql        création des 8 tables (à exécuter une fois dans phpPgAdmin)
│   └── import-supabase.sql  transfert des données depuis l'ancienne base Supabase
├── config/           réglages
│   ├── env.js            charge le fichier .env (dotenv)
│   ├── constantes.js     rôles, statuts, longueur minimale des mots de passe
│   └── origines.js       adresses autorisées à appeler l'API (SITE_URL, CORS_ORIGINS, localhost)
├── middleware/       contrôles exécutés avant les routes
│   ├── securite.js       CORS, en-têtes de sécurité, contrôle de l'origine (CSRF)
│   ├── session.js        lit et vérifie le jeton JWT ; requireAuth ; exigerRole(...)
│   ├── admin.js          verifierAdmin = exigerRole() : administrateur seulement
│   ├── limiteurs.js      limites de tentatives par adresse IP
│   ├── configurationAuth.js  503 si DATABASE_URL, JWT_SECRET ou SITE_URL manquent
│   └── erreurs.js        404 « Route API introuvable », gestionnaire d'erreurs final
├── routes/           adresses de l'API → fonction du contrôleur
│   ├── auth.routes.js        /api/auth/...
│   ├── admin.routes.js       /api/admin/comptes
│   ├── data.routes.js        /api/data
│   ├── adherents.routes.js   /api/adherents
│   └── sante.routes.js       /api/sante
├── controllers/      traitement de chaque requête : contrôles d'accès, appel aux modèles, réponse JSON
│   ├── auth.controller.js    inscription, connexion, session, déconnexion, mots de passe
│   ├── admin.controller.js   création / suppression de comptes par l'admin
│   ├── data.controller.js    données métier : une « action » par opération
│   ├── adherents.controller.js  liste, ajout, modification, suppression d'adhérents
│   └── sante.controller.js   bilan de santé (API + base)
├── services/         règles de gestion réutilisables
│   ├── jeton.service.js      création / vérification du JWT, cookie httpOnly
│   ├── motDePasse.service.js hachage et vérification bcrypt, règles de longueur
│   ├── email.service.js      emails (nodemailer) : mot de passe oublié, alerte SOS
│   ├── profil.service.js     profil de l'utilisateur connecté (compte + profil)
│   ├── confidentialite.service.js  masquage du téléphone et de l'adresse, comptes de démo, profils non validés
│   ├── demande.service.js    changement de statut d'une demande (transaction : code d'arrivée + mission)
│   └── validation.service.js contrôle des données reçues
├── models/           requêtes SQL, un fichier par table
│   ├── utilisateur.model.js  utilisateurs + jetons_reinitialisation
│   ├── profil.model.js       profiles
│   ├── demande.model.js      demandes
│   ├── mission.model.js      mises_en_relation
│   ├── avis.model.js         avis
│   ├── message.model.js      messages_contact
│   └── adherent.model.js     adherents
└── package.json      {"type": "module"}
```

| Question | Réponse |
|---|---|
| À quoi servent les routes ? | Associer une adresse et une méthode HTTP (GET, POST, PUT, DELETE) à une fonction de contrôleur, avec les middlewares propres à cette route. |
| Pourquoi séparer les controllers ? | Le fichier de routes se lit comme un sommaire de l'API ; le contrôleur contient le traitement (contrôle des droits et des données, appel aux modèles, réponse). |
| Où sont les traitements métier ? | Dans `services/` (confidentialité des profils, cycle de vie des demandes, jeton, mots de passe, emails). |
| Où se trouve la connexion à la base ? | Dans `db.js` (paquet `pg`, variable `DATABASE_URL`). |
| Où sont les requêtes SQL ? | Dans `models/`, une table par fichier, toujours paramétrées (`$1, $2…`). |
| Où sont les middlewares ? | Dans `middleware/`, branchés dans `app.js` ou dans les fichiers de routes. |

## 2. Démarrage

Commande : `npm start` ou `npm run server` (soit `node backend/app.js`, voir [package.json](../package.json)). Sur alwaysdata, la commande du site Node.js est `node backend/app.js`, répertoire de travail `aufildesages`.

Déroulé dans `app.js` :

1. `import './config/env.js'` charge le fichier `.env` (en local ; sur alwaysdata, les variables sont saisies dans la fiche du site).
2. `express()` crée l'application ; en production, `trust proxy` (alwaysdata place un proxy HTTPS devant le serveur).
3. Le **sous-dossier** du site est déduit de `SITE_URL` (`https://moustakim.alwaysdata.net/fil` → `/fil`).
4. Middlewares pour toutes les requêtes, dans l'ordre : CORS, `express.json` (1 Mo maximum), `cookie-parser`, en-têtes de sécurité, contrôle de l'origine.
5. Un routeur `site` regroupe la session (`/api`), les routes `/api/auth`, `/api/admin`, `/api/data`, `/api/adherents`, `/api/sante`, le `404` JSON des adresses `/api` inconnues, et (si `SERVIR_FRONT` n'est pas `false`) l'envoi du site Vue construit (`dist/`).
6. Ce routeur est branché sur le sous-dossier (`/fil`) et aussi à la racine : alwaysdata transmet l'adresse complète (`/fil/api/...`) au serveur.
7. `404` JSON pour toute autre adresse, puis gestionnaire d'erreurs final (`500`).
8. `app.listen(port, ip)` avec `PORT` et `IP` fournis par alwaysdata (3001 en local).

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

## 4. Connexion et autorisation

- **Jeton** : à la connexion, `services/jeton.service.js` fabrique un **JWT** signé avec `JWT_SECRET` (identifiant du compte, version, durée : 12 h, ou 30 jours avec « Se souvenir de moi ») et le range dans un **cookie httpOnly** (`__Host-dispositif_session` en production : HTTPS uniquement, illisible par le JavaScript de la page).
- **À chaque requête**, `middleware/session.js` lit le jeton (cookie, ou en-tête `Authorization: Bearer` pour Postman), vérifie sa signature, puis **relit le compte dans la base** : il doit exister et avoir la même `version_jeton` (un changement de mot de passe augmente ce numéro et invalide les anciens jetons). Il place `req.utilisateur = { id, email, estAdmin, role }`, avec `role` = `senior`, `sante`, `particulier` ou `admin`.
- **Connecté** : `requireAuth` répond `401` si personne n'est connecté.
- **Rôle** : `exigerRole('sante', …)` répond `403` si le rôle ne convient pas ; l'administrateur passe toujours. `verifierAdmin` = `exigerRole()` : administrateur seulement.
- **Contrôles d'accès aux données** : chaque action de `data.controller.js` vérifie elle-même les droits avant d'interroger la base (voir [06-base-de-donnees.md](06-base-de-donnees.md) § 3). L'identité vient toujours du jeton, jamais d'un identifiant envoyé par le navigateur.

## 5. Accès à la base (`db.js` et `models/`)

- `requete(sql, params)` renvoie les lignes ; `requeteUne(sql, params)` la première ligne ou `null`.
- **Paramètres** : les valeurs sont toujours passées à part (`$1, $2…`), jamais collées dans le texte SQL : l'injection SQL est impossible.
- `transaction(fn)` : plusieurs requêtes qui réussissent toutes ou échouent toutes (`begin` / `commit` / `rollback`). Utilisée pour l'inscription (compte + profil), la création de compte par l'admin, l'acceptation d'une demande (statut + code + mission) et la réinitialisation du mot de passe.
- `transactionAdmin(fn)` : transaction marquée « administrateur » (`set_config('app.admin', 'on', true)`), seule autorisée par le déclencheur `proteger_verifie` à changer la colonne `profiles.verifie`.
- **Pool** : 5 connexions au maximum ; une connexion inutilisée depuis 30 s est fermée (évite les coupures réseau silencieuses, erreur `ETIMEDOUT`).

## 6. Gestion des erreurs

Chaque contrôleur est entouré d'un `try … catch (error) { next(error) }`. `middleware/erreurs.js` reçoit ces erreurs, écrit seulement leur type (et le message des pannes de connexion à la base) dans le journal et répond `500` avec `{ message: 'Une erreur serveur est survenue.' }`. Le détail technique n'est jamais envoyé au navigateur. Cas particuliers : JSON mal formé → `400`, valeur en double (code PostgreSQL `23505`) → `409` avec un message clair (email ou téléphone déjà utilisé).

Format constant des erreurs : `{ "message": "..." }`.

## 7. Sécurité : constats

| Constat | Détail |
|---|---|
| CORS et origine | Seules les origines listées (`SITE_URL`, `CORS_ORIGINS`, localhost en développement) sont acceptées ; les requêtes qui modifient des données sans en-tête `Origin` autorisé sont refusées (403, protection CSRF). |
| Limites de débit | 10 connexions / 15 min, 5 inscriptions / heure, 4 réinitialisations / heure, par adresse IP (`middleware/limiteurs.js`). |
| En-têtes | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en HTTPS (`middleware/securite.js` ; pour le front, `.htaccess`). |
| Coordonnées des profils | Téléphone et adresse envoyés seulement à la personne elle-même, à l'administrateur et aux personnes liées par une demande acceptée ou terminée (`services/confidentialite.service.js`). |
| Mots de passe | Hachés avec bcrypt (coût 10), jamais stockés en clair ; 8 caractères minimum (`MOT_DE_PASSE_MIN`). |
| Administrateur | Reconnu par la colonne `utilisateurs.est_admin`, relue à chaque requête. |
| Secrets | `DATABASE_URL`, `JWT_SECRET`, `SMTP_PASS` : uniquement dans `.env` (non versionné) et dans la fiche du site alwaysdata. |

## 8. Vie privée des profils et comptes de démonstration

Tout utilisateur connecté peut lister les profils (c'est nécessaire à la recherche). Le serveur filtre donc ce qu'il renvoie dans les actions `profiles.list` et `profiles.find` :

| Règle | Fonction | Effet |
|---|---|---|
| Coordonnées | `contactsAutorises()`, `masquerCoordonnees()` | `telephone` et `adresse` vidés (et `contact_masque: true`) sauf pour soi-même, l'administrateur et les personnes liées par une demande `acceptee` ou `terminee` |
| Profils non validés | `enAttenteDeValidation()` | un intervenant (`sante`, `particulier`) dont `verifie = false` n'apparaît pas dans la recherche |
| Comptes de démo | `visibleDansLaListe()` | les profils dont le nom contient « (démo) » n'apparaissent dans la liste (recherche, carte) que pour l'administrateur et les autres comptes de démo |

## 9. Adhérents : table `adherents`

Les adhérents sont rangés dans la même base que tout le reste. Les routes `/api/adherents` sont réservées à l'administrateur (`verifierAdmin`).

| Fonction (`models/adherent.model.js`) | Requête SQL |
|---|---|
| `obtenirAdherents` | `select * from adherents order by created_at asc` |
| `ajouterAdherent` | `insert into adherents (nom, email, …) values ($1, $2, …) returning *` |
| `modifierAdherent` | `update adherents set …, updated_at = now() where id = $1 returning *` (`null` si introuvable → 404) |
| `supprimerAdherent` | `delete from adherents where id = $1 returning id` (`false` si introuvable → 404) |

- L'email est enregistré en minuscules ; un index unique (`adherents_email_unique`) empêche deux adhérents d'avoir le même email (`23505` → `409`).
- Un identifiant qui n'est pas un UUID reçoit directement un `404`.

**Historique.** Les adhérents ont été successivement dans un fichier JSON, dans MongoDB Atlas, puis dans Supabase. Depuis novembre 2026, ils sont dans la base PostgreSQL d'alwaysdata, avec toutes les autres données.

## À retenir

- Point d'entrée : `backend/app.js`. Découpage routes → controllers → services / models ; accès à la base dans `db.js`.
- Le serveur est le seul à parler à la base, avec des requêtes SQL paramétrées.
- Connexion par JWT dans un cookie httpOnly ; compte et rôle relus dans la base à chaque requête.
- Les contrôles d'accès (participants, administrateur, confidentialité) sont dans les contrôleurs et les services.
