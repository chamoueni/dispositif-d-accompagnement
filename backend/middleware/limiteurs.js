// Limitation du nombre de tentatives par adresse IP, contre les attaques par
// force brute (essais de mots de passe en série) et les inscriptions en masse.
import { rateLimit } from 'express-rate-limit'

const OPTIONS = { standardHeaders: 'draft-8', legacyHeaders: false }

// 10 connexions par quart d'heure.
export const limiterConnexion = rateLimit({
  ...OPTIONS,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: 'Trop de tentatives, merci de réessayer dans quelques minutes.' },
})

// 5 inscriptions par heure.
export const limiterInscription = rateLimit({ ...OPTIONS, windowMs: 60 * 60 * 1000, limit: 5 })

// 4 demandes de réinitialisation de mot de passe par heure.
export const limiterReinitialisation = rateLimit({ ...OPTIONS, windowMs: 60 * 60 * 1000, limit: 4 })
