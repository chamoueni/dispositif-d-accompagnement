import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from 'express-rate-limit'
import { supabaseAdmin } from './supabaseAdmin.js'
import {
  clearSessionCookie,
  createSession,
  persistSessionTokens,
  requireAuth,
  revokeSession,
} from './sessions.js'

const router = Router()
const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'
const rolesAutorises = ['senior', 'sante', 'particulier']

// Longueur minimale des mots de passe, la même que côté site
// (frontend/src/lib/motDePasse.js). C'est cette vérification-ci qui fait foi.
const MOT_DE_PASSE_MIN = 8

const limiterConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, merci de réessayer dans quelques minutes.' },
})
const limiterInscription = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})
const limiterReinitialisation = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 4,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

function clientSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase côté serveur n’est pas configuré.')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
}

function verifierConfigurationAuth(_req, res, next) {
  const configured = !!supabaseAdmin &&
    !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) &&
    typeof process.env.AUTH_SESSION_SECRET === 'string' &&
    Buffer.byteLength(process.env.AUTH_SESSION_SECRET) >= 32 &&
    (process.env.NODE_ENV !== 'production' || !!process.env.SITE_URL)
  if (!configured) {
    return res.status(503).json({ message: 'Authentification serveur non configurée. Vérifiez les variables d’environnement et la migration Supabase.' })
  }
  next()
}

function emailValide(email) {
  return typeof email === 'string' && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function profilDepuisUtilisateur(user) {
  return {
    id: user.id,
    email: user.email,
    nom: user.user_metadata?.nom || '',
    telephone: user.user_metadata?.telephone || '',
    ville: user.user_metadata?.ville || '',
    adresse: user.user_metadata?.adresse || '',
    role: user.user_metadata?.role || '',
    specialite: user.user_metadata?.specialite || '',
    services: user.user_metadata?.services || [],
    bio: user.user_metadata?.bio || '',
    disponibilites: user.user_metadata?.disponibilites || [],
  }
}

async function chargerProfil(client, user) {
  const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (data) return { ...data, email: user.email }

  const metadata = user.user_metadata || {}
  if (!rolesAutorises.includes(metadata.role)) return null
  const { data: created, error: createError } = await client.from('profiles').insert({
    id: user.id,
    nom: metadata.nom || '',
    telephone: metadata.telephone || '',
    ville: metadata.ville || '',
    adresse: metadata.adresse || '',
    role: metadata.role,
    specialite: metadata.specialite || '',
    services: Array.isArray(metadata.services) ? metadata.services : [],
    bio: metadata.bio || '',
    disponibilites: Array.isArray(metadata.disponibilites) ? metadata.disponibilites : [],
  }).select().single()
  if (createError) {
    if (/duplicate key/i.test(createError.message)) return chargerProfil(client, user)
    throw createError
  }
  return { ...created, email: user.email }
}

function validerOrigine(req, res, next) {
  const origin = req.get('origin')
  const configured = [
    process.env.SITE_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
  ].filter(Boolean).map((value) => {
    try { return new URL(value.trim()).origin } catch { return '' }
  }).filter(Boolean)
  const autorise = new Set([
    ...configured,
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
  ])
  if (!origin || !autorise.has(origin)) {
    return res.status(403).json({ message: 'Origine de la requête non autorisée.' })
  }
  next()
}

router.use('/auth', verifierConfigurationAuth)

router.post('/auth/register', validerOrigine, limiterInscription, async (req, res, next) => {
  try {
    const body = req.body || {}
    if (!emailValide(body.email)) return res.status(400).json({ message: 'Adresse email invalide.' })
    if (typeof body.password !== 'string' || body.password.length < MOT_DE_PASSE_MIN || body.password.length > 1024) {
      return res.status(400).json({ message: `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.` })
    }
    if (!rolesAutorises.includes(body.role)) return res.status(400).json({ message: 'Le profil sélectionné est invalide.' })
    if (typeof body.nom !== 'string' || !body.nom.trim() || body.nom.length > 120) {
      return res.status(400).json({ message: 'Le nom est obligatoire.' })
    }

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
    const client = clientSupabase()
    const { data, error } = await client.auth.signUp({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      options: { data: metadata },
    })
    if (error) {
      if (/rate limit/i.test(error.message)) {
        return res.status(429).json({ message: 'Trop de tentatives, merci de réessayer dans quelques minutes.' })
      }
      if (/password.*at least|password.*characters/i.test(error.message)) {
        return res.status(400).json({ message: `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.` })
      }
      if (/already registered|already been registered/i.test(error.message)) {
        return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' })
      }
      throw error
    }

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
})

router.post('/auth/login', validerOrigine, limiterConnexion, async (req, res, next) => {
  try {
    const { email, password, remember } = req.body || {}
    if (!emailValide(email) || typeof password !== 'string' || !password || password.length > 1024) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect.' })
    }
    const { data, error } = await clientSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      if (/rate limit/i.test(error.message)) {
        return res.status(429).json({ message: 'Trop de tentatives, merci de réessayer dans quelques minutes.' })
      }
      if (/email not confirmed/i.test(error.message)) {
        return res.status(403).json({
          message: 'Merci de confirmer votre adresse email avant de vous connecter : vérifiez votre boîte mail et vos courriers indésirables.',
        })
      }
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
    }
    const client = clientSupabase()
    const { error: sessionError } = await client.auth.setSession(data.session)
    if (sessionError) throw sessionError
    const user = await chargerProfil(client, data.user)
    const { data: sessionData } = await client.auth.getSession()
    await createSession(data.user.id, sessionData.session || data.session, remember === true, res)
    return res.json({ user: user || profilDepuisUtilisateur(data.user) })
  } catch (error) {
    next(error)
  }
})

