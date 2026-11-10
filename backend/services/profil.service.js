// Profil de l'utilisateur connecté (table profiles).
import { ROLES_AUTORISES } from '../config/constantes.js'

// Profil de secours construit à partir des informations du compte, quand la
// table profiles n'a pas (encore) de ligne pour cet utilisateur.
export function profilDepuisUtilisateur(user) {
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

// Lit le profil ; s'il n'existe pas encore (compte confirmé par e-mail après
// l'inscription), le crée à partir des informations saisies à l'inscription.
export async function chargerProfil(client, user) {
  const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  if (data) return { ...data, email: user.email }

  const metadata = user.user_metadata || {}
  if (!ROLES_AUTORISES.includes(metadata.role)) return null
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
