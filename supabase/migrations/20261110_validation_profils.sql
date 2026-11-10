-- Validation des profils d'intervenants par l'administrateur (cahier des
-- charges : F08, BF16, BNF04). Un personnel de santé ou un particulier qui
-- s'inscrit n'apparaît dans la recherche et sur la carte qu'une fois son
-- profil vérifié par l'administrateur (voir backend/services/confidentialite.service.js).
-- Script rejouable, à exécuter une fois dans l'éditeur SQL de Supabase.

-- 1. Nouvelle colonne « verifie ». Les profils qui existent déjà étaient en
--    ligne avant cette règle : ils sont marqués vérifiés, pour que personne ne
--    disparaisse de la recherche. Le bloc ne s'exécute qu'à la création de la
--    colonne : rejouer le script ne valide donc jamais un profil en attente.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'verifie'
  ) then
    alter table profiles add column verifie boolean not null default false;
    update profiles set verifie = true;
  end if;
end $$;

-- 2. Seul l'administrateur (ou le serveur avec la clé service role) peut
--    changer cette colonne. Le serveur filtre déjà les champs modifiables ;
--    ce déclencheur est une seconde protection, au niveau de la base.
create or replace function proteger_verifie() returns trigger
language plpgsql as $$
declare
  autorise boolean := coalesce(auth.role(), '') = 'service_role'
    or coalesce(auth.jwt() ->> 'email', '') = 'moustakimsinina05@gmail.com';
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

-- Vérification : nombre de profils vérifiés et en attente.
select verifie, count(*) as nombre from profiles group by verifie;
