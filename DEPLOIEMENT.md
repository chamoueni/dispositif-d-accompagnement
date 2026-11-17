# Déploiement sur alwaysdata

Ce guide met en ligne **Au Fil des Âges** sur alwaysdata : la base PostgreSQL **et** le site
(un seul programme Node.js qui sert à la fois l'API `/api/...` et les pages Vue).
Supabase et Render ne sont plus utilisés.

> **Tout se fait dans le navigateur.** La base se gère avec **phpPgAdmin**, l'outil web fourni
> par alwaysdata (lien « phpPgAdmin » sur la page Bases de données › PostgreSQL). Aucun
> logiciel à installer. (DBeaver reste possible pour qui préfère un logiciel sur son PC.)

```
Navigateur ──HTTPS──▶ alwaysdata : Node.js (backend/app.js)
                          ├── /api/...  → API Express ──SQL──▶ PostgreSQL alwaysdata
                          └── le reste  → site Vue (dist/)            ▲
phpPgAdmin (dans le navigateur) ──────────────────────────────────────┘
```

Compte alwaysdata : `moustakim`. Le site « fitness » déjà présent (`moustakim.alwaysdata.net`,
base MySQL) n'est pas touché : on ajoute une **deuxième** base et un **deuxième** site.

---

## Étape 1 : créer la base PostgreSQL

1. Sur [admin.alwaysdata.com](https://admin.alwaysdata.com) : **Bases de données › PostgreSQL**.
2. Onglet **Utilisateurs › Ajouter un utilisateur** : nom `moustakim_app`, un mot de passe
   long (note-le dans un gestionnaire de mots de passe, jamais dans le code).
3. Onglet **Bases de données › Ajouter une base** : nom `moustakim_aufildesages`, et donne
   **tous les droits** à `moustakim_app`.
4. Note l'hôte affiché : `postgresql-moustakim.alwaysdata.net`, port `5432`.

L'adresse de connexion (`DATABASE_URL`) sera donc :

```
postgresql://moustakim_app:MOT_DE_PASSE@postgresql-moustakim.alwaysdata.net:5432/moustakim_aufildesages
```

(Si le mot de passe contient `@`, `:`, `/` ou `#`, remplace-les par `%40`, `%3A`, `%2F`, `%23`.)

## Étape 2 : créer les tables avec phpPgAdmin

1. Page **Bases de données › PostgreSQL** › lien **phpPgAdmin**.
2. Connexion avec l'utilisateur `moustakim_app` et son mot de passe.
3. À gauche : **PostgreSQL › moustakim_aufildesages**, puis l'onglet **SQL** en haut.
4. Colle le contenu de [backend/sql/schema.sql](backend/sql/schema.sql) › **Exécuter**.
5. Le dernier résultat doit afficher 8 tables : `adherents`, `avis`, `demandes`,
   `jetons_reinitialisation`, `messages_contact`, `mises_en_relation`, `profiles`,
   `utilisateurs`.

## Étape 3 : transférer les données de Supabase

Tout est dans [backend/sql/import-supabase.sql](backend/sql/import-supabase.sql).

1. **Sauvegarde d'abord** : Supabase › **Database › Backups** (ou Table Editor › chaque
   table › Export to CSV) et garde les fichiers en lieu sûr.
2. Supabase › **SQL Editor** › New query : colle la **première requête** du fichier (celle
   qui commence par `with lignes as`) › **Run**. Elle ne modifie rien dans Supabase.
3. Le résultat est **une seule cellule** `script_import`. Clique dessus › copie tout son
   contenu (il commence par `begin;` et finit par `commit;`).
4. phpPgAdmin › base `moustakim_aufildesages` › onglet **SQL** › colle › **Exécuter**.
   - Les comptes gardent leur mot de passe actuel (empreintes bcrypt copiées telles quelles).
   - Si une erreur apparaît, rien n'est importé (`begin`/`commit`) : envoie le message
     d'erreur, on corrige et on recommence.
5. **Contrôle** : exécute la requête « Dans Supabase » (fin du fichier) dans le SQL Editor
   de Supabase, et la requête « Dans phpPgAdmin » dans phpPgAdmin. Les nombres doivent être
   identiques, avec exactement 1 administrateur.

## Étape 4 : l'adresse email d'envoi

Le site envoie les liens « Mot de passe oublié » et les alertes SOS. Sans nom de domaine,
alwaysdata donne une seule adresse par compte : **`moustakim@alwaysdata.net`**
(**Emails › Adresses**, la ligne « moustakim »).

1. Roue dentée ⚙ de la ligne `moustakim` › **Mot de passe** › Valider.
2. Réglages SMTP : hôte `smtp-moustakim.alwaysdata.net`, port `587`, identifiant
   `moustakim@alwaysdata.net`, mot de passe = celui de l'adresse.

## Étape 5 : récupérer le code sur le serveur (SSH)

1. **Accès distant › SSH/SFTP** : active la connexion par mot de passe pour l'utilisateur `moustakim`.
2. Depuis un terminal sur ton PC :

   ```bash
   ssh moustakim@ssh-moustakim.alwaysdata.net
   ```

3. Sur le serveur (dépôt public, donc pas de clé nécessaire) :

   ```bash
   git clone -b migration-alwaysdata https://github.com/chamoueni/dispositif-d-accompagnement.git aufildesages
   cd aufildesages
   npm install --omit=dev --no-audit --no-fund
   ```

   - **`--omit=dev` est indispensable** : l'offre gratuite limite la mémoire, et un
     `npm install` complet (avec Vite, ESLint, Sass…) est arrêté par le serveur (`Killed`).
     Le serveur n'a besoin que des paquets d'exécution (Express, pg, bcryptjs…).
   - Le message `npm warn install-scripts` n'est pas bloquant. Vérification :
     `node -e "require('express');require('pg');require('bcryptjs');console.log('paquets OK')"`.
   - Node.js du serveur : v24 (20 minimum).

## Étape 6 : construire le front sur le PC et l'envoyer

Le front et le back sont hébergés **séparément**, sur deux sites alwaysdata reliés par le même
nom de domaine (la connexion par cookie fonctionne donc sans réglage particulier) :

| | Front (site Vue) | Back (API) |
| --- | --- | --- |
| Type de site alwaysdata | **PHP** (Apache, utilisé ici seulement pour envoyer des fichiers) | **Node.js** |
| Adresse | `moustakim.alwaysdata.net/aufildesages` | `moustakim.alwaysdata.net/aufildesages/api` |
| Dossier sur le serveur | `aufildesages-front/dist` (envoyé depuis le PC) | `aufildesages` (le code, `git clone`) |

Sans nom de domaine, alwaysdata n'accepte que `moustakim.alwaysdata.net` (déjà utilisée par un
autre site) : d'où le **sous-dossier** `/aufildesages`. Le code le déduit de l'adresse :
`VITE_SITE_URL` au build, `SITE_URL` sur le serveur. alwaysdata transmet l'adresse complète
(`/aufildesages/api/...`) au serveur Node.js, qui sait la traiter.

