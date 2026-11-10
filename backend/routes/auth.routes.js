// Routes des comptes, montées sur /api/auth (voir app.js).
import { Router } from 'express'
import * as auth from '../controllers/auth.controller.js'
import { verifierConfigurationAuth } from '../middleware/configurationAuth.js'
import {
  limiterConnexion,
  limiterInscription,
  limiterReinitialisation,
} from '../middleware/limiteurs.js'
import { requireAuth } from '../middleware/session.js'

const router = Router()

router.use(verifierConfigurationAuth)

router.post('/register', limiterInscription, auth.inscrire)
router.post('/login', limiterConnexion, auth.connecter)
router.get('/session', requireAuth, auth.sessionCourante)
router.post('/logout', auth.deconnecter)
router.post('/forgot-password', limiterReinitialisation, auth.motDePasseOublie)
router.post('/recovery/verify', limiterReinitialisation, auth.verifierLienReinitialisation)
router.post('/recovery', limiterReinitialisation, auth.reinitialiserMotDePasse)
router.put('/password', requireAuth, auth.changerMotDePasse)

export default router
