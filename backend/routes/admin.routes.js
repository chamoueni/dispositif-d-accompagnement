// Routes de l'espace admin, montées sur /api/admin (voir app.js).
// Toutes réservées à l'administrateur.
import { Router } from 'express'
import { creerCompte, supprimerCompte } from '../controllers/admin.controller.js'
import { verifierAdmin } from '../middleware/admin.js'

const router = Router()

router.use(verifierAdmin)

router.post('/comptes', creerCompte)
router.delete('/comptes/:id', supprimerCompte)

export default router
