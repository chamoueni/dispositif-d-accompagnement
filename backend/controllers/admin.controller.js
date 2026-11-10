// Contrôleur des comptes gérés par l'administrateur (espace admin › Comptes).
// Utilise la clé "service role" : les routes sont protégées par verifierAdmin.
import { randomBytes } from 'node:crypto'
import { ROLES_AUTORISES } from '../config/constantes.js'
import { supabaseAdmin } from '../config/supabase.js'
import { emailValide } from '../services/validation.service.js'

const NON_CONFIGURE = { message: 'Service d’administration non configuré.' }

// DELETE /api/admin/comptes/:id : supprime le compte (et son profil, par cascade).
export async function supprimerCompte(req, res, next) {
  try {
    if (!supabaseAdmin) return res.status(503).json(NON_CONFIGURE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id)
    if (error) return res.status(400).json({ message: 'Impossible de supprimer ce compte.' })
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
    if (!supabaseAdmin) return res.status(503).json(NON_CONFIGURE)

    const metadata = {
      nom: nom.trim(),
      telephone: typeof telephone === 'string' ? telephone.slice(0, 40) : '',
      ville: typeof ville === 'string' ? ville.slice(0, 100) : '',
      role,
    }
    // Mot de passe aléatoire : la personne choisira le sien avec « Mot de passe oublié ».
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: randomBytes(32).toString('base64url'),
      email_confirm: true,
      user_metadata: metadata,
    })
    if (error) {
      const message = /already.*registered|already.*exists/i.test(error.message)
        ? 'Un compte existe déjà avec cet email.'
        : 'Impossible de créer ce compte.'
      return res.status(400).json({ message })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: data.user.id, ...metadata, actif: req.body?.actif !== false })
      .select()
      .single()
    if (profileError) {
      // Pas de compte sans profil : on annule la création.
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      if (cleanupError) console.error('Échec du nettoyage du compte admin créé sans profil.')
      const message = /profiles_telephone_unique/i.test(profileError.message)
        ? 'Ce numéro de téléphone est déjà utilisé par un autre compte.'
        : 'Impossible de créer le profil du compte, merci de réessayer.'
      return res.status(400).json({ message })
    }
    return res.status(201).json({ ...profile, email: data.user.email })
  } catch (error) {
    next(error)
  }
}
