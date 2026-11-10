# 11 — Lancement et déploiement

Ce document sépare ce qui est **écrit dans le dépôt** de ce qui se règle **ailleurs** (tableaux de bord Render, Supabase, GitHub). Pour ce second groupe, le dépôt ne permet pas de confirmer l'état réel : c'est signalé par « Non trouvé ».

## 1. Lancer le projet en local

Prérequis : Node.js et npm. La version de Node n'est pas imposée par le projet.

```bash
npm install
copy .env.example .env       # sous Windows ; "cp" sous macOS/Linux
# remplir .env (voir § 2)
npm run dev:full
```

| Commande | Ce qu'elle lance | Adresse |
|---|---|---|
| `npm run dev` | Vite (frontend seul) | `http://localhost:5173` (port par défaut de Vite, indiqué dans le README) |
| `npm run server` | Express (`node backend/app.js`) | `http://localhost:3001` (ou `PORT`) |
| `npm run dev:full` | Les deux, avec `concurrently` | — |
| `npm run build` | Construit le site dans `dist/` | — |
| `npm run preview` | Sert le contenu de `dist/` pour vérification | — |
| `npm run lint` | ESLint sur tout le projet | — |

En local, le frontend appelle `/api/...` et Vite redirige vers Express ([vite.config.js](../frontend/vite.config.js)). `VITE_API_URL` peut donc rester vide.

Sans Express, le site ne fonctionne pas : la connexion et toutes les données passent par lui.

## 2. Variables d'environnement

Les noms viennent de [.env.example](../.env.example). **Ne jamais écrire leurs valeurs dans le dépôt ni dans la documentation.**

| Nom | Côté | Lue dans | Rôle |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | `frontend/src/lib/supabaseClient.js` | Adresse du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend | `frontend/src/lib/supabaseClient.js` | Clé publique « anon » |
| `VITE_API_URL` | Frontend | `frontend/src/lib/apiBase.js` | **Vide** en local comme en production : le site appelle `/api/...` sur sa propre adresse (proxy Vite en local, règle de réécriture Render en ligne) |
| `SUPABASE_URL` | Backend | `backend/config/supabase.js` | Adresse du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | `backend/config/supabase.js` | Clé d'administration. **Jamais de préfixe `VITE_`.** |
| `PORT` | Backend | `backend/app.js` | Port d'écoute (fourni par l'hébergeur) |

Deux règles à retenir :

- Une variable préfixée `VITE_` est **incluse dans le JavaScript envoyé au navigateur**. Elle est lue au moment de `npm run build`, pas au démarrage : après l'avoir changée, il faut reconstruire le site.
- Les variables du backend sont lues au démarrage du serveur : après un changement, il faut le redémarrer.

Autres secrets, hors `.env` :

| Nom | Où le régler | Utilisé par |
|---|---|---|
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Secrets des fonctions Edge, dans Supabase | `supabase/functions/notify-contact-message/index.ts` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Secrets du dépôt GitHub | `.github/workflows/mlezi-gardien.yml` |

## 3. Construction (build)

`npm run build` exécute `vite build` et produit le dossier `dist/` : un `index.html`, et un fichier JavaScript par page grâce au chargement à la demande. `dist/` est ignoré par Git.

Le backend n'a pas d'étape de construction : il s'exécute tel quel avec Node.

## 4. Hébergement

Le propriétaire indique que le backend est sur **Render**. Voici ce que le dépôt confirme et ce qu'il ne confirme pas.

| Élément | Constat dans le dépôt |
|---|---|
| Fichier `render.yaml` | **Non trouvé** |
| Deux services distincts (site statique + API) | Suggéré par les commentaires de `.env.example` et de `frontend/src/lib/apiBase.js` (« service Render séparé du site statique ») |
| Adresse du site déployé | **Non trouvée** |
| Adresse de l'API déployée | **Non trouvée** (l'exemple de `.env.example` est fictif) |
| Commandes de build et de démarrage réglées chez Render | **Non trouvées** ; elles devraient correspondre aux scripts du § 1 |
| Nom de domaine personnalisé | **Non trouvé** |
| Version de Node utilisée en production | **Non trouvée** |

