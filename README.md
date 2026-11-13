# Dispositif d'accompagnement

Application Vue 3/Vite du dispositif d'accompagnement à Mayotte, avec API Express et Supabase Auth/Postgres.

## Démarrage local

```bash
npm install
copy .env.example .env
npm run dev:full
```

Le frontend est disponible sur `http://localhost:5173` et l'API sur `http://localhost:3001`. Le proxy Vite redirige automatiquement `/api` vers Express. Pour lancer séparément les services : `npm run dev` et `npm run server`.

## Configuration Supabase

1. Renseigner `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env`. Les accès Supabase passent maintenant par Express; aucune session Supabase n'est conservée dans le navigateur.
2. Générer `AUTH_SESSION_SECRET` avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` et configurer `SITE_URL`, `VITE_SITE_URL` et `CORS_ORIGINS` selon l'origine frontend.
3. Exécuter `supabase/schema.sql` et `supabase/migrations/20261029_secure_auth_sessions.sql` dans l'éditeur SQL Supabase. La migration crée les sessions révocables, accessibles uniquement au serveur.

`SUPABASE_SERVICE_ROLE_KEY` et `AUTH_SESSION_SECRET` restent uniquement dans l'environnement Node. Ne les préfixe jamais par `VITE_`, ne les expose pas au navigateur et ne les committe pas. Supabase Auth gère les comptes et le hachage reconnu des mots de passe; Express place un identifiant de session aléatoire dans un cookie `HttpOnly`, tandis que les jetons Supabase chiffrés et révocables restent côté serveur. `AUTH_REMEMBER_DAYS` règle la durée de « Se souvenir de moi » (30 jours par défaut, plafond de 365 jours); sans cette option, le cookie est temporaire et la session serveur expire après `AUTH_SESSION_HOURS` (12 h par défaut, plafond de 24 h).

## Structure du projet

```
frontend/     Le site (Vue 3 + Vite) : ce que voit le navigateur
  src/        pages, composants, styles, traductions...
  public/     fichiers servis tels quels (favicon, icônes, audio)
  scripts/    génération des pages SEO après le build
backend/      Le serveur (Node.js + Express) : l'API /api/...
  app.js        point d'entrée (middlewares + routes)
  config/ middleware/ routes/ controllers/ services/ models/
supabase/     La base de données : schéma, migrations, fonction Edge
docs/         Documentation détaillée (commencer par docs/README.md)
.github/      Mlezi, le robot de maintenance (GitHub Actions)
```

- `backend/app.js` : point d'entrée de l'API Express ; le code suit le découpage routes → controllers → services / models (détail dans `docs/05-backend.md`).
- `backend/controllers/auth.controller.js`, `backend/controllers/data.controller.js`, `backend/services/session.service.js` : connexion par sessions sécurisées et accès aux données sous RLS.
- `backend/models/adherent.model.js` : adhérents dans la table Supabase (PostgreSQL) `adherents`.
- `frontend/src/stores/adherents.js` et `frontend/src/pages/AdminAdherents.vue` : gestion des adhérents dans l'espace admin.
- `frontend/vite.config.js` : proxy de développement `/api` vers Express ; le build est écrit dans `dist/` à la racine.
- `supabase/schema.sql` : tables, index et règles RLS.

Les comptes utilisateurs restent gérés par Supabase Auth et les profils par `profiles` ; les appels métier passent par le serveur, afin que le navigateur ne reçoive aucun jeton Supabase.

## SEO et déploiement

Définir `VITE_SITE_URL` (frontend) et `SITE_URL` (serveur) avec l’URL publique HTTPS avant le build. `npm run build` génère les pages statiques publiques avec leurs titres, descriptions, URL canoniques et Open Graph, ainsi que `dist/sitemap.xml`, `dist/robots.txt` et `dist/404.html`. Sans domaine configuré, le sitemap est valide mais vide; renseigner l’URL avant le déploiement pour y inclure les pages publiques.

Configurer l’hébergement pour servir les fichiers statiques générés, préserver le statut HTTP 404 sur `404.html`, et transmettre `/api/*` à Express. Si frontend et API partagent le même site (y compris des sous-domaines), garder `COOKIE_SAME_SITE=lax`; s’ils sont sur des sites différents, `COOKIE_SAME_SITE=none` et HTTPS sont nécessaires, mais les navigateurs peuvent bloquer les cookies tiers. Un reverse proxy sous le même domaine est préférable. Sur Render, c'est le cas : le site statique transmet `/api/*` au service Express par une règle de réécriture, donc `VITE_API_URL` reste vide (voir `docs/11-deploiement.md`). Renseigner les secrets serveur dans la configuration de l’hébergeur.

## API REST

| Méthode | Route | Effet |
| --- | --- | --- |
| GET | `/api/adherents` | Retourne tous les adhérents |
| POST | `/api/adherents` | Crée un adhérent |
| PUT | `/api/adherents/:id` | Modifie un adhérent |
| DELETE | `/api/adherents/:id` | Supprime un adhérent |

Un adhérent contient `id`, `nom`, `email`, `telephone`, `ville`, `role`, `statut` et les dates `created_at`/`updated_at`.

## Lecture ligne par ligne du flux principal

### Backend

Dans `backend/app.js`, `express()` crée l'application ; les middlewares de `backend/middleware/` (CORS, `express.json()`, cookies, sécurité, session) s'appliquent à chaque requête, puis les fichiers de `backend/routes/` envoient chaque adresse vers son contrôleur. Pour les adhérents, `routes/adherents.routes.js` vérifie que l'utilisateur est l'administrateur, `controllers/adherents.controller.js` contrôle les champs (`validerAdherent()`) et appelle `models/adherent.model.js`, qui lit ou écrit la table `adherents` de Supabase. `middleware/erreurs.js` transforme les erreurs inattendues en réponse HTTP 500.

### Frontend

Dans `frontend/src/stores/adherents.js`, `defineStore()` crée l'état Pinia. `appelerApi()` ajoute les en-têtes JSON, exécute `fetch()` et convertit les erreurs HTTP en exceptions. `chargerAdherents()`, `creerAdherent()`, `modifierAdherent()` et `supprimerAdherent()` appellent respectivement GET, POST, PUT et DELETE puis mettent à jour l'état réactif.

Dans `frontend/src/components/AdherentsManager.vue`, `computed()` filtre les champs recherchables et trie la copie de la liste. `reactive()` contient les valeurs du formulaire. `enregistrer()` choisit création ou modification selon `editionId`. `supprimer()` demande une confirmation, puis appelle le store. `notifier()` affiche un toast temporaire. Le template relie ces fonctions aux inputs, boutons et lignes du tableau.

## Vérifications

```bash
npm run lint
npm run build
```

Le test manuel du CRUD peut être effectué avec Postman, Insomnia ou `fetch()` dans la console du navigateur lorsque Express est lancé.
