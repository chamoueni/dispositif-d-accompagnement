// Réserve une route au compte administrateur : 401 si personne n'est connecté,
// 403 si le compte connecté n'est pas celui de l'administrateur.
// Indispensable pour les routes qui utilisent la clé "service role"
// (capable de contourner toute RLS) : sans ce contrôle, elles seraient
// utilisables par n'importe qui connaissant leur adresse.
import { ADMIN_EMAIL } from '../config/constantes.js'

export function verifierAdmin(req, res, next) {
  if (!req.authSession || !req.supabase) return res.status(401).json({ message: 'Authentification requise.' })
  if (req.authSession.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Accès réservé à l’administrateur.' })
  }
  next()
}
