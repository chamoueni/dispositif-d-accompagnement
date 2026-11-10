// Route des données métier, montée sur /api/data (voir app.js).
// Le contrôle de connexion se fait action par action dans le contrôleur :
// la liste des avis et l'envoi d'un message SOS restent ouverts à tous.
import { Router } from 'express'
import { traiterAction } from '../controllers/data.controller.js'

const router = Router()

router.post('/', traiterAction)

export default router
