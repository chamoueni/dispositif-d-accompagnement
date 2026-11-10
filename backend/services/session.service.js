// Sessions de connexion côté serveur.
//
// Le navigateur ne reçoit qu'un cookie httpOnly contenant un jeton aléatoire.
// Les jetons Supabase de l'utilisateur restent sur le serveur, chiffrés
// (AES-256-GCM) dans la table auth_sessions ; on n'y stocke que l'empreinte
// (hash) du jeton du cookie, jamais le jeton lui-même.
import crypto from 'node:crypto'
import { supabaseAdmin } from '../config/supabase.js'

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-dispositif_session' : 'dispositif_session'
const rememberDays = Number(process.env.AUTH_REMEMBER_DAYS)
const sessionHours = Number(process.env.AUTH_SESSION_HOURS)
const SESSION_DAYS = Number.isInteger(rememberDays) ? Math.min(365, Math.max(1, rememberDays)) : 30
const TEMP_SESSION_HOURS = Number.isInteger(sessionHours) ? Math.min(24, Math.max(1, sessionHours)) : 12
const configuredSameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase()
const sameSite = ['lax', 'strict', 'none'].includes(configuredSameSite) ? configuredSameSite : 'lax'
const cookieSecure = process.env.NODE_ENV === 'production' || sameSite === 'none'

function encryptionKey() {
  const secret = process.env.AUTH_SESSION_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_SESSION_SECRET doit contenir au moins 32 octets.')
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

export function decrypt(value) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'))
  if (!iv || !tag || !encrypted) throw new Error('Session chiffrée invalide.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function cookieOptions(remember, expiresAt, req) {
  const options = {
    httpOnly: true,
    secure: cookieSecure || req?.secure === true,
    sameSite,
    path: '/',
  }
  if (remember) options.expires = new Date(expiresAt)
  return options
}

export function setSessionCookie(res, token, remember, expiresAt) {
  res.cookie(SESSION_COOKIE, token, cookieOptions(remember, expiresAt, res.req))
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(false, undefined, res.req))
}

// Vrai si tout ce qu'il faut pour gérer les sessions est configuré.
export function sessionsConfigurees() {
  return !!supabaseAdmin &&
    !!process.env.SUPABASE_URL &&
    !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) &&
    !!process.env.AUTH_SESSION_SECRET &&
    Buffer.byteLength(process.env.AUTH_SESSION_SECRET) >= 32
}

// Après une connexion réussie : enregistre la session et pose le cookie.
// remember = « Se souvenir de moi » (30 jours au lieu de 12 heures).
export async function createSession(userId, session, remember, res) {
  if (!supabaseAdmin) throw new Error('Supabase côté serveur n’est pas configuré.')
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(
    Date.now() + (remember ? SESSION_DAYS * 24 : TEMP_SESSION_HOURS) * 60 * 60 * 1000,
  ).toISOString()
  const { error } = await supabaseAdmin.from('auth_sessions').insert({
    token_hash: hashToken(token),
    user_id: userId,
    tokens_encrypted: encrypt(JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })),
    remember_me: remember,
    expires_at: expiresAt,
  })
  if (error) throw error
  setSessionCookie(res, token, remember, expiresAt)
}

// Déconnexion : marque la session du cookie comme révoquée.
export async function revokeSession(req) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token || !supabaseAdmin) return
  const tokenHash = hashToken(token)
  let { data: row, error } = await supabaseAdmin
    .from('auth_sessions')
    .select('id')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!row && !error) {
    const now = new Date().toISOString()
    const previous = await supabaseAdmin
      .from('auth_sessions')
      .select('id')
      .eq('previous_token_hash', tokenHash)
      .gt('previous_valid_until', now)
      .maybeSingle()
    row = previous.data
    error = previous.error
  }
  if (error || !row) {
    if (error) throw error
    return
  }
  const { error: revokeError } = await supabaseAdmin
    .from('auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('revoked_at', null)
  if (revokeError) throw revokeError
}

// Après un changement de mot de passe : Supabase délivre de nouveaux jetons,
// on les enregistre à la place des anciens.
export async function persistSessionTokens(req) {
  if (!req.authSession || !req.supabase || !supabaseAdmin) return
  const { data, error } = await req.supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Session Supabase introuvable.')
  const { error: updateError } = await supabaseAdmin
    .from('auth_sessions')
    .update({
      tokens_encrypted: encrypt(JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })),
    })
    .eq('id', req.authSession.id)
    .is('revoked_at', null)
  if (updateError) throw updateError
}
