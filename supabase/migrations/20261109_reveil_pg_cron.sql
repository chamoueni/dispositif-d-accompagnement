-- Réveil automatique du serveur, planifié DANS Supabase (pg_cron + pg_net).
--
-- Pourquoi : le robot Mlezi (GitHub Actions) ne recevait aucun déclenchement
-- programmé de GitHub. Ce script fait la même chose depuis la base elle-même,
-- sans dépendre de GitHub :
-- toutes les 10 minutes, la base appelle GET /api/sante sur le serveur Render.
-- - le serveur (offre gratuite, endormi après 15 min sans visite) reste éveillé ;
-- - /api/sante relit la table "avis" via l'API Supabase : le projet a donc de
--   l'activité et n'est plus mis en pause après 7 jours.
--
-- Budget Render gratuit : 750 h/mois ; un seul service éveillé 24 h/24 en
-- consomme ~720. Le contrôle complet et les tickets de panne restent assurés
-- par Mlezi (GitHub) quand il tourne, ou à la demande (bouton « Run workflow »).
--
-- À exécuter une fois dans l'éditeur SQL de Supabase. Le script est
-- rejouable : il remplace la tâche si elle existe déjà.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime une éventuelle ancienne version de la tâche avant de la recréer.
select cron.unschedule(jobid)
from cron.job
where jobname = 'reveil-serveur-render';

select cron.schedule(
  'reveil-serveur-render',
  '*/10 * * * *',
  $$ select net.http_get(
       url := 'https://dispositif-d-accompagnement-ulzn.onrender.com/api/sante',
       timeout_milliseconds := 60000
     ) $$
);

-- Vérification : la tâche doit apparaître ici.
select jobid, jobname, schedule, active from cron.job where jobname = 'reveil-serveur-render';
