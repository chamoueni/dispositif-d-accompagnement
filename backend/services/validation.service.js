// Contrôle des données reçues par l'API. Une donnée refusée ici donne une
// réponse 400 dans le contrôleur, avant tout accès à la base.
import { ROLES_AUTORISES, STATUTS_ADHERENT } from '../config/constantes.js'

export function emailValide(email) {
  return typeof email === 'string' && email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function jsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Champs d'un profil qu'une modification a le droit de changer.
const PROFIL_FIELDS = [
  'nom', 'telephone', 'ville', 'adresse', 'role', 'specialite', 'services',
  'bio', 'disponibilites', 'abonnement', 'actif',
]

// Garde uniquement les champs autorisés et vérifie leur format.
// Renvoie null si une valeur est invalide.
export function patchProfil(value) {
  if (!jsonObject(value)) return null
  const patch = Object.fromEntries(Object.entries(value).filter(([key]) => PROFIL_FIELDS.includes(key)))
  if (patch.role && !ROLES_AUTORISES.includes(patch.role)) return null
  if (patch.nom !== undefined && (typeof patch.nom !== 'string' || patch.nom.length > 120)) return null
  if (patch.telephone !== undefined && (typeof patch.telephone !== 'string' || patch.telephone.length > 40)) return null
  if (patch.ville !== undefined && (typeof patch.ville !== 'string' || patch.ville.length > 100)) return null
  if (patch.adresse !== undefined && (typeof patch.adresse !== 'string' || patch.adresse.length > 300)) return null
  if (patch.bio !== undefined && (typeof patch.bio !== 'string' || patch.bio.length > 2000)) return null
  if (patch.services !== undefined &&
      (!Array.isArray(patch.services) || patch.services.length > 30 ||
       patch.services.some((item) => typeof item !== 'string' || item.length > 100))) return null
  if (patch.disponibilites !== undefined &&
      (!Array.isArray(patch.disponibilites) || patch.disponibilites.length > 100)) return null
  return patch
}

// Formulaire « adhérent » de l'espace admin. Renvoie le message d'erreur, ou null.
export function validerAdherent(body) {
  if (!body.nom?.trim()) return 'Le nom est obligatoire.'
  if (!body.email?.trim() || !body.email.includes('@')) return 'Un email valide est obligatoire.'
  if (!ROLES_AUTORISES.includes(body.role || 'particulier')) return 'Le rôle est invalide.'
  if (!STATUTS_ADHERENT.includes(body.statut || 'actif')) return 'Le statut est invalide.'
  return null
}
