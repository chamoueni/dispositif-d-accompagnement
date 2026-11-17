# 09 — Analyse fichier par fichier

Ce document passe en revue les fichiers qui portent la logique du projet. Les pages et composants sont déjà détaillés dans [02-frontend.md](02-frontend.md) et [03-html-composants.md](03-html-composants.md) ; ils ne sont repris ici que lorsqu'une fonction mérite une explication.

---

## Fichiers de configuration

### `package.json`

- **Rôle** : liste les dépendances et les scripts, pour le frontend **et** le backend.
- **Scripts** : `dev` (Vite), `server` (Express), `dev:full` (les deux avec `concurrently`), `build`, `lint`, `preview`.
- **Utilisé par** : `npm`, et par l'hébergeur au moment du déploiement.

### `vite.config.js`

- **Rôle** : configure Vite.
- **Contenu** : plugin Vue ; proxy `'/api' → 'http://localhost:3001'` (en développement seulement) ; options Sass pour faire taire les avertissements de Bootstrap.
- **Pourquoi le proxy** : le frontend peut appeler `/api/...` sans connaître l'adresse du backend, et sans problème de CORS en local.

### `eslint.config.js`

Règles recommandées JavaScript et Vue. Variables globales du navigateur partout, de Node pour `backend/**`. La règle `vue/multi-word-component-names` est coupée pour `frontend/src/pages/`.

### `index.html`

- **Rôle** : la seule page HTML.
- **Contenu** : script anti-flash (thème et mode confort lus dans `localStorage`), favicon, polices Google, `<div id="app">`, chargement de `/src/main.js`.
- **Détail** : `<html lang="en">` est écrit en dur, mais `main.js` le remplace aussitôt par la langue mémorisée.

### `.env.example`

Modèle sans valeurs : variables du serveur (`DATABASE_URL`, `JWT_SECRET`, `SITE_URL`, SMTP…) et du site (`VITE_SITE_URL`). Voir [11-deploiement.md](11-deploiement.md).

### `.github/workflows/mlezi-gardien.yml`

Robot de surveillance « Mlezi » (GitHub Actions). Toutes les heures en journée, appelle `https://moustakim.alwaysdata.net/fil/api/sante` ; chaque matin, contrôle l'API + la base, l'accueil, la connexion et la page Services, et ouvre (ou ferme) un ticket GitHub `mlezi` en cas de panne. Aucun secret nécessaire.

---

## Frontend — socle

### `frontend/src/main.js`

- **Rôle** : point d'entrée.
- **Fait** : importe les styles dans l'ordre, pose `lang` sur `<html>`, crée l'application et branche Pinia, le routeur et i18n.
- **Utilise** : `App.vue`, `router`, `i18n`.

### `frontend/src/App.vue`

- **Rôle** : coquille commune.
- **Logique** : `estEspaceAdmin` masque navbar, pied de page et SOS dans l'espace admin.
- **Style** : réserve la place de la navbar fixe avec `--hauteur-nav`.

### `frontend/src/router/index.js`

- **Rôle** : table des routes et garde de navigation.
- **Fonctions** :
  - `attendreInitialisation(initialized)` : renvoie une promesse résolue quand `initialized` passe à vrai. Existe parce que la restauration de session est asynchrone.
  - `router.beforeEach` : applique `requiresAdmin`, `requiresAuth`, `guestOnly` et la redirection depuis l'accueil.
- **Utilise** : `useAuth`.
- **Utilisé par** : `main.js`.

### `frontend/src/services/api.js`

- **Rôle** : point de passage **unique** vers l'API. Exporte `apiRequest(chemin, { method, body })`.
- **Fait** : ajoute le sous-dossier du site (`import.meta.env.BASE_URL`, par exemple `/fil`) devant `/api/...`, envoie le JSON, joint le cookie de session (`credentials: 'same-origin'`), renvoie la réponse JSON ou lève une erreur avec le message du serveur (et son code dans `erreur.status`).
- **`401`** : émet l'événement `auth:expired`, écouté par `stores/auth.js` qui passe le site en mode déconnecté.
- **Ne manipule jamais le jeton** : il est dans un cookie httpOnly, illisible par le JavaScript.
- **Utilisé par** : `stores/auth.js`, `data/store.js`, `stores/adherents.js`.

