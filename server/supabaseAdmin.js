// Client Supabase "service role" partagé par le serveur : contourne la RLS,
// donc jamais exposé au front (voir SUPABASE_SERVICE_ROLE_KEY dans .env.example,
// server-only). Utilisé pour la synchro adhérents (supabaseSync.js) et pour la
// suppression complète d'un compte (auth + profil) depuis l'espace admin.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null
