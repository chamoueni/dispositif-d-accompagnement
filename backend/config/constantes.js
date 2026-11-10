// Valeurs fixes partagées par tout le serveur (avant : recopiées dans
// index.js, authRoutes.js et dataRoutes.js).

// Même email en dur que côté client (voir ADMIN_EMAIL dans stores/auth.js) et
// que les policies RLS Supabase : pas de rôle "admin" séparé pour ce projet.
export const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'

// Profils possibles d'un compte.
export const ROLES_AUTORISES = ['senior', 'sante', 'particulier']

// Statut d'un adhérent (espace admin).
export const STATUTS_ADHERENT = ['actif', 'inactif']

// Cycle de vie d'une demande d'aide et d'une mission (mise en relation).
export const STATUTS_DEMANDE = ['en_attente', 'acceptee', 'refusee', 'terminee', 'annulee']
export const STATUTS_MISSION = ['en_cours', 'terminee', 'annulee']

// Longueur minimale des mots de passe, la même que côté site
// (frontend/src/lib/motDePasse.js). C'est la vérification du serveur qui fait foi.
export const MOT_DE_PASSE_MIN = 8
