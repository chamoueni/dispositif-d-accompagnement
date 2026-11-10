// Middlewares de session :
// - sessionMiddleware retrouve l'utilisateur connecté grâce au cookie et place
//   dans la requête req.authSession (qui est connecté) et req.supabase (un
//   client Supabase qui agit au nom de cet utilisateur, donc soumis à la RLS) ;
// - requireAuth refuse la requête (401) si personne n'est connecté.
import crypto from 'node:crypto'
import { clientAnonyme, supabaseAdmin } from '../config/supabase.js'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  decrypt,
  encrypt,
  hashToken,
  sessionsConfigurees,
  setSessionCookie,
} from '../services/session.service.js'

const COLONNES = 'id,user_id,token_hash,tokens_encrypted,remember_me,expires_at,revoked_at'

export async function sessionMiddleware(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return next()
  if (!sessionsConfigurees()) {
    clearSessionCookie(res)
    return res.status(503).json({ message: 'Authentification serveur non configurée.' })
  }

  try {
    // 1. Retrouver la session à partir de l'empreinte du jeton du cookie.
    //    Le jeton précédent reste accepté 2 minutes après un renouvellement,
    //    le temps que les requêtes déjà parties arrivent.
    const tokenHash = hashToken(token)
    let { data: row, error } = await supabaseAdmin
      .from('auth_sessions').select(COLONNES).eq('token_hash', tokenHash).maybeSingle()
    if (error) throw error
    if (!row) {
      const previous = await supabaseAdmin
        .from('auth_sessions').select(COLONNES)
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

    // 2. Rouvrir la session Supabase avec les jetons déchiffrés.
    const savedTokens = JSON.parse(decrypt(row.tokens_encrypted))
    const authClient = clientAnonyme()
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

    // 3. Vérifier que le compte existe toujours et correspond à la session.
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

    // 4. Si Supabase a renouvelé les jetons, on les enregistre et on change
    //    aussi le jeton du cookie (rotation).
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
