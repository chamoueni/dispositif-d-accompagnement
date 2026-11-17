# 01 — Architecture générale

Ce document donne la vue d'ensemble : quelles sont les grandes parties du projet, comment elles se parlent, et où se trouve chaque fichier.

## 1. Les grandes parties

| Partie | Technologie | Où (code) | Où (en ligne) | Rôle |
|---|---|---|---|---|
| Frontend | Vue 3 + Vite | `frontend/` | site alwaysdata « PHP » (Apache), `moustakim.alwaysdata.net/fil`, dossier `~/aufildesages-front/dist` | Toute l'interface : pages publiques, espace personnel, espace admin. Application à page unique (SPA), construite sur le PC puis envoyée en fichiers statiques. |
| Backend (API) | Node.js + Express 5 | `backend/` | site alwaysdata « Node.js », `moustakim.alwaysdata.net/fil/api`, dossier `~/aufildesages` | Seul à parler à la base : connexion et comptes, données métier, adhérents, comptes admin, emails, bilan de santé `/api/sante`. |
| Base de données | PostgreSQL 17 | `backend/sql/schema.sql` | `postgresql-moustakim.alwaysdata.net`, base `moustakim_aufildesages` | Comptes (`utilisateurs`), profils, demandes, mises en relation, avis, messages de contact, adhérents, liens « mot de passe oublié ». |
| Robot de maintenance « Mlezi » | GitHub Actions | `.github/workflows/mlezi-gardien.yml` | serveurs de GitHub | Toutes les heures en journée : appelle `/api/sante`. Chaque matin : contrôle complet (API + base, pages) et ticket GitHub en cas de panne. |

Services externes appelés par le projet :

- **Serveur mail (SMTP) d'alwaysdata** : envoi des emails « mot de passe oublié » et des alertes SOS, par le backend ([email.service.js](../backend/services/email.service.js)).
- **Géoplateforme IGN** : tuiles de carte chargées par le navigateur ([CarteMayotte.vue](../frontend/src/components/CarteMayotte.vue), constante `MODELE_IGN`).
- **Google Fonts** : polices Fraunces, Inter et Nunito Sans chargées dans [index.html](../frontend/index.html).
- **Unsplash** : trois photos chargées par URL dans [PourQui.vue](../frontend/src/pages/PourQui.vue).
- **API publique de GitHub** : la carte « Santé du site » de l'espace admin y lit la dernière ronde de Mlezi ([SanteSite.vue](../frontend/src/components/admin/SanteSite.vue)).

## 2. Comment les parties communiquent

Point essentiel : **le navigateur ne parle qu'à l'API** (`/api/...`). Seule l'API lit et écrit dans la base.

```
                       NAVIGATEUR (Vue 3, frontend/src/)
                                  |
          +-----------------------+-------------------------+
          |                       |                         |
          | (1) pages, JS, CSS    | (2) fetch /fil/api/...  | (3) tuiles, polices, photos
          v                       |     JSON + cookie JWT   v
+----------------------+          |               IGN / Google Fonts / Unsplash
| SITE FRONT (Apache)  |          v
| /fil                 |   +--------------------------+
| ~/aufildesages-front |   | SITE BACK (Node.js)      |
| dist/ + .htaccess    |   | /fil/api  ~/aufildesages |
+----------------------+   | Express (backend/)       |
                           +------+-----------+-------+
                                  |           |
                     (4) SQL (pg) |           | (5) SMTP
                                  v           v
                     +-------------------+   serveur mail alwaysdata --> boîte email
                     | PostgreSQL 17     |
                     | moustakim_        |
                     | aufildesages      |
                     +-------------------+

GitHub Actions « Mlezi » (cron) -----> /fil/api/sante et pages du site (surveillance)
```

Détail des flèches :

1. **Navigateur → site front.** Apache envoie les fichiers construits (`dist/`). Le fichier `.htaccess` (généré au build) renvoie `index.html` pour toute adresse qui n'est pas un fichier : c'est Vue Router qui affiche la bonne page (mode « history »).
2. **Navigateur → API.** Toutes les données passent par [frontend/src/services/api.js](../frontend/src/services/api.js) (fonction `apiRequest`), qui ajoute le sous-dossier du site (`/fil`) devant `/api/...`. Le jeton de connexion voyage dans un **cookie httpOnly** : le navigateur le joint tout seul, le JavaScript ne peut pas le lire.
3. **Navigateur → services tiers.** Chargements directs, sans passer par le backend.
4. **API → base.** Par le paquet `pg` ([backend/db.js](../backend/db.js)), avec des requêtes **paramétrées** (`$1, $2…`) rangées dans [backend/models/](../backend/models/). Les règles d'accès sont vérifiées dans les contrôleurs avant chaque requête.
5. **API → serveur mail.** Par `nodemailer`.

Front et back sont sur le **même nom de domaine** (`moustakim.alwaysdata.net`) : alwaysdata envoie `/fil/api/...` au site back et le reste de `/fil/...` au site front. Le cookie de connexion fonctionne donc sans réglage particulier (pas de « cookie tiers »).

## 3. Arborescence

Deux grands dossiers : `frontend/` (le site) et `backend/` (le serveur et la base). Dossiers générés non listés : `node_modules/`, `dist/` (site construit, à la racine), `.git/`.

