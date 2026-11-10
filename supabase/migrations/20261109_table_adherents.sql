-- Table "adherents" : copie dans Supabase des adhérents gérés par l'espace admin
-- (la source principale est MongoDB, voir backend/models/adherent.model.js et
-- backend/services/adherentSync.service.js). Cette partie de schema.sql n'avait jamais été
-- exécutée sur le projet en ligne : la copie échouait (« table introuvable »).
-- Script rejouable, à exécuter une fois dans l'éditeur SQL de Supabase.

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

-- Vérification : la table doit exister (0 ligne au départ).
select count(*) as adherents_en_copie from adherents;
