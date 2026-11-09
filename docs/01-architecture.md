# 01 — Architecture générale

Ce document donne la vue d'ensemble : quelles sont les grandes parties du projet, comment elles se parlent, et où se trouve chaque fichier.

## 1. Les grandes parties

| Partie | Technologie | Où | Rôle |
|---|---|---|---|
| Frontend | Vue 3 + Vite | `src/`, `index.html` | Toute l'interface : pages publiques, espace personnel, espace admin. C'est une application à page unique (SPA). |
| Backend Express | Node.js + Express | `server/` | Petite API REST pour trois choses que le navigateur ne peut pas faire seul : créer/supprimer un compte depuis l'admin, gérer les adhérents, interroger l'assistant IA. |
| Base de données et authentification | Supabase (PostgreSQL + Supabase Auth) | `supabase/schema.sql` | Stocke les profils, demandes, mises en relation, avis, messages de contact, adhérents. Gère aussi les comptes (e-mail + mot de passe). |
| Fonction Edge | Deno (Supabase Edge Function) | `supabase/functions/notify-contact-message/index.ts` | Envoie un e-mail à l'administrateur quand un message de contact est créé. |
| Robot de maintenance « Mlezi » | GitHub Actions | `.github/workflows/mlezi-gardien.yml` | Toutes les 10 min en journée : réveille l’API Render et fait travailler Supabase (`/api/sante`). Chaque matin : contrôle complet et ticket GitHub en cas de panne. |

Services externes appelés par le projet :

- **Supabase** : appelé par le frontend ([supabaseClient.js](../src/lib/supabaseClient.js)) et par le backend ([supabaseAdmin.js](../server/supabaseAdmin.js)).
- **API Anthropic** : appelée uniquement par le backend, route `POST /api/chat-ia` ([server/index.js](../server/index.js), ligne 210).
- **Géoplateforme IGN** : tuiles de carte chargées par le navigateur ([CarteMayotte.vue](../src/components/CarteMayotte.vue), constante `MODELE_IGN`).
- **Google Fonts** : polices Fraunces, Inter et Nunito Sans chargées dans [index.html](../index.html).
- **Unsplash** : trois photos chargées par URL dans [PourQui.vue](../src/pages/PourQui.vue).
- **SMTP Gmail** : utilisé par la fonction Edge pour envoyer l'e-mail.

## 2. Comment les parties communiquent

Point essentiel à comprendre : **le frontend parle directement à Supabase** pour presque tout. Le backend Express n'est pas un passage obligé entre le navigateur et la base.

```
                         NAVIGATEUR (Vue 3, src/)
                                   |
        +--------------------------+---------------------------+
        |                          |                           |
        | (1) supabase-js          | (2) fetch /api/...        | (3) tuiles, polices, photos
        |     clé "anon" + JWT     |     JSON                  |
        v                          v                           v
+------------------+      +-------------------+        IGN / Google Fonts / Unsplash
|    SUPABASE      |      |  EXPRESS (server/)|
|  - Auth          |<-----|  clé "service role"|-----> API Anthropic (assistant IA)
|  - PostgreSQL    | (4)  |                   |
|  - règles RLS    |      |  fichier JSON     |
+--------+---------+      |  server/data/     |
         |                +-------------------+
         | (5) Database Webhook (configuré dans le tableau de bord Supabase)
         v
+---------------------------+
| Fonction Edge (Deno)      |-----> SMTP Gmail -----> e-mail à l'administrateur
| notify-contact-message    |
+---------------------------+

GitHub Actions (cron) ----------> lecture de la table "avis" sur Supabase (maintien en activité)
```

Détail des flèches :