```
.
├── frontend/                    LE SITE (Vue 3 + Vite), ce que voit le navigateur
│   ├── index.html               Page HTML unique ; script anti-flash du thème ; polices
│   ├── vite.config.js           Configuration Vite : plugin Vue, sous-dossier (base), proxy /api, build vers ../dist
│   ├── jsconfig.json            Exclusions pour l'éditeur
│   ├── public/                  Fichiers servis tels quels (favicon, icônes, audio/)
│   ├── scripts/
│   │   └── generate-seo-pages.js  Pages SEO, sitemap, 404 et .htaccess générés après le build
│   └── src/
│       ├── main.js              Point d'entrée : crée l'app, branche Pinia, routeur, i18n
│       ├── App.vue              Coquille : bandeau hors-ligne, navbar, <router-view>, pied de page, SOS
│       ├── index.css            Typographie et styles de base
│       ├── assets/              theme.css (clair/sombre, mode confort), logo, photos
│       ├── components/          Composants réutilisables (voir 03-html-composants.md)
│       │   └── admin/           Composants propres à l'espace admin
│       ├── composables/         Logique réutilisable sans interface
│       ├── data/store.js        Fonctions métier (appellent l'API) + constantes
│       ├── i18n/index.js        Configuration vue-i18n (fr, shi, kib)
│       ├── lib/                 motDePasse.js (règles du mot de passe), nom.js (affichage du nom)
│       ├── locales/             Traductions : fr.json, shi.json, kib.json
│       ├── pages/               Une vue par route (voir 02-frontend.md)
│       ├── router/index.js      Routes et garde de navigation
│       ├── services/api.js      Point de passage unique vers l'API
│       ├── stores/              auth, accessibility, adherents, adminDashboard (Pinia)
│       └── styles/              Un fichier CSS par page ou composant + ui.css + bootstrap-custom.scss
│
├── backend/                     LE SERVEUR (Node.js + Express), l'API /api/...
│   ├── app.js                   Point d'entrée : middlewares, routes, sous-dossier, démarrage
│   ├── db.js                    Connexion PostgreSQL (pg), requete(), transaction()
│   ├── sql/
│   │   ├── schema.sql           Les 8 tables, index, contraintes, déclencheur
│   │   └── import-supabase.sql  Transfert des données depuis l'ancienne base Supabase
│   ├── config/                  .env, constantes, origines autorisées
│   ├── middleware/              Sécurité (CORS, origine), session JWT et rôles, admin, limites, erreurs
│   ├── routes/                  auth, admin, data, adherents, sante : adresse → contrôleur
│   ├── controllers/             Traitement de chaque requête : contrôles d'accès + réponse JSON
│   ├── services/                Jeton JWT, mots de passe, emails, confidentialité, demandes, validation
│   ├── models/                  Requêtes SQL, un fichier par table
│   └── package.json             Contient seulement {"type": "module"}
│
├── supabase/                    Ancien schéma Supabase (référence historique, plus utilisé)
├── docs/                        Cette documentation
├── .github/workflows/
│   └── mlezi-gardien.yml        Robot de maintenance : surveille le site, signale les pannes
├── .env.example                 Modèle des variables d'environnement (sans valeurs)
├── .gitignore
├── DEPLOIEMENT.md               Mise en ligne sur alwaysdata, étape par étape
├── eslint.config.js             Règles ESLint (JS + Vue, globals Node pour backend/)
├── package.json                 Dépendances et scripts (frontend ET backend)
├── package-lock.json
└── README.md
```

## 4. Séparation frontend / backend

**Ce qui est séparé**

- **L'hébergement** : deux sites alwaysdata distincts, dans deux dossiers distincts. Le front peut être remplacé sans redémarrer l'API, et inversement. Le back tourne avec `SERVIR_FRONT=false` : il ne sert que l'API.
- **Les secrets** restent côté serveur : `DATABASE_URL`, `JWT_SECRET`, `SMTP_PASS` ne sont lus que dans `backend/` et ne sont jamais envoyés au navigateur.
- **Les règles métier et les contrôles d'accès** sont dans le backend : changement de statut d'une demande, création de la mission, code d'arrivée ([demande.service.js](../backend/services/demande.service.js)), qui voit quelles demandes et quelles coordonnées ([data.controller.js](../backend/controllers/data.controller.js), [confidentialite.service.js](../backend/services/confidentialite.service.js)).
- Côté frontend, les pages n'appellent jamais `fetch` elles-mêmes pour l'API : elles passent par [store.js](../frontend/src/data/store.js), les stores, puis [services/api.js](../frontend/src/services/api.js).

**Ce qui n'est pas séparé**

- **Un seul `package.json`** pour le frontend et le backend. `backend/package.json` ne contient que `{"type": "module"}`. Sur le serveur, `npm install --omit=dev` n'installe que les paquets d'exécution (Express, pg, bcryptjs…) ; Vite et les outils restent sur le PC, où se fait le build.
- **Un seul dépôt Git** pour les deux parties.

## 5. Points d'attention relevés dans le dépôt

- Le nom « Au Fil des Âges » n'apparaît que dans les emails ; l'interface affiche « Dispositif d'accompagnement » ([AppNav.vue](../frontend/src/components/AppNav.vue), [App.vue](../frontend/src/App.vue)).
- Aucun fichier de test, aucun script `test` dans [package.json](../package.json).
- Le dossier `supabase/` n'est plus utilisé par le code ; il documente l'ancienne base.

## À retenir

- Trois blocs chez alwaysdata : un site front (fichiers statiques), un site back (API Express) et une base PostgreSQL.
- Le navigateur ne parle qu'à l'API ; l'API est la seule à toucher la base, avec des requêtes SQL paramétrées.
- Les contrôles d'accès et les règles métier sont exécutés sur le serveur.
- Frontend et backend partagent un seul `package.json`, mais sont hébergés séparément.
