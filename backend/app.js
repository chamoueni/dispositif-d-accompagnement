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

// Sous-dossier où le site est publié, déduit de son adresse (SITE_URL) :
// https://moustakim.alwaysdata.net/fil donne « /fil ».
// Vide si le site est à la racine (en local notamment).
const sousDossier = (() => {
  try {
    return new URL(process.env.SITE_URL).pathname.replace(/\/+$/, '')
  } catch {
    return ''
  }
})()

// 1. Middlewares appliqués à toutes les requêtes, dans cet ordre.
app.use(corsMiddleware)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(enTetesSecurite)
app.use(verifierOrigine)

// Tout le site (API + pages) est regroupé dans un « routeur », branché plus
// bas sur le sous-dossier : /fil/api/... et /fil/mon-compte
// arrivent ici comme /api/... et /mon-compte.
const site = express.Router()
site.use('/api', sessionMiddleware)

// 2. Routes de l'API.
site.use('/api/auth', authRoutes)
site.use('/api/admin', adminRoutes)
site.use('/api/data', dataRoutes)
site.use('/api/adherents', adherentsRoutes)
site.use('/api/sante', santeRoutes)
site.use('/api', routeIntrouvable)

// 3. Le site Vue. Les fichiers qui existent (JS, CSS, images…) sont envoyés
//    tels quels ; les fichiers avec un nom « haché » (assets/) peuvent rester
//    en cache un an, car leur nom change à chaque nouvelle version.
//    SERVIR_FRONT=false : le front est hébergé à part (site statique
//    alwaysdata, voir DEPLOIEMENT.md) et ce serveur ne fait que l'API.
const servirFront = process.env.SERVIR_FRONT !== 'false'
if (!servirFront) {
  console.log('SERVIR_FRONT=false : ce serveur ne sert que l’API (le front est hébergé à part).')
} else if (existsSync(dossierSite)) {
  // fallthrough: false : un fichier d'assets/ introuvable répond 404 (au lieu
  // de recevoir la page d'accueil à la place d'un script, ce qui serait trompeur).
  site.use('/assets', express.static(path.join(dossierSite, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }))
  // redirect: false : /services n'est pas redirigé vers /services/ (voir plus bas).
  site.use(express.static(dossierSite, { redirect: false }))

  site.use((req, res, next) => {
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

// Branchement du site sur son sous-dossier. Il reste aussi joignable sans le
// préfixe, au cas où l'hébergeur retire lui-même le sous-dossier de l'adresse
// avant de transmettre la requête.
if (sousDossier) app.use(sousDossier, site)
app.use(site)

// Adresse qui ne correspond à rien (par exemple une page, quand le front est
// hébergé à part) : réponse 404 claire plutôt que la page d'erreur d'Express.
app.use((_req, res) => res.status(404).json({ message: 'Adresse introuvable.' }))

// 4. Erreurs inattendues.
app.use(gestionErreurs)

app.listen(port, ip, () => {
  console.log(`Serveur démarré sur http://${ip || 'localhost'}:${port}`)
})
