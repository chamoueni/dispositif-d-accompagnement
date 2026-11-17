# 10 — Technologies

Les versions de la colonne « Déclarée » sont lues dans [package.json](../package.json). Le signe `^` signifie « cette version ou une version mineure plus récente ». La colonne « Installée » est la version présente dans `node_modules` au moment de la rédaction ; elle peut différer sur une autre machine.

## 1. Frontend

| Nom | Déclarée | Installée | Rôle | Où | Communique avec |
|---|---|---|---|---|---|
| **Vue** | `^3.5.41` | 3.5.41 | Framework d'interface (composants, réactivité) | tout `frontend/src/` | le navigateur |
| **Vue Router** | `^5.2.0` | 5.2.0 | Navigation entre pages sans rechargement (mode « history », dans le sous-dossier du site) | `frontend/src/router/index.js` | `stores/auth.js` pour la garde |
| **Pinia** | `^3.0.3` | 3.0.4 | Stores partagés | `stores/adminDashboard.js`, `stores/adherents.js` | les pages admin |
| **vue-i18n** | `^11.4.12` | 11.4.12 | Traductions fr / shi / kib | `frontend/src/i18n/index.js`, `frontend/src/locales/` | tous les composants publics |
| **Bootstrap** | `^5.3.8` | 5.3.8 | Grille, boutons, formulaires, cartes | `styles/bootstrap-custom.scss`, `main.js` | recompilé avec Sass |
| **Leaflet** | `^1.9.4` | 1.9.4 | Carte interactive | `components/CarteMayotte.vue` | tuiles IGN |
| **leaflet.markercluster** | `^1.5.3` | 1.5.3 | Regroupement des marqueurs | `components/CarteMayotte.vue` | Leaflet |

Le site ne parle à l'API qu'avec `fetch`, regroupé dans [services/api.js](../frontend/src/services/api.js) : pas de bibliothèque HTTP.

Pourquoi ces choix, d'après les commentaires du code :

- **Bootstrap recompilé en Sass** plutôt que le CSS tout prêt : c'est le seul moyen de changer la palette de tous ses composants (`bootstrap-custom.scss`).
- **Tuiles IGN** plutôt que Google Maps : accès libre sans clé (`CarteMayotte.vue`).
- **Pas de bibliothèque d'icônes** : les icônes sont des SVG écrits dans les composants.

Le JavaScript de Bootstrap est importé dans `main.js`, mais le menu mobile est piloté par Vue (voir `AppNav.vue`).

## 2. Backend

| Nom | Déclarée | Installée | Rôle | Où |
|---|---|---|---|---|
| **Node.js** | `>=20` (`engines`) | v24 sur alwaysdata | Exécute le serveur | — |
| **Express** | `^5.1.0` | 5.2.1 | Serveur HTTP et routes | `backend/app.js`, `backend/routes/` |
| **pg** | `^8.23.1` | 8.23.1 | Connexion à PostgreSQL, requêtes paramétrées, transactions | `backend/db.js`, `backend/models/` |
| **bcryptjs** | `^3.0.3` | 3.0.3 | Hachage des mots de passe (bcrypt en JavaScript pur, rien à compiler sur le serveur) | `backend/services/motDePasse.service.js` |
| **jsonwebtoken** | `^9.0.3` | 9.0.3 | Jetons de connexion (JWT, HS256) | `backend/services/jeton.service.js` |
| **nodemailer** | `^10.6.0` | 10.6.0 | Envoi d'emails par SMTP | `backend/services/email.service.js` |
| **cookie-parser** | `^1.4.7` | 1.4.7 | Lecture du cookie de session | `backend/app.js` |
| **express-rate-limit** | `^8.7.1` | 8.7.1 | Limites de tentatives par adresse IP | `backend/middleware/limiteurs.js` |
| **cors** | `^2.8.5` | 2.8.6 | Liste des origines autorisées | `backend/middleware/securite.js` |
| **dotenv** | `^17.2.2` | 17.4.2 | Charge le fichier `.env` | `backend/config/env.js` |

Le code utilise les modules ES (`"type": "module"`) et le module `node:crypto` (jetons de réinitialisation, code d'arrivée).

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

Ces outils ne sont pas installés sur le serveur (`npm install --omit=dev`) : le build se fait sur le PC.

Aucun outil de test (Vitest, Jest, Cypress…) : **non trouvé dans le code**.

## 4. Services externes

| Service | Rôle | Où il est appelé | Configuration |
|---|---|---|---|
| **alwaysdata** | Hébergement du site front (Apache), de l'API (Node.js), de la base PostgreSQL 17 et du serveur d'emails | tout le projet en ligne | fiches des sites (Web › Sites), `.env` en local |
| **Géoplateforme IGN** | Fonds de carte « Plan » et « Satellite » | `CarteMayotte.vue` (`MODELE_IGN`) | aucune clé |
| **Google Fonts** | Polices Fraunces, Inter, Nunito Sans | `index.html` | aucune |
| **Unsplash** | Trois photos de la page « Pour qui » | `PourQui.vue` | aucune |
| **GitHub** | Dépôt du code ; GitHub Actions pour le robot « Mlezi » | `.github/workflows/mlezi-gardien.yml` | aucun secret |

Anciens services, remplacés en novembre 2026 : Supabase (base, comptes, fonction Edge d'email) et Render (hébergement).

## 5. Fonctions du navigateur utilisées

| API | Usage | Fichier |
|---|---|---|
| Web Speech — synthèse (`speechSynthesis`) | Lecture à voix haute | `composables/useSpeech.js` |
| Web Speech — reconnaissance (`SpeechRecognition`) | Dictée et commande vocale | `composables/useVoiceInput.js` |
| `fetch` | Appels à l'API | `services/api.js` |
| `localStorage` | Thème, mode confort, langue | `useTheme.js`, `accessibility.js`, `i18n/index.js`, `index.html` |
| `IntersectionObserver` | Apparition des cartes de l'accueil | `pages/Accueil.vue` |
| `ResizeObserver` | Hauteur de la navbar, taille de la carte | `AppNav.vue`, `CarteMayotte.vue` |
| `navigator.onLine` | Bandeau hors-ligne | `composables/useConnexion.js` |
| `matchMedia` | Thème du système, détection du survol | `useTheme.js`, `CarteMayotte.vue` |

## 6. Écarts avec le cahier des charges

| Prévu | Réel |
|---|---|
| MySQL | PostgreSQL (alwaysdata) |
| API REST Node.js + Express comme unique accès à la base | **Conforme** depuis la migration : le navigateur ne parle qu'à l'API |
| bcrypt, JWT gérés par l'application | **Conforme** : `bcryptjs` et `jsonwebtoken` dans le backend |
| Postman | Aucune collection dans le dépôt (l'API accepte l'en-tête `Authorization: Bearer` pour les tests) |
| Figma, Looping | Aucun fichier de maquette ni de modélisation dans le dépôt |

## À retenir

- Côté interface : Vue 3, Vue Router, Pinia, vue-i18n, Bootstrap 5, Leaflet.
- Côté serveur : Express 5, `pg`, `bcryptjs`, `jsonwebtoken`, `nodemailer`.
- alwaysdata fournit l'hébergement des deux sites, la base PostgreSQL et l'envoi d'emails.
- Aucun outil de test n'est installé.
- Node.js 20 minimum (`engines`), v24 en production.
