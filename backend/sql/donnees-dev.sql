-- =============================================================================
-- Données FICTIVES pour la base de DÉVELOPPEMENT (moustakim_aufildesages_dev).
-- Ne JAMAIS exécuter sur la base de production.
--
-- But : tester le site sur le poste du développeur sans toucher aux données
-- réelles des utilisateurs (données personnelles et de santé, RGPD).
-- À exécuter APRÈS backend/sql/schema.sql, dans phpPgAdmin (base _dev › SQL).
--
-- Tous les comptes ci-dessous sont inventés. Ils ont le même mot de passe de
-- test : DevMotDePasse1  (empreinte bcrypt ci-dessous ; ce mot de passe ne sert
-- qu'en développement et n'existe pas en production).
-- Le script est rejouable : il vide d'abord les tables.
-- =============================================================================

begin;

-- Repart d'une base vide (les tables liées sont vidées en cascade).
truncate utilisateurs, adherents cascade;

-- Transaction marquée « administrateur » : le déclencheur proteger_verifie
-- accepte alors verifie = true pour les intervenants de test.
select set_config('app.admin', 'on', true);

-- Comptes (mot de passe DevMotDePasse1 pour tous).
insert into utilisateurs (id, email, mot_de_passe_hash, est_admin) values
  ('00000000-0000-4000-8000-000000000001', 'admin.dev@exemple.fr',       '$2b$10$D149u/ogE2rMlC64kop7CeMw595uXnrUt2kS/pBNR826ePoZYNoim', true),
  ('00000000-0000-4000-8000-000000000002', 'senior.dev@exemple.fr',      '$2b$10$D149u/ogE2rMlC64kop7CeMw595uXnrUt2kS/pBNR826ePoZYNoim', false),
  ('00000000-0000-4000-8000-000000000003', 'sante.dev@exemple.fr',       '$2b$10$D149u/ogE2rMlC64kop7CeMw595uXnrUt2kS/pBNR826ePoZYNoim', false),
  ('00000000-0000-4000-8000-000000000004', 'particulier.dev@exemple.fr', '$2b$10$D149u/ogE2rMlC64kop7CeMw595uXnrUt2kS/pBNR826ePoZYNoim', false),
  ('00000000-0000-4000-8000-000000000005', 'attente.dev@exemple.fr',     '$2b$10$D149u/ogE2rMlC64kop7CeMw595uXnrUt2kS/pBNR826ePoZYNoim', false);

-- Profils (numéros de téléphone fictifs).
insert into profiles (id, role, nom, telephone, ville, adresse, specialite, bio, services, disponibilites, verifie) values
  ('00000000-0000-4000-8000-000000000002', 'senior',      'Personne âgée Test',   '0639990002', 'Mamoudzou', '1 rue de Test', '', '', '{}', '[]', true),
  ('00000000-0000-4000-8000-000000000003', 'sante',       'Infirmière Test',      '0639990003', 'Dembeni',   '', 'infirmier', 'Profil fictif de test.', '{}',
     '[{"jour":"lundi","heureDebut":"08:00","heureFin":"12:00"}]', true),
  ('00000000-0000-4000-8000-000000000004', 'particulier', 'Particulier Test',     '0639990004', 'Koungou',   '', '', 'Profil fictif de test.', '{coursier,menage}',
     '[{"jour":"mardi","heureDebut":"12:00","heureFin":"17:00"}]', true),
  ('00000000-0000-4000-8000-000000000005', 'sante',       'Intervenant en attente', '0639990005', 'Sada',    '', 'aide-soignant', 'Profil non validé (test de la validation).', '{}', '[]', false);

-- Une demande en attente, pour tester l'acceptation.
insert into demandes (demandeur_id, aidant_id, type_service, message) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'soins', 'Demande fictive de test.');

-- Un avis, un message SOS et un adhérent fictifs.
insert into avis (user_id, nom, texte) values
  ('00000000-0000-4000-8000-000000000002', 'Personne âgée Test', 'Avis fictif de test.');
insert into messages_contact (user_id, nom, message) values
  (null, 'Visiteur de test', 'Message SOS fictif de test.');
insert into adherents (nom, email, telephone, ville) values
  ('Adhérent Test', 'adherent.dev@exemple.fr', '0639990009', 'Mamoudzou');

commit;

-- Vérification : 5 comptes, 4 profils, 1 demande, 1 avis, 1 message, 1 adhérent.
select 'comptes' as table_, count(*) from utilisateurs
union all select 'profiles', count(*) from profiles
union all select 'demandes', count(*) from demandes
union all select 'avis', count(*) from avis
union all select 'messages_contact', count(*) from messages_contact
union all select 'adherents', count(*) from adherents;
