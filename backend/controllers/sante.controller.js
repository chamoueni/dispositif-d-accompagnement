// GET /api/sante : bilan de santé du serveur, appelé toutes les 10 minutes par
// la tâche planifiée pg_cron (Supabase) et par le robot « Mlezi »
// (.github/workflows/mlezi-gardien.yml).
// Un seul appel suffit à : réveiller ce serveur (Render gratuit l'endort après
// 15 min sans visite) ET faire une vraie lecture dans Supabase (qui met en pause
// les projets gratuits inactifs). Public et sans donnée sensible : on ne renvoie
// que des "ok"/"erreur", jamais le contenu de la base.
import { cleAnonyme } from '../config/supabase.js'

export async function bilanSante(_req, res) {
  let supabase = 'non configuré'
  const url = process.env.SUPABASE_URL
  const cle = cleAnonyme()
  if (url && cle) {
    try {
      const reponse = await fetch(`${url.replace(/\/$/, '')}/rest/v1/avis?select=id&limit=1`, {
        headers: { apikey: cle, Authorization: `Bearer ${cle}` },
        signal: AbortSignal.timeout(10000),
      })
      supabase = reponse.ok ? 'ok' : 'erreur'
    } catch {
      supabase = 'erreur'
    }
  }
  const ok = supabase === 'ok'
  res.status(ok ? 200 : 503).json({ ok, api: 'ok', supabase, date: new Date().toISOString() })
}
