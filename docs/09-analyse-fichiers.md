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

Règles recommandées JavaScript et Vue. Variables globales du navigateur partout, de Node pour `server/**`. La règle `vue/multi-word-component-names` est coupée pour `src/pages/`.

### `index.html`

- **Rôle** : la seule page HTML.
- **Contenu** : script anti-flash (thème et mode confort lus dans `localStorage`), favicon, polices Google, `<div id="app">`, chargement de `/src/main.js`.
- **Détail** : `<html lang="en">` est écrit en dur, mais `main.js` le remplace aussitôt par la langue mémorisée.

### `.env.example`

Modèle sans valeurs. Six variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. Voir [11-deploiement.md](11-deploiement.md).

### `.github/workflows/keep-supabase-alive.yml`

Tâche planifiée (`cron: "0 6 */3 * *"`) qui lit une ligne de la table `avis` avec `curl`. Elle lit deux secrets GitHub : `SUPABASE_URL` et `SUPABASE_ANON_KEY`. But : empêcher la mise en pause d'un projet Supabase gratuit inactif.

---

## Frontend — socle

### `src/main.js`

- **Rôle** : point d'entrée.
- **Fait** : importe les styles dans l'ordre, pose `lang` sur `<html>`, crée l'application et branche Pinia, le routeur et i18n.
- **Utilise** : `App.vue`, `router`, `i18n`.

### `src/App.vue`

- **Rôle** : coquille commune.
- **Logique** : `estEspaceAdmin` masque navbar, pied de page et SOS dans l'espace admin.
- **Style** : réserve la place de la navbar fixe avec `--hauteur-nav`.

### `src/router/index.js`

- **Rôle** : table des routes et garde de navigation.
- **Fonctions** :
  - `attendreInitialisation(initialized)` : renvoie une promesse résolue quand `initialized` passe à vrai. Existe parce que la restauration de session est asynchrone.
  - `router.beforeEach` : applique `requiresAdmin`, `requiresAuth`, `guestOnly` et la redirection depuis l'accueil.
- **Utilise** : `useAuth`.
- **Utilisé par** : `main.js`.

### `src/lib/supabaseClient.js`

Crée et exporte `supabase`, le client unique du navigateur, à partir de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Écrit une erreur explicite dans la console si elles manquent. Importé par `auth.js`, `store.js` et `ReinitialiserMotDePasse.vue`.

### `src/lib/apiBase.js`

Une ligne : `API_BASE_URL = import.meta.env.VITE_API_URL || ''`. Vide en local (le proxy Vite prend le relais), adresse du backend en production. Importé par `store.js`, `stores/adherents.js`, `SosButton.vue`.

### `src/i18n/index.js`

- **Rôle** : configuration de vue-i18n.
- **Exporte** : `LANGUES`, `langueEnregistree()`, `enregistrerLangue(code)`, `i18n`, `texteFrancais(cle)`.
- **`texteFrancais`** : renvoie le texte français d'une clé quelle que soit la langue affichée. Sert à la lecture vocale, qui ne doit lire que du français.
- **À savoir** : le commentaire d'en-tête indique que les traductions shimaoré et kibushi n'ont pas été relues par un locuteur natif.

---

## Frontend — état et données

### `src/stores/auth.js`

Le fichier le plus important côté compte. Malgré son dossier, ce **n'est pas un store Pinia** : c'est un état `reactive` déclaré au niveau du module.

| Fonction | Reçoit | Renvoie / effet | Quand |
|---|---|---|---|
| `messageErreurAuth(error)` | une erreur Supabase | un message en français | à chaque erreur d'authentification |
| `messageErreurProfil(error)` | une erreur de base | un message en français (exportée) | écriture dans `profiles` |
| `chargerProfil(authUser)` | l'utilisateur Auth | remplit `state.user` (profil + e-mail) ou `null` | connexion, restauration, changement de session |
| `creerProfilDepuisMetadata(authUser)` | l'utilisateur Auth | crée la ligne `profiles` à partir des métadonnées ; `true` si créé | première connexion après confirmation d'e-mail |
| `signup(payload)` | les champs du formulaire | le profil créé, ou lève une erreur | inscription |
| `login(email, password)` | identifiants | le profil | connexion |
| `logout()` | — | vide `state.user` | déconnexion |
| `updateProfile(patch)` | un objet partiel | écrit en base **et** met à jour `state.user` | profil, disponibilités, formule |
| `changerMotDePasse(nouveau)` | texte | — | profil, réinitialisation |
| `demanderReinitialisationMotDePasse(email)` | texte | — | mot de passe oublié, création de compte par l'admin |
| `useAuth()` | — | `{ user, initialized, isAdmin, …fonctions }` | dans tout composant |