1. **Navigateur → Supabase.** Toutes les lectures et écritures métier (profils, demandes, missions, avis, messages) passent par [src/data/store.js](../src/data/store.js) et [src/stores/auth.js](../src/stores/auth.js). La sécurité repose sur les règles RLS de la base (voir [06-base-de-donnees.md](06-base-de-donnees.md)).
2. **Navigateur → Express.** Trois usages seulement : `/api/adherents` ([src/stores/adherents.js](../src/stores/adherents.js)), `/api/admin/comptes` ([store.js](../src/data/store.js), `createCompteAdmin` et `deleteCompteAdmin`), `/api/chat-ia` ([SosButton.vue](../src/components/SosButton.vue), `demanderAssistantIA`). L'adresse de base vient de [src/lib/apiBase.js](../src/lib/apiBase.js).
3. **Navigateur → services tiers.** Chargements directs, sans passer par le backend.
4. **Express → Supabase.** Avec la clé « service role », qui contourne les règles RLS. Sert à créer/supprimer des comptes Auth et à recopier les adhérents dans la table `adherents`.
5. **Supabase → fonction Edge.** Le déclencheur (Database Webhook) est décrit dans un commentaire de la fonction mais **n'est pas dans le dépôt** : il se configure dans le tableau de bord Supabase.

## 3. Arborescence

Dossiers générés ou externes non listés : `node_modules/`, `dist/`, `.git/`.

```
.
├── .env.example                 Modèle des variables d'environnement (sans valeurs)
├── .github/workflows/
│   └── mlezi-gardien.yml        Robot de maintenance : garde l’API et Supabase actifs, signale les pannes
├── .gitignore
├── eslint.config.js             Règles ESLint (JS + Vue, globals Node pour server/)
├── index.html                   Page HTML unique ; script anti-flash du thème ; polices
├── jsconfig.json                Exclusions pour l'éditeur
├── package.json                 Dépendances et scripts (frontend ET backend)
├── package-lock.json
├── README.md                    README existant (partiellement périmé, voir § 5)
├── vite.config.js               Configuration Vite : plugin Vue, proxy /api, options Sass
│
├── public/                      Fichiers servis tels quels
│   ├── favicon.png
│   ├── icons.svg
│   └── audio/
│       ├── LISEZ-MOI.md         Mode d'emploi des enregistrements shimaoré / kibushi
│       ├── kib/.gitkeep         (vide pour l'instant)
│       └── shi/.gitkeep         (vide pour l'instant)
│
├── server/                      Backend Express
│   ├── index.js                 Serveur, middleware, toutes les routes
│   ├── adherentsStore.js        Lecture/écriture des adhérents dans un fichier JSON
│   ├── supabaseAdmin.js         Client Supabase « service role »
│   ├── supabaseSync.js          Copie des adhérents vers la table Supabase "adherents"
│   ├── package.json             Contient seulement {"type": "module"}
│   └── data/adherents.json      Stockage local des adhérents
│
├── src/                         Frontend
│   ├── main.js                  Point d'entrée : crée l'app, branche Pinia, routeur, i18n
│   ├── App.vue                  Coquille : bandeau hors-ligne, navbar, <router-view>, pied de page, SOS
│   ├── index.css                Typographie et styles de base
│   ├── assets/
│   │   ├── theme.css            Couleurs clair/sombre, alias, mode confort
│   │   ├── logo.png
│   │   └── *.jpg                Photos (accueil, services, publics)
│   ├── components/              Composants réutilisables (voir 03-html-composants.md)
│   │   └── admin/               Composants propres à l'espace admin
│   ├── composables/             Logique réutilisable sans interface
│   │   ├── useAidants.js        Liste partagée des intervenants + calcul « près de chez vous »
│   │   ├── useConnexion.js      État en ligne / hors ligne
│   │   ├── useSpeech.js         Lecture à voix haute
│   │   ├── useTheme.js          Thème clair / sombre / auto
│   │   └── useVoiceInput.js     Reconnaissance vocale
│   ├── data/
│   │   └── store.js             Couche d'accès aux données Supabase + constantes métier
│   ├── i18n/index.js            Configuration vue-i18n (fr, shi, kib)
│   ├── lib/
│   │   ├── apiBase.js           Adresse de base de l'API Express
│   │   └── supabaseClient.js    Client Supabase du navigateur
│   ├── locales/                 Traductions : fr.json, shi.json, kib.json
│   ├── pages/                   Une vue par route (voir 02-frontend.md)
│   ├── router/index.js          Routes et garde de navigation
│   ├── stores/
│   │   ├── auth.js              Authentification et profil connecté
│   │   ├── accessibility.js     Mode confort
│   │   ├── adherents.js         Store Pinia des adhérents (API Express)
│   │   └── adminDashboard.js    Store Pinia de l'espace admin
│   └── styles/                  Un fichier CSS par page ou composant + ui.css + bootstrap-custom.scss
│
└── supabase/
    ├── schema.sql               Tables, index, règles RLS
    └── functions/notify-contact-message/index.ts   Fonction Edge (e-mail à l'admin)
```

