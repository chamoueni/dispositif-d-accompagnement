# 13 — Glossaire

Les termes techniques rencontrés dans le projet, expliqués simplement. Chaque entrée indique où le terme apparaît dans le code.

## Termes métier du projet

| Terme | Explication | Dans le code |
|---|---|---|
| **Personne âgée** | Utilisateur qui cherche de l'aide et envoie des demandes | rôle `senior` |
| **Personnel de santé** | Intervenant qui propose des soins | rôle `sante` |
| **Particulier** | Intervenant qui propose courses ou ménage | rôle `particulier` |
| **Aidant / intervenant / prestataire** | Trois mots employés dans le code pour la même chose : un personnel de santé ou un particulier | `aidant_id`, `useAidants`, `ProviderCard` |
| **Demandeur** | La personne âgée qui a envoyé la demande | `demandeur_id` |
| **Demande** | Sollicitation envoyée à un intervenant | table `demandes` |
| **Mise en relation / mission / accompagnement** | Trois mots pour la même chose : ce qui est créé quand une demande est acceptée | table `mises_en_relation` |
| **Code d'arrivée** | Code à 4 chiffres que l'intervenant annonce en arrivant | `demandes.code_arrivee` |
| **Formule** | Offre d'accompagnement (Basique, Essentiel, Confort, Premium) | `FORMULES` |
| **Adhérent** | Personne suivie par l'administrateur, gérée à part des comptes | `server/adherentsStore.js` |
| **Zone** | Regroupement de communes : Nord, Centre, Sud, Petite-Terre | `COMMUNES_MAYOTTE` |
| **Mode confort** | Affichage avec texte et boutons plus grands | classe `mode-confort` |
| **Shimaoré, kibushi** | Deux langues parlées à Mayotte | codes `shi`, `kib` |

## Termes généraux

| Terme | Explication |
|---|---|
| **Frontend** | La partie qui s'exécute dans le navigateur : ce que l'utilisateur voit. Ici, `src/`. |
| **Backend** | La partie qui s'exécute sur un serveur. Ici, `server/`, plus Supabase. |
| **API** | Ensemble d'adresses qu'un programme appelle pour demander ou envoyer des données. |
| **API REST** | API organisée autour de ressources et de verbes HTTP : `GET` (lire), `POST` (créer), `PUT` (modifier), `DELETE` (supprimer). Exemple : `/api/adherents`. |
| **Route** | Deux sens dans ce projet. Côté frontend : une adresse de page (`/profil`). Côté backend : une adresse d'API (`GET /api/sante`). |
| **JSON** | Format texte pour échanger des données, par exemple `{ "nom": "Ali" }`. |
| **Code de statut HTTP** | Nombre renvoyé par le serveur : 200 réussi, 201 créé, 204 réussi sans contenu, 400 requête invalide, 401 non identifié, 403 interdit, 404 introuvable, 500 erreur du serveur, 503 service indisponible. |
| **Variable d'environnement** | Réglage fourni au programme de l'extérieur (fichier `.env`, hébergeur), pour ne pas écrire de secret dans le code. |
| **Dépendance** | Bibliothèque externe installée avec `npm install`, listée dans `package.json`. |

## Vue et le frontend

