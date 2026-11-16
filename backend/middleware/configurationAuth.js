// Refuse les routes /api/auth/* (503) tant que le serveur n'a pas tout ce qu'il
// faut pour gérer les comptes (base de données + JWT_SECRET) : message clair
// plutôt qu'une erreur incompréhensible.
import { baseConfiguree } from '../db.js'
import { secretConfigure } from '../services/jeton.service.js'

export function verifierConfigurationAuth(_req, res, next) {
  const configure = baseConfiguree() &&
    secretConfigure() &&
    (process.env.NODE_ENV !== 'production' || !!process.env.SITE_URL)
  if (!configure) {
    return res.status(503).json({
      message: 'Authentification serveur non configurée. Vérifiez DATABASE_URL, JWT_SECRET et SITE_URL.',
    })
  }
  next()
}
