# 06 — Base de données Supabase

La base est un **PostgreSQL** hébergé par Supabase. Tout le schéma est décrit dans un seul fichier : [supabase/schema.sql](../supabase/schema.sql). Il n'y a pas de dossier de migrations.

> **Important.** Ce fichier ne s'applique pas tout seul. Après chaque modification, il faut l'exécuter à la main dans l'éditeur SQL du tableau de bord Supabase. Le dépôt ne permet donc pas de garantir que la base en ligne correspond exactement au fichier. Le script est écrit pour pouvoir être rejoué (`create table if not exists`, `drop policy if exists` avant chaque `create policy`).

## 1. Vue d'ensemble

Six tables applicatives, plus la table `auth.users` gérée par Supabase.

```
auth.users (géré par Supabase : e-mail, mot de passe haché)
    │ 1
    │        id = id, on delete cascade
    │ 1
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

## 2. Les tables

### `profiles` — lignes 15 à 47

Les informations métier d'un utilisateur. Une ligne par compte.

| Colonne | Type | Contraintes | Remarque |
|---|---|---|---|
| `id` | `uuid` | clé primaire ; référence `auth.users(id)` ; `on delete cascade` | Même identifiant que le compte Auth |
| `role` | `text` | non nul ; `check (role in ('senior','sante','particulier'))` | Pas de valeur « admin » |
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
| `created_at` | `timestamptz` | non nul, défaut `now()` | |

**Index** : `profiles_telephone_unique`, index unique partiel sur `telephone` `where telephone <> ''`. Deux comptes ne peuvent pas partager un numéro, mais plusieurs peuvent avoir un numéro vide.

### `demandes` — lignes 143 à 163

Une personne âgée sollicite un intervenant.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `demandeur_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `aidant_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `type_service` | `text` | non nul (valeurs utilisées par le code : `soins`, `coursier`, `menage` ; pas de `check`) |
| `urgence` | `text` | non nul, défaut `'normale'` (pas de `check`) |
| `message` | `text` | non nul, défaut `''` |
| `creneau_souhaite` | `jsonb` | nul autorisé |
| `statut` | `text` | non nul, défaut `'en_attente'` ; `check` : `en_attente`, `acceptee`, `refusee`, `terminee`, `annulee` |
| `code_arrivee` | `text` | nul autorisé ; ajouté par `alter table` (ligne 163) |
| `date_creation` | `timestamptz` | non nul, défaut `now()` |
| `date_mise_a_jour` | `timestamptz` | non nul, défaut `now()` (mis à jour par le code, pas par un trigger) |

### `mises_en_relation` — lignes 190 à 199

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

Aucune contrainte d'unicité sur `demande_id` : la base n'empêche pas deux missions pour une même demande.

### `avis` — lignes 114 à 120

Témoignages publiés sur la page « Pour qui ».

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `user_id` | `uuid` | non nul ; référence `profiles(id)` ; cascade |
| `nom` | `text` | non nul, défaut `''` |
| `texte` | `text` | non nul |
| `created_at` | `timestamptz` | non nul, défaut `now()` |

Pas de note chiffrée, pas de lien vers un intervenant.

### `messages_contact` — lignes 229 à 236

Messages envoyés depuis « SOS › Un problème avec le site ».

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `user_id` | `uuid` | nul autorisé ; référence `profiles(id)` ; `on delete set null` |
| `nom` | `text` | non nul, défaut `''` |
| `message` | `text` | non nul |
| `lu` | `boolean` | non nul, défaut `false` |
| `created_at` | `timestamptz` | non nul, défaut `now()` |

### `adherents` — lignes 82 à 94

Copie des adhérents gérés par l'API Express.

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `uuid` | clé primaire (fourni par le serveur) |
| `nom` | `text` | non nul |
| `email` | `text` | non nul (pas d'unicité) |
| `telephone`, `ville` | `text` | non nul, défaut `''` |
| `role` | `text` | défaut `'particulier'` ; `check` : `senior`, `sante`, `particulier` |
| `statut` | `text` | défaut `'actif'` ; `check` : `actif`, `inactif` |
| `created_at`, `updated_at` | `timestamptz` | non nul, défaut `now()` |

## 3. Règles RLS (Row Level Security)

La RLS est activée sur les six tables. Sans règle qui l'autorise, toute opération est refusée. « Admin » signifie ici : l'e-mail contenu dans le jeton (`auth.jwt() ->> 'email'`) est égal à l'adresse de l'administrateur écrite en dur dans le fichier.

| Table | Règle | Opération | Qui |
|---|---|---|---|
| `profiles` | `profiles_select_authenticated` | lecture | **Tout utilisateur connecté, toutes les lignes** |
| | `profiles_insert_own` | création | L'utilisateur, pour sa propre ligne (`auth.uid() = id`) |
| | `profiles_update_own` | modification | L'utilisateur, sa propre ligne |
| | `profiles_update_admin` | modification | Admin, toutes les lignes |
| `demandes` | `demandes_select_participants` | lecture | Le demandeur ou l'intervenant de la demande |
| | `demandes_insert_demandeur` | création | Le demandeur (`auth.uid() = demandeur_id`) |
| | `demandes_update_participants` | modification | Le demandeur **ou** l'intervenant |
| | `demandes_select_admin` | lecture | Admin |
| `mises_en_relation` | `mer_select_participants` | lecture | Les deux participants |
| | `mer_insert_participants` | création | L'un des deux participants |
| | `mer_update_participants` | modification | L'un des deux participants |
| | `mer_select_admin` | lecture | Admin |
| `avis` | `avis_select_anyone` | lecture | Tout le monde, même non connecté |
| | `avis_insert_own` | création | Utilisateur connecté, en son nom |
| | `avis_delete_own_or_admin` | suppression | L'auteur ou l'admin |
| `messages_contact` | `messages_contact_insert_anyone` | création | Tout le monde, même non connecté |
| | `messages_contact_select_admin` | lecture | Admin |
| | `messages_contact_update_admin` | modification | Admin |
| | `messages_contact_delete_admin` | suppression | Admin |
| `adherents` | `adherents_select_admin` | lecture | Admin |
| | `adherents_modify_admin` | tout | Admin |

Opérations **sans règle**, donc refusées depuis le navigateur : suppression d'un profil, suppression d'une demande, suppression d'une mission, modification d'un avis.

### Limites de ces règles

- **Lecture des profils trop large.** Tout compte connecté peut lire le téléphone, l'adresse et l'abonnement de tous les autres. Le schéma l'assume en commentaire (« simplifié pour ce projet »).
- **Pas de contrôle des transitions de statut.** La règle `demandes_update_participants` laisse les deux participants modifier **toute** la ligne. Rien n'empêche, côté base, une personne âgée d'accepter sa propre demande ou de changer le destinataire. Seule l'interface limite les boutons affichés.
- **Pas de contrôle du rôle à la création.** `demandes_insert_demandeur` vérifie l'identité, pas que le demandeur est une personne âgée ni que le destinataire est un intervenant.
- **Un utilisateur peut modifier son propre `role` ou `abonnement`** : `profiles_update_own` n'exclut aucune colonne.

## 4. Fonctions, triggers, vues

**Non trouvé dans le code.** `schema.sql` ne définit aucune fonction SQL, aucun trigger, aucune vue. Conséquences : `date_mise_a_jour` est tenu à jour par le code JavaScript, et la création de la mission après acceptation n'est pas garantie par la base.

## 5. Requêtes principales

Toutes passent par le constructeur de requêtes de `@supabase/supabase-js` ; il n'y a pas de SQL écrit à la main dans l'application.

| Fonction | Fichier | Requête |
|---|---|---|
| `getUsers` | [store.js](../frontend/src/data/store.js) l. 115 | `from('profiles').select('*')` |
| `findById` | store.js l. 124 | `from('profiles').select('*').eq('id', id).single()` |
| `updateCompteAdmin` | store.js l. 136 | `from('profiles').update(patch).eq('id', id).select('id')` |
| `getDemandes` | store.js l. 209 | `from('demandes').select('*')` |
| `getDemandesByDemandeur` | store.js l. 218 | `… .eq('demandeur_id', id)` |
| `getDemandesByAidant` | store.js l. 230 | `… .eq('aidant_id', id)` |
| `addDemande` | store.js l. 241 | `from('demandes').insert({...}).select().single()` |
| `updateDemandeStatut` | store.js l. 307 | `from('demandes').update(patch).eq('id', id).select().single()` |
| `getMisesEnRelation` | store.js l. 353 | `from('mises_en_relation').select('*')` |
| `getMiseEnRelationByDemande` | store.js l. 362 | `… .eq('demande_id', id).maybeSingle()` |
| `addMiseEnRelation` | store.js l. 376 | `from('mises_en_relation').insert({...})` |
| `updateMiseEnRelationStatut` | store.js l. 407 | `from('mises_en_relation').update({...}).eq('id', id)` |
| `addMessageContact` | store.js l. 440 | `from('messages_contact').insert({...})` |
| `getMessagesContact` | store.js l. 451 | `… .select('*').order('created_at', { ascending: false })` |
| `marquerMessageContactLu` | store.js l. 465 | `… .update({ lu: true }).eq('id', id)` |
| `deleteMessageContact` | store.js l. 476 | `… .delete().eq('id', id).select('id')` |
| `getAvis` / `addAvis` / `deleteAvis` | store.js l. 491, 505, 517 | lecture triée, insertion, suppression |
| `chargerProfil` | [auth.js](../frontend/src/stores/auth.js) l. 68 | `from('profiles').select('*').eq('id', authUser.id).single()` |
| `signup`, `creerProfilDepuisMetadata` | auth.js | `from('profiles').insert({...})` |
| `updateProfile` | auth.js l. 187 | `from('profiles').update(patch).eq('id', user.id)` |
| `synchroniserAdherent` | [supabaseSync.js](../backend/supabaseSync.js) | `from('adherents').upsert(...)` ou `.delete().eq('id', …)` |

Deux détails utiles :

- **Conversion des noms.** La base utilise `snake_case` (`demandeur_id`), l'application `camelCase` (`demandeurId`). Les fonctions `mapDemande`, `mapMiseEnRelation` et `mapMessageContact` font la conversion.
- **Suppressions silencieuses.** Une suppression bloquée par la RLS ne renvoie pas d'erreur, juste zéro ligne. `deleteMessageContact`, `deleteAvis` et `updateCompteAdmin` ajoutent donc `.select('id')` et lèvent une erreur si rien ne revient.

## 6. Écarts avec la conception

Comparaison avec le MCD initial (UTILISATEUR, PERSONNE_AGEE, PERSONNEL_SANTE, PARTICULIER, DISPONIBILITE, SERVICE, DEMANDE, MISE_EN_RELATION, AVIS_EVALUATION, NOTIFICATION) et le cahier des charges.

| Entité prévue | Ce que fait le code | Écart |
|---|---|---|
| UTILISATEUR | `auth.users` (e-mail, mot de passe) + `profiles` (le reste) | Séparée en deux. Pas de champ prénom : un seul champ `nom`. |
| PERSONNE_AGEE, PERSONNEL_SANTE, PARTICULIER | Une seule table `profiles` avec une colonne `role` | **Pas de tables de spécialisation.** Les champs propres à un rôle (`specialite`, `services`) sont dans la même table et laissés vides pour les autres. |
| DISPONIBILITE | Colonne `profiles.disponibilites` (`jsonb`) | **Pas de table.** Donc pas de clé étrangère vers un créneau, et aucune contrainte de non-chevauchement en base. |
| SERVICE | Colonne `profiles.services` (`text[]`) + `demandes.type_service` (`text`) | **Pas de table.** Les valeurs (`soins`, `coursier`, `menage`) sont des chaînes écrites dans le code. Le personnel de santé n'a pas de service enregistré : c'est son `role` qui vaut « soins ». |
| DEMANDE | Table `demandes` | Présente. Ajouts : `urgence`, `code_arrivee`, statut `terminee`. |
| MISE_EN_RELATION | Table `mises_en_relation` | Présente. |
| AVIS_EVALUATION | Table `avis` | **Différente** : texte libre sur le dispositif, sans note et sans lien vers un intervenant ou une mission. |
| NOTIFICATION | — | **Absente.** Aucune table, aucun code de notification aux utilisateurs. Seul l'administrateur reçoit un e-mail pour les messages de contact. |
| (non prévu) | Tables `messages_contact` et `adherents` | Ajoutées. |
| (non prévu) | `profiles.abonnement`, `profiles.actif`, `profiles.adresse` | Ajoutés. |

Écarts fonctionnels liés à la base :

- **Rôle administrateur** : pas de valeur `admin` dans `profiles.role`. L'administrateur est reconnu par son e-mail. Comme `chargerProfil` exige une ligne `profiles`, le compte admin doit quand même avoir un profil avec l'un des trois rôles.
- **Validation des profils par l'administrateur** : aucune colonne de statut de validation (« en attente », « validé », « refusé »). Un intervenant apparaît dans la recherche dès son inscription.
- **Suspension** : `actif` existe mais n'est lu par aucune requête de recherche ni par la connexion.
- **Base de données** : le cahier des charges annonce MySQL ; le code utilise PostgreSQL via Supabase.

## À retenir

- Un seul fichier de schéma, à rejouer à la main dans Supabase après chaque changement.
- Six tables ; `profiles` regroupe les trois types d'utilisateurs, leurs services et leurs disponibilités.
- La sécurité des données repose sur les règles RLS ; elles vérifient **qui** écrit, pas **ce qui** est écrit.
- Pas de trigger ni de fonction SQL : la cohérence (statuts, dates, création de la mission) dépend du code JavaScript.
- Par rapport au MCD : pas de tables DISPONIBILITE, SERVICE ni NOTIFICATION, et un AVIS sans évaluation.
