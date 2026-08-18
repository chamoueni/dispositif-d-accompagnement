// Client Supabase partagé par toute l'app (auth.js et store.js l'importent tous
// les deux). Les clés viennent des variables d'environnement VITE_* (voir
// .env.example) : jamais en dur dans le code, même si la clé "anon" est conçue
// pour être publique (elle est limitée par les policies RLS côté Supabase).
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Erreur explicite plutôt qu'un plantage obscur plus loin dans l'app si le
  // fichier .env n'a pas été créé (voir .env.example).
  console.error(
    "Supabase n'est pas configuré : crée un fichier .env à partir de .env.example " +
      'avec l’URL et la clé "anon" de ton projet Supabase.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