### Réglages attendus, déduits du code

**Frontend (site statique)**

- Commande de construction : `npm install && npm run build`.
- Dossier publié : `dist`.
- Variables à définir avant la construction : `VITE_SITE_URL` et `SITE_URL` (adresse publique du site). `VITE_API_URL` reste vide.
- **Règle de réécriture à placer en premier** (Redirects/Rewrites) : `/api/*` → `https://dispositif-d-accompagnement-ulzn.onrender.com/api/*`, action *Rewrite*. Le navigateur parle ainsi à l’API par l’adresse du site : les cookies de session restent « du même site » (deux sous-domaines `onrender.com` comptent comme deux sites différents, et les navigateurs bloquent de plus en plus les cookies tiers).
- **Règle de réécriture indispensable** : toutes les adresses doivent renvoyer `index.html`. Le routeur utilise `createWebHistory()` ; sans cette règle, recharger `/mon-compte` donne une erreur 404. Un commentaire de `frontend/src/composables/useSpeech.js` indique que l'hébergement renvoie bien `index.html` pour un chemin inconnu.

**Backend (service web)**

- Commande de démarrage (**Start Command** sur Render) : `npm start`, qui lance `node backend/app.js`. ⚠️ Ne pas écrire de chemin de fichier en dur dans Render : après la réorganisation en `frontend/` + `backend/` (novembre 2026), l'ancienne commande `node server/index.js` faisait échouer chaque déploiement, Render gardant l'ancienne version en ligne sans le signaler aux visiteurs.
- Contrôle de santé conseillé (**Health Check Path**) : `/api/sante`.
- Installation : `npm install` à la racine, puisque le `package.json` est commun.
- Variables : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SESSION_SECRET`, `SITE_URL`, `NODE_ENV=production`, `MONGODB_URI` (détail dans [.env.example](../.env.example)). `PORT` est en général fourni par l'hébergeur.
- Un commentaire de `SosButton.vue` mentionne la mise en veille du serveur après inactivité sur l'offre gratuite ; c'est la raison du délai de 5 secondes de l'assistant.

**Point de vigilance.** Sans `MONGODB_URI`, les adhérents sont enregistrés dans le fichier `backend/data/adherents.json`, effacé par Render à chaque redéploiement. En production, renseigner `MONGODB_URI` (base gratuite MongoDB Atlas : créer un cluster, un utilisateur, autoriser l'accès réseau `0.0.0.0/0`, puis copier la chaîne `mongodb+srv://…`). Voir [05-backend.md](05-backend.md), section 8.

## 4 bis. Maintenance automatique : Mlezi

[.github/workflows/mlezi-gardien.yml](../.github/workflows/mlezi-gardien.yml), gratuit (GitHub Actions, dépôt public) :

| Quand | Action | Effet |
|---|---|---|
| Toutes les 10 min (minutes 07, 17, 27…), 7 h – 23 h (Mayotte) | appelle `GET /api/sante` | réveille l’API Render (endormie après 15 min sans visite) et lit la table `avis` dans Supabase (évite la pause du projet gratuit) |
| Chaque jour vers 8 h 23 | contrôle l’API, la règle de réécriture, les pages et Supabase | en cas de panne : ticket GitHub étiqueté `mlezi` (email au propriétaire) ; ticket fermé automatiquement quand tout remarche |
| À la demande | onglet *Actions* › Mlezi › *Run workflow* | contrôle complet immédiat |

L’ancien `keep-supabase-alive.yml` (un appel tous les 3 jours) a été remplacé : il n’avait pas empêché la pause de Supabase mi-octobre 2026.

Les horaires sont volontairement décalés sur des minutes « calmes » : GitHub retarde, voire saute, les tâches programmées aux minutes rondes (:00, :10…). L’état de Mlezi est aussi visible dans l’espace admin (carte « Santé du site »).

