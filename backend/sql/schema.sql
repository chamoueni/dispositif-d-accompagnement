-- =============================================================================
-- Schéma PostgreSQL du dispositif d'accompagnement « Au Fil des Âges ».
-- Base hébergée sur alwaysdata, gérée avec phpPgAdmin (outil web d'alwaysdata).
--
-- À exécuter UNE fois, dans une base vide (phpPgAdmin › base
-- moustakim_aufildesages › onglet SQL › coller ce fichier › Exécuter).
-- Le script est rejouable : « if not exists » / « or replace » partout.
--
-- Différences avec l'ancienne base Supabase (supabase/schema.sql) :
-- - la table « utilisateurs » remplace auth.users de Supabase Auth : email et
--   mot de passe HACHÉ (bcrypt), jamais le mot de passe en clair ;
-- - plus de règles RLS : c'est le serveur Express qui vérifie qui a le droit de
--   voir ou modifier quoi (voir backend/controllers/ et backend/services/) ;
-- - la table auth_sessions disparaît : la connexion repose sur un jeton JWT
--   signé par le serveur (voir backend/services/jeton.service.js).
-- =============================================================================

-- gen_random_uuid() est intégrée à PostgreSQL depuis la version 13 : la base
-- crée elle-même l'identifiant de chaque nouvelle ligne.

-- -----------------------------------------------------------------------------
-- UTILISATEURS : les comptes (connexion). Un compte = une adresse email.
-- -----------------------------------------------------------------------------
create table if not exists utilisateurs (
  id uuid primary key default gen_random_uuid(),
  -- Toujours enregistré en minuscules : « Paul@Mail.fr » et « paul@mail.fr »
  -- sont le même compte.
  email text not null unique check (email = lower(email)),
  -- Empreinte bcrypt du mot de passe (« $2a$10$… » ou « $2b$10$… »).
  mot_de_passe_hash text not null,
  -- Seul le compte de l'administrateur a true. Remplace l'email écrit en dur
  -- dans les anciennes règles RLS.
  est_admin boolean not null default false,
  -- Augmente à chaque changement de mot de passe : les jetons de connexion
  -- émis avant deviennent invalides (déconnexion des autres appareils).
  version_jeton integer not null default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- JETONS_REINITIALISATION : liens « Mot de passe oublié » envoyés par email.
-- On ne stocke que l'empreinte (SHA-256) du jeton, jamais le jeton lui-même :
-- quelqu'un qui lirait la table ne pourrait pas s'en servir.
-- -----------------------------------------------------------------------------
create table if not exists jetons_reinitialisation (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs (id) on delete cascade,
  jeton_hash text not null unique,
  expire_le timestamptz not null,
  -- Rempli quand le lien a servi : un lien ne marche qu'une seule fois.
  utilise_le timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists jetons_reinitialisation_utilisateur_idx
  on jetons_reinitialisation (utilisateur_id);

-- -----------------------------------------------------------------------------
-- PROFILES : informations « métier » d'un compte. Même id que dans utilisateurs.
-- Rôles : senior (personne âgée), sante (personnel de santé), particulier.
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references utilisateurs (id) on delete cascade,
  role text not null check (role in ('senior', 'sante', 'particulier')),
  nom text not null default '',
  telephone text not null default '',
  ville text not null default '',
  adresse text not null default '',
  specialite text not null default '',
  bio text not null default '',
  services text[] not null default '{}',
  disponibilites jsonb not null default '[]',
  abonnement jsonb,
  -- Suivi côté admin (AdminComptes.vue), ne bloque pas la connexion.
  actif boolean not null default true,
  -- Profil d'intervenant vérifié par l'administrateur (F08 / BF16) : tant que
  -- c'est false, il n'apparaît pas dans la recherche.
  verifie boolean not null default false,
  created_at timestamptz not null default now()
);

-- Un même numéro ne peut pas servir à deux comptes. Index PARTIEL : plusieurs
-- profils sans numéro ('') ne se bloquent pas entre eux.
create unique index if not exists profiles_telephone_unique
  on profiles (telephone) where telephone <> '';

-- Seconde protection, au niveau de la base, du champ « verifie » : seul
-- l'administrateur peut le changer. Le serveur annonce qu'il agit pour
-- l'administrateur avec set_config('app.admin', 'on', true) au début de la
-- transaction (voir transactionAdmin() dans backend/db.js). Pour tout autre
-- appel, la valeur est remise comme avant, et un nouveau profil part à false.
create or replace function proteger_verifie() returns trigger
language plpgsql as $$
declare
  autorise boolean := coalesce(current_setting('app.admin', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if not autorise then new.verifie := false; end if;
  elsif new.verifie is distinct from old.verifie and not autorise then
    new.verifie := old.verifie;
  end if;
  return new;
end $$;

drop trigger if exists profiles_proteger_verifie on profiles;
create trigger profiles_proteger_verifie
  before insert or update on profiles
  for each row execute function proteger_verifie();

-- -----------------------------------------------------------------------------
-- ADHERENTS : liste gérée par l'administrateur (espace admin › Adhérents).
-- -----------------------------------------------------------------------------
create table if not exists adherents (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  telephone text not null default '',
  ville text not null default '',
  role text not null default 'particulier'
    check (role in ('senior', 'sante', 'particulier')),
  statut text not null default 'actif'
    check (statut in ('actif', 'inactif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deux adhérents ne peuvent pas avoir le même email (le serveur répond 409).
create unique index if not exists adherents_email_unique on adherents (email);

-- -----------------------------------------------------------------------------
-- AVIS : témoignages publics de la page « Pour qui ».
-- -----------------------------------------------------------------------------
create table if not exists avis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  nom text not null default '',
  texte text not null,
  created_at timestamptz not null default now()
);

create index if not exists avis_user_id_idx on avis (user_id);

-- -----------------------------------------------------------------------------
-- DEMANDES : une personne âgée sollicite un intervenant pour un service.
-- -----------------------------------------------------------------------------
create table if not exists demandes (
  id uuid primary key default gen_random_uuid(),
  demandeur_id uuid not null references profiles (id) on delete cascade,
  aidant_id uuid not null references profiles (id) on delete cascade,
  type_service text not null,
  urgence text not null default 'normale',
  message text not null default '',
  creneau_souhaite jsonb,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee', 'terminee', 'annulee')),
  -- Code à 4 chiffres annoncé par l'intervenant en arrivant chez la personne
  -- âgée. Créé quand la demande est acceptée, null avant.
  code_arrivee text,
  date_creation timestamptz not null default now(),
  date_mise_a_jour timestamptz not null default now()
);

-- Accélère « mes demandes envoyées » et « mes demandes reçues ».
create index if not exists demandes_demandeur_idx on demandes (demandeur_id);
create index if not exists demandes_aidant_idx on demandes (aidant_id);

-- -----------------------------------------------------------------------------
-- MISES_EN_RELATION : la mission elle-même, une fois une demande acceptée.
-- -----------------------------------------------------------------------------
create table if not exists mises_en_relation (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references demandes (id) on delete cascade,
  demandeur_id uuid not null references profiles (id) on delete cascade,
  aidant_id uuid not null references profiles (id) on delete cascade,
  date_debut timestamptz not null default now(),
  date_fin timestamptz,
  statut_mission text not null default 'en_cours'
    check (statut_mission in ('en_cours', 'terminee', 'annulee'))
);

create index if not exists mises_en_relation_demande_idx on mises_en_relation (demande_id);
create index if not exists mises_en_relation_demandeur_idx on mises_en_relation (demandeur_id);
create index if not exists mises_en_relation_aidant_idx on mises_en_relation (aidant_id);

-- -----------------------------------------------------------------------------
-- MESSAGES_CONTACT : « Un problème avec le site » (bouton SOS). N'importe qui
-- peut en envoyer un ; seul l'administrateur peut les lire (contrôle côté serveur).
-- -----------------------------------------------------------------------------
create table if not exists messages_contact (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  nom text not null default '',
  message text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- Vérification : les 8 tables doivent apparaître.
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
