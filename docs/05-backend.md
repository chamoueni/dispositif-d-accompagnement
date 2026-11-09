# 05 — Backend (`server/`)

Le backend est un petit serveur **Express 5** écrit en JavaScript (modules ES). Il ne remplace pas Supabase : il le complète pour trois besoins (voir [01-architecture.md](01-architecture.md)).

## 1. Structure

| Fichier | Rôle |
|---|---|
| [server/index.js](../server/index.js) | Crée le serveur, pose les middleware, déclare **toutes** les routes |
| [server/adherentsStore.js](../server/adherentsStore.js) | Lit et écrit les adhérents dans `server/data/adherents.json` |
| [server/supabaseAdmin.js](../server/supabaseAdmin.js) | Crée le client Supabase « service role » (ou `null` si non configuré) |
| [server/supabaseSync.js](../server/supabaseSync.js) | Recopie un adhérent dans la table Supabase `adherents` |
| `server/data/adherents.json` | Stockage des adhérents |
| `server/package.json` | `{"type": "module"}` uniquement |

Il n'y a **pas de dossiers `routes/`, `controllers/`, `services/`** : tout est dans `index.js`. Si on voulait rapprocher le code de ce découpage, voici la correspondance :

- « routes » et « controllers » : les fonctions `app.get/post/put/delete` de `index.js` ;
- « services » : `adherentsStore.js` et `supabaseSync.js` ;
- « middleware » : `cors()`, `express.json()`, `verifierAdmin`, le gestionnaire d'erreurs final.

## 2. Démarrage du serveur

Commande : `npm run server` (soit `node server/index.js`, voir [package.json](../package.json)).

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
| `ANTHROPIC_API_KEY` | `index.js` (ligne 48), puis lue par le SDK | Clé de l'API Anthropic | `anthropic` vaut `null`, `/api/chat-ia` répond 503 |

Les valeurs ne figurent pas dans le dépôt ; `.env` est ignoré par Git. Voir [.env.example](../.env.example) pour les noms.

## 4. Authentification et autorisation

Un seul mécanisme : le middleware **`verifierAdmin`** ([index.js](../server/index.js), ligne 31).

1. Si `supabaseAdmin` est `null` → `503`.
2. Lit l'en-tête `Authorization: Bearer <jeton>`. Absent → `401`.
3. Demande à Supabase à qui appartient ce jeton : `supabaseAdmin.auth.getUser(token)`.
4. Si erreur, ou si l'e-mail du compte n'est pas celui de la constante `ADMIN_EMAIL` → `403`.
5. Sinon `next()` : la route s'exécute.

Le jeton est le jeton de session Supabase de l'utilisateur connecté, envoyé par le frontend (`createCompteAdmin`, `deleteCompteAdmin` dans [store.js](../src/data/store.js)).

**Ce middleware n'est posé que sur les deux routes `/api/admin/comptes`.** Les routes `/api/adherents` et `/api/chat-ia` n'ont aucun contrôle d'accès (voir § 7).

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
- **Suite côté frontend** : [AdminComptes.vue](../src/pages/AdminComptes.vue) demande aussitôt un e-mail de réinitialisation, pour que la personne choisisse son mot de passe.

### `DELETE /api/admin/comptes/:id`

- **Protection** : `verifierAdmin`.
- **Traitement** : `supabaseAdmin.auth.admin.deleteUser(id)`. La ligne `profiles` disparaît avec, grâce à `on delete cascade` dans le schéma.
- **Réponse** : `204`.
- **Erreurs** : `400` + message Supabase, `401`, `403`, `503`, `500`.

### `POST /api/chat-ia`

- **Protection** : aucune.
- **Corps** : `{ message, historique? }` où `historique` est un tableau de `{ role, texte }`.
- **Traitement** : construit la liste des messages, puis appelle `anthropic.messages.create` avec le modèle `claude-opus-5`, `max_tokens: 400` et la consigne `CONTEXTE_SITE` (ligne 52), qui décrit les services, zones et formules du site.
- **Réponse** : `200` + `{ reponse }`.
- **Erreurs** : `503` si la clé API est absente ; `400` si le message est vide ; `500` sinon.

## 6. Gestion des erreurs

Chaque route est entourée d'un `try … catch (error) { next(error) }`. Le dernier middleware ([index.js](../server/index.js), ligne 245) reçoit ces erreurs, les écrit dans la console et répond `500` avec `{ message: 'Une erreur serveur est survenue.' }`. Le détail technique n'est donc jamais envoyé au navigateur.

Format constant des erreurs : `{ "message": "..." }`.

## 7. Sécurité : constats

| Constat | Détail |
|---|---|
| Routes adhérents ouvertes | `GET/POST/PUT/DELETE /api/adherents` n'exigent aucun jeton. Toute personne connaissant l'adresse de l'API peut lire, créer, modifier ou supprimer des adhérents (nom, e-mail, téléphone, commune). |
| Assistant IA ouvert | `POST /api/chat-ia` n'exige pas de compte et n'a **pas de limite de débit**. Chaque appel consomme l'API payante. |
| CORS ouvert | `cors()` sans option : toutes les origines sont acceptées. |
| Pas de limite de débit, pas d'en-têtes de sécurité | Aucune bibliothèque de type limiteur ou `helmet` : **non trouvé dans le code**. |
| Validation légère | L'e-mail est jugé valide s'il contient `@`. La taille du message envoyé à l'IA n'est pas bornée (hors limite par défaut d'`express.json()`). |
| E-mail de l'admin en dur | La constante `ADMIN_EMAIL` est répétée dans `server/index.js`, `src/stores/auth.js`, `supabase/schema.sql` et la fonction Edge. Changer d'administrateur demande de modifier les quatre. |
| Clé « service role » | Bien cantonnée au serveur. C'est le point fort de ce backend. |

## 8. Stockage des adhérents : deux endroits

1. **Fichier JSON** (`server/data/adherents.json`) : c'est la source lue par `GET /api/adherents`.
2. **Table Supabase `adherents`** : simple copie, écrite par `synchroniserAdherent` seulement si `supabaseAdmin` existe. Elle n'est jamais relue par l'application.

Conséquences à connaître :

- Si la synchronisation échoue après l'écriture du fichier, la route répond `500` alors que le fichier est déjà modifié.
- Le fichier `adherents.json` est **suivi par Git** et contient actuellement un enregistrement.
- Sur un hébergement dont le disque est remis à zéro à chaque déploiement, les adhérents ajoutés en production seraient perdus. Le dépôt ne permet pas de dire si c'est le cas ici (voir [11-deploiement.md](11-deploiement.md)).
- `adherentsStore.js` utilise `crypto.randomUUID()` sans importer `crypto` : cela repose sur l'objet global `crypto` de Node. La version de Node attendue n'est pas déclarée (`engines` absent de `package.json`).

## À retenir

- Tout le backend tient dans `server/index.js` : 7 routes.
- Seules les deux routes `/api/admin/comptes` sont protégées, par `verifierAdmin`.
- Le backend sert à ce que le navigateur ne doit pas faire : utiliser la clé « service role » et la clé de l'API d'IA.
- Les adhérents vivent dans un fichier JSON, copié de façon facultative vers Supabase.
- Priorité de sécurité : protéger `/api/adherents` et limiter `/api/chat-ia`.
