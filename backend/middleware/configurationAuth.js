// Refuse les routes /api/auth/* (503) tant que le serveur n'a pas tout ce qu'il
// faut pour gérer les comptes : message clair plutôt qu'une erreur incompréhensible.
import { cleAnonyme, supabaseAdmin } from '../config/supabase.js'

export function verifierConfigurationAuth(_req, res, next) {
  const configured = !!supabaseAdmin &&
    !!cleAnonyme() &&
    typeof process.env.AUTH_SESSION_SECRET === 'string' &&
    Buffer.byteLength(process.env.AUTH_SESSION_SECRET) >= 32 &&
    (process.env.NODE_ENV !== 'production' || !!process.env.SITE_URL)
  if (!configured) {
    return res.status(503).json({ message: 'Authentification serveur non configurée. Vérifiez les variables d’environnement et la migration Supabase.' })
  }
  next()
}