Partie délicate : à l'ouverture du site, deux choses s'exécutent dès l'import du fichier — `getSession()` (restauration) et `onAuthStateChange` (écoute). C'est pour cela que `initialized` existe.

`isAdmin` est un `computed` : vrai si `state.user.email` est égal à `ADMIN_EMAIL`.

### `src/data/store.js`

- **Rôle** : couche d'accès aux données. Toutes les requêtes Supabase métier sont ici.
- **Constantes exportées** :
  - `COMMUNES_MAYOTTE` : 17 communes avec `zone`, `lat`, `lng`.
  - `FORMULES` : les 4 formules (`basique` 0 €, `essentiel` 25 €, `confort` 39 €, `premium` 101 €).
  - `DELAI_DEMARRAGE_MISSION_MS` : 3 minutes.
- **Fonctions utilitaires** : `getCoordonneesCommune(nom)`, `getZoneCommune(nom)`.
- **Fonctions de données** : listées dans [06-base-de-donnees.md](06-base-de-donnees.md), § 5.

Fonctions à comprendre en priorité :

- **`updateDemandeStatut(id, statut)`** (ligne 307). Reçoit l'identifiant d'une demande et le nouveau statut. Met à jour le statut et la date. Si le statut est `acceptee`, attribue en plus un code d'arrivée et crée la mission. Renvoie la demande. Appelée par `MesDemandes.vue` et `MesAccompagnements.vue`.
- **`genererCodeArrivee()`** (ligne 269). Tire un nombre avec `crypto.getRandomValues` (imprévisible, contrairement à `Math.random`) et le formate sur 4 chiffres, zéros de tête compris.
- **`codeArriveeAAttribuer(id)`** (ligne 283). Renvoie un nouveau code, ou `null` si un code existe déjà (il ne doit jamais changer) ou si la colonne n'existe pas encore dans la base.
- **`missionDemarree(mission, maintenant)`** (ligne 402). Vrai si plus de 3 minutes se sont écoulées depuis `dateDebut`. `maintenant` est passé en paramètre pour que Vue recalcule l'affichage quand le minuteur de la page avance.
- **`mapDemande`, `mapMiseEnRelation`, `mapMessageContact`**. Convertissent une ligne de la base (`snake_case`) en objet de l'application (`camelCase`).
- **`createCompteAdmin` / `deleteCompteAdmin`**. Les deux seules fonctions de ce fichier qui appellent le backend Express plutôt que Supabase, en joignant le jeton de session.

### `src/stores/adminDashboard.js`

Store Pinia `admin-dashboard`. `charger()` lance quatre lectures en parallèle (`getUsers`, `getMessagesContact`, `getDemandes`, `getMisesEnRelation`). Les autres fonctions (`modifierCompte`, `supprimerCompte`, `creerCompte`, `marquerLu`, `supprimerMessage`) écrivent en base puis corrigent l'état local, ce qui évite de tout recharger. `nomCompte(id)` renvoie « Compte supprimé » si le profil n'existe plus. Chargé une fois par `Admin.vue`.

### `src/stores/adherents.js`

Store Pinia `adherents`. `appelerApi(url, options)` centralise les `fetch` vers Express : ajoute l'en-tête JSON, lit la réponse, lève une erreur si le statut n'est pas correct. Quatre actions : `chargerAdherents`, `creerAdherent`, `modifierAdherent`, `supprimerAdherent`.

### `src/stores/accessibility.js`

État du mode confort. Un `watchEffect` ajoute ou retire la classe `mode-confort` sur `<html>` et enregistre le choix dans `localStorage` (clé `dispositif.modeConfort`).

---

## Frontend — composables

### `src/composables/useAidants.js`

- **Rôle** : une seule liste d'intervenants partagée entre la carte et le compteur de l'accueil, donc une seule requête.
- **Logique** : surveille `user`. Sans compte, la liste est vide. Avec un compte, `getUsers()` est appelé une fois par session (`sessionChargee`).
- **`pres`** : cherche les intervenants de la commune de l'utilisateur ; s'il n'y en a aucun, élargit à sa zone ; renvoie `{ liste, portee, lieu }`.

### `src/composables/useSpeech.js`