router.get('/auth/session', requireAuth, async (req, res, next) => {
  try {
    const user = await chargerProfil(req.supabase, req.authSession.user)
    return res.json({ user: user || profilDepuisUtilisateur(req.authSession.user) })
  } catch (error) {
    next(error)
  }
})

router.post('/auth/logout', validerOrigine, async (req, res, next) => {
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
})

router.post('/auth/forgot-password', validerOrigine, limiterReinitialisation, async (req, res, next) => {
  try {
    const email = req.body?.email
    if (!emailValide(email)) return res.status(400).json({ message: 'Adresse email invalide.' })
    const { error } = await clientSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.SITE_URL || 'http://localhost:5173'}/reinitialiser-mot-de-passe`,
    })
    if (error) throw error
    return res.json({ message: 'Si cette adresse est associée à un compte, un email de réinitialisation a été envoyé.' })
  } catch (error) {
    next(error)
  }
})

router.post('/auth/recovery/verify', validerOrigine, limiterReinitialisation, async (req, res, next) => {
  try {
    const accessToken = req.body?.accessToken
    if (typeof accessToken !== 'string' || accessToken.length > 8192 || !supabaseAdmin) {
      return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou expiré.' })
    }
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error || !data.user) {
      return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou expiré.' })
    }
    return res.json({ valid: true })
  } catch (error) {
    next(error)
  }
})

router.post('/auth/recovery', validerOrigine, limiterReinitialisation, async (req, res, next) => {
  try {
    const { accessToken, password } = req.body || {}
    if (typeof accessToken !== 'string' || accessToken.length > 8192) {
      return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou expiré.' })
    }
    if (typeof password !== 'string' || password.length < MOT_DE_PASSE_MIN || password.length > 1024) {
      return res.status(400).json({ message: `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.` })
    }
    if (!supabaseAdmin) return res.status(503).json({ message: 'La réinitialisation n’est pas configurée.' })
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error || !data.user) return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou expiré.' })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password })
    if (updateError) throw updateError
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
})

router.put('/auth/password', validerOrigine, requireAuth, async (req, res, next) => {
  try {
    const password = req.body?.password
    if (typeof password !== 'string' || password.length < MOT_DE_PASSE_MIN || password.length > 1024) {
      return res.status(400).json({ message: `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.` })
    }
    const { error } = await req.supabase.auth.updateUser({ password })
    if (error) throw error
    await persistSessionTokens(req)
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.use('/admin', requireAuth, (req, res, next) => {
  if (req.authSession.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Accès réservé à l’administrateur.' })
  }
  next()
})

router.delete('/admin/comptes/:id', async (req, res, next) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ message: 'Service d’administration non configuré.' })
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id)
    if (error) return res.status(400).json({ message: 'Impossible de supprimer ce compte.' })
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

router.post('/admin/comptes', async (req, res, next) => {
  try {
    const { nom, email, telephone, ville, role } = req.body || {}
    if (typeof nom !== 'string' || !nom.trim() || nom.length > 120) {
      return res.status(400).json({ message: 'Le nom est obligatoire.' })
    }
    if (!emailValide(email)) {
      return res.status(400).json({ message: 'Un email valide est obligatoire pour créer un compte.' })
    }
    if (!rolesAutorises.includes(role)) return res.status(400).json({ message: 'Le rôle est invalide.' })
    if (!supabaseAdmin) return res.status(503).json({ message: 'Service d’administration non configuré.' })

    const metadata = {
      nom: nom.trim(),
      telephone: typeof telephone === 'string' ? telephone.slice(0, 40) : '',
      ville: typeof ville === 'string' ? ville.slice(0, 100) : '',
      role,
    }
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
})

export default router
