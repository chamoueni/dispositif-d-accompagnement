-- Code d'arrivée à 4 chiffres d'une demande acceptée (règle RG05 du cahier des
-- charges) : l'intervenant l'annonce en arrivant chez la personne âgée.
-- La colonne figurait dans schema.sql mais n'avait jamais été créée sur le
-- projet en ligne : le serveur acceptait alors les demandes sans code (voir
-- backend/services/demande.service.js). Script rejouable, à exécuter une fois
-- dans l'éditeur SQL de Supabase.

alter table demandes add column if not exists code_arrivee text;

-- Vérification : la colonne doit apparaître (valeur vide pour les anciennes demandes).
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'demandes' and column_name = 'code_arrivee';
