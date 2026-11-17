// Contrôleur des données métier : POST /api/data { action, payload }.
// Une seule adresse, une « action » par opération (profils, demandes,
// missions, messages, avis).
//
// SÉCURITÉ (remplace les règles RLS de Supabase) : chaque action vérifie
// elle-même qui a le droit de faire quoi AVANT de toucher à la base :
// - une demande ou une mission n'est visible et modifiable que par ses deux
//   participants (demandeur et intervenant) ; l'administrateur voit tout ;
// - on ne modifie que son propre profil (sauf l'administrateur) ;
// - un avis s'écrit à son nom, et ne se supprime que par son auteur ou l'admin ;
// - les messages SOS ne sont lisibles que par l'administrateur ;
// - téléphone et adresse sont masqués tant qu'il n'y a pas de mise en relation
//   (services/confidentialite.service.js).
// L'identité vient TOUJOURS de req.utilisateur (jeton vérifié par le serveur),
// jamais d'un identifiant envoyé par le navigateur.
import { STATUTS_DEMANDE, STATUTS_MISSION } from '../config/constantes.js'
import { transactionAdmin } from '../db.js'
import { creerAvis, listerAvis, supprimerAvis, trouverAvis } from '../models/avis.model.js'
import { creerDemande, listerDemandes, trouverDemande } from '../models/demande.model.js'
import { creerMessage, listerMessages, marquerLu, supprimerMessage } from '../models/message.model.js'
import {
  creerMission,
  listerMissions,
  modifierStatutMission,
  trouverMission,
} from '../models/mission.model.js'
import { listerProfils, modifierProfil, trouverProfil } from '../models/profil.model.js'
import {
  contactsAutorises,
  isAdmin,
  masquerCoordonnees,
  visibleDansLaListe,
} from '../services/confidentialite.service.js'
import { RefusMetier, changerStatutDemande } from '../services/demande.service.js'
import { alerterNouveauMessage } from '../services/email.service.js'
import { isUuid, jsonObject, patchProfil } from '../services/validation.service.js'

const ADMIN_SEULEMENT = { message: 'Accès réservé à l’administrateur.' }
const ID_INVALIDE = { message: 'Identifiant invalide.' }
const DEMANDE_INTROUVABLE = { message: 'Demande introuvable.' }
const MISSION_INTROUVABLE = { message: 'Mission introuvable.' }

// La personne connectée participe-t-elle à cette demande / mission ?
const participe = (ligne, moi) => ligne.demandeur_id === moi || ligne.aidant_id === moi

