-- =============================================================================
-- Transfert des données Supabase → base PostgreSQL alwaysdata.
-- Sans logiciel à installer : éditeur SQL de Supabase + phpPgAdmin d'alwaysdata.
-- Pas à pas complet : DEPLOIEMENT.md, étape 3.
--
-- Principe : cette requête, exécutée dans Supabase (SQL Editor), ne modifie
-- rien. Elle FABRIQUE un script d'import (une seule cellule de texte) qui
-- contient une instruction « insert » par ligne de données. On copie cette
-- cellule et on l'exécute dans phpPgAdmin, sur la base alwaysdata (où
-- backend/sql/schema.sql a déjà créé les tables).
--
-- Détails :
-- - auth.users (comptes Supabase) → table « utilisateurs ». encrypted_password
--   est déjà une empreinte bcrypt : chacun garde son mot de passe actuel.
-- - row_to_json() met chaque ligne en JSON, json_populate_record() la relit
--   colonne par colonne côté alwaysdata : l'ordre des colonnes peut différer
--   entre les deux bases, les accents, apostrophes, listes et JSON sont conservés.
-- - Les tables sont insérées dans l'ordre des clés étrangères (comptes, puis
--   profils, puis ce qui pointe vers les profils…).
-- - Le déclencheur proteger_verifie est mis en pause pendant l'import (sinon
--   tous les profils repasseraient « non vérifiés »), puis remis en route.
-- - Le compte de l'administrateur reçoit est_admin = true.
-- - begin / commit : si une seule ligne échoue, RIEN n'est importé (on peut
--   corriger et recommencer sans doublons).
-- - auth_sessions n'est pas copiée : la table n'existe plus.
-- - Numéros de téléphone en double : la nouvelle base les refuse (index
--   profiles_telephone_unique, jamais appliqué dans Supabase). Le 16/11/2026, un
--   doublon a été trouvé ; le numéro du compte le plus récent a été vidé dans le
--   script avant l'import (décision du propriétaire du site).
-- =============================================================================

with lignes as (
  select 1 as ordre, created_at as tri, format(
    'insert into utilisateurs (id, email, mot_de_passe_hash, created_at) values (%L, %L, %L, %L);',
    id, lower(email), encrypted_password, created_at) as sql
  from auth.users
  where email is not null and coalesce(encrypted_password, '') <> ''
  union all
  -- '{"actif": true}' || … : la base Supabase en ligne n'a pas toujours la colonne
  -- « actif » (ajoutée dans le fichier mais jamais appliquée) ; sans elle, on
  -- met la valeur par défaut true au lieu de null (refusé par la nouvelle base).
  select 2, created_at, format('insert into profiles select * from jsonb_populate_record(null::profiles, ''{"actif": true}''::jsonb || %L::jsonb);', row_to_json(t)) from public.profiles t
  union all
  select 3, created_at, format('insert into adherents select * from json_populate_record(null::adherents, %L);', row_to_json(t)) from public.adherents t
  union all
  select 4, created_at, format('insert into avis select * from json_populate_record(null::avis, %L);', row_to_json(t)) from public.avis t
  union all
  select 5, date_creation, format('insert into demandes select * from json_populate_record(null::demandes, %L);', row_to_json(t)) from public.demandes t
  union all
  select 6, date_debut, format('insert into mises_en_relation select * from json_populate_record(null::mises_en_relation, %L);', row_to_json(t)) from public.mises_en_relation t
  union all
  select 7, created_at, format('insert into messages_contact select * from json_populate_record(null::messages_contact, %L);', row_to_json(t)) from public.messages_contact t
)
select
  'begin;' || E'\n' ||
  'alter table profiles disable trigger profiles_proteger_verifie;' || E'\n' ||
  string_agg(sql, E'\n' order by ordre, tri) || E'\n' ||
  'alter table profiles enable trigger profiles_proteger_verifie;' || E'\n' ||
  'update utilisateurs set est_admin = true where email = ''moustakimsinina05@gmail.com'';' || E'\n' ||
  'commit;' as script_import
from lignes;


-- =============================================================================
-- Contrôle : à exécuter DES DEUX CÔTÉS et comparer les nombres.
-- =============================================================================

-- Dans Supabase :
select 'comptes' as table_, count(*) from auth.users where email is not null and coalesce(encrypted_password, '') <> ''
union all select 'profiles', count(*) from public.profiles
union all select 'adherents', count(*) from public.adherents
union all select 'avis', count(*) from public.avis
union all select 'demandes', count(*) from public.demandes
union all select 'mises_en_relation', count(*) from public.mises_en_relation
union all select 'messages_contact', count(*) from public.messages_contact;

-- Dans phpPgAdmin (alwaysdata) : mêmes nombres, plus exactement 1 administrateur.
select 'comptes' as table_, count(*) from utilisateurs
union all select 'profiles', count(*) from profiles
union all select 'adherents', count(*) from adherents
union all select 'avis', count(*) from avis
union all select 'demandes', count(*) from demandes
union all select 'mises_en_relation', count(*) from mises_en_relation
union all select 'messages_contact', count(*) from messages_contact
union all select 'administrateurs', count(*) from utilisateurs where est_admin;
