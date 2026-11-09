# 05 — Backend (`backend/`)

Le backend est un petit serveur **Express 5** écrit en JavaScript (modules ES). Il ne remplace pas Supabase : il le complète pour trois besoins (voir [01-architecture.md](01-architecture.md)).

## 1. Structure

| Fichier | Rôle |
|---|---|
| [backend/index.js](../backend/index.js) | Crée le serveur, pose les middleware, déclare **toutes** les routes |
| [backend/adherentsStore.js](../backend/adherentsStore.js) | Lit et écrit les adhérents dans **MongoDB** (base NoSQL) si `MONGODB_URI` est définie, sinon dans `backend/data/adherents.json` |
| [backend/supabaseAdmin.js](../backend/supabaseAdmin.js) | Crée le client Supabase « service role » (ou `null` si non configuré) |
| [backend/supabaseSync.js](../backend/supabaseSync.js) | Recopie un adhérent dans la table Supabase `adherents` |
| `backend/data/adherents.json` | Stockage des adhérents |
| `backend/package.json` | `{"type": "module"}` uniquement |

Il n'y a **pas de dossiers `routes/`, `controllers/`, `services/`** : tout est dans `index.js`. Si on voulait rapprocher le code de ce découpage, voici la correspondance :

- « routes » et « controllers » : les fonctions `app.get/post/put/delete` de `index.js` ;
- « services » : `adherentsStore.js` et `supabaseSync.js` ;
- « middleware » : `cors()`, `express.json()`, `verifierAdmin`, le gestionnaire d'erreurs final.

## 2. Démarrage du serveur

Commande : `npm run server` (soit `node backend/index.js`, voir [package.json](../package.json)).

Déroulé dans `index.js` :

1. Import de `supabaseAdmin.js`, qui charge le fichier `.env` (`import 'dotenv/config'`).
2. `express()` crée l'application.
3. `app.use(cors())` : accepte les requêtes de **n'importe quelle origine** (aucune option passée).
4. `app.use(express.json())` : transforme le corps JSON des requêtes en objet `req.body`.
5. Déclaration des routes.
6. Gestionnaire d'erreurs final.
7. `app.listen(port)` avec `port = Number(process.env.PORT) || 3001`.

## 3. Variables d'environnement lues par le backend

