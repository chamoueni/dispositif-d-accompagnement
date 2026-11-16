// Profil de l'utilisateur connecté, tel que le site le reçoit après la
// connexion (GET /api/auth/session, POST /api/auth/login…).
import { trouverProfil } from '../models/profil.model.js'

// Assemble le compte (email, statut admin) et le profil (nom, rôle…).
// L'administrateur peut ne pas avoir de profil : on renvoie alors juste
// l'essentiel. Jamais l'empreinte du mot de passe.
export async function chargerProfil(utilisateur, executant) {
  const profil = await trouverProfil(utilisateur.id, executant)
  return {
    ...(profil || { id: utilisateur.id, role: '', nom: '' }),
    email: utilisateur.email,
    est_admin: utilisateur.est_admin === true,
  }
}