| Terme | Explication | Exemple dans le projet |
|---|---|---|
| **SPA** (application à page unique) | Une seule page HTML ; JavaScript change le contenu sans recharger | `index.html` + `App.vue` |
| **Composant** | Morceau d'interface réutilisable, dans un fichier `.vue` | `ProviderCard.vue` |
| **`<script setup>`** | Façon courte d'écrire la logique d'un composant Vue 3 | tous les `.vue` |
| **Gabarit (`<template>`)** | La partie HTML d'un composant | |
| **Props** | Valeurs que le parent passe à un composant | `provider` de `ProviderCard` |
| **Événement (`emit`)** | Signal envoyé par un composant à son parent | `dictate` de `DictateButton` |
| **Slot** | Emplacement où le parent insère son contenu | `HighlightWord` |
| **`ref` / `reactive`** | Valeurs « réactives » : quand elles changent, l'écran se met à jour | `const chargement = ref(true)` |
| **`computed`** | Valeur calculée à partir d'autres, recalculée automatiquement | `results` dans la recherche |
| **`watch` / `watchEffect`** | Exécute du code quand une valeur change | `useTheme.js` |
| **`onMounted`** | Fonction appelée quand le composant vient de s'afficher ; c'est là qu'on charge les données | `RecherchePersonnel.vue` |
| **`v-model`** | Lie un champ de formulaire à une variable, dans les deux sens | `v-model="form.email"` |
| **`v-if` / `v-for`** | Afficher sous condition / répéter pour chaque élément | |
| **Composable** | Fonction `useQuelqueChose()` qui regroupe une logique réutilisable | `useSpeech`, `useTheme` |
| **Store** | Endroit où l'on range un état partagé entre plusieurs composants | `stores/` |
| **Pinia** | Bibliothèque officielle de stores pour Vue | `adminDashboard.js` |
| **Routeur** | Associe une adresse à une page | `src/router/index.js` |
| **Garde de navigation** | Fonction exécutée avant chaque changement de page, qui peut rediriger | `router.beforeEach` |
| **`meta`** | Informations libres attachées à une route | `requiresAuth`, `guestOnly`, `requiresAdmin` |
| **Chargement à la demande (lazy loading)** | Le code d'une page n'est téléchargé que lorsqu'on la visite | `() => import('../pages/…')` |
| **i18n** | Internationalisation : gestion des traductions | `vue-i18n`, fonction `t()` |
| **Clé de traduction** | Identifiant d'un texte dans les fichiers de langue | `nav.connexion` |
| **Vite** | Outil qui sert le site en développement et le construit pour la production | `vite.config.js` |
| **Build** | Transformation du code source en fichiers optimisés, dans `dist/` | `npm run build` |
| **Proxy** | En développement, Vite fait suivre `/api` vers Express | `vite.config.js` |
| **`localStorage`** | Petit stockage du navigateur, qui persiste entre les visites | thème, langue, mode confort |
| **`fetch`** | Fonction du navigateur pour appeler une adresse | `stores/adherents.js` |
| **`async` / `await` / promesse** | Façon d'attendre le résultat d'une opération longue (réseau) sans bloquer la page | toutes les fonctions de `store.js` |

## CSS et design

| Terme | Explication | Exemple |
|---|---|---|
| **Variable CSS (token)** | Valeur nommée, réutilisée partout | `--teal`, `var(--teal)` |
| **Alias** | Variable qui pointe vers une autre | `--accent: var(--teal)` |
| **Sass / SCSS** | Langage qui se compile en CSS, utilisé pour recompiler Bootstrap | `bootstrap-custom.scss` |
| **Bootstrap** | Bibliothèque de styles prêts à l'emploi (`btn`, `card`, `row`) | |
| **Media query** | Règle CSS appliquée selon la taille de l'écran ou une préférence | `@media (max-width: 991px)` |
| **Point de rupture (breakpoint)** | Largeur à partir de laquelle la mise en page change | 991 px, 1024 px |
| **Responsive** | Qui s'adapte au téléphone, à la tablette et à l'ordinateur | |
| **Flexbox / Grid** | Deux systèmes CSS pour disposer des éléments | `.admin-shell`, `.hero-inner` |
| **`z-index`** | Ordre d'empilement : le plus grand passe devant | bandeau hors-ligne : 2000 |
| **`position: fixed`** | L'élément reste à l'écran pendant le défilement | navbar, bouton SOS |
| **`scoped`** | Styles limités au composant qui les contient | `<style scoped>` de `App.vue` |
| **`:hover` / `:focus-visible` / `:active`** | États survolé / sélectionné au clavier / pressé | `ui.css` |
| **`prefers-reduced-motion`** | Préférence système « réduire les animations » | |
| **`prefers-color-scheme`** | Préférence système clair ou sombre | `useTheme.js` |
| **ARIA** | Attributs HTML qui décrivent l'interface aux lecteurs d'écran | `aria-label`, `aria-expanded` |
| **Lien d'évitement** | Premier lien de la page, qui saute directement au contenu | `.lien-evitement` |

## Backend et base de données