- **Rôle** : lecture à voix haute.
- **`speak(texte, cle)`** : en français, utilise la synthèse vocale du navigateur. En shimaoré ou kibushi, cherche un fichier `/audio/<langue>/<cle>.mp3` ; s'il n'existe pas, lit le texte **français** de la clé.
- **`audioExiste(url)`** : vérifie le type de contenu renvoyé, car un hébergement statique renvoie `index.html` avec un code 200 pour un fichier absent.

### `src/composables/useVoiceInput.js`

Reconnaissance vocale du navigateur, en `fr-FR`. `start(onResult)` écoute une phrase puis s'arrête. `supported` doit être testé avant d'afficher un bouton.

### `src/composables/useTheme.js`

État du thème (`light`, `dark`, `auto`). Écrit `data-theme` sur `<html>`, mémorise dans `localStorage` (clé `theme`), et écoute le changement de thème du système en mode `auto`.

### `src/composables/useConnexion.js`

Un `ref` `enLigne` tenu à jour par les événements `online` et `offline` du navigateur.

---

## Backend

Voir [05-backend.md](05-backend.md) pour les routes. Résumé par fichier :

### `server/index.js`

- **Utilise** : `express`, `cors`, `@anthropic-ai/sdk`, `adherentsStore.js`, `supabaseSync.js`, `supabaseAdmin.js`.
- **Fonctions** : `verifierAdmin` (middleware), `validerAdherent(body)` (renvoie un message d'erreur ou `null`), les 7 routes, le gestionnaire d'erreurs.
- **Constantes** : `rolesAutorises`, `statutsAutorises`, `ADMIN_EMAIL`, `CONTEXTE_SITE`.
- **Partie délicate** : dans `POST /api/admin/comptes`, si l'insertion du profil échoue après la création du compte Auth, le compte est supprimé pour éviter un compte sans profil.

### `server/adherentsStore.js`

`lireAdherents` / `ecrireAdherents` (privées) lisent et réécrivent **tout le fichier** à chaque opération. Exporte `obtenirAdherents`, `ajouterAdherent`, `modifierAdherent` (renvoie `null` si introuvable), `supprimerAdherent` (renvoie `false` si introuvable). Deux requêtes simultanées peuvent s'écraser, puisqu'il n'y a pas de verrou.

### `server/supabaseAdmin.js`

Charge `.env` puis exporte `supabaseAdmin`, ou `null` si l'adresse ou la clé manque. Ce `null` permet au serveur de démarrer sans Supabase.

### `server/supabaseSync.js`

`synchroniserAdherent(adherent, operation)` : ne fait rien si `supabaseAdmin` est `null` ; sinon `upsert` ou `delete` dans la table `adherents`.

---

## Supabase

### `supabase/schema.sql`

Détaillé dans [06-base-de-donnees.md](06-base-de-donnees.md).

### `supabase/functions/notify-contact-message/index.ts`

- **Rôle** : envoyer un e-mail à l'administrateur.
- **Reçoit** : le corps d'un Database Webhook (`{ record, ... }`).
- **Fait** : ouvre une connexion SMTP vers Gmail avec les secrets `GMAIL_USER` et `GMAIL_APP_PASSWORD`, envoie un message au sujet fixe, contenant le nom et le texte.
- **Renvoie** : `{ success: true }`, `400` sans message, `500` en cas d'erreur.
- **Dépendance** : `denomailer` 1.6.0, importé par URL.
- **Environnement** : Deno, pas Node. C'est pour cela que `jsconfig.json` exclut le dossier `supabase` et que `.vscode/settings.json` active Deno pour ce dossier.

---

## Fichiers présents mais inutilisés ou périmés

| Fichier | Constat |
|---|---|
| `src/components/MayotteSymbol.vue`, `src/styles/MayotteSymbol.css` | Importés par aucun fichier |
| `public/icons.svg` | Aucune référence trouvée dans `src/` ni `index.html` |
| `README.md` | Cite deux fichiers qui n'existent pas (`AdherentsManager.vue`, `AdherentsManager.css`) |
| `--mono`, style `code` dans `index.css` | Un commentaire d'`index.html` indique qu'aucune page n'utilise `<code>` |

## À retenir

- Pour comprendre le projet, lire dans cet ordre : `router/index.js`, `stores/auth.js`, `data/store.js`, `supabase/schema.sql`, `server/index.js`.
- `stores/auth.js` n'est pas un store Pinia, contrairement à `adminDashboard.js` et `adherents.js`.
- `store.js` est le seul endroit où modifier une requête Supabase métier.
- `updateDemandeStatut` porte la règle métier centrale : accepter = code d'arrivée + mission.
- La fonction Edge tourne sous Deno et se déploie séparément du reste.