export async function traiterAction(req, res, next) {
  try {
    const { action, payload = {} } = req.body || {}
    if (!jsonObject(payload)) return res.status(400).json({ message: 'Données invalides.' })

    // --- Actions publiques (sans connexion) -----------------------------------
    if (action === 'avis.list') {
      return res.json(await listerAvis())
    }

    if (action === 'contact.create') {
      if (typeof payload.nom !== 'string' || payload.nom.length > 120 ||
          typeof payload.message !== 'string' || !payload.message.trim() || payload.message.length > 3000) {
        return res.status(400).json({ message: 'Le nom ou le message est invalide.' })
      }
      const message = {
        userId: req.utilisateur?.id || null,
        nom: payload.nom.trim(),
        message: payload.message.trim(),
      }
      await creerMessage(message)
      // Alerte email à l'administrateur : un échec d'envoi ne doit pas faire
      // échouer l'enregistrement du message (déjà en base).
      alerterNouveauMessage(message).catch((error) => {
        console.error('Alerte email du message SOS impossible :', error.message)
      })
      return res.status(201).json({ ok: true })
    }

    // --- Toutes les autres actions demandent d'être connecté ------------------
    if (!req.utilisateur) {
      return res.status(401).json({ message: 'Authentification requise.' })
    }
    const moi = req.utilisateur.id
    const admin = isAdmin(req)

    switch (action) {
      // Profils
      case 'profiles.list': {
        const profils = await listerProfils()
        const contacts = await contactsAutorises(req)
        const monProfil = profils.find((p) => p.id === moi)
        return res.json(
          profils
            .filter((p) => visibleDansLaListe(p, monProfil, req))
            .map((p) => masquerCoordonnees(p, req, contacts)),
        )
      }
      case 'profiles.find': {
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        const profil = await trouverProfil(payload.id)
        if (!profil) return res.status(404).json({ message: 'Profil introuvable.' })
        return res.json(masquerCoordonnees(profil, req, await contactsAutorises(req)))
      }
      case 'profiles.updateOwn':
      case 'profiles.updateAdmin': {
        const parAdmin = action === 'profiles.updateAdmin'
        if (parAdmin && !admin) return res.status(403).json(ADMIN_SEULEMENT)
        // updateOwn : l'id est celui du jeton, jamais celui envoyé par le navigateur.
        const id = parAdmin ? payload.id : moi
        const patch = patchProfil(payload.patch, { admin: parAdmin })
        if (!isUuid(id) || !patch || Object.keys(patch).length === 0) {
          return res.status(400).json({ message: 'Profil ou champs de modification invalides.' })
        }
        try {
          // Pour l'admin, transaction « admin » : le déclencheur de la base
          // accepte alors la modification du champ « verifie ».
          const profil = parAdmin
            ? await transactionAdmin((client) => modifierProfil(id, patch, client))
            : await modifierProfil(id, patch)
          if (!profil) return res.status(404).json({ message: 'Profil introuvable.' })
          return res.json({ id: profil.id })
        } catch (error) {
          if (error?.code === '23505' && error.constraint === 'profiles_telephone_unique') {
            return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.' })
          }
          throw error
        }
      }

      // Demandes d'aide
      case 'demandes.list': {
        // L'administrateur voit tout ; les autres, seulement leurs demandes.
        return res.json(await listerDemandes(admin ? {} : { participant: moi }))
      }
      case 'demandes.byDemandeur':
      case 'demandes.byAidant': {
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        const filtre = action === 'demandes.byDemandeur' ? { demandeur: payload.id } : { aidant: payload.id }
        // Même avec l'id de quelqu'un d'autre, on ne reçoit que les demandes
        // auxquelles on participe soi-même.
        return res.json(await listerDemandes(admin ? filtre : { ...filtre, participant: moi }))
      }
      case 'demandes.create': {
        const body = payload.demande
        if (!jsonObject(body) || !isUuid(body.aidantId) ||
            typeof body.typeService !== 'string' || !body.typeService.trim() || body.typeService.length > 100 ||
            typeof body.message !== 'string' || body.message.length > 3000 ||
            (body.urgence !== undefined && !['normale', 'urgente'].includes(body.urgence))) {
          return res.status(400).json({ message: 'Les informations de la demande sont invalides.' })
        }
        // Une demande s'adresse à un intervenant qui existe (personnel de santé
        // ou particulier), jamais à soi-même ni à une autre personne âgée.
        const aidant = await trouverProfil(body.aidantId)
        if (!aidant || !['sante', 'particulier'].includes(aidant.role) || aidant.id === moi) {
          return res.status(404).json({ message: 'Intervenant introuvable.' })
        }
        const demande = await creerDemande({
          demandeurId: moi, // toujours la personne connectée
          aidantId: body.aidantId,
          typeService: body.typeService.trim(),
          urgence: body.urgence || 'normale',
          message: body.message,
          creneauSouhaite: body.creneauSouhaite ?? null,
        })
        return res.status(201).json(demande)
      }
      case 'demandes.updateStatut': {
        const { id, statut } = payload
        if (!isUuid(id) || !STATUTS_DEMANDE.includes(statut)) {
          return res.status(400).json({ message: 'Identifiant ou statut invalide.' })
        }
        try {
          const demande = await changerStatutDemande(moi, id, statut)
          if (!demande) return res.status(404).json(DEMANDE_INTROUVABLE)
          return res.json(demande)
        } catch (error) {
          // Changement interdit par une règle de gestion (RG11, RG12, RG14) :
          // 403 (pas le bon acteur) ou 409 (statut actuel incompatible).
          if (error instanceof RefusMetier) return res.status(error.status).json({ message: error.message })
          throw error
        }
      }

      // Missions (mises en relation)
      case 'missions.list': {
        return res.json(await listerMissions(admin ? {} : { participant: moi }))
      }
      case 'missions.byDemande': {
        if (!isUuid(payload.demandeId)) return res.status(400).json(ID_INVALIDE)
        const missions = await listerMissions(
          admin ? { demande: payload.demandeId } : { demande: payload.demandeId, participant: moi },
        )
        return res.json(missions[0] ?? null)
      }
      case 'missions.create': {
        const { demandeId, demandeurId, aidantId } = payload.mission || {}
        if (![demandeId, demandeurId, aidantId].every(isUuid)) {
          return res.status(400).json({ message: 'Informations de mise en relation invalides.' })
        }
        // La mission doit correspondre à une vraie demande, avec les mêmes
        // participants, et la personne connectée doit en faire partie.
        const demande = await trouverDemande(demandeId)
        if (!demande || !participe(demande, moi) ||
            demande.demandeur_id !== demandeurId || demande.aidant_id !== aidantId) {
          return res.status(404).json(DEMANDE_INTROUVABLE)
        }
        return res.status(201).json(await creerMission({ demandeId, demandeurId, aidantId }))
      }
      case 'missions.updateStatut': {
        if (!isUuid(payload.id) || !STATUTS_MISSION.includes(payload.statutMission)) {
          return res.status(400).json({ message: 'Identifiant ou statut invalide.' })
        }
        // Seuls les deux participants peuvent faire avancer la mission.
        const mission = await trouverMission(payload.id)
        if (!mission || !participe(mission, moi)) return res.status(404).json(MISSION_INTROUVABLE)
        return res.json(await modifierStatutMission(payload.id, payload.statutMission))
      }

      // Messages envoyés depuis le bouton SOS (administrateur seulement)
      case 'messages.list': {
        if (!admin) return res.status(403).json(ADMIN_SEULEMENT)
        return res.json(await listerMessages())
      }
      case 'messages.markRead': {
        if (!admin) return res.status(403).json(ADMIN_SEULEMENT)
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        await marquerLu(payload.id)
        return res.json({ ok: true })
      }
      case 'messages.delete': {
        if (!admin) return res.status(403).json(ADMIN_SEULEMENT)
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        if (!(await supprimerMessage(payload.id))) return res.status(404).json({ message: 'Message introuvable.' })
        return res.json({ ok: true })
      }

      // Avis
      case 'avis.create': {
        if (typeof payload.texte !== 'string' || !payload.texte.trim() || payload.texte.length > 2000) {
          return res.status(400).json({ message: 'Le texte de l’avis est invalide.' })
        }
        // Il faut un profil pour signer un avis (la table avis pointe vers profiles).
        const profil = await trouverProfil(moi)
        if (!profil) return res.status(403).json({ message: 'Un profil est nécessaire pour publier un avis.' })
        await creerAvis({ userId: moi, nom: profil.nom || '', texte: payload.texte.trim() })
        return res.status(201).json({ ok: true })
      }
      case 'avis.delete': {
        if (!isUuid(payload.id)) return res.status(400).json(ID_INVALIDE)
        const avis = await trouverAvis(payload.id)
        // Seul l'auteur ou l'administrateur peut supprimer un avis.
        if (!avis || (avis.user_id !== moi && !admin)) {
          return res.status(403).json({ message: 'Suppression refusée.' })
        }
        await supprimerAvis(payload.id)
        return res.json({ ok: true })
      }

      default:
        return res.status(404).json({ message: 'Opération inconnue.' })
    }
  } catch (error) {
    next(error)
  }
}