| Terme | Explication | Exemple |
|---|---|---|
| **Node.js** | Programme qui exécute du JavaScript hors du navigateur | `node server/index.js` |
| **Express** | Bibliothèque pour créer un serveur web en Node | `server/index.js` |
| **Middleware** | Fonction qui s'exécute avant la route (contrôle, transformation) | `verifierAdmin`, `cors()` |
| **CORS** | Règle des navigateurs qui limite les appels d'un site vers un autre ; le serveur dit qui il accepte | `app.use(cors())` |
| **Supabase** | Service en ligne qui fournit une base PostgreSQL, l'authentification et des fonctions | |
| **BaaS** | « Backend as a Service » : un backend prêt à l'emploi, comme Supabase | |
| **PostgreSQL** | Système de base de données relationnelle | |
| **Table / colonne / ligne** | Tableau de données / un champ / un enregistrement | `profiles` |
| **Clé primaire** | Colonne qui identifie une ligne de façon unique | `id` |
| **Clé étrangère** | Colonne qui pointe vers la clé primaire d'une autre table | `demandes.aidant_id` |
| **`on delete cascade`** | Si la ligne visée est supprimée, celles qui pointent vers elle le sont aussi | |
| **Contrainte `check`** | Règle que la valeur doit respecter | liste des statuts |
| **Index unique partiel** | Unicité imposée seulement sur certaines lignes | `profiles_telephone_unique` |
| **`uuid`** | Identifiant aléatoire très long, quasi impossible à deviner | |
| **`jsonb`** | Type PostgreSQL qui stocke du JSON | `disponibilites` |
| **`text[]`** | Type PostgreSQL : liste de textes | `services` |
| **`timestamptz`** | Date et heure avec fuseau horaire | `created_at` |
| **RLS** (Row Level Security) | Règles de la base qui décident, ligne par ligne, qui peut lire ou écrire | `schema.sql` |
| **Policy** | Une règle RLS | `profiles_update_own` |
| **`auth.uid()`** | Dans une règle : l'identifiant de l'utilisateur qui fait la requête | |
| **Clé « anon »** | Clé publique de Supabase, utilisée dans le navigateur, limitée par la RLS | `VITE_SUPABASE_ANON_KEY` |
| **Clé « service role »** | Clé d'administration qui **contourne** la RLS ; uniquement côté serveur | `SUPABASE_SERVICE_ROLE_KEY` |
| **`upsert`** | Insère la ligne, ou la met à jour si elle existe déjà | `supabaseSync.js` |
| **Fonction Edge** | Petit programme hébergé par Supabase, exécuté par Deno | `notify-contact-message` |
| **Deno** | Environnement d'exécution JavaScript/TypeScript, différent de Node | |
| **Webhook** | Appel automatique d'une adresse quand un événement se produit | insertion dans `messages_contact` |
| **SMTP** | Protocole d'envoi d'e-mails | fonction Edge |
| **Migration** | Fichier qui décrit une évolution du schéma ; le projet n'en a pas, seulement `schema.sql` | |
| **Transaction** | Groupe d'écritures qui réussissent ou échouent ensemble ; non utilisé à l'acceptation d'une demande | |

## Authentification et sécurité

| Terme | Explication |
|---|---|
| **Authentification** | Vérifier qui est l'utilisateur (connexion). |
| **Autorisation** | Vérifier ce qu'il a le droit de faire. |
| **Session** | Période pendant laquelle l'utilisateur reste connecté. |
| **JWT** (jeton) | Texte signé remis à la connexion, joint aux requêtes pour prouver l'identité. |
| **`Bearer`** | Façon d'envoyer un jeton : en-tête `Authorization: Bearer <jeton>`. |
| **Hachage** | Transformation irréversible d'un mot de passe ; fait ici par Supabase. |
| **XSS** | Injection de code dans une page via un texte non échappé. |
| **CSRF** | Requête déclenchée à l'insu de l'utilisateur depuis un autre site. |
| **Injection SQL** | Détournement d'une requête construite par collage de texte. |
| **Limite de débit (rate limit)** | Plafond du nombre de requêtes par période. |
| **RGPD** | Règlement européen sur la protection des données personnelles. |

## Outils

| Terme | Explication |
|---|---|
| **Git / GitHub** | Suivi des versions du code / site qui héberge le dépôt. |
| **Dépôt (repository)** | Le dossier du projet suivi par Git. |
| **Commit / push** | Enregistrer un changement / l'envoyer sur GitHub. |
| **`.gitignore`** | Liste des fichiers que Git ne doit pas suivre (`.env`, `node_modules`, `dist`). |
| **GitHub Actions** | Tâches automatiques lancées par GitHub. |
| **Cron** | Planification d'une tâche à intervalle régulier. |
| **Render** | Hébergeur du projet. |
| **ESLint** | Outil qui repère les erreurs et incohérences de code. |
| **npm** | Gestionnaire de paquets de Node (`npm install`, `npm run …`). |

## À retenir

- Le code emploie plusieurs mots pour une même notion : aidant = intervenant = prestataire ; mise en relation = mission = accompagnement ; `senior` = personne âgée.
- « Route » désigne une page côté frontend et une adresse d'API côté backend.
- RLS, clé « anon » et clé « service role » sont les trois notions à maîtriser pour comprendre la sécurité du projet.
