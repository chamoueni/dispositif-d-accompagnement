# 06 — Base de données PostgreSQL

La base est un **PostgreSQL 17** hébergé par **alwaysdata** (hôte `postgresql-moustakim.alwaysdata.net`, base `moustakim_aufildesages`). Tout le schéma est décrit dans un seul fichier : [backend/sql/schema.sql](../backend/sql/schema.sql). Elle se gère dans le navigateur avec **phpPgAdmin** (lien sur la page Bases de données › PostgreSQL d'alwaysdata) ; DBeaver ou tout autre client PostgreSQL convient aussi.

> **Important.** Ce fichier ne s'applique pas tout seul. Après chaque modification, il faut l'exécuter à la main (phpPgAdmin › base › onglet SQL). Le script est écrit pour pouvoir être rejoué (`create table if not exists`, `create or replace function`, `drop trigger if exists`).

Seul le serveur Express se connecte à la base (variable `DATABASE_URL`, utilisateur PostgreSQL `moustakim_app`). Le navigateur n'y a jamais accès.

## 1. Vue d'ensemble

Huit tables.

```
utilisateurs (email, mot de passe haché bcrypt, est_admin, version_jeton)
    │ 1                              │ 1
    │ id = id, on delete cascade     │ N (utilisateur_id, cascade)
    │ 1                         jetons_reinitialisation
profiles ─────────────────────────────────────────────┐
    │ 1                       │ 1                      │ 1
    │                         │                        │
    │ N (user_id, cascade)    │ N (demandeur_id        │ 0..N (user_id,
    │                         │    et aidant_id,       │       set null)
  avis                        │    cascade)            │
                           demandes               messages_contact
                              │ 1
                              │ N (demande_id, cascade)
                       mises_en_relation
                       (porte aussi demandeur_id et aidant_id → profiles)

adherents   (aucune clé étrangère : table indépendante)
```

Supprimer une ligne de `utilisateurs` supprime en cascade son profil, ses demandes, missions et avis : c'est le « droit à l'effacement » du RGPD, utilisé par l'administrateur (`DELETE /api/admin/comptes/:id`).

## 2. Les tables

### `utilisateurs`

Les comptes : de quoi se connecter. Remplace la table `auth.users` de Supabase (mêmes identifiants, copiés lors de la migration).

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` | |
| `email` | `text` | non nul, **unique** (`utilisateurs_email_key`), `check (email = lower(email))` | Toujours en minuscules |
| `mot_de_passe_hash` | `text` | non nul | Empreinte bcrypt (`$2a$10$…` pour les comptes venus de Supabase, `$2b$10$…` pour les nouveaux), jamais le mot de passe |
| `est_admin` | `boolean` | non nul, défaut `false` | `true` pour l'administrateur seulement |
| `version_jeton` | `integer` | non nul, défaut `0` | +1 à chaque changement de mot de passe : les jetons émis avant deviennent invalides |
| `created_at` | `timestamptz` | non nul, défaut `now()` | |

### `jetons_reinitialisation`

Les liens « Mot de passe oublié » envoyés par email.

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | `uuid` | clé primaire | |
| `utilisateur_id` | `uuid` | non nul ; référence `utilisateurs(id)` ; cascade | |
| `jeton_hash` | `text` | non nul, unique | Empreinte SHA-256 du jeton, jamais le jeton lui-même |
| `expire_le` | `timestamptz` | non nul | Création + 1 heure |
| `utilise_le` | `timestamptz` | nul autorisé | Rempli après usage : un lien ne sert qu'une fois |
| `created_at` | `timestamptz` | non nul, défaut `now()` | |

### `profiles`

Les informations métier d'un utilisateur. Une ligne par compte (l'administrateur peut ne pas en avoir).

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | `uuid` | clé primaire ; référence `utilisateurs(id)` ; `on delete cascade` | Même identifiant que le compte |
| `role` | `text` | non nul ; `check (role in ('senior','sante','particulier'))` | Pas de valeur « admin » (voir `utilisateurs.est_admin`) |
| `nom` | `text` | non nul, défaut `''` | Nom complet en un seul champ |
| `telephone` | `text` | non nul, défaut `''` | Unique s'il est renseigné (voir index) |
| `ville` | `text` | non nul, défaut `''` | Une des 17 communes (contrôlé côté formulaire seulement) |
| `adresse` | `text` | non nul, défaut `''` | Texte libre |
| `specialite` | `text` | non nul, défaut `''` | Personnel de santé |
| `bio` | `text` | non nul, défaut `''` | Présentation |
| `services` | `text[]` | non nul, défaut `'{}'` | `coursier`, `menage` pour un particulier |
| `disponibilites` | `jsonb` | non nul, défaut `'[]'` | Tableau d'objets `{ jour, heureDebut, heureFin }` |
| `abonnement` | `jsonb` | nul autorisé | `{ formuleId, dateDebut }` |
| `actif` | `boolean` | non nul, défaut `true` | Information de suivi admin ; **aucune règle n'en dépend** |
| `verifie` | `boolean` | non nul, défaut `false` | Profil d'intervenant validé par l'administrateur (sinon absent de la recherche) |
| `created_at` | `timestamptz` | non nul, défaut `now()` | |

**Index** : `profiles_telephone_unique`, index unique partiel sur `telephone` `where telephone <> ''`. Deux comptes ne peuvent pas partager un numéro, mais plusieurs peuvent avoir un numéro vide.

**Déclencheur** `profiles_proteger_verifie` (fonction `proteger_verifie()`) : seule une transaction marquée « administrateur » (`set_config('app.admin', 'on', true)`, voir `transactionAdmin()` dans [db.js](../backend/db.js)) peut changer `verifie`. Pour toute autre écriture, un nouveau profil part à `false` et une modification de `verifie` est annulée. C'est une seconde protection, au niveau de la base, en plus du filtrage des champs fait par le serveur.

### `demandes`

Une personne âgée sollicite un intervenant.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `demandeur_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `aidant_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `type_service` | `text` | non nul (valeurs utilisées par le code : `soins`, `coursier`, `menage` ; pas de `check`) |
| `urgence` | `text` | non nul, défaut `'normale'` (le serveur n'accepte que `normale` ou `urgente`) |
| `message` | `text` | non nul, défaut `''` |
| `creneau_souhaite` | `jsonb` | nul autorisé |
| `statut` | `text` | non nul, défaut `'en_attente'` ; `check` : `en_attente`, `acceptee`, `refusee`, `terminee`, `annulee` |
| `code_arrivee` | `text` | nul autorisé ; 4 chiffres créés à l'acceptation |
| `date_creation` | `timestamptz` | non nul, défaut `now()` |
| `date_mise_a_jour` | `timestamptz` | non nul, défaut `now()` (mis à jour par la requête de changement de statut) |

Index : `demandes_demandeur_idx`, `demandes_aidant_idx`.

### `mises_en_relation`

La mission, créée quand une demande est acceptée.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `demande_id` | `uuid` | non nul ; référence `demandes(id)` ; cascade |
| `demandeur_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `aidant_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `date_debut` | `timestamptz` | non nul, défaut `now()` |
| `date_fin` | `timestamptz` | nul autorisé |
| `statut_mission` | `text` | non nul, défaut `'en_cours'` ; `check` : `en_cours`, `terminee`, `annulee` |

Index : sur `demande_id`, `demandeur_id`, `aidant_id`. Pas de contrainte d'unicité sur `demande_id` : c'est le serveur qui vérifie, dans la même transaction que l'acceptation, qu'aucune mission n'existe déjà pour la demande.

### `avis`

Témoignages publiés sur la page « Pour qui ».

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `user_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `nom` | `text` | non nul, défaut `''` |
| `texte` | `text` | non nul |
| `created_at` | `timestamptz` | non nul, défaut `now()` |

Pas de note chiffrée, pas de lien vers un intervenant.

### `messages_contact`

Messages envoyés depuis « SOS › Un problème avec le site ».

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `user_id` | `uuid` | nul autorisé ; référence `profiles(id)` ; `on delete set null` |
| `nom` | `text` | non nul, défaut `''` |
| `message` | `text` | non nul |
| `lu` | `boolean` | non nul, défaut `false` |
| `created_at` | `timestamptz` | non nul, défaut `now()` |

### `adherents`

Liste gérée par l'administrateur (espace admin › Adhérents).

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `nom` | `text` | non nul |
| `email` | `text` | non nul ; **unique** (`adherents_email_unique`) |
| `telephone`, `ville` | `text` | non nul, défaut `''` |
| `role` | `text` | défaut `'particulier'` ; `check` : `senior`, `sante`, `particulier` |
| `statut` | `text` | défaut `'actif'` ; `check` : `actif`, `inactif` |
| `created_at`, `updated_at` | `timestamptz` | non nul, défaut `now()` |

## 3. Contrôles d'accès (qui voit et modifie quoi)

Avec Supabase, ces règles étaient des **règles RLS** dans la base. Elles sont maintenant **dans le serveur** ([data.controller.js](../backend/controllers/data.controller.js), [demande.service.js](../backend/services/demande.service.js), [confidentialite.service.js](../backend/services/confidentialite.service.js)), qui est seul à parler à la base. L'identité vient toujours du jeton vérifié (`req.utilisateur`), jamais d'un identifiant envoyé par le navigateur.

| Table | Opération | Qui | Comment |
|---|---|---|---|
| `profiles` | lecture | tout utilisateur connecté | téléphone et adresse masqués sans demande acceptée commune ; profils non validés et comptes de démo filtrés |
| | modification de son profil | l'utilisateur, sa propre ligne | l'identifiant est celui du jeton ; champs autorisés filtrés (`patchProfil`), `verifie` exclu |
| | modification de tout profil | administrateur | transaction « admin » (permet `verifie`) |
| `demandes` | lecture | le demandeur ou l'intervenant ; l'administrateur voit tout | condition `demandeur_id = moi or aidant_id = moi` ajoutée à la requête |
| | création | utilisateur connecté, en son nom | `demandeur_id` = le jeton ; destinataire = intervenant existant (`sante` ou `particulier`), pas soi-même |
| | changement de statut | accepter / refuser : l'intervenant seul ; annuler une demande en attente : le demandeur seul ; terminer ou annuler une mission acceptée : l'un ou l'autre | vérifié dans la transaction (`verifierTransition`) ; non-participant `404`, mauvais acteur `403`, statut incompatible `409` |
| `mises_en_relation` | lecture | les deux participants ; l'administrateur voit tout | condition sur les participants |
| | création | un participant, pour une vraie demande aux mêmes participants | sinon `404` |
| | changement de statut | un participant | sinon `404` |
| `avis` | lecture | tout le monde, même non connecté | |
| | création | utilisateur connecté ayant un profil, en son nom | |
| | suppression | l'auteur ou l'administrateur | sinon `403` |
| `messages_contact` | création | tout le monde, même non connecté | |
| | lecture, marquer lu, suppression | administrateur | sinon `403` |
| `adherents` | tout | administrateur | middleware `verifierAdmin` sur `/api/adherents` |
| `utilisateurs` | création / suppression par un tiers | administrateur | `/api/admin/comptes` |

**Points d'attention**

- Il n'y a plus de « filet » dans la base : **toute nouvelle route doit refaire ces contrôles**. Le seul contrôle restant au niveau de la base est le déclencheur sur `profiles.verifie`.
- Les changements de statut suivent les règles RG11, RG12 et RG14 du cahier des charges, appliquées par le serveur (`TRANSITIONS` dans [demande.service.js](../backend/services/demande.service.js)) : seul l'intervenant accepte ou refuse, seule la personne âgée annule une demande en attente, et une demande déjà refusée, annulée ou terminée ne change plus.
- Un utilisateur peut modifier son propre `role` ou `abonnement` (champs autorisés par `patchProfil`).

## 4. Fonctions, déclencheurs, vues

| Objet | Rôle |
|---|---|
| Fonction `proteger_verifie()` + déclencheur `profiles_proteger_verifie` | Protège la colonne `profiles.verifie` (voir § 2). |

Aucune vue. `date_mise_a_jour` et la création de la mission sont faits par le serveur, dans une transaction.

## 5. Requêtes principales

Toutes les requêtes sont écrites en SQL dans [backend/models/](../backend/models/), avec des **paramètres** (`$1, $2…`) : les valeurs voyagent séparément du texte SQL, l'injection SQL est impossible.

| Fonction (modèle) | Requête |
|---|---|
| `trouverPourConnexion` (utilisateur) | `select id, email, est_admin, version_jeton, mot_de_passe_hash from utilisateurs where email = $1` |
| `creerUtilisateur` | `insert into utilisateurs (email, mot_de_passe_hash) values ($1, $2) returning …` |
| `changerMotDePasse` | `update utilisateurs set mot_de_passe_hash = $2, version_jeton = version_jeton + 1 where id = $1` |
| `listerProfils` / `trouverProfil` (profil) | `select * from profiles …` |
| `creerProfil` / `modifierProfil` | `insert` / `update profiles set …` (colonnes prises dans une liste fixe, jamais dans la requête du navigateur) |
| `listerDemandes` (demande) | `select * from demandes where … (demandeur_id = $n or aidant_id = $n) order by date_creation desc` |
| `creerDemande` | `insert into demandes (…) values ($1 … $6) returning *` |
| `modifierStatut` | `update demandes set statut = $2, code_arrivee = coalesce($3, code_arrivee), date_mise_a_jour = now() where id = $1` |
| `demandesEnRelation` | demandes `acceptee` ou `terminee` de la personne (pour le masquage des coordonnées) |
| `listerMissions` / `creerMission` / `modifierStatutMission` (mission) | `select` / `insert` / `update mises_en_relation …` |
| `listerAvis` / `creerAvis` / `supprimerAvis` (avis) | lecture triée, insertion, suppression |
| `listerMessages` / `creerMessage` / `marquerLu` / `supprimerMessage` (message) | `messages_contact` |
| `obtenirAdherents` … `supprimerAdherent` (adherent) | `adherents` |

Deux détails utiles :

- **Conversion des noms.** La base utilise `snake_case` (`demandeur_id`), l'application `camelCase` (`demandeurId`). Les fonctions `mapDemande`, `mapMiseEnRelation` et `mapMessageContact` de [store.js](../frontend/src/data/store.js) font la conversion côté navigateur.
- **Colonnes `jsonb`.** Le paquet `pg` transforme un tableau JavaScript en tableau PostgreSQL (`text[]`), pas en JSON : les modèles convertissent eux-mêmes `disponibilites`, `abonnement` et `creneau_souhaite` avec `JSON.stringify`.

## 6. Écarts avec la conception

Comparaison avec le MCD initial (UTILISATEUR, PERSONNE_AGEE, PERSONNEL_SANTE, PARTICULIER, DISPONIBILITE, SERVICE, DEMANDE, MISE_EN_RELATION, AVIS_EVALUATION, NOTIFICATION) et le cahier des charges.

| Entité prévue | Ce que fait le code | Écart |
|---|---|---|
| UTILISATEUR | `utilisateurs` (email, mot de passe haché, admin) + `profiles` (le reste) | Séparée en deux. Pas de champ prénom : un seul champ `nom`. |
| PERSONNE_AGEE, PERSONNEL_SANTE, PARTICULIER | Une seule table `profiles` avec une colonne `role` | **Pas de tables de spécialisation.** Les champs propres à un rôle (`specialite`, `services`) sont dans la même table et laissés vides pour les autres. |
| DISPONIBILITE | Colonne `profiles.disponibilites` (`jsonb`) | **Pas de table.** Donc pas de clé étrangère vers un créneau, et aucune contrainte de non-chevauchement en base. |
| SERVICE | Colonne `profiles.services` (`text[]`) + `demandes.type_service` (`text`) | **Pas de table.** Les valeurs (`soins`, `coursier`, `menage`) sont des chaînes écrites dans le code. Le personnel de santé n'a pas de service enregistré : c'est son `role` qui vaut « soins ». |
| DEMANDE | Table `demandes` | Présente. Ajouts : `urgence`, `code_arrivee`, statut `terminee`. |
| MISE_EN_RELATION | Table `mises_en_relation` | Présente. |
| AVIS_EVALUATION | Table `avis` | **Différente** : texte libre sur le dispositif, sans note et sans lien vers un intervenant ou une mission. |
| NOTIFICATION | — | **Absente.** Aucune table. Seuls des emails existent : « mot de passe oublié » et alerte SOS à l'administrateur. |
| (non prévu) | Tables `messages_contact`, `adherents`, `jetons_reinitialisation` | Ajoutées. |
| (non prévu) | `profiles.abonnement`, `profiles.actif`, `profiles.adresse`, `profiles.verifie` | Ajoutés. |

Écarts fonctionnels liés à la base :

- **Rôle administrateur** : pas de valeur `admin` dans `profiles.role` ; l'administrateur est reconnu par `utilisateurs.est_admin` et n'a pas besoin de profil.
- **Suspension** : `actif` existe mais n'est lu par aucune requête de recherche ni par la connexion.
- **Base de données** : le cahier des charges annonce MySQL ; le code utilise PostgreSQL.

## À retenir

- Un seul fichier de schéma, [backend/sql/schema.sql](../backend/sql/schema.sql), à rejouer à la main dans phpPgAdmin après chaque changement.
- Huit tables ; `profiles` regroupe les trois types d'utilisateurs, leurs services et leurs disponibilités ; `utilisateurs` porte la connexion.
- Les contrôles d'accès sont dans le serveur ; la base protège seulement la colonne `verifie` (déclencheur).
- Toutes les requêtes sont paramétrées ; les opérations en plusieurs étapes sont faites en transaction.
- Par rapport au MCD : pas de tables DISPONIBILITE, SERVICE ni NOTIFICATION, et un AVIS sans évaluation.
