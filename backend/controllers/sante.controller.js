// GET /api/sante : bilan de santé du serveur (carte « Santé du site » de
// l'espace admin, robot de surveillance). Fait une vraie petite lecture dans
// la base pour vérifier qu'elle répond.
// Public et sans donnée sensible : on ne renvoie que des « ok »/« erreur »,
// jamais le contenu de la base.
import { baseConfiguree, requete } from '../db.js'

export async function bilanSante(_req, res) {
  let base = 'non configurée'
  if (baseConfiguree()) {
    try {
      await requete('select 1')
      base = 'ok'
    } catch {
      base = 'erreur'
    }
  }
  const ok = base === 'ok'
  res.status(ok ? 200 : 503).json({ ok, api: 'ok', base, date: new Date().toISOString() })
}
