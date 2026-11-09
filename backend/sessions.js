import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseAdmin.js'

const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-dispositif_session' : 'dispositif_session'
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

function encrypt(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

function decrypt(value) {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'))
  if (!iv || !tag || !encrypted) throw new Error('Session chiffrée invalide.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

function hashToken(token) {
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

export async function sessionMiddleware(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return next()
  if (
    !supabaseAdmin ||
    !process.env.SUPABASE_URL ||
    !(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) ||
    !process.env.AUTH_SESSION_SECRET ||
    Buffer.byteLength(process.env.AUTH_SESSION_SECRET) < 32
  ) {
    clearSessionCookie(res)
    return res.status(503).json({ message: 'Authentification serveur non configurée.' })
  }

  try {
    const tokenHash = hashToken(token)
    let { data: row, error } = await supabaseAdmin
      .from('auth_sessions')
      .select('id,user_id,token_hash,tokens_encrypted,remember_me,expires_at,revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    if (error) throw error
    if (!row) {
      const previous = await supabaseAdmin
        .from('auth_sessions')
        .select('id,user_id,token_hash,tokens_encrypted,remember_me,expires_at,revoked_at')
        .eq('previous_token_hash', tokenHash)
        .gt('previous_valid_until', new Date().toISOString())
        .maybeSingle()
      if (previous.error) throw previous.error
      row = previous.data
    }
    if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) {
      clearSessionCookie(res)
      return next()
    }

    const savedTokens = JSON.parse(decrypt(row.tokens_encrypted))
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
    )
    const { data, error: sessionError } = await authClient.auth.setSession(savedTokens)
    if (sessionError && (!sessionError.status || sessionError.status >= 500)) {
      return res.status(503).json({ message: 'Le service d’authentification est temporairement indisponible.' })
    }
    if (sessionError || !data.session) {
      await supabaseAdmin.from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', row.id)
      clearSessionCookie(res)
      return next()
    }

    const { data: authData, error: userError } = await authClient.auth.getUser()
    if (userError && (!userError.status || userError.status >= 500)) {
      return res.status(503).json({ message: 'Le service d’authentification est temporairement indisponible.' })
    }
    if (userError || !authData.user || authData.user.id !== row.user_id) {
      await supabaseAdmin.from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', row.id)
      clearSessionCookie(res)
      return next()
    }

    const updatedTokens = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }
    if (
      updatedTokens.access_token !== savedTokens.access_token ||
      updatedTokens.refresh_token !== savedTokens.refresh_token
    ) {
      const rotatedToken = crypto.randomBytes(32).toString('base64url')
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('auth_sessions')
        .update({
          token_hash: hashToken(rotatedToken),
          previous_token_hash: row.token_hash,
          previous_valid_until: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          tokens_encrypted: encrypt(JSON.stringify(updatedTokens)),
          last_rotated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('token_hash', row.token_hash)
        .is('revoked_at', null)
        .select('id')
      if (updateError) throw updateError
      if (updated?.length) {
        setSessionCookie(res, rotatedToken, row.remember_me, row.expires_at)
      }
    }

    req.authSession = { id: row.id, user: authData.user, remember: row.remember_me }
    req.supabase = authClient
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAuth(req, res, next) {
  if (!req.authSession || !req.supabase) {
    return res.status(401).json({ message: 'Authentification requise.' })
  }
  next()
}
