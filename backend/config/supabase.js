// Connexion à Supabase (base PostgreSQL + comptes). Deux sortes de clients :
//
// - supabaseAdmin : clé "service role", qui contourne la RLS. Jamais exposée
//   au front (SUPABASE_SERVICE_ROLE_KEY, voir .env.example). Sert aux sessions,
//   aux actions de l'administrateur et à la copie des adhérents.
// - clientAnonyme() : clé publique. Un nouveau client à chaque appel, auquel le
//   serveur donne ensuite la session de l'utilisateur connecté : la base
//   applique alors ses règles RLS à cet utilisateur.
import './env.js'
import { createClient } from '@supabase/supabase-js'

// Le serveur ne garde rien en mémoire entre deux requêtes : les jetons sont
// stockés chiffrés dans la table auth_sessions (voir services/session.service.js).
const OPTIONS = { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } }

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = url && serviceRoleKey ? createClient(url, serviceRoleKey, OPTIONS) : null

export function cleAnonyme() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
}

export function clientAnonyme() {
  const cle = cleAnonyme()
  if (!process.env.SUPABASE_URL || !cle) throw new Error('Supabase côté serveur n’est pas configuré.')
  return createClient(process.env.SUPABASE_URL, cle, OPTIONS)
}
