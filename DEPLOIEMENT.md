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

## Étape 4 : créer l'adresse email d'envoi

Le site envoie les liens « Mot de passe oublié » et les alertes SOS.

1. **Emails › Adresses › Ajouter** : par exemple `contact@moustakim.alwaysdata.net`, avec un
   mot de passe.
2. Réglages SMTP : hôte `smtp-moustakim.alwaysdata.net`, port `587`, identifiant = l'adresse
   complète, mot de passe = celui de l'adresse.

## Étape 5 : récupérer le code sur le serveur (SSH)

1. **Accès distant › SSH** : active la connexion par mot de passe pour l'utilisateur `moustakim`.
2. Depuis un terminal sur ton PC :

   ```bash
   ssh moustakim@ssh-moustakim.alwaysdata.net
   ```

3. Sur le serveur :

   ```bash
   git clone https://github.com/<ton-compte>/dispositif-d-accompagnement.git aufildesages
   cd aufildesages
   git checkout main
   npm install
   VITE_SITE_URL=https://aufildesages.moustakim.alwaysdata.net npm run build
   ```

   - Dépôt **privé** : crée une clé SSH sur le serveur (`ssh-keygen -t ed25519`), ajoute
     `~/.ssh/id_ed25519.pub` dans GitHub › Settings › Deploy keys, puis clone avec
     l'adresse `git@github.com:<ton-compte>/dispositif-d-accompagnement.git`.
   - `npm run build` crée le dossier `dist/` (le site Vue), que le serveur Node.js affiche.
   - Version de Node.js : 20 minimum (voir **Environnement › Node.js** dans l'admin).

## Étape 6 : déclarer le site Node.js

**Web › Sites › Ajouter un site** :

| Champ | Valeur |
| --- | --- |
| Nom | Au Fil des Âges |
| Adresses | `aufildesages.moustakim.alwaysdata.net` |
| Type | **Node.js** |
| Commande | `npm start` |
| Répertoire de travail | `aufildesages` |
| Version de Node.js | 20 ou plus |

Si alwaysdata refuse cette adresse, choisis-en une autre proposée par l'interface (ou un nom
de domaine à toi), puis mets la **même** adresse dans `SITE_URL` et `VITE_SITE_URL`.

**Variables d'environnement** (même page, champ « Environnement », une par ligne) :

```
NODE_ENV=production
DATABASE_URL=postgresql://moustakim_app:MOT_DE_PASSE@postgresql-moustakim.alwaysdata.net:5432/moustakim_aufildesages
JWT_SECRET=une-longue-cle-aleatoire-differente-de-celle-du-pc
SITE_URL=https://aufildesages.moustakim.alwaysdata.net
SMTP_HOST=smtp-moustakim.alwaysdata.net
SMTP_PORT=587
SMTP_USER=contact@moustakim.alwaysdata.net
SMTP_PASS=mot-de-passe-de-l-adresse
EMAIL_ADMIN=adresse-qui-recoit-les-alertes-sos
```

- `JWT_SECRET` se génère avec
  `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- **Ne pas** définir `PORT` ni `IP` : alwaysdata les fournit lui-même, et le serveur les lit
  (`process.env.PORT`, `process.env.IP` dans [backend/app.js](backend/app.js)).
- Ces secrets ne vont **jamais** dans GitHub : uniquement ici et dans le `.env` local (ignoré par git).

Enregistre : alwaysdata démarre le site.

## Étape 7 : tester

1. `https://aufildesages.moustakim.alwaysdata.net/api/sante` doit afficher
   `{"ok":true,"api":"ok","base":"ok",...}`.
2. La page d'accueil s'affiche, et recharger une page comme `/mon-compte` fonctionne (pas d'erreur 404).
3. Connexion avec un compte de démo : son ancien mot de passe marche.
4. « Mot de passe oublié » : l'email arrive, le lien permet de changer le mot de passe.
5. Connexion admin (`/admin/connexion`) : tableau de bord, messages, adhérents.
6. Avec deux comptes : une demande envoyée par un senior est visible par l'intervenant
   concerné, et **pas** par un troisième compte.
7. En cas d'erreur : **Web › Sites › Journaux** (ou `~/admin/logs/` en SSH).

## Mettre à jour le site plus tard

```bash
ssh moustakim@ssh-moustakim.alwaysdata.net
cd aufildesages
git pull
npm install
VITE_SITE_URL=https://aufildesages.moustakim.alwaysdata.net npm run build
```

Puis **Web › Sites › (le site) › Redémarrer**. Si `backend/sql/schema.sql` change, rejoue
les nouvelles instructions dans phpPgAdmin : la base ne se met pas à jour toute seule.

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