**Réveil de secours dans Supabase.** GitHub n’ayant déclenché aucune ronde programmée de Mlezi le jour de sa mise en place, le réveil est aussi planifié dans la base elle-même : [supabase/migrations/20261109_reveil_pg_cron.sql](../supabase/migrations/20261109_reveil_pg_cron.sql) (extensions `pg_cron` et `pg_net`) appelle `GET /api/sante` toutes les 10 minutes. Comme pour les autres scripts SQL, il faut l’exécuter une fois dans l’éditeur SQL de Supabase. Vérification : `select * from cron.job;` puis, après 10 minutes, `select status_code from net._http_response order by created desc limit 5;` (codes 200 attendus).

## 5. Supabase

Rien ne se déploie automatiquement depuis le dépôt.

1. **Schéma** : copier [supabase/schema.sql](../supabase/schema.sql) dans l'éditeur SQL de Supabase et l'exécuter. À refaire après chaque modification du fichier.
2. **Authentification** : l'en-tête de `schema.sql` recommande d'activer « Confirm email » (Authentication › Providers › Email). L'état réel : non trouvé dans le dépôt.
3. **Adresse de retour du mot de passe oublié** : le code envoie `redirectTo: <origine du site>/reinitialiser-mot-de-passe`. Cette adresse doit être acceptée par le projet Supabase. Réglage : non trouvé dans le dépôt.
4. **Compte administrateur** : le compte dont l'e-mail correspond à `ADMIN_EMAIL` doit exister et posséder une ligne dans `profiles`. Aucun script ne le crée.
5. **Fonction Edge** : le code est dans `supabase/functions/notify-contact-message/`. La commande de déploiement et le fichier de configuration Supabase (`config.toml`) : **non trouvés**. Il faut aussi définir les deux secrets Gmail.
6. **Database Webhook** : déclenche la fonction à chaque insertion dans `messages_contact`. Décrit en commentaire, configuré dans le tableau de bord : non trouvé dans le dépôt.

## 6. Envoyer une mise à jour en production

Ce que le dépôt montre :

- Le code est sur GitHub : `https://github.com/chamoueni/dispositif-d-accompagnement` (dépôt distant `origin`).
- La branche principale est `main`.
- Le seul flux GitHub Actions présent est la tâche de maintien en activité. **Il n'y a pas de flux de déploiement ni de vérification automatique** (lint, build) dans le dépôt.

Le déclenchement d'un déploiement Render à chaque `git push` : **non trouvé dans le dépôt** (c'est un réglage du service Render).

Marche à suivre prudente :

```bash
npm run lint
npm run build          # vérifie que la construction passe
git add <fichiers>
git commit -m "..."
git push origin main
```

Puis, selon ce qui a changé :

| Modification | Action supplémentaire |
|---|---|
| `supabase/schema.sql` | Rejouer le SQL dans Supabase |
| Fonction Edge | La redéployer chez Supabase |
| Variable `VITE_…` | Reconstruire le frontend |
| Variable du backend | Redémarrer le service |
| `ADMIN_EMAIL` | Modifier les 4 fichiers concernés **et** rejouer le SQL |

## 7. Vérifications après déploiement

- La page d'accueil s'affiche, et recharger `/services` ne donne pas d'erreur 404.
- Connexion avec un compte de test.
- Dans l'espace admin, la page Adhérents se charge (preuve que la règle `/api/*` atteint le backend).
- `https://dispositif-d-accompagnement.onrender.com/api/sante` renvoie `{"ok":true,...}` (et non une page HTML).
- L'assistant SOS répond (preuve que la clé d'IA est définie) ; sinon il renvoie des réponses automatiques.
- Accepter une demande de test affiche un code à 4 chiffres (preuve que la colonne `code_arrivee` existe).

## À retenir

- En local : `npm install`, créer `.env`, `npm run dev:full`.
- Trois variables `VITE_…` pour le frontend, trois variables pour le backend ; les valeurs ne vont jamais dans Git.
- Le dépôt ne contient aucun fichier de configuration Render : les réglages sont dans le tableau de bord.
- Le schéma SQL, la fonction Edge et le webhook se mettent à jour à la main dans Supabase.
- Le site statique a besoin d'une règle qui renvoie toutes les adresses vers `index.html`.
