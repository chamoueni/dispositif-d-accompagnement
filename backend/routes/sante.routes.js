// Route publique du bilan de santé, montée sur /api/sante (voir app.js).
import { Router } from 'express'
import { bilanSante } from '../controllers/sante.controller.js'

const router = Router()

router.get('/', bilanSante)

export default router
