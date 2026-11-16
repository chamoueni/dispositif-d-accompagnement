// Point d'entrée du serveur (npm start) : crée l'application Express, branche
// les middlewares, les routes de l'API, puis le site Vue, et démarre l'écoute.
//
// Sur alwaysdata, UN SEUL programme Node.js fait tout :
//   /api/...        → l'API (ce dossier backend/)
//   tout le reste   → le site Vue déjà construit (dossier dist/, npm run build)
//
// Organisation du dossier backend/ :
//   db.js         connexion à PostgreSQL (paquet « pg »)
//   sql/          schéma de la base (schema.sql) et scripts d'import
//   config/       réglages (variables d'environnement, constantes…)
//   middleware/   contrôles exécutés avant les routes (sécurité, connexion, rôle…)
//   routes/       adresses de l'API et contrôleur appelé pour chacune
//   controllers/  traitement de chaque requête et réponse JSON
//   services/     règles de gestion réutilisables (jeton, mots de passe, emails…)
//   models/       requêtes SQL, une table par fichier
import './config/env.js'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

// alwaysdata donne l'adresse et le port à utiliser dans IP et PORT.
// En local : port 3001 (celui que le serveur Vite redirige, voir vite.config.js).
const port = Number(process.env.PORT) || 3001
const ip = process.env.IP || undefined

// Dossier du site construit (à la racine du dépôt, voir frontend/vite.config.js).
const dossierSite = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

// Derrière le proxy d'alwaysdata : permet de savoir si la requête est en HTTPS
// et de connaître la vraie adresse IP du visiteur (limiteurs de tentatives).
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
app.use('/api', routeIntrouvable)

// 3. Le site Vue. Les fichiers qui existent (JS, CSS, images…) sont envoyés
//    tels quels ; les fichiers avec un nom « haché » (assets/) peuvent rester
//    en cache un an, car leur nom change à chaque nouvelle version.
if (existsSync(dossierSite)) {
  // fallthrough: false : un fichier d'assets/ introuvable répond 404 (au lieu
  // de recevoir la page d'accueil à la place d'un script, ce qui serait trompeur).
  app.use('/assets', express.static(path.join(dossierSite, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }))
  // redirect: false : /services n'est pas redirigé vers /services/ (voir plus bas).
  app.use(express.static(dossierSite, { redirect: false }))

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    // Pages publiques pré-générées pour les moteurs de recherche par
    // « npm run build » (frontend/scripts/generate-seo-pages.js) : /services
    // → dist/services/index.html. path.resolve + startsWith empêchent de
    // sortir du dossier dist/ avec une adresse piégée (../../).
    const pageSeo = path.resolve(dossierSite, '.' + req.path, 'index.html')
    if (pageSeo.startsWith(dossierSite + path.sep) && existsSync(pageSeo)) return res.sendFile(pageSeo)
    // Mode « history » de Vue Router : une adresse comme /mon-compte n'est pas
    // un fichier, c'est Vue qui affiche la bonne page. Pour toute autre page
    // inconnue du serveur, on renvoie donc index.html et Vue Router prend le relais.
    res.sendFile(path.join(dossierSite, 'index.html'))
  })
} else {
  console.warn('Dossier dist/ introuvable : lancez « npm run build » pour que le serveur affiche aussi le site.')
}

// 4. Erreurs inattendues.
app.use(gestionErreurs)

app.listen(port, ip, () => {
  console.log(`Serveur démarré sur http://${ip || 'localhost'}:${port}`)
})
