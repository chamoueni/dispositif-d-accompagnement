// Règles de confidentialité appliquées aux profils renvoyés par l'API.
import { ADMIN_EMAIL } from '../config/constantes.js'

export function isAdmin(req) {
  return req.authSession?.user?.email === ADMIN_EMAIL
}

// --- Vie privée des profils (téléphone, adresse) ----------------------------
// La base laisse tout utilisateur connecté lire tous les profils (nécessaire à
// la recherche). Le téléphone et l'adresse d'une personne ne sont pourtant pas
// à donner à n'importe qui : le serveur ne les renvoie qu'à elle-même, à
// l'administrateur, et aux personnes avec qui elle a une demande ACCEPTÉE ou
// TERMINÉE (une vraie mise en relation). Le navigateur n'ayant pas de jeton
// Supabase (voir services/session.service.js), il ne peut pas contourner ce filtre.
const STATUTS_EN_RELATION = ['acceptee', 'terminee']

// Identifiants des personnes en relation avec l'utilisateur connecté.
export async function contactsAutorises(client, req) {
  const moi = req.authSession.user.id
  const { data, error } = await client
    .from('demandes')
    .select('demandeur_id, aidant_id, statut')
    .or(`demandeur_id.eq.${moi},aidant_id.eq.${moi}`)
    .in('statut', STATUTS_EN_RELATION)
  if (error) throw error
  const contacts = new Set()
  for (const d of data || []) contacts.add(d.demandeur_id === moi ? d.aidant_id : d.demandeur_id)
  return contacts
}

export function masquerCoordonnees(profil, req, contacts) {
  const autorise = isAdmin(req) || profil.id === req.authSession.user.id || contacts.has(profil.id)
  if (autorise) return profil
  // contact_masque : le front affiche « Numéro après acceptation » (ProviderCard.vue).
  return { ...profil, telephone: '', adresse: '', contact_masque: true }
}

// --- Comptes de démonstration -------------------------------------------------
// Les comptes dont le nom contient « (démo) » servent aux tests du propriétaire
// du site. Ils n'apparaissent dans la recherche et sur la carte que pour
// l'administrateur et pour les autres comptes de démo (qui peuvent ainsi
// toujours tester une mise en relation entre eux), jamais pour les vrais
// utilisateurs.
const estDemo = (profil) => /\(démo\)/i.test(profil?.nom || '')

export function visibleDansLaListe(profil, moi, req) {
  if (!estDemo(profil)) return true
  return isAdmin(req) || estDemo(moi) || profil.id === req.authSession.user.id
}