Historique : remplace `lib/supabaseClient.js` (client Supabase du navigateur, retiré), puis `lib/api.js` et `lib/apiBase.js` (fusionnés ici lors de la migration vers alwaysdata).

### `frontend/src/i18n/index.js`

- **Rôle** : configuration de vue-i18n.
- **Exporte** : `LANGUES`, `langueEnregistree()`, `enregistrerLangue(code)`, `i18n`, `texteFrancais(cle)`.
- **`texteFrancais`** : renvoie le texte français d'une clé quelle que soit la langue affichée. Sert à la lecture vocale, qui ne doit lire que du français.
- **À savoir** : le commentaire d'en-tête indique que les traductions shimaoré et kibushi n'ont pas été relues par un locuteur natif.

---

## Frontend — état et données

### `frontend/src/stores/auth.js`

Le fichier le plus important côté compte. Malgré son dossier, ce **n'est pas un store Pinia** : c'est un état `reactive` déclaré au niveau du module.

| Fonction | Reçoit | Renvoie / effet | Quand |
|---|---|---|---|
| `messageErreurProfil(error)` | une erreur | un message en français (exportée) | écriture dans `profiles` |
| `initialiserSession()` | — | `GET /api/auth/session` → remplit `state.user` ou `null`, puis `initialized = true` | à l'ouverture du site |
| `signup(payload)` | les champs du formulaire | `POST /api/auth/register` → le profil créé, ou lève une erreur | inscription |
| `login(email, password, remember)` | identifiants | `POST /api/auth/login` → le profil | connexion |
| `logout()` | — | `POST /api/auth/logout`, vide `state.user` | déconnexion |
| `updateProfile(patch)` | un objet partiel | action `profiles.updateOwn` **et** met à jour `state.user` | profil, disponibilités, formule |
| `changerMotDePasse(nouveau)` | texte | `PUT /api/auth/password` | profil |
| `demanderReinitialisationMotDePasse(email)` | texte | `POST /api/auth/forgot-password` | mot de passe oublié, création de compte par l'admin |
| `verifierLienReinitialisation(jeton)`, `reinitialiserMotDePasse(jeton, mdp)` | jeton du lien | `/api/auth/recovery/verify`, `/api/auth/recovery` | page de réinitialisation |
| `useAuth()` | — | `{ user, initialized, isAdmin, …fonctions }` | dans tout composant |

Partie délicate : `initialiserSession()` s'exécute dès l'import du fichier ; comme c'est asynchrone, `initialized` permet au routeur d'attendre la réponse avant de rediriger. L'événement `auth:expired` (émis par `services/api.js` sur une réponse `401`) remet `state.user` à `null`.

`isAdmin` est un `computed` : vrai si `state.user.est_admin` vaut `true` (valeur envoyée par le serveur, issue de la colonne `utilisateurs.est_admin`).

### `frontend/src/data/store.js`

- **Rôle** : fonctions métier du site. Elles appellent l'API (`POST /api/data { action, payload }`, via `appelerDonnees` puis `apiRequest`) et convertissent les réponses.
- **Constantes exportées** :
  - `COMMUNES_MAYOTTE` : 17 communes avec `zone`, `lat`, `lng`.
  - `FORMULES` : les 4 formules (`basique` 0 €, `essentiel` 25 €, `confort` 39 €, `premium` 101 €).
  - `DELAI_DEMARRAGE_MISSION_MS` : 3 minutes.
- **Fonctions utilitaires** : `getCoordonneesCommune(nom)`, `getZoneCommune(nom)`.
- **Fonctions de données** : listées dans [06-base-de-donnees.md](06-base-de-donnees.md), § 5.

