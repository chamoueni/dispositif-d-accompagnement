# 10 — Technologies

Les versions de la colonne « Déclarée » sont lues dans [package.json](../package.json). Le signe `^` signifie « cette version ou une version mineure plus récente ». La colonne « Installée » est la version présente dans `node_modules` au moment de la rédaction ; elle peut différer sur une autre machine.

## 1. Frontend

| Nom | Déclarée | Installée | Rôle | Où | Communique avec |
|---|---|---|---|---|---|
| **Vue** | `^3.5.41` | 3.5.41 | Framework d'interface (composants, réactivité) | tout `frontend/src/` | le navigateur |
| **Vue Router** | `^5.2.0` | 5.2.0 | Navigation entre pages sans rechargement | `frontend/src/router/index.js` | `stores/auth.js` pour la garde |
| **Pinia** | `^3.0.3` | 3.0.4 | Stores partagés | `stores/adminDashboard.js`, `stores/adherents.js` | les pages admin |
| **vue-i18n** | `^11.4.12` | 11.4.12 | Traductions fr / shi / kib | `frontend/src/i18n/index.js`, `frontend/src/locales/` | tous les composants publics |
| **Bootstrap** | `^5.3.8` | 5.3.8 | Grille, boutons, formulaires, cartes | `styles/bootstrap-custom.scss`, `main.js` | recompilé avec Sass |
| **@supabase/supabase-js** | `^2.112.3` | 2.112.3 | Client Supabase (auth + requêtes), côté serveur uniquement | `backend/supabaseAdmin.js`, `backend/sessions.js`, `backend/dataRoutes.js` | l'API Supabase |
| **Leaflet** | `^1.9.4` | 1.9.4 | Carte interactive | `components/CarteMayotte.vue` | tuiles IGN |
| **leaflet.markercluster** | `^1.5.3` | 1.5.3 | Regroupement des marqueurs | `components/CarteMayotte.vue` | Leaflet |

Pourquoi ces choix, d'après les commentaires du code :

- **Bootstrap recompilé en Sass** plutôt que le CSS tout prêt : c'est le seul moyen de changer la palette de tous ses composants (`bootstrap-custom.scss`).
- **Tuiles IGN** plutôt que Google Maps : accès libre sans clé (`CarteMayotte.vue`).
- **Pas de bibliothèque d'icônes** : les icônes sont des SVG écrits dans les composants.

Le JavaScript de Bootstrap est importé dans `main.js`, mais le menu mobile est piloté par Vue (voir `AppNav.vue`).

## 2. Backend

| Nom | Déclarée | Installée | Rôle | Où | Communique avec |
|---|---|---|---|---|---|
| **Express** | `^5.1.0` | 5.2.1 | Serveur HTTP et routes | `backend/index.js` | le frontend |
| **cors** | `^2.8.5` | 2.8.6 | Autorise les appels depuis une autre origine | `backend/index.js` | — |
| **dotenv** | `^17.2.2` | 17.4.2 | Charge le fichier `.env` | `backend/supabaseAdmin.js` | — |
| **Node.js** | non déclarée | — | Exécute le serveur | — | — |

La version de Node attendue n'est pas déclarée (`engines` absent). Le code utilise les modules ES (`"type": "module"`) et l'objet global `crypto`.

## 3. Outils de développement

| Nom | Déclarée | Installée | Rôle |
|---|---|---|---|
| **Vite** | `^8.2.0` | 8.2.1 | Serveur de développement et construction du site |
| **@vitejs/plugin-vue** | `^6.0.8` | 6.0.8 | Permet à Vite de lire les fichiers `.vue` |
| **Sass** | `^1.102.0` | 1.102.0 | Compile `bootstrap-custom.scss` |
| **ESLint** | `^10.8.0` | 10.8.1 | Vérifie la qualité du code |
| **@eslint/js** | `^10.0.1` | — | Règles JavaScript recommandées |
| **eslint-plugin-vue** | `^10.10.0` | 10.10.0 | Règles pour les fichiers `.vue` |
| **vue-eslint-parser** | `^10.4.1` | — | Analyseur de fichiers `.vue` pour ESLint |
| **globals** | `^17.7.0` | — | Listes de variables globales (navigateur, Node) |
| **concurrently** | `^9.2.1` | 9.2.4 | Lance Vite et Express en même temps (`npm run dev:full`) |

Aucun outil de test (Vitest, Jest, Cypress…) : **non trouvé dans le code**.

## 4. Services externes

| Service | Rôle | Où il est appelé | Configuration |
|---|---|---|---|
| **Supabase** | Base PostgreSQL, authentification, règles RLS, fonction Edge | `backend/supabaseAdmin.js`, `backend/sessions.js`, `supabase/` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Géoplateforme IGN** | Fonds de carte « Plan » et « Satellite » | `CarteMayotte.vue` (`MODELE_IGN`) | aucune clé |
| **Google Fonts** | Polices Fraunces, Inter, Nunito Sans | `index.html` | aucune |
| **Unsplash** | Trois photos de la page « Pour qui » | `PourQui.vue` | aucune |
| **SMTP Gmail** | Envoi de l'e-mail à l'administrateur | fonction Edge | secrets `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| **GitHub Actions** | Robot de maintenance « Mlezi » | `.github/workflows/mlezi-gardien.yml` | secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Render** | Hébergement | — | aucun fichier de configuration dans le dépôt |

## 5. Fonctions du navigateur utilisées

| API | Usage | Fichier |
|---|---|---|
| Web Speech — synthèse (`speechSynthesis`) | Lecture à voix haute | `composables/useSpeech.js` |
| Web Speech — reconnaissance (`SpeechRecognition`) | Dictée et commande vocale | `composables/useVoiceInput.js` |
| `localStorage` | Thème, mode confort, langue | `useTheme.js`, `accessibility.js`, `i18n/index.js`, `index.html` |
| `crypto.getRandomValues` | Code d'arrivée | `data/store.js` |
| `IntersectionObserver` | Apparition des cartes de l'accueil | `pages/Accueil.vue` |
| `ResizeObserver` | Hauteur de la navbar, taille de la carte | `AppNav.vue`, `CarteMayotte.vue` |
| `navigator.onLine` | Bandeau hors-ligne | `composables/useConnexion.js` |
| `matchMedia` | Thème du système, détection du survol | `useTheme.js`, `CarteMayotte.vue` |
| `AbortController` | Délai maximum de l'assistant | `SosButton.vue` |

## 6. Fonction Edge

| Nom | Version | Rôle |
|---|---|---|
| **Deno** | non déclarée | Environnement d'exécution des fonctions Supabase |
| **denomailer** | 1.6.0 (dans l'URL d'import) | Client SMTP |

## 7. Écarts avec le cahier des charges

| Prévu | Réel |
|---|---|
| MySQL | PostgreSQL (Supabase) |
| API REST Node.js + Express comme unique accès à la base | Accès direct du navigateur à Supabase ; Express en complément |
| bcrypt, JWT gérés par l'application | Délégués à Supabase Auth |
| Postman | Aucune collection dans le dépôt |
| Figma, Looping | Aucun fichier de maquette ni de modélisation dans le dépôt |

## À retenir

- Côté interface : Vue 3, Vue Router, Pinia, vue-i18n, Bootstrap 5, Leaflet.
- Côté serveur : Express 5, avec le SDK Supabase et le pilote MongoDB.
- Supabase fournit à la fois la base, les comptes et la fonction d'envoi d'e-mail.
- Aucun outil de test n'est installé.
- La version de Node n'est pas fixée dans le projet.
