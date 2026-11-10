// Contrôleur des comptes : inscription, connexion, session, déconnexion,
// mot de passe oublié et changement de mot de passe.
// Les mots de passe ne passent jamais en clair dans la base : c'est
// Supabase Auth qui les hache (bcrypt).
import { MOT_DE_PASSE_MIN, ROLES_AUTORISES } from '../config/constantes.js'
import { clientAnonyme, supabaseAdmin } from '../config/supabase.js'
import { chargerProfil, profilDepuisUtilisateur } from '../services/profil.service.js'
import {
  clearSessionCookie,
  createSession,
  persistSessionTokens,
  revokeSession,
} from '../services/session.service.js'
import { emailValide } from '../services/validation.service.js'

const MESSAGE_TROP_DE_TENTATIVES = 'Trop de tentatives, merci de réessayer dans quelques minutes.'
const MESSAGE_MOT_DE_PASSE = `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`
const MESSAGE_LIEN_INVALIDE = 'Le lien de réinitialisation est invalide ou expiré.'

function motDePasseValide(password) {
  return typeof password === 'string' && password.length >= MOT_DE_PASSE_MIN && password.length <= 1024
}

// POST /api/auth/register
export async function inscrire(req, res, next) {
  try {
    const body = req.body || {}
    if (!emailValide(body.email)) return res.status(400).json({ message: 'Adresse email invalide.' })
    if (!motDePasseValide(body.password)) return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
    if (!ROLES_AUTORISES.includes(body.role)) return res.status(400).json({ message: 'Le profil sélectionné est invalide.' })
    if (typeof body.nom !== 'string' || !body.nom.trim() || body.nom.length > 120) {
      return res.status(400).json({ message: 'Le nom est obligatoire.' })
    }

    // Seuls ces champs, nettoyés et de taille limitée, sont enregistrés.
    const metadata = {
      nom: body.nom.trim(),
      telephone: typeof body.telephone === 'string' ? body.telephone.slice(0, 40) : '',
      ville: typeof body.ville === 'string' ? body.ville.slice(0, 100) : '',
      adresse: typeof body.adresse === 'string' ? body.adresse.slice(0, 300) : '',
      role: body.role,
      specialite: typeof body.specialite === 'string' ? body.specialite.slice(0, 100) : '',
      services: Array.isArray(body.services) ? body.services.slice(0, 30) : [],
      bio: typeof body.bio === 'string' ? body.bio.slice(0, 2000) : '',
      disponibilites: Array.isArray(body.disponibilites) ? body.disponibilites.slice(0, 100) : [],
    }
    const client = clientAnonyme()
    const { data, error } = await client.auth.signUp({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      options: { data: metadata },
    })
    if (error) {
      if (/rate limit/i.test(error.message)) return res.status(429).json({ message: MESSAGE_TROP_DE_TENTATIVES })
      if (/password.*at least|password.*characters/i.test(error.message)) {
        return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
      }
      if (/already registered|already been registered/i.test(error.message)) {
        return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' })
      }
      throw error
    }

    // Confirmation par e-mail activée : pas encore de session.
    if (!data.session) {
      return res.status(201).json({
        confirmationRequired: true,
        message: 'Un email de confirmation a été envoyé. Cliquez sur le lien reçu, puis connectez-vous.',
      })
    }

    const { error: sessionError } = await client.auth.setSession(data.session)
    if (sessionError) throw sessionError
    const { error: profileError } = await client.from('profiles').insert({ id: data.user.id, ...metadata })
    if (profileError) throw profileError
    const { data: sessionData } = await client.auth.getSession()
    await createSession(data.user.id, sessionData.session || data.session, false, res)
    return res.status(201).json({ user: { ...metadata, id: data.user.id, email: data.user.email } })
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/login
export async function connecter(req, res, next) {
  try {
    const { email, password, remember } = req.body || {}
    if (!emailValide(email) || typeof password !== 'string' || !password || password.length > 1024) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' })
    }
    const { data, error } = await clientAnonyme().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      if (/rate limit/i.test(error.message)) return res.status(429).json({ message: MESSAGE_TROP_DE_TENTATIVES })
      if (/email not confirmed/i.test(error.message)) {
        return res.status(403).json({
          message: 'Merci de confirmer votre adresse email avant de vous connecter : vérifiez votre boîte mail et vos courriers indésirables.',
        })
      }
      // Même message que l'email existe ou non : on ne révèle pas quels comptes existent.
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
    }
    const client = clientAnonyme()
    const { error: sessionError } = await client.auth.setSession(data.session)
    if (sessionError) throw sessionError
    const user = await chargerProfil(client, data.user)
    const { data: sessionData } = await client.auth.getSession()
    await createSession(data.user.id, sessionData.session || data.session, remember === true, res)
    return res.json({ user: user || profilDepuisUtilisateur(data.user) })
  } catch (error) {
    next(error)
  }
}

// GET /api/auth/session : qui est connecté ?
export async function sessionCourante(req, res, next) {
  try {
    const user = await chargerProfil(req.supabase, req.authSession.user)
    return res.json({ user: user || profilDepuisUtilisateur(req.authSession.user) })
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/logout
export async function deconnecter(req, res, next) {
  try {
    await revokeSession(req)
    clearSessionCookie(res)
    if (req.authSession && req.supabase) {
      const { error } = await req.supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    }
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/forgot-password : envoie un lien de réinitialisation par e-mail.
export async function motDePasseOublie(req, res, next) {
  try {
    const email = req.body?.email
    if (!emailValide(email)) return res.status(400).json({ message: 'Adresse email invalide.' })
    const { error } = await clientAnonyme().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.SITE_URL || 'http://localhost:5173'}/reinitialiser-mot-de-passe`,
    })
    if (error) throw error
    // Même réponse que le compte existe ou non.
    return res.json({ message: 'Si cette adresse est associée à un compte, un email de réinitialisation a été envoyé.' })
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/recovery/verify : le lien reçu par e-mail est-il encore valable ?
export async function verifierLienReinitialisation(req, res, next) {
  try {
    const accessToken = req.body?.accessToken
    if (typeof accessToken !== 'string' || accessToken.length > 8192 || !supabaseAdmin) {
      return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })
    }
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error || !data.user) return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })
    return res.json({ valid: true })
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/recovery : nouveau mot de passe depuis le lien reçu par e-mail.
export async function reinitialiserMotDePasse(req, res, next) {
  try {
    const { accessToken, password } = req.body || {}
    if (typeof accessToken !== 'string' || accessToken.length > 8192) {
      return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })
    }
    if (!motDePasseValide(password)) return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
    if (!supabaseAdmin) return res.status(503).json({ message: 'La réinitialisation n’est pas configurée.' })
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error || !data.user) return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password })
    if (updateError) throw updateError
    // Par sécurité, toutes les sessions ouvertes de ce compte sont fermées.
    const { error: revokeError } = await supabaseAdmin
      .from('auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', data.user.id)
      .is('revoked_at', null)
    if (revokeError) throw revokeError
    return res.json({ message: 'Mot de passe modifié. Vous pouvez maintenant vous connecter.' })
  } catch (error) {
    next(error)
  }
}

// PUT /api/auth/password : changement de mot de passe depuis « Mon profil ».
export async function changerMotDePasse(req, res, next) {
  try {
    const password = req.body?.password
    if (!motDePasseValide(password)) return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
    const { error } = await req.supabase.auth.updateUser({ password })
    if (error) throw error
    await persistSessionTokens(req)
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
}
