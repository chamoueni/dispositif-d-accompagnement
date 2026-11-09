import crypto from 'node:crypto'
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'
const rolesAutorises = ['senior', 'sante', 'particulier']
const statutsDemande = ['en_attente', 'acceptee', 'refusee', 'terminee', 'annulee']
const statutsMission = ['en_cours', 'terminee', 'annulee']
const profilFields = [
  'nom', 'telephone', 'ville', 'adresse', 'role', 'specialite', 'services',
  'bio', 'disponibilites', 'abonnement', 'actif',
]

function isAdmin(req) {
  return req.authSession?.user?.email === ADMIN_EMAIL
}

function clientAnonyme() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase côté serveur n’est pas configuré.')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
}

// --- Vie privée des profils (téléphone, adresse) ----------------------------
// La base laisse tout utilisateur connecté lire tous les profils (nécessaire à
// la recherche). Le téléphone et l'adresse d'une personne ne sont pourtant pas
// à donner à n'importe qui : le serveur ne les renvoie qu'à elle-même, à
// l'administrateur, et aux personnes avec qui elle a une demande ACCEPTÉE ou
// TERMINÉE (une vraie mise en relation). Le navigateur n'ayant plus de jeton
// Supabase (voir sessions.js), il ne peut pas contourner ce filtre.
const STATUTS_EN_RELATION = ['acceptee', 'terminee']

