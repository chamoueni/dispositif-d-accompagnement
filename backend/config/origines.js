// Adresses (origines) autorisées à appeler l'API avec leurs cookies :
// l'adresse officielle du site (SITE_URL), d'éventuelles adresses en plus
// (CORS_ORIGINS, séparées par des virgules) et, hors production, le serveur
// de développement Vite. Utilisé par CORS et par le contrôle de l'origine
// (voir middleware/securite.js).
import './env.js'

export const originesAutorisees = new Set([
  process.env.SITE_URL,
  ...(process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
].filter(Boolean).map((value) => {
  try { return new URL(value).origin } catch { return '' }
}).filter(Boolean))
