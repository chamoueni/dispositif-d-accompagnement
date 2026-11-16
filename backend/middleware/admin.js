// Réserve une route au compte administrateur : 401 si personne n'est connecté,
// 403 si le compte connecté n'est pas administrateur (colonne
// utilisateurs.est_admin, relue dans la base à chaque requête par
// middleware/session.js). Sans ce contrôle, ces routes seraient utilisables
// par n'importe qui connaissant leur adresse.
import { exigerRole } from './session.js'

// exigerRole() sans rôle autorisé : seul l'administrateur passe.
export const verifierAdmin = exigerRole()