Fonctions à comprendre en priorité :

- **`updateDemandeStatut(id, statut)`**. Envoie l'action `demandes.updateStatut`. C'est le **serveur** ([demande.service.js](../backend/services/demande.service.js)) qui, dans une transaction, vérifie que la personne participe à la demande, change le statut et, pour `acceptee`, attribue le code d'arrivée (`crypto.randomInt`, 4 chiffres) et crée la mission. Renvoie la demande. Appelée par `MesDemandes.vue` et `MesAccompagnements.vue`.
- **`missionDemarree(mission, maintenant)`**. Vrai si plus de 3 minutes se sont écoulées depuis `dateDebut`. `maintenant` est passé en paramètre pour que Vue recalcule l'affichage quand le minuteur de la page avance.
- **`mapDemande`, `mapMiseEnRelation`, `mapMessageContact`**. Convertissent une ligne de la base (`snake_case`) en objet de l'application (`camelCase`).
- **`createCompteAdmin` / `deleteCompteAdmin`**. Appellent les routes `/api/admin/comptes` (administrateur seulement), au lieu de `/api/data`.

### `frontend/src/stores/adminDashboard.js`

Store Pinia `admin-dashboard`. `charger()` lance quatre lectures en parallèle (`getUsers`, `getMessagesContact`, `getDemandes`, `getMisesEnRelation`). Les autres fonctions (`modifierCompte`, `supprimerCompte`, `creerCompte`, `marquerLu`, `supprimerMessage`) écrivent en base puis corrigent l'état local, ce qui évite de tout recharger. `nomCompte(id)` renvoie « Compte supprimé » si le profil n'existe plus. Chargé une fois par `Admin.vue`.

### `frontend/src/stores/adherents.js`

Store Pinia `adherents`. Ses quatre actions (`chargerAdherents`, `creerAdherent`, `modifierAdherent`, `supprimerAdherent`) appellent `/api/adherents` par `apiRequest` ([services/api.js](../frontend/src/services/api.js)).

### `frontend/src/stores/accessibility.js`

État du mode confort. Un `watchEffect` ajoute ou retire la classe `mode-confort` sur `<html>` et enregistre le choix dans `localStorage` (clé `dispositif.modeConfort`).

---

## Frontend — composables

### `frontend/src/composables/useAidants.js`

- **Rôle** : une seule liste d'intervenants partagée entre la carte et le compteur de l'accueil, donc une seule requête.
- **Logique** : surveille `user`. Sans compte, la liste est vide. Avec un compte, `getUsers()` est appelé une fois par session (`sessionChargee`).
- **`pres`** : cherche les intervenants de la commune de l'utilisateur ; s'il n'y en a aucun, élargit à sa zone ; renvoie `{ liste, portee, lieu }`.

### `frontend/src/composables/useSpeech.js`

- **Rôle** : lecture à voix haute.
- **`speak(texte, cle)`** : en français, utilise la synthèse vocale du navigateur. En shimaoré ou kibushi, cherche un fichier `audio/<langue>/<cle>.mp3` (dans le sous-dossier du site) ; s'il n'existe pas, lit le texte **français** de la clé.
- **`audioExiste(url)`** : vérifie le type de contenu renvoyé, car un hébergement statique renvoie `index.html` avec un code 200 pour un fichier absent.

### `frontend/src/composables/useVoiceInput.js`

Reconnaissance vocale du navigateur, en `fr-FR`. `start(onResult)` écoute une phrase puis s'arrête. `supported` doit être testé avant d'afficher un bouton.

### `frontend/src/composables/useTheme.js`

État du thème (`light`, `dark`, `auto`). Écrit `data-theme` sur `<html>`, mémorise dans `localStorage` (clé `theme`), et écoute le changement de thème du système en mode `auto`.

### `frontend/src/composables/useConnexion.js`

Un `ref` `enLigne` tenu à jour par les événements `online` et `offline` du navigateur.

