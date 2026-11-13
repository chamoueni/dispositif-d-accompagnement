-- Fin de MongoDB : les adhérents sont désormais gérés uniquement dans la table
-- PostgreSQL « adherents » de Supabase (avant, c'était une simple copie des
-- données de MongoDB). Les données étaient identiques dans les deux bases au
-- moment du passage (vérifié le 12/11/2026), rien n'est donc à importer.
-- Script rejouable, à exécuter une fois dans l'éditeur SQL de Supabase,
-- AVANT de mettre en ligne la nouvelle version du serveur.

-- 1. La base crée elle-même l'identifiant d'un nouvel adhérent.
alter table adherents alter column id set default gen_random_uuid();

-- 2. Deux adhérents ne peuvent pas avoir le même email (remplace l'index
--    unique qui existait dans MongoDB ; le serveur répond alors 409).
create unique index if not exists adherents_email_unique on adherents (email);

-- Vérification : 1 ligne attendue avec la valeur par défaut de "id",
-- et l'index adherents_email_unique doit apparaître.
select column_default from information_schema.columns
where table_schema = 'public' and table_name = 'adherents' and column_name = 'id';
select indexname from pg_indexes where tablename = 'adherents';
