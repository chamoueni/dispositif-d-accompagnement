// Contrôleur des adhérents (espace admin › Adhérents).
// Données dans MongoDB (models/adherent.model.js), copie dans Supabase
// (services/adherentSync.service.js).
import {
  ajouterAdherent,
  modifierAdherent,
  obtenirAdherents,
  supprimerAdherent,
} from '../models/adherent.model.js'
import { synchroniserAdherent } from '../services/adherentSync.service.js'
import { validerAdherent } from '../services/validation.service.js'

const DOUBLON = { message: 'Un adhérent existe déjà avec cet email.' }

// GET /api/adherents
export async function lister(_req, res, next) {
  try {
    res.json(await obtenirAdherents())
  } catch (error) {
    next(error)
  }
}

// POST /api/adherents
export async function ajouter(req, res, next) {
  try {
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    // Pas deux adhérents avec le même email : évite aussi les doublons créés
    // par un double-clic ou un envoi répété du formulaire.
    const email = req.body.email.trim().toLowerCase()
    if ((await obtenirAdherents()).some((a) => a.email === email)) {
      return res.status(409).json(DOUBLON)
    }
    const adherent = await ajouterAdherent(req.body)
    await synchroniserAdherent(adherent, 'ajouter')
    return res.status(201).json(adherent)
  } catch (error) {
    // 11000 = clé en double dans MongoDB (index unique sur l'email).
    if (error?.code === 11000) return res.status(409).json(DOUBLON)
    next(error)
  }
}

// PUT /api/adherents/:id
export async function modifier(req, res, next) {
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
}

// DELETE /api/adherents/:id
export async function supprimer(req, res, next) {
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
}
