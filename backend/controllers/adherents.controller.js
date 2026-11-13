// Contrôleur des adhérents (espace admin › Adhérents).
// Données dans la table PostgreSQL « adherents » de Supabase
// (models/adherent.model.js), lue avec le client de l'administrateur connecté.
import {
  ajouterAdherent,
  modifierAdherent,
  obtenirAdherents,
  supprimerAdherent,
} from '../models/adherent.model.js'
import { isUuid, validerAdherent } from '../services/validation.service.js'

const DOUBLON = { message: 'Un adhérent existe déjà avec cet email.' }
const INTROUVABLE = { message: 'Adhérent introuvable.' }

// 23505 = valeur en double dans PostgreSQL (index unique sur l'email).
const estDoublon = (error) => error?.code === '23505'

// GET /api/adherents
export async function lister(req, res, next) {
  try {
    res.json(await obtenirAdherents(req.supabase))
  } catch (error) {
    next(error)
  }
}

// POST /api/adherents
export async function ajouter(req, res, next) {
  try {
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    // Pas deux adhérents avec le même email : l'index unique de la base le
    // garantit, même pour un double-clic ou deux envois simultanés.
    const adherent = await ajouterAdherent(req.supabase, req.body)
    return res.status(201).json(adherent)
  } catch (error) {
    if (estDoublon(error)) return res.status(409).json(DOUBLON)
    next(error)
  }
}

// PUT /api/adherents/:id
export async function modifier(req, res, next) {
  try {
    // Un identifiant mal formé ferait échouer PostgreSQL (type uuid) : 404 direct.
    if (!isUuid(req.params.id)) return res.status(404).json(INTROUVABLE)
    const erreur = validerAdherent(req.body)
    if (erreur) return res.status(400).json({ message: erreur })
    const adherent = await modifierAdherent(req.supabase, req.params.id, req.body)
    if (!adherent) return res.status(404).json(INTROUVABLE)
    return res.json(adherent)
  } catch (error) {
    // Nouvel email déjà utilisé par un autre adhérent.
    if (estDoublon(error)) return res.status(409).json(DOUBLON)
    next(error)
  }
}

// DELETE /api/adherents/:id
export async function supprimer(req, res, next) {
  try {
    if (!isUuid(req.params.id) || !(await supprimerAdherent(req.supabase, req.params.id))) {
      return res.status(404).json(INTROUVABLE)
    }
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
}
