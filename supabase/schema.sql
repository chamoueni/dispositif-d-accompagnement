-- Schéma Supabase du dispositif d'accompagnement.
-- À exécuter une fois dans l'éditeur SQL de ton projet (supabase.com > SQL Editor).
--
-- IMPORTANT avant de tester l'inscription depuis le site :
-- Authentication > Providers > Email > désactive "Confirm email" (ou confirme le
-- compte manuellement). Sinon signUp() ne renvoie pas de session immédiate et la
-- création du profil juste après (voir stores/auth.js) échoue tant que l'email
-- n'est pas confirmé.

-- ---------------------------------------------------------------------------
-- PROFILES : infos "métier" de l'utilisateur, en plus de auth.users (qui gère
-- déjà email + mot de passe). Un profil = une ligne, id = celui de auth.users.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
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
  created_at timestamptz not null default now()
);

-- "create table if not exists" ne modifie pas une table déjà existante : sur un
-- projet déjà en place, ce alter est ce qui ajoute vraiment la colonne (à
-- rejouer manuellement dans le SQL Editor, comme le reste de ce fichier).
alter table profiles add column if not exists adresse text not null default '';

alter table profiles enable row level security;

-- Tout utilisateur connecté peut consulter les profils (nécessaire pour la page
-- Recherche, qui liste les aidants). Simplifié pour ce projet : pas de distinction
-- fine par rôle sur la lecture.
-- (drop if exists avant chaque create policy : "create policy" n'a pas de
-- variante "if not exists" en Postgres, donc sans ça le script ne serait pas
-- rejouable une deuxième fois si une policy existe déjà.)
drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated" on profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update to authenticated using (auth.uid() = id);

-- L'admin peut modifier n'importe quel profil depuis l'espace admin (gestion
-- des comptes). Policy additionnelle (permissive) à côté de "profiles_update_own" :
-- Postgres les combine avec un OR, donc un utilisateur normal garde le droit de
-- modifier uniquement son propre profil, et l'admin gagne le droit sur tous.
drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles
  for update to authenticated
  using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

-- ---------------------------------------------------------------------------
-- ADHERENTS : table métier alimentée par l'API Express (miroir Supabase).
-- La clé de service du backend contourne RLS, tandis que cette policy permet
-- aussi une lecture contrôlée depuis les outils Supabase pour l'administrateur.
-- ---------------------------------------------------------------------------
create table if not exists adherents (
  id uuid primary key,
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

alter table adherents enable row level security;

drop policy if exists "adherents_select_admin" on adherents;
create policy "adherents_select_admin" on adherents
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

drop policy if exists "adherents_modify_admin" on adherents;
create policy "adherents_modify_admin" on adherents
  for all to authenticated
  using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com')
  with check (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

-- ---------------------------------------------------------------------------
-- AVIS : témoignages/commentaires publics postés par les utilisateurs sur la
-- page "Pour qui" (src/pages/PourQui.vue). Remplace les témoignages statiques
-- codés en dur par de vrais avis stockés en base.
-- ---------------------------------------------------------------------------
create table if not exists avis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  nom text not null default '',
  texte text not null,
  created_at timestamptz not null default now()
);

alter table avis enable row level security;

-- Page publique : visible même sans connexion.
drop policy if exists "avis_select_anyone" on avis;
create policy "avis_select_anyone" on avis
  for select to anon, authenticated using (true);

-- Seul un utilisateur connecté peut poster un avis, et uniquement en son nom.
drop policy if exists "avis_insert_own" on avis;
create policy "avis_insert_own" on avis
  for insert to authenticated with check (auth.uid() = user_id);

-- Auteur ou admin peuvent supprimer un avis (modération basique).
drop policy if exists "avis_delete_own_or_admin" on avis;
create policy "avis_delete_own_or_admin" on avis
  for delete to authenticated
  using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

-- ---------------------------------------------------------------------------
-- DEMANDES : une personne âgée sollicite un aidant pour un service donné.
-- ---------------------------------------------------------------------------
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
  date_creation timestamptz not null default now(),
  date_mise_a_jour timestamptz not null default now()
);