---

## Backend

Voir [05-backend.md](05-backend.md) pour les routes. Résumé par fichier :

### `backend/app.js`

- **Rôle** : point d'entrée. Charge `.env`, branche les middlewares (CORS, JSON, cookies, en-têtes, origine), regroupe l'API (et, si `SERVIR_FRONT` n'est pas `false`, le site `dist/`) dans un routeur monté sur le sous-dossier déduit de `SITE_URL`, puis écoute sur `PORT` / `IP`.
- **Partie délicate** : alwaysdata transmet l'adresse complète (`/fil/api/...`) ; le routeur est donc monté sur `/fil` **et** à la racine.

### `backend/db.js`

Connexion à PostgreSQL (`pg`, variable `DATABASE_URL`). Exporte `requete`, `requeteUne`, `transaction(fn)` et `transactionAdmin(fn)` (transaction marquée administrateur pour le déclencheur `proteger_verifie`). Pool de 5 connexions, fermées après 30 s d'inactivité.

### `backend/middleware/session.js`

Lit le jeton (cookie ou en-tête `Authorization: Bearer`), vérifie sa signature, relit le compte et son rôle dans la base, et remplit `req.utilisateur`. Exporte aussi `requireAuth` et `exigerRole(...roles)`.

### `backend/services/jeton.service.js`, `motDePasse.service.js`, `email.service.js`

- `jeton.service.js` : `creerJeton`, `lireJeton` (JWT HS256), `poserCookie`, `effacerCookie`.
- `motDePasse.service.js` : `hacherMotDePasse`, `verifierMotDePasse` (bcrypt, comparaison factice si le compte n'existe pas), `motDePasseValide`.
- `email.service.js` : gabarit HTML aux couleurs du site, `envoyerLienReinitialisation(email, jeton, nom)`, `alerterNouveauMessage({ nom, message })`. Sans SMTP en développement, l'email s'affiche dans le terminal.

### `backend/models/*.model.js`

Une table par fichier, uniquement des requêtes SQL paramétrées. Les droits ne sont **pas** vérifiés ici mais dans les contrôleurs. Détail dans [06-base-de-donnees.md](06-base-de-donnees.md) § 5.

### `backend/sql/schema.sql` et `backend/sql/import-supabase.sql`

Création des 8 tables (détaillées dans [06-base-de-donnees.md](06-base-de-donnees.md)) et requête qui a fabriqué le script de transfert des données depuis Supabase.

---

## Ancien dossier `supabase/`

Plus utilisé par le code depuis la migration. Il contient l'ancien schéma (règles RLS), les migrations et la fonction Edge `notify-contact-message` (Deno) qui envoyait l'alerte SOS par Gmail ; ce rôle est repris par `backend/services/email.service.js`. Conservé comme référence historique.

---

## Fichiers présents mais inutilisés ou périmés

| Fichier | Constat |
|---|---|
| `frontend/src/components/MayotteSymbol.vue`, `frontend/src/styles/MayotteSymbol.css` | Importés par aucun fichier |
| `frontend/public/icons.svg` | Aucune référence trouvée dans `frontend/src/` ni `index.html` |
| `--mono`, style `code` dans `index.css` | Un commentaire d'`index.html` indique qu'aucune page n'utilise `<code>` |

## À retenir

- Pour comprendre le projet, lire dans cet ordre : `router/index.js`, `stores/auth.js`, `data/store.js`, `backend/app.js`, `backend/controllers/data.controller.js`, `backend/sql/schema.sql`.
- `stores/auth.js` n'est pas un store Pinia, contrairement à `adminDashboard.js` et `adherents.js`.
- Côté site, `store.js` regroupe les appels métier ; côté serveur, une requête SQL se modifie dans `backend/models/`.
- La règle métier centrale (accepter = code d'arrivée + mission) est dans `backend/services/demande.service.js`, en transaction.
- Toute l'application (site + API) se lance avec Node ; il n'y a plus de fonction Edge.