## 4. Séparation frontend / backend

**Ce qui est bien séparé**

- Les clés sensibles restent côté serveur. `SUPABASE_SERVICE_ROLE_KEY` et `ANTHROPIC_API_KEY` ne sont lues que dans `server/` ([supabaseAdmin.js](../server/supabaseAdmin.js), [server/index.js](../server/index.js) ligne 48). Le frontend n'a que la clé « anon », prévue pour être publique.
- Les opérations qui exigent la clé « service role » (création et suppression d'un compte Auth) sont bien dans le backend, protégées par le middleware `verifierAdmin` ([server/index.js](../server/index.js), ligne 31).
- Côté frontend, les pages n'écrivent jamais de requête Supabase elles-mêmes (une seule exception, voir plus bas) : elles appellent les fonctions de [store.js](../src/data/store.js) ou de [auth.js](../src/stores/auth.js).

**Ce qui n'est pas séparé**

- **Les règles métier sont dans le navigateur.** Le changement de statut d'une demande, la création de la mise en relation et la génération du code d'arrivée se font dans `updateDemandeStatut` ([store.js](../src/data/store.js), ligne 307), exécuté dans le navigateur. Le serveur ne vérifie pas, par exemple, que seul l'intervenant accepte une demande : la règle RLS autorise les deux participants à modifier la ligne (voir [06-base-de-donnees.md](06-base-de-donnees.md)).
- **Un seul `package.json`** pour le frontend et le backend. `server/package.json` ne contient que `{"type": "module"}`. Les dépendances Express, cors, dotenv et `@anthropic-ai/sdk` sont donc installées avec celles du frontend.
- **Une exception à la couche de données** : [ReinitialiserMotDePasse.vue](../src/pages/ReinitialiserMotDePasse.vue) importe directement `supabase` pour écouter l'événement de récupération de mot de passe.
- **Deux types de bases** : SQL (Supabase/PostgreSQL) pour presque toutes les données, et **NoSQL (MongoDB)** pour les adhérents gérés par l'admin, avec repli sur un fichier JSON local si MongoDB n'est pas configuré (voir [05-backend.md](05-backend.md), section 8).

## 5. Points d'attention relevés dans le dépôt

- Le [README.md](../README.md) cite `src/components/AdherentsManager.vue` et `src/styles/AdherentsManager.css`. **Ces deux fichiers n'existent pas** ; la gestion des adhérents est dans [AdminAdherents.vue](../src/pages/AdminAdherents.vue).
- Le nom « Au Fil des Âges » **n'apparaît nulle part dans le code**. L'interface affiche « Dispositif d'accompagnement » ([AppNav.vue](../src/components/AppNav.vue), [App.vue](../src/App.vue)) et le titre de la page est « Dispositif d'accompagnement personnalisé » ([index.html](../index.html)).
- Aucun fichier de test, aucun script `test` dans [package.json](../package.json).

## À retenir

- Trois blocs : un frontend Vue, un petit backend Express, et Supabase pour la base et les comptes.
- Le frontend interroge Supabase **directement** ; Express ne sert que pour les comptes admin, les adhérents et l'assistant IA.
- La sécurité des données repose donc surtout sur les règles RLS de `supabase/schema.sql`.
- Les règles métier (statuts, code d'arrivée) sont exécutées dans le navigateur, pas sur un serveur.
- Frontend et backend partagent un seul `package.json`.