alter table demandes enable row level security;

-- Seuls le demandeur et l'aidant concernés voient/modifient une demande.
drop policy if exists "demandes_select_participants" on demandes;
create policy "demandes_select_participants" on demandes
  for select to authenticated using (auth.uid() = demandeur_id or auth.uid() = aidant_id);

drop policy if exists "demandes_insert_demandeur" on demandes;
create policy "demandes_insert_demandeur" on demandes
  for insert to authenticated with check (auth.uid() = demandeur_id);

drop policy if exists "demandes_update_participants" on demandes;
create policy "demandes_update_participants" on demandes
  for update to authenticated using (auth.uid() = demandeur_id or auth.uid() = aidant_id);

-- L'admin voit aussi toutes les demandes, pour le suivi d'activité du tableau
-- de bord (sans ça, la policy "participants" ci-dessus lui masquerait tout).
drop policy if exists "demandes_select_admin" on demandes;
create policy "demandes_select_admin" on demandes
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

-- ---------------------------------------------------------------------------
-- MISES_EN_RELATION : la mission elle-même, une fois une demande acceptée.
-- ---------------------------------------------------------------------------
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

alter table mises_en_relation enable row level security;

drop policy if exists "mer_select_participants" on mises_en_relation;
create policy "mer_select_participants" on mises_en_relation
  for select to authenticated using (auth.uid() = demandeur_id or auth.uid() = aidant_id);

drop policy if exists "mer_insert_participants" on mises_en_relation;
create policy "mer_insert_participants" on mises_en_relation
  for insert to authenticated with check (auth.uid() = demandeur_id or auth.uid() = aidant_id);

drop policy if exists "mer_update_participants" on mises_en_relation;
create policy "mer_update_participants" on mises_en_relation
  for update to authenticated using (auth.uid() = demandeur_id or auth.uid() = aidant_id);

-- Même besoin que pour "demandes" ci-dessus : l'admin doit voir toutes les
-- missions, pas seulement celles où il serait lui-même participant.
drop policy if exists "mer_select_admin" on mises_en_relation;
create policy "mer_select_admin" on mises_en_relation
  for select to authenticated
  using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

-- ---------------------------------------------------------------------------
-- MESSAGES_CONTACT : "Un problème avec le site" dans le menu SOS (voir
-- SosButton.vue). Remplace le lien mailto:, qui ne fonctionne que si la
-- personne a un client mail configuré sur son appareil — pas fiable pour le
-- public visé. Le message est stocké directement en base, lisible uniquement
-- par l'admin (email en dur, cohérent avec isAdmin dans stores/auth.js).
-- ---------------------------------------------------------------------------
create table if not exists messages_contact (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  nom text not null default '',
  message text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages_contact enable row level security;

-- N'importe qui peut envoyer un message (même pas connecté : le bouton SOS est
-- visible sur l'accueil sans connexion, une urgence ne doit pas dépendre d'un compte).
drop policy if exists "messages_contact_insert_anyone" on messages_contact;
create policy "messages_contact_insert_anyone" on messages_contact
  for insert to anon, authenticated with check (true);

-- Seul l'admin peut lire/mettre à jour les messages (auth.jwt() lit l'email
-- directement dans le token, pas besoin d'un rôle "admin" séparé en base).
drop policy if exists "messages_contact_select_admin" on messages_contact;
create policy "messages_contact_select_admin" on messages_contact
  for select to authenticated using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

drop policy if exists "messages_contact_update_admin" on messages_contact;
create policy "messages_contact_update_admin" on messages_contact
  for update to authenticated using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');

-- Idem pour la suppression, depuis l'espace admin (voir deleteMessageContact
-- dans data/store.js). Sans cette policy, RLS bloque silencieusement tout
-- delete() : la table interdit tout par défaut tant qu'aucune policy n'autorise.
drop policy if exists "messages_contact_delete_admin" on messages_contact;
create policy "messages_contact_delete_admin" on messages_contact
  for delete to authenticated using (auth.jwt() ->> 'email' = 'moustakimsinina05@gmail.com');