| Nom | Lue dans | Rôle | Si absente |
|---|---|---|---|
| `PORT` | `index.js` | Port d'écoute | 3001 |
| `SUPABASE_URL` | `supabaseAdmin.js` | Adresse du projet Supabase | `supabaseAdmin` vaut `null` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseAdmin.js` | Clé qui contourne les règles RLS | `supabaseAdmin` vaut `null` |

Les valeurs ne figurent pas dans le dépôt ; `.env` est ignoré par Git. Voir [.env.example](../.env.example) pour les noms.

## 4. Authentification et autorisation

Un seul mécanisme : le middleware **`verifierAdmin`** ([index.js](../backend/index.js), ligne 31).

1. Si `supabaseAdmin` est `null` → `503`.
2. Lit l'en-tête `Authorization: Bearer <jeton>`. Absent → `401`.
3. Demande à Supabase à qui appartient ce jeton : `supabaseAdmin.auth.getUser(token)`.
4. Si erreur, ou si l'e-mail du compte n'est pas celui de la constante `ADMIN_EMAIL` → `403`.
5. Sinon `next()` : la route s'exécute.

Le jeton est le jeton de session Supabase de l'utilisateur connecté, envoyé par le frontend (`createCompteAdmin`, `deleteCompteAdmin` dans [store.js](../frontend/src/data/store.js)).

**Ce middleware protège les routes `/api/adherents` et `/api/admin/comptes`** (administrateur uniquement).

Il n'y a pas de notion de rôle côté backend : seulement « est l'administrateur » ou non.

## 5. Les routes

### `GET /api/adherents`

- **Protection** : aucune.
- **Traitement** : `obtenirAdherents()` lit le fichier JSON.
- **Réponse** : `200` + tableau d'adhérents.
- **Erreurs** : `500` si le fichier est illisible.

### `POST /api/adherents`

- **Protection** : aucune.
- **Corps attendu** : `{ nom, email, telephone?, ville?, role?, statut? }`.
- **Validation** (`validerAdherent`, ligne 71) : `nom` non vide ; `email` non vide et contenant `@` ; `role` parmi `senior`, `sante`, `particulier` (défaut `particulier`) ; `statut` parmi `actif`, `inactif` (défaut `actif`).
- **Traitement** : `ajouterAdherent` (génère un `id` avec `crypto.randomUUID()`, met l'e-mail en minuscules, ajoute `created_at`) puis `synchroniserAdherent(adherent, 'ajouter')`.
- **Réponse** : `201` + l'adhérent créé.
- **Erreurs** : `400` + `{ message }` si la validation échoue ; `500` sinon.

### `PUT /api/adherents/:id`

- **Protection** : aucune.
- **Paramètre** : `id` dans l'adresse.
- **Corps** : comme `POST`.
- **Traitement** : `modifierAdherent` (ajoute `updated_at`) puis synchronisation.
- **Réponse** : `200` + l'adhérent modifié.
- **Erreurs** : `400` (validation), `404` (« Adhérent introuvable. »), `500`.

### `DELETE /api/adherents/:id`

- **Protection** : aucune.
- **Traitement** : cherche l'adhérent, `supprimerAdherent`, puis `synchroniserAdherent(adherent, 'supprimer')`.
- **Réponse** : `204` sans contenu.
- **Erreurs** : `404`, `500`.

### `POST /api/admin/comptes`

- **Protection** : `verifierAdmin`.
- **Corps** : `{ nom, email, telephone?, ville?, role, actif? }`.
- **Validation** : `nom` obligatoire ; `email` valide ; `role` autorisé.
- **Traitement** :
  1. génère un mot de passe aléatoire (`crypto.randomBytes(24)`), jamais communiqué ;
  2. `supabaseAdmin.auth.admin.createUser(...)` avec `email_confirm: true` ;
  3. insère la ligne correspondante dans `profiles` ;
  4. si l'insertion du profil échoue, **supprime le compte Auth** qui vient d'être créé, pour ne pas laisser un compte orphelin.
- **Réponse** : `201` + le profil et l'e-mail.
- **Erreurs** : `400` (validation, e-mail déjà utilisé, téléphone déjà utilisé), `401`, `403`, `503`, `500`.
- **Suite côté frontend** : [AdminComptes.vue](../frontend/src/pages/AdminComptes.vue) demande aussitôt un e-mail de réinitialisation, pour que la personne choisisse son mot de passe.

### `DELETE /api/admin/comptes/:id`

- **Protection** : `verifierAdmin`.
- **Traitement** : `supabaseAdmin.auth.admin.deleteUser(id)`. La ligne `profiles` disparaît avec, grâce à `on delete cascade` dans le schéma.
- **Réponse** : `204`.
- **Erreurs** : `400` + message Supabase, `401`, `403`, `503`, `500`.

## 6. Gestion des erreurs

Chaque route est entourée d'un `try … catch (error) { next(error) }`. Le dernier middleware ([index.js](../backend/index.js), ligne 245) reçoit ces erreurs, les écrit dans la console et répond `500` avec `{ message: 'Une erreur serveur est survenue.' }`. Le détail technique n'est donc jamais envoyé au navigateur.

Format constant des erreurs : `{ "message": "..." }`.

## 7. Sécurité : constats

| Constat | Détail |
|---|---|
| Routes adhérents | `/api/adherents` est réservé à l'administrateur (middleware `verifierAdmin`). Elle était ouverte à tous avant novembre 2026. |
| CORS et origine | Seules les origines listées (`SITE_URL`, `CORS_ORIGINS`, localhost en développement) sont acceptées ; les requêtes qui modifient des données sans en-tête `Origin` autorisé sont refusées (403). |
| Limites de débit | `express-rate-limit` : 10 connexions / 15 min, 5 inscriptions / heure, 4 réinitialisations / heure, par adresse IP. En-têtes de sécurité posés à la main (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS en HTTPS). |
| Coordonnées des profils | Le téléphone et l'adresse ne sont envoyés qu'à la personne elle-même, à l'administrateur, et aux personnes avec qui elle a une demande acceptée ou terminée (`masquerCoordonnees` dans [dataRoutes.js](../backend/dataRoutes.js)). |
| Mots de passe | 8 caractères minimum à l'inscription et aux changements de mot de passe (`MOT_DE_PASSE_MIN` dans [authRoutes.js](../backend/authRoutes.js)). |
| E-mail de l'admin en dur | La constante `ADMIN_EMAIL` est répétée dans `backend/index.js`, `frontend/src/stores/auth.js`, `supabase/schema.sql` et la fonction Edge. Changer d'administrateur demande de modifier les quatre. |
| Clé « service role » | Bien cantonnée au serveur. C'est le point fort de ce backend. |

## 7 bis. Vie privée des profils et comptes de démonstration

La base laisse tout utilisateur connecté lire tous les profils (c'est nécessaire à la recherche). Le serveur filtre donc ce qu'il renvoie, dans les actions `profiles.list` et `profiles.find` de [dataRoutes.js](../backend/dataRoutes.js) :

| Règle | Fonction | Effet |
|---|---|---|
| Coordonnées | `contactsAutorises()`, `masquerCoordonnees()` | `telephone` et `adresse` vidés (et `contact_masque: true`) sauf pour soi-même, l'administrateur et les personnes liées par une demande `acceptee` ou `terminee` |
| Comptes de démo | `estDemo()`, `visibleDansLaListe()` | les profils dont le nom contient « (démo) » n'apparaissent dans la liste (recherche, carte) que pour l'administrateur et les autres comptes de démo |

Le navigateur n'ayant aucun jeton Supabase (voir [07-authentification-securite.md](07-authentification-securite.md)), il ne peut pas contourner ce filtre en interrogeant la base directement.

## 8. Stockage des adhérents : base NoSQL MongoDB

Les adhérents sont la partie **NoSQL** du projet : tout le reste (profils, demandes, avis…) est en SQL dans Supabase/PostgreSQL.

1. **MongoDB** (si `MONGODB_URI` est définie, par exemple une base gratuite MongoDB Atlas) : c'est la source lue par `GET /api/adherents`. Chaque adhérent est un **document** de la collection `adherents` (base `MONGODB_DB`, `dispositif` par défaut).
2. **Fichier JSON** (`backend/data/adherents.json`) : utilisé à la place de MongoDB quand `MONGODB_URI` est vide, pratique en local.
3. **Table Supabase `adherents`** : simple copie, écrite par `synchroniserAdherent` seulement si `supabaseAdmin` existe. Elle n'est jamais relue par l'application.

Opérations MongoDB utilisées (pilote officiel `mongodb`) :

| Fonction | Requête MongoDB |
|---|---|
| `obtenirAdherents` | `find({}).sort({ created_at: 1 })` |
| `ajouterAdherent` | `insertOne(document)` |
| `modifierAdherent` | `findOneAndUpdate({ id }, { $set: … })` |
| `supprimerAdherent` | `deleteOne({ id })` |

Détails de conception :

- Le champ technique `_id` de MongoDB n'est jamais renvoyé au front (projection `{ _id: 0 }`) ; l'identifiant public reste `id` (UUID), protégé par un **index unique**.
- Au premier lancement sur une base vide, les adhérents du fichier JSON y sont importés automatiquement.
- La connexion est ouverte une seule fois, au premier appel, puis réutilisée.

Pourquoi MongoDB ici : le disque d'un service Render gratuit est effacé à chaque redéploiement, donc les adhérents écrits dans le fichier JSON disparaissaient. Une base externe les conserve.

Conséquences à connaître :

- Si la synchronisation Supabase échoue après l'écriture, la route répond `500` alors que l'adhérent est déjà enregistré.
- Le fichier `adherents.json` est **suivi par Git** et contient actuellement un enregistrement.

## À retenir

- Tout le backend tient dans `backend/index.js` : 7 routes.
- Seules les deux routes `/api/admin/comptes` sont protégées, par `verifierAdmin`.
- Le backend sert à ce que le navigateur ne doit pas faire : utiliser la clé « service role » et la clé de l'API d'IA.
- Les adhérents vivent dans un fichier JSON, copié de façon facultative vers Supabase.
- `/api/adherents` est réservé à l’administrateur (corrigé en novembre 2026 : la liste était auparavant publique).
