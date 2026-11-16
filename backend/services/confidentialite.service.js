// Règles de confidentialité appliquées aux profils renvoyés par l'API (RGPD).
// Avant, une partie de ces règles était dans la base (RLS Supabase) ; elles
// sont maintenant toutes ici, dans le serveur, seul à parler à la base.
import { demandesEnRelation } from '../models/demande.model.js'

// L'administrateur est reconnu par la colonne utilisateurs.est_admin
// (chargée par middleware/session.js), plus par un email écrit en dur.
export function isAdmin(req) {
  return req.utilisateur?.estAdmin === true
}

// --- Vie privée des profils (téléphone, adresse) ----------------------------
// Tout utilisateur connecté peut lister les profils (nécessaire à la
// recherche). Le téléphone et l'adresse d'une personne ne sont pourtant pas
// à donner à n'importe qui : le serveur ne les renvoie qu'à elle-même, à
// l'administrateur, et aux personnes avec qui elle a une demande ACCEPTÉE ou
// TERMINÉE (une vraie mise en relation).

// Identifiants des personnes en relation avec l'utilisateur connecté.
export async function contactsAutorises(req) {
  const moi = req.utilisateur.id
  const contacts = new Set()
  for (const d of await demandesEnRelation(moi)) {
    contacts.add(d.demandeur_id === moi ? d.aidant_id : d.demandeur_id)
  }
  return contacts
}

export function masquerCoordonnees(profil, req, contacts) {
  const autorise = isAdmin(req) || profil.id === req.utilisateur.id || contacts.has(profil.id)
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

// --- Validation des profils par l'administrateur (F08 / BF16) ---------------
// Un personnel de santé ou un particulier n'apparaît dans la recherche et sur
// la carte qu'une fois son profil vérifié par l'administrateur (colonne verifie).
const ROLES_INTERVENANT = ['sante', 'particulier']

export function enAttenteDeValidation(profil) {
  return ROLES_INTERVENANT.includes(profil?.role) && profil?.verifie === false
}

export function visibleDansLaListe(profil, moi, req) {
  // Soi-même et l'administrateur voient toujours le profil.
  if (isAdmin(req) || profil.id === req.utilisateur.id) return true
  if (enAttenteDeValidation(profil)) return false
  if (!estDemo(profil)) return true
  return estDemo(moi)
}
