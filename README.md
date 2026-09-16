# Dispositif d'accompagnement

Application Vue 3/Vite du dispositif d'accompagnement à Mayotte, avec un espace administrateur de gestion des adhérents.

## Démarrage local

```bash
npm install
copy .env.example .env
npm run dev:full
```

Le frontend est disponible sur `http://localhost:5173` et l'API sur `http://localhost:3001`. Le proxy Vite redirige automatiquement `/api` vers Express. Pour lancer séparément les services : `npm run dev` et `npm run server`.

## Configuration Supabase

1. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env` pour le site existant.
2. Renseigner `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` pour activer le miroir serveur.
3. Exécuter `supabase/schema.sql` dans l'éditeur SQL Supabase. La table `adherents` est créée avec des policies réservées à l'administrateur.

La clé `SUPABASE_SERVICE_ROLE_KEY` reste uniquement dans l'environnement Node. Elle ne doit jamais être préfixée par `VITE_`, exposée dans le navigateur ou commitée.

## Architecture ajoutée

- `server/index.js` : application Express, CORS, `express.json()` et routes REST.
- `server/adherentsStore.js` : lecture/écriture du modèle métier dans `server/data/adherents.json`.
- `server/supabaseSync.js` : miroir facultatif des créations, modifications et suppressions dans Supabase.
- `server/data/adherents.json` : stockage local de secours, initialisé avec un tableau vide.
- `src/stores/adherents.js` : store Pinia et appels `fetch()` vers `/api/adherents`.
- `src/components/AdherentsManager.vue` : composant réutilisable avec formulaire, recherche, tri, actions et toasts.
- `src/styles/AdherentsManager.css` : styles isolés du module.
- `supabase/schema.sql` : table `adherents` et policies RLS admin.
- `vite.config.js` : proxy de développement `/api` vers Express.

Les comptes utilisateurs déjà gérés par `profiles` et Supabase Auth ne sont pas remplacés. Le module adhérents est ajouté dans `/admin` et dispose de son propre stockage métier.

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

Dans `server/index.js`, les imports chargent Express, CORS et les fonctions de stockage. `express()` crée l'application, `cors()` autorise les appels du frontend et `express.json()` transforme le corps JSON des requêtes en objet JavaScript. `validerAdherent()` vérifie les champs obligatoires et les valeurs autorisées. Chaque route appelle le stockage JSON, puis `synchroniserAdherent()` met à jour Supabase si les variables serveur existent. Le middleware final transforme les erreurs inattendues en réponse HTTP 500.

### Frontend

Dans `src/stores/adherents.js`, `defineStore()` crée l'état Pinia. `appelerApi()` ajoute les en-têtes JSON, exécute `fetch()` et convertit les erreurs HTTP en exceptions. `chargerAdherents()`, `creerAdherent()`, `modifierAdherent()` et `supprimerAdherent()` appellent respectivement GET, POST, PUT et DELETE puis mettent à jour l'état réactif.

Dans `src/components/AdherentsManager.vue`, `computed()` filtre les champs recherchables et trie la copie de la liste. `reactive()` contient les valeurs du formulaire. `enregistrer()` choisit création ou modification selon `editionId`. `supprimer()` demande une confirmation, puis appelle le store. `notifier()` affiche un toast temporaire. Le template relie ces fonctions aux inputs, boutons et lignes du tableau.

## Vérifications

```bash
npm run lint
npm run build
```

Le test manuel du CRUD peut être effectué avec Postman, Insomnia ou `fetch()` dans la console du navigateur lorsque Express est lancé.