// Identifiants des personnes en relation avec l'utilisateur connecté.
async function contactsAutorises(client, req) {
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

function masquerCoordonnees(profil, req, contacts) {
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

function visibleDansLaListe(profil, moi, req) {
  if (!estDemo(profil)) return true
  return isAdmin(req) || estDemo(moi) || profil.id === req.authSession.user.id
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function jsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function patchProfil(value) {
  if (!jsonObject(value)) return null
  const patch = Object.fromEntries(Object.entries(value).filter(([key]) => profilFields.includes(key)))
  if (patch.role && !rolesAutorises.includes(patch.role)) return null
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

router.post('/data', async (req, res, next) => {
  try {
    const { action, payload = {} } = req.body || {}
    if (!jsonObject(payload)) return res.status(400).json({ message: 'Données invalides.' })

    if (action === 'avis.list') {
      const { data, error } = await clientAnonyme().from('avis').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return res.json(data)
    }

    if (action === 'contact.create') {
      if (typeof payload.nom !== 'string' || payload.nom.length > 120 ||
          typeof payload.message !== 'string' || !payload.message.trim() || payload.message.length > 3000) {
        return res.status(400).json({ message: 'Le nom ou le message est invalide.' })
      }
      const client = req.supabase || clientAnonyme()
      const { error } = await client.from('messages_contact').insert({
        user_id: req.authSession?.user.id || null,
        nom: payload.nom.trim(),
        message: payload.message.trim(),
      })
      if (error) throw error
      return res.status(201).json({ ok: true })
    }

    if (!req.authSession || !req.supabase) {
      return res.status(401).json({ message: 'Authentification requise.' })
    }
    const client = req.supabase

    switch (action) {
      case 'profiles.list': {
        const { data, error } = await client.from('profiles').select('*')
        if (error) throw error
        const contacts = await contactsAutorises(client, req)
        const moi = data.find((p) => p.id === req.authSession.user.id)
        return res.json(
          data
            .filter((p) => visibleDansLaListe(p, moi, req))
            .map((p) => masquerCoordonnees(p, req, contacts)),
        )
      }
      case 'profiles.find': {
        if (!isUuid(payload.id)) return res.status(400).json({ message: 'Identifiant invalide.' })
        const { data, error } = await client.from('profiles').select('*').eq('id', payload.id).maybeSingle()
        if (error) throw error
        if (!data) return res.status(404).json({ message: 'Profil introuvable.' })
        return res.json(masquerCoordonnees(data, req, await contactsAutorises(client, req)))
      }
      case 'profiles.updateOwn':
      case 'profiles.updateAdmin': {
        if (action === 'profiles.updateAdmin' && !isAdmin(req)) {
          return res.status(403).json({ message: 'Accès réservé à l’administrateur.' })
        }
        const id = action === 'profiles.updateOwn' ? req.authSession.user.id : payload.id
        const patch = patchProfil(payload.patch)
        if (!isUuid(id) || !patch || Object.keys(patch).length === 0) {
          return res.status(400).json({ message: 'Profil ou champs de modification invalides.' })
        }
        const { data, error } = await client.from('profiles').update(patch).eq('id', id).select('id')
        if (error) throw error
        if (!data?.length) return res.status(403).json({ message: 'Modification refusée.' })
        return res.json(data[0])
      }
      case 'demandes.list': {
        const { data, error } = await client.from('demandes').select('*')
        if (error) throw error
        return res.json(data)
      }
      case 'demandes.byDemandeur':
      case 'demandes.byAidant': {
        const column = action === 'demandes.byDemandeur' ? 'demandeur_id' : 'aidant_id'
        if (!isUuid(payload.id)) return res.status(400).json({ message: 'Identifiant invalide.' })
        const { data, error } = await client.from('demandes').select('*').eq(column, payload.id)
        if (error) throw error
        return res.json(data)
      }
      case 'demandes.create': {
        const body = payload.demande
        if (!jsonObject(body) || !isUuid(body.aidantId) ||
            typeof body.typeService !== 'string' || !body.typeService.trim() || body.typeService.length > 100 ||
            typeof body.message !== 'string' || body.message.length > 3000 ||
            (body.urgence !== undefined && !['normale', 'urgente'].includes(body.urgence))) {
          return res.status(400).json({ message: 'Les informations de la demande sont invalides.' })
        }
        const { data, error } = await client.from('demandes').insert({
          demandeur_id: req.authSession.user.id,
          aidant_id: body.aidantId,
          type_service: body.typeService.trim(),
          urgence: body.urgence || 'normale',
          message: body.message,
          creneau_souhaite: body.creneauSouhaite ?? null,
        }).select().single()
        if (error) throw error
        return res.status(201).json(data)
      }
      case 'demandes.updateStatut': {
        const { id, statut } = payload
        if (!isUuid(id) || !statutsDemande.includes(statut)) {
          return res.status(400).json({ message: 'Identifiant ou statut invalide.' })
        }
        const patch = { statut, date_mise_a_jour: new Date().toISOString() }
        if (statut === 'acceptee') {
          const { data: current, error: readError } = await client
            .from('demandes').select('code_arrivee').eq('id', id).single()
          if (readError && !/code_arrivee/i.test(readError.message)) throw readError
          if (!readError && !current.code_arrivee) {
            patch.code_arrivee = String(crypto.randomInt(10000)).padStart(4, '0')
          }
        }
        const { data, error } = await client.from('demandes').update(patch).eq('id', id).select().single()
        if (error) throw error
        if (statut === 'acceptee') {
          const { data: existing, error: existingError } = await client
            .from('mises_en_relation').select('id').eq('demande_id', id).maybeSingle()
          if (existingError) throw existingError
          if (!existing) {
            const { error: insertError } = await client.from('mises_en_relation').insert({
              demande_id: id,
              demandeur_id: data.demandeur_id,
              aidant_id: data.aidant_id,
            })
            if (insertError) throw insertError
          }
        }
        return res.json(data)
      }
      case 'missions.list': {
        const { data, error } = await client.from('mises_en_relation').select('*')
        if (error) throw error
        return res.json(data)
      }
      case 'missions.byDemande': {
        if (!isUuid(payload.demandeId)) return res.status(400).json({ message: 'Identifiant invalide.' })
        const { data, error } = await client
          .from('mises_en_relation').select('*').eq('demande_id', payload.demandeId).maybeSingle()
        if (error) throw error
        return res.json(data)
      }
      case 'missions.create': {
        const { demandeId, demandeurId, aidantId } = payload.mission || {}
        if (![demandeId, demandeurId, aidantId].every(isUuid)) {
          return res.status(400).json({ message: 'Informations de mise en relation invalides.' })
        }
        const { data, error } = await client.from('mises_en_relation').insert({
          demande_id: demandeId, demandeur_id: demandeurId, aidant_id: aidantId,
        }).select().single()
        if (error) throw error
        return res.status(201).json(data)
      }
      case 'missions.updateStatut': {
        if (!isUuid(payload.id) || !statutsMission.includes(payload.statutMission)) {
          return res.status(400).json({ message: 'Identifiant ou statut invalide.' })
        }
        const { data, error } = await client.from('mises_en_relation')
          .update({
            statut_mission: payload.statutMission,
            date_fin: payload.statutMission === 'en_cours' ? null : new Date().toISOString(),
          })
          .eq('id', payload.id).select().single()
        if (error) throw error
        return res.json(data)
      }
      case 'messages.list': {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Accès réservé à l’administrateur.' })
        const { data, error } = await client.from('messages_contact').select('*').order('created_at', { ascending: false })
        if (error) throw error
        return res.json(data)
      }
      case 'messages.markRead': {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Accès réservé à l’administrateur.' })
        if (!isUuid(payload.id)) return res.status(400).json({ message: 'Identifiant invalide.' })
        const { error } = await client.from('messages_contact').update({ lu: true }).eq('id', payload.id)
        if (error) throw error
        return res.json({ ok: true })
      }
      case 'messages.delete': {
        if (!isAdmin(req)) return res.status(403).json({ message: 'Accès réservé à l’administrateur.' })
        if (!isUuid(payload.id)) return res.status(400).json({ message: 'Identifiant invalide.' })
        const { data, error } = await client.from('messages_contact').delete().eq('id', payload.id).select('id')
        if (error) throw error
        if (!data?.length) return res.status(403).json({ message: 'Suppression refusée.' })
        return res.json({ ok: true })
      }
      case 'avis.create': {
        if (typeof payload.texte !== 'string' || !payload.texte.trim() || payload.texte.length > 2000) {
          return res.status(400).json({ message: 'Le texte de l’avis est invalide.' })
        }
        const { data: profile, error: profileError } = await client
          .from('profiles').select('nom').eq('id', req.authSession.user.id).maybeSingle()
        if (profileError) throw profileError
        const { error } = await client.from('avis').insert({
          user_id: req.authSession.user.id,
          nom: profile?.nom || '',
          texte: payload.texte.trim(),
        })
        if (error) throw error
        return res.status(201).json({ ok: true })
      }
      case 'avis.delete': {
        if (!isUuid(payload.id)) return res.status(400).json({ message: 'Identifiant invalide.' })
        const { data, error } = await client.from('avis').delete().eq('id', payload.id).select('id')
        if (error) throw error
        if (!data?.length) return res.status(403).json({ message: 'Suppression refusée.' })
        return res.json({ ok: true })
      }
      default:
        return res.status(404).json({ message: 'Opération inconnue.' })
    }
  } catch (error) {
    next(error)
  }
})

export default router
