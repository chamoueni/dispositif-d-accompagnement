// Contrôleur des comptes gérés par l'administrateur (espace admin › Comptes).
// Les routes sont protégées par verifierAdmin (voir routes/admin.routes.js).
import { randomBytes } from 'node:crypto'
import { ROLES_AUTORISES } from '../config/constantes.js'
import { transactionAdmin } from '../db.js'
import { creerProfil } from '../models/profil.model.js'
import { creerUtilisateur, supprimerUtilisateur } from '../models/utilisateur.model.js'
import { hacherMotDePasse } from '../services/motDePasse.service.js'
import { emailValide, isUuid } from '../services/validation.service.js'

// DELETE /api/admin/comptes/:id : supprime le compte. Son profil, ses
// demandes, missions et avis partent avec (on delete cascade dans la base) :
// c'est aussi le « droit à l'effacement » du RGPD.
export async function supprimerCompte(req, res, next) {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ message: 'Compte introuvable.' })
    // L'administrateur ne peut pas supprimer son propre compte par erreur.
    if (req.params.id === req.utilisateur.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte administrateur.' })
    }
    if (!(await supprimerUtilisateur(req.params.id))) {
      return res.status(404).json({ message: 'Compte introuvable.' })
    }
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/comptes : crée un compte et son profil.
export async function creerCompte(req, res, next) {
  try {
    const { nom, email, telephone, ville, role } = req.body || {}
    if (typeof nom !== 'string' || !nom.trim() || nom.length > 120) {
      return res.status(400).json({ message: 'Le nom est obligatoire.' })
    }
    if (!emailValide(email)) {
      return res.status(400).json({ message: 'Un email valide est obligatoire pour créer un compte.' })
    }
    if (!ROLES_AUTORISES.includes(role)) return res.status(400).json({ message: 'Le rôle est invalide.' })

    // Mot de passe aléatoire, que personne ne connaît : la personne choisira
    // le sien avec « Mot de passe oublié ».
    const hash = await hacherMotDePasse(randomBytes(32).toString('base64url'))
    const champs = {
      nom: nom.trim(),
      telephone: typeof telephone === 'string' ? telephone.slice(0, 40) : '',
      ville: typeof ville === 'string' ? ville.slice(0, 100) : '',
      role,
      actif: req.body?.actif !== false,
      // Compte créé par l'administrateur lui-même : profil vérifié, sauf s'il
      // décoche « Profil vérifié » dans le formulaire (verifie: false).
      verifie: req.body?.verifie !== false,
    }

    // Transaction « admin » : le déclencheur de la base accepte alors la
    // valeur de « verifie ». Compte et profil sont créés ensemble ou pas du tout.
    const { utilisateur, profil } = await transactionAdmin(async (client) => {
      const utilisateur = await creerUtilisateur(email.trim().toLowerCase(), hash, client)
      const profil = await creerProfil(utilisateur.id, champs, client)
      return { utilisateur, profil }
    })
    return res.status(201).json({ ...profil, email: utilisateur.email })
  } catch (error) {
    if (error?.code === '23505') {
      const message = error.constraint === 'profiles_telephone_unique'
        ? 'Ce numéro de téléphone est déjà utilisé par un autre compte.'
        : 'Un compte existe déjà avec cet email.'
      return res.status(400).json({ message })
    }
    next(error)
  }
}
