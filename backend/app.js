// Point d'entrée du serveur (npm start) : crée l'application Express, branche
// les middlewares puis les routes, et démarre l'écoute.
//
// Organisation du dossier backend/ :
//   config/       réglages et connexion à la base Supabase (PostgreSQL)
//   middleware/   contrôles exécutés avant les routes (sécurité, session, admin…)
//   routes/       adresses de l'API et contrôleur appelé pour chacune
//   controllers/  traitement de chaque requête et réponse JSON
//   services/     règles de gestion réutilisables (sessions, confidentialité…)
//   models/       accès aux données des adhérents (table Supabase « adherents »)
import './config/env.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import { corsMiddleware, enTetesSecurite, verifierOrigine } from './middleware/securite.js'
import { sessionMiddleware } from './middleware/session.js'
import { gestionErreurs, routeIntrouvable } from './middleware/erreurs.js'
import authRoutes from './routes/auth.routes.js'
import adminRoutes from './routes/admin.routes.js'
import dataRoutes from './routes/data.routes.js'
import adherentsRoutes from './routes/adherents.routes.js'
import santeRoutes from './routes/sante.routes.js'

const app = express()
const port = Number(process.env.PORT) || 3001

// Derrière le proxy de Render : permet de savoir si la requête est en HTTPS.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

// 1. Middlewares appliqués à toutes les requêtes, dans cet ordre.
app.use(corsMiddleware)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(enTetesSecurite)
app.use(verifierOrigine)
app.use('/api', sessionMiddleware)

// 2. Routes de l'API.
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/adherents', adherentsRoutes)
app.use('/api/sante', santeRoutes)

// 3. Adresse inconnue, puis erreurs inattendues.
app.use('/api', routeIntrouvable)
app.use(gestionErreurs)

app.listen(port, () => {
  console.log(`API disponible sur http://localhost:${port}`)
})
