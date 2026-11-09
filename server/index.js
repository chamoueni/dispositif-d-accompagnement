// API REST Express : connexion (sessions), données, adhérents et bilan de santé.
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {
  ajouterAdherent,
  modifierAdherent,
  obtenirAdherents,
  supprimerAdherent,
} from './adherentsStore.js'
import { synchroniserAdherent } from './supabaseSync.js'
import authRoutes from './authRoutes.js'
import dataRoutes from './dataRoutes.js'
import { sessionMiddleware } from './sessions.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const rolesAutorises = ['senior', 'sante', 'particulier']
const statutsAutorises = ['actif', 'inactif']
// Même email en dur que côté client (voir ADMIN_EMAIL dans stores/auth.js) et
// que les policies RLS Supabase : pas de rôle "admin" séparé pour ce projet.
const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

const originsAutorises = new Set([
  process.env.SITE_URL,
  ...(process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
].filter(Boolean).map((value) => {
  try { return new URL(value).origin } catch { return '' }
}).filter(Boolean))

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || originsAutorises.has(origin))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)')
  next()
})
app.use((req, res, next) => {
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000')
  next()
})
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (!origin || !originsAutorises.has(origin)) {
    return res.status(403).json({ message: 'Origine de la requête non autorisée.' })
  }
  next()
})
app.use('/api', sessionMiddleware)
app.use('/api', authRoutes)
app.use('/api', dataRoutes)

// Protège les routes /api/admin/* : le front envoie le token de session Supabase
// de l'utilisateur connecté (Authorization: Bearer <access_token>), qu'on
// vérifie ici avant d'autoriser une action qui utilise la clé service role
// (donc capable de contourner toute RLS) — sans ce contrôle, ces routes
// seraient utilisables par n'importe qui connaissant leur URL.
function verifierAdmin(req, res, next) {
  if (!req.authSession) return res.status(401).json({ message: 'Authentification requise.' })
  if (req.authSession.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Accès réservé à l'administrateur." })
  }
  next()
}

function validerAdherent(body) {
  if (!body.nom?.trim()) return 'Le nom est obligatoire.'
  if (!body.email?.trim() || !body.email.includes('@')) return 'Un email valide est obligatoire.'
  if (!rolesAutorises.includes(body.role || 'particulier')) return 'Le rôle est invalide.'
  if (!statutsAutorises.includes(body.statut || 'actif')) return 'Le statut est invalide.'
  return null
}

app.get('/api/adherents', verifierAdmin, async (_req, res, next) => {
  try {
    res.json(await obtenirAdherents())
  } catch (error) {
    next(error)
  }
})

app.post('/api/adherents', verifierAdmin, async (req, res, next) => {
  try {
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    const adherent = await ajouterAdherent(req.body)
    await synchroniserAdherent(adherent, 'ajouter')
    return res.status(201).json(adherent)
  } catch (error) {
    next(error)
  }
})

app.put('/api/adherents/:id', verifierAdmin, async (req, res, next) => {
  try {
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    const adherent = await modifierAdherent(req.params.id, req.body)
    if (!adherent) return res.status(404).json({ message: 'Adhérent introuvable.' })
    await synchroniserAdherent(adherent, 'modifier')
    return res.json(adherent)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/adherents/:id', verifierAdmin, async (req, res, next) => {
  try {
    const adherents = await obtenirAdherents()
    const adherent = adherents.find((item) => item.id === req.params.id)
    if (!adherent || !(await supprimerAdherent(req.params.id))) {
      return res.status(404).json({ message: 'Adhérent introuvable.' })
    }
    await synchroniserAdherent(adherent, 'supprimer')
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

// Bilan de santé, appelé par le robot de maintenance "Mlezi"
// (.github/workflows/mlezi-gardien.yml) toutes les 10 minutes en journée.
// Un seul appel suffit à : réveiller ce serveur (Render gratuit l'endort après
// 15 min sans visite) ET faire une vraie lecture dans Supabase (qui met en pause
// les projets gratuits inactifs). Public et sans donnée sensible : on ne renvoie
// que des "ok"/"erreur", jamais le contenu de la base.
app.get('/api/sante', async (_req, res) => {
  let supabase = 'non configuré'
  const url = process.env.SUPABASE_URL
  const cle = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
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
})

app.use('/api', (_req, res) => res.status(404).json({ message: 'Route API introuvable.' }))

app.use((error, _req, res, _next) => {
  void _next
  console.error('Erreur API :', error?.name || 'Erreur')
  res.status(500).json({ message: 'Une erreur serveur est survenue.' })
})

app.listen(port, () => {
  console.log(`API adhérents disponible sur http://localhost:${port}`)
})
