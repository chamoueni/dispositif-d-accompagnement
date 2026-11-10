// Middlewares de sécurité appliqués à toutes les requêtes (voir app.js).
import cors from 'cors'
import { originesAutorisees } from '../config/origines.js'

// CORS : seules les origines autorisées peuvent appeler l'API avec leurs cookies.
export const corsMiddleware = cors({
  origin(origin, callback) {
    callback(null, !origin || originesAutorisees.has(origin))
  },
  credentials: true,
})

// En-têtes de sécurité envoyés avec chaque réponse.
export function enTetesSecurite(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // Interdit d'afficher le site dans le cadre d'un autre site (clickjacking).
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)')
  // HTTPS imposé au navigateur pendant un an (seulement si la requête est déjà en HTTPS).
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000')
  next()
}

// Protection contre les requêtes forgées (CSRF) : toute requête qui modifie
// quelque chose (POST, PUT, DELETE...) doit venir d'une origine autorisée.
export function verifierOrigine(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (!origin || !originesAutorisees.has(origin)) {
    return res.status(403).json({ message: 'Origine de la requête non autorisée.' })
  }
  next()
}
