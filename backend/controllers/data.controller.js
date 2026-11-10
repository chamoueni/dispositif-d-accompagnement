// Contrôleur des données métier : POST /api/data { action, payload }.
// Une seule adresse, une « action » par opération (profils, demandes,
// missions, messages, avis). Chaque action contrôle ses données, puis
// interroge PostgreSQL avec le client de l'utilisateur connecté (req.supabase) :
// la base applique alors ses règles RLS à cet utilisateur.
import { STATUTS_DEMANDE, STATUTS_MISSION } from '../config/constantes.js'
import { clientAnonyme } from '../config/supabase.js'
import {
  contactsAutorises,
  isAdmin,
  masquerCoordonnees,
  visibleDansLaListe,
} from '../services/confidentialite.service.js'
import { changerStatutDemande } from '../services/demande.service.js'
import { isUuid, jsonObject, patchProfil } from '../services/validation.service.js'

const ADMIN_SEULEMENT = { message: 'Accès réservé à l’administrateur.' }
const ID_INVALIDE = { message: 'Identifiant invalide.' }

export async function traiterAction(req, res, next) {
  try {
    const { action, payload = {} } = req.body || {}
    if (!jsonObject(payload)) return res.status(400).json({ message: 'Données invalides.' })

    // --- Actions publiques (sans connexion) -----------------------------------
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

    // --- Toutes les autres actions demandent d'être connecté ------------------
    if (!req.authSession || !req.supabase) {
      return res.status(401).json({ message: 'Authentification requise.' })
    }
    const client = req.supabase

    switch (action) {
      // Profils
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
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        const { data, error } = await client.from('profiles').select('*').eq('id', payload.id).maybeSingle()
        if (error) throw error
        if (!data) return res.status(404).json({ message: 'Profil introuvable.' })
        return res.json(masquerCoordonnees(data, req, await contactsAutorises(client, req)))
      }
      case 'profiles.updateOwn':
      case 'profiles.updateAdmin': {
        if (action === 'profiles.updateAdmin' && !isAdmin(req)) return res.status(403).json(ADMIN_SEULEMENT)
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

      // Demandes d'aide
      case 'demandes.list': {
        const { data, error } = await client.from('demandes').select('*')
        if (error) throw error
        return res.json(data)
      }
      case 'demandes.byDemandeur':
      case 'demandes.byAidant': {
        const column = action === 'demandes.byDemandeur' ? 'demandeur_id' : 'aidant_id'
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
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
        if (!isUuid(id) || !STATUTS_DEMANDE.includes(statut)) {
          return res.status(400).json({ message: 'Identifiant ou statut invalide.' })
        }
        return res.json(await changerStatutDemande(client, id, statut))
      }

      // Missions (mises en relation)
      case 'missions.list': {
        const { data, error } = await client.from('mises_en_relation').select('*')
        if (error) throw error
        return res.json(data)
      }
      case 'missions.byDemande': {
        if (!isUuid(payload.demandeId)) return res.status(400).json(ID_INVALIDE)
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
        if (!isUuid(payload.id) || !STATUTS_MISSION.includes(payload.statutMission)) {
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

      // Messages envoyés depuis le bouton SOS (administrateur seulement)
      case 'messages.list': {
        if (!isAdmin(req)) return res.status(403).json(ADMIN_SEULEMENT)
        const { data, error } = await client.from('messages_contact').select('*').order('created_at', { ascending: false })
        if (error) throw error
        return res.json(data)
      }
      case 'messages.markRead': {
        if (!isAdmin(req)) return res.status(403).json(ADMIN_SEULEMENT)
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        const { error } = await client.from('messages_contact').update({ lu: true }).eq('id', payload.id)
        if (error) throw error
        return res.json({ ok: true })
      }
      case 'messages.delete': {
        if (!isAdmin(req)) return res.status(403).json(ADMIN_SEULEMENT)
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        const { data, error } = await client.from('messages_contact').delete().eq('id', payload.id).select('id')
        if (error) throw error
        if (!data?.length) return res.status(403).json({ message: 'Suppression refusée.' })
        return res.json({ ok: true })
      }

      // Avis
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
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
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
}
