// Valeurs fixes partagées par tout le serveur (avant : recopiées dans
// index.js, authRoutes.js et dataRoutes.js).

// L'administrateur n'est plus reconnu par un email écrit ici : c'est la
// colonne utilisateurs.est_admin de la base (voir backend/sql/schema.sql).

// Profils possibles d'un compte : senior = personne âgée, sante = personnel
// de santé, particulier. (« admin » n'est pas un profil, c'est est_admin.)
export const ROLES_AUTORISES = ['senior', 'sante', 'particulier']

// Statut d'un adhérent (espace admin).
export const STATUTS_ADHERENT = ['actif', 'inactif']

// Cycle de vie d'une demande d'aide et d'une mission (mise en relation).
export const STATUTS_DEMANDE = ['en_attente', 'acceptee', 'refusee', 'terminee', 'annulee']
export const STATUTS_MISSION = ['en_cours', 'terminee', 'annulee']

// Longueur minimale des mots de passe, la même que côté site
// (frontend/src/lib/motDePasse.js). C'est la vérification du serveur qui fait foi.
export const MOT_DE_PASSE_MIN = 8