Le build (Vite) demande trop de mémoire pour le serveur : on le fait sur le PC. Il produit aussi
`dist/.htaccess`, les règles d'Apache pour le front (mode « history » de Vue Router, pages SEO,
en-têtes de sécurité).

Dans un terminal **sur le PC** (PowerShell), à la racine du projet :

```powershell
$env:VITE_SITE_URL = "https://moustakim.alwaysdata.net/aufildesages"; npm run build; Remove-Item Env:VITE_SITE_URL
scp -r dist moustakim@ssh-moustakim.alwaysdata.net:aufildesages-front/
```

(La première fois, créer d'abord le dossier sur le serveur : `mkdir -p ~/aufildesages-front`.
Les fichiers arrivent dans `~/aufildesages-front/dist`, et un nouvel envoi remplace l'ancien.)

## Étape 7 : déclarer les deux sites

**Web › Sites › Ajouter un site**, deux fois.

**Site 1 : le back (API)**

| Champ | Valeur |
| --- | --- |
| Adresses | `moustakim.alwaysdata.net/aufildesages/api` |
| Type | **Node.js** |
| Commande | `node backend/app.js` |
| Répertoire de travail | `aufildesages` |
| Version de Node.js | Version par défaut (v24) |

Variables d'environnement (champ « Environnement », une par ligne, sans espace ni guillemets) :

```
NODE_ENV=production
SITE_URL=https://moustakim.alwaysdata.net/aufildesages
SERVIR_FRONT=false
DATABASE_URL=postgresql://moustakim_app:MOT_DE_PASSE@postgresql-moustakim.alwaysdata.net:5432/moustakim_aufildesages
JWT_SECRET=une-longue-cle-aleatoire-differente-de-celle-du-pc
SMTP_HOST=smtp-moustakim.alwaysdata.net
SMTP_PORT=587
SMTP_USER=moustakim@alwaysdata.net
SMTP_PASS=mot-de-passe-de-l-adresse
EMAIL_ADMIN=adresse-qui-recoit-les-alertes-sos
```

- `SERVIR_FRONT=false` : ce serveur ne sert que l'API, les pages viennent du site front.
- `JWT_SECRET` se génère avec
  `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- **Ne pas** définir `PORT` ni `IP` : alwaysdata les fournit (lus dans [backend/app.js](backend/app.js)).
- Ces secrets ne vont **jamais** dans GitHub : uniquement ici et dans le `.env` local (ignoré par git).

**Site 2 : le front**

| Champ | Valeur |
| --- | --- |
| Adresses | `moustakim.alwaysdata.net/aufildesages` |
| Type | **PHP** (aucun code PHP : Apache envoie les fichiers et lit `.htaccess`) |
| Répertoire racine | `aufildesages-front/dist` |

alwaysdata envoie chaque requête au site dont l'adresse correspond le mieux : `/aufildesages/api/...`
va au back, tout le reste de `/aufildesages/...` au front.

## Étape 8 : tester

1. `https://moustakim.alwaysdata.net/aufildesages/api/sante` doit afficher
   `{"ok":true,"api":"ok","base":"ok",...}`.
2. La page d'accueil s'affiche, et recharger une page comme `/aufildesages/mon-compte`
   fonctionne (pas d'erreur 404).
3. Connexion avec un compte de démo : son ancien mot de passe marche.
4. « Mot de passe oublié » : l'email arrive, le lien permet de changer le mot de passe.
5. Connexion admin (`/aufildesages/admin/connexion`) : tableau de bord, messages, adhérents.
6. Avec deux comptes : une demande envoyée par un senior est visible par l'intervenant
   concerné, et **pas** par un troisième compte.
7. Le site `moustakim.alwaysdata.net` (fitness) fonctionne toujours.
8. En cas d'erreur : **Web › Sites › Journaux** (ou `~/admin/logs/` en SSH).

## Mettre à jour le site plus tard

- **Back** (code serveur modifié), sur le serveur en SSH :

  ```bash
  cd aufildesages
  git pull
  npm install --omit=dev --no-audit --no-fund
  ```

  puis **Web › Sites › (site API) › Redémarrer**.
- **Front** (site Vue modifié) : refaire l'étape 6 sur le PC (build + `scp`). Rien à redémarrer.
- Si `backend/sql/schema.sql` change, rejouer les nouvelles instructions dans phpPgAdmin : la
  base ne se met pas à jour toute seule.

## Étape finale : arrêter Supabase et Render

**Seulement une fois que tout fonctionne sur alwaysdata pendant quelques jours :**

1. Render : supprimer les deux services (site statique et API).
2. GitHub : désactiver le workflow `.github/workflows/mlezi-gardien.yml` (il réveillait
   Render), ou le faire pointer vers `/api/sante` de la nouvelle adresse.
3. Supabase : supprimer la tâche `pg_cron` « reveil-serveur-render », faire une dernière
   sauvegarde, puis supprimer le projet.
4. Dans le dépôt : supprimer le dossier `supabase/` (gardé jusque-là comme référence).

## Travailler en local

```bash
npm install
copy .env.example .env      # puis remplir DATABASE_URL et JWT_SECRET
npm run dev:full
```

Le site est sur `http://localhost:5173` et l'API sur `http://localhost:3001`. En local, sans
réglage SMTP, les emails (lien de réinitialisation…) s'affichent dans le terminal au lieu
d'être envoyés.
