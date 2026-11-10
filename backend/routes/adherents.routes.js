// Routes des adhérents, montées sur /api/adherents (voir app.js).
// Toutes réservées à l'administrateur.
import { Router } from 'express'
import * as adherents from '../controllers/adherents.controller.js'
import { verifierAdmin } from '../middleware/admin.js'

const router = Router()

router.use(verifierAdmin)

router.get('/', adherents.lister)
router.post('/', adherents.ajouter)
router.put('/:id', adherents.modifier)
router.delete('/:id', adherents.supprimer)

export default router
