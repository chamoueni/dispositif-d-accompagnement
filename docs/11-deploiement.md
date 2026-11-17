# 11 — Lancement et déploiement

Ce document résume comment lancer le projet en local et comment il est mis en ligne chez **alwaysdata**. Le pas-à-pas complet de la première mise en ligne (création de la base, transfert depuis Supabase, création des sites) est dans [../DEPLOIEMENT.md](../DEPLOIEMENT.md). Les réglages faits dans les interfaces (alwaysdata, GitHub) ne sont pas dans le dépôt : ils sont décrits ici tels qu'ils ont été faits en novembre 2026.

## 1. Lancer le projet en local

Prérequis : Node.js 20 ou plus (`"engines": { "node": ">=20" }` dans [package.json](../package.json)) et npm.

```bash
npm install
copy .env.example .env       # sous Windows ; "cp" sous macOS/Linux
# remplir .env (voir § 2), au minimum DATABASE_URL et JWT_SECRET
npm run dev:full
```

| Commande | Ce qu'elle lance | Adresse |
|---|---|---|
| `npm run dev` | Vite (frontend seul) | `http://localhost:5173` |
| `npm run server` | Express (`node backend/app.js`) | `http://localhost:3001` (ou `PORT`) |
| `npm run dev:full` | Les deux, avec `concurrently` | — |
| `npm run build` | Construit le site dans `dist/` (+ pages SEO, sitemap, `.htaccess`) | — |
| `npm start` | Lance le serveur (API, et site construit si `SERVIR_FRONT` n'est pas `false`) | `http://localhost:3001` |
| `npm run preview` | Sert le contenu de `dist/` pour vérification | — |
| `npm run lint` | ESLint sur tout le projet | — |

En local, le frontend appelle `/api/...` et Vite redirige vers Express ([vite.config.js](../frontend/vite.config.js)). La base utilisée est celle d'alwaysdata (`DATABASE_URL`). Sans réglage SMTP, les emails (lien de réinitialisation…) s'affichent dans le terminal au lieu d'être envoyés.

## 2. Variables d'environnement

Les noms viennent de [.env.example](../.env.example). **Ne jamais écrire leurs valeurs dans le dépôt ni dans la documentation.**

| Nom | Côté | Lue dans | Rôle |
|---|---|---|---|
| `DATABASE_URL` | Backend | `backend/db.js` | Adresse de la base PostgreSQL (utilisateur, mot de passe, hôte, base) |
| `DATABASE_SSL` | Backend | `backend/db.js` | `true` seulement si la base exige une connexion chiffrée |
| `JWT_SECRET` | Backend | `backend/services/jeton.service.js` | Clé qui signe les jetons de connexion (32 caractères minimum, différente en local et en production) |
| `AUTH_REMEMBER_DAYS`, `AUTH_SESSION_HOURS` | Backend | `jeton.service.js` | Durée de connexion (30 jours / 12 heures par défaut) |
| `SITE_URL` | Backend | `backend/app.js`, `config/origines.js`, `email.service.js` | Adresse publique du site ; le sous-dossier (`/fil`) en est déduit |
| `NODE_ENV` | Backend | plusieurs fichiers | `production` en ligne (cookies HTTPS uniquement, proxy de confiance) |
| `SERVIR_FRONT` | Backend | `backend/app.js` | `false` en ligne : le serveur ne sert que l'API |
| `PORT`, `IP` | Backend | `backend/app.js` | Fournis par alwaysdata ; 3001 en local |
| `CORS_ORIGINS` | Backend | `config/origines.js` | Autres adresses autorisées (rarement utile) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Backend | `email.service.js` | Serveur d'envoi d'emails (alwaysdata) |
| `EMAIL_EXPEDITEUR` | Backend | `email.service.js` | Expéditeur affiché (par défaut « Au Fil des Âges » + `SMTP_USER`) |
| `EMAIL_ADMIN` | Backend | `email.service.js` | Adresse qui reçoit les alertes SOS |
| `VITE_SITE_URL` | Frontend (build) | `frontend/vite.config.js`, `router/index.js`, `scripts/generate-seo-pages.js` | Adresse publique ; fixe le sous-dossier du build et les URL canoniques |

Deux règles à retenir :

- Une variable préfixée `VITE_` est **incluse dans le JavaScript envoyé au navigateur**. Elle est lue au moment de `npm run build` : après l'avoir changée, il faut reconstruire et renvoyer le site.
- Les variables du backend sont lues au démarrage du serveur : après un changement, alwaysdata redémarre le site API.

## 3. Construction (build)

`npm run build` exécute `vite build` puis `frontend/scripts/generate-seo-pages.js` et produit le dossier `dist/` : `index.html`, un fichier JavaScript par page (chargement à la demande), les pages publiques pré-générées pour les moteurs de recherche (`services/index.html`…), `sitemap.xml`, `robots.txt`, `404.html` et **`.htaccess`** (règles d'Apache pour le site front). `dist/` est ignoré par Git.

Le build se fait **sur le PC** : la mémoire de l'offre gratuite d'alwaysdata ne suffit pas pour Vite. Le backend n'a pas d'étape de construction.

## 4. Hébergement chez alwaysdata

| Élément | Réglage |
|---|---|
| Compte | `moustakim` (offre gratuite), adresse imposée `moustakim.alwaysdata.net` |
| Site front | type **PHP** (Apache, aucun PHP utilisé), adresse `moustakim.alwaysdata.net/fil`, répertoire racine `aufildesages-front/dist` |
| Site back | type **Node.js**, adresse `moustakim.alwaysdata.net/fil/api`, commande `node backend/app.js`, répertoire de travail `aufildesages` |
| Base | PostgreSQL 17, `postgresql-moustakim.alwaysdata.net`, base `moustakim_aufildesages`, utilisateur `moustakim_app` |
| Emails | adresse `moustakim@alwaysdata.net`, SMTP `smtp-moustakim.alwaysdata.net:587` |
| Autre site du compte | `moustakim.alwaysdata.net` (un autre projet), non touché |

Pourquoi un **sous-dossier** : sans nom de domaine à lui, le compte gratuit n'accepte que `moustakim.alwaysdata.net`, déjà utilisée. Le code déduit le sous-dossier de l'adresse (`VITE_SITE_URL` au build, `SITE_URL` sur le serveur). alwaysdata envoie `/fil/api/...` au site back (adresse la plus précise) et le reste de `/fil/...` au site front ; il transmet l'adresse complète au serveur Node.js.

**Sur le serveur, `npm install --omit=dev`** : un `npm install` complet est arrêté faute de mémoire (`Killed`). Le serveur n'a besoin que des paquets d'exécution.

## 5. Maintenance automatique : Mlezi

[.github/workflows/mlezi-gardien.yml](../.github/workflows/mlezi-gardien.yml), gratuit (GitHub Actions, dépôt public) :

| Quand | Action | Effet |
|---|---|---|
| Toutes les heures (minute 17), 7 h – 22 h (Mayotte) | appelle `GET /fil/api/sante` | vérification légère de l'API et de la base |
| Chaque jour vers 8 h 23 | contrôle l'API + base, l'accueil, la connexion et la page Services | en cas de panne : ticket GitHub étiqueté `mlezi` (email au propriétaire) ; ticket fermé automatiquement quand tout remarche |
| À la demande | onglet *Actions* › Mlezi › *Run workflow* | contrôle complet immédiat |

alwaysdata n'endort pas les sites : l'ancien « réveil » toutes les 10 minutes (pour Render et Supabase) n'est plus utile. L'état de Mlezi est aussi visible dans l'espace admin (carte « Santé du site »).

## 6. Envoyer une mise à jour en production

Le code est sur GitHub : `https://github.com/chamoueni/dispositif-d-accompagnement`, branche `main`. Rien ne se déploie automatiquement.

```bash
npm run lint
npm run build          # vérifie que la construction passe
git add <fichiers>
git commit -m "..."
git push origin main
```

Puis, selon ce qui a changé :

| Modification | Action |
|---|---|
| Code du backend | En SSH : `cd aufildesages && git pull && npm install --omit=dev --no-audit --no-fund`, puis **Web › Sites › (site API) › Redémarrer** |
| Code du frontend | Sur le PC : `$env:VITE_SITE_URL = "https://moustakim.alwaysdata.net/fil"; npm run build`, puis `scp -r dist moustakim@ssh-moustakim.alwaysdata.net:aufildesages-front/` |
| `backend/sql/schema.sql` | Rejouer le SQL dans phpPgAdmin |
| Variable du backend | Modifier le champ « Environnement » du site API (redémarrage automatique) |
| Adresse du site | Changer l'adresse des deux sites, `SITE_URL` du site API, puis reconstruire et renvoyer le front |

## 7. Vérifications après déploiement

- `https://moustakim.alwaysdata.net/fil/api/sante` renvoie `{"ok":true,"api":"ok","base":"ok",...}`.
- La page d'accueil s'affiche, et recharger `/fil/mon-compte` ne donne pas d'erreur 404.
- Connexion avec un compte de démo ; connexion admin sur `/fil/admin/connexion`.
- « Mot de passe oublié » sur un compte de démo : l'email arrive (alwaysdata › Emails › Historique montre chaque envoi).
- Accepter une demande de test affiche un code à 4 chiffres.

## 8. Anciens services (avant novembre 2026)

| Service | État |
|---|---|
| Render (site statique + API) | **Suspendu** (17/11/2026) ; à supprimer après quelques jours sans problème |
| Supabase (base + comptes) | **En pause** (17/11/2026) ; données transférées et sauvegardées hors du dépôt ; à supprimer plus tard |
| Dossier `supabase/` du dépôt | Conservé comme référence historique |

## À retenir

- En local : `npm install`, créer `.env` (`DATABASE_URL`, `JWT_SECRET`), `npm run dev:full`.
- En ligne : deux sites alwaysdata (front statique `/fil`, API Node.js `/fil/api`) et une base PostgreSQL.
- Le front se construit sur le PC et s'envoie par `scp` ; le back se met à jour par `git pull` en SSH.
- Les secrets ne vont jamais dans Git : `.env` en local, champ « Environnement » du site API en ligne.
- Le schéma SQL se rejoue à la main dans phpPgAdmin.
