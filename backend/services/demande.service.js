// Règle de gestion du cycle de vie d'une demande d'aide :
// en attente → acceptée / refusée → terminée ou annulée.
// À l'acceptation, deux traitements automatiques :
// - un code d'arrivée à 4 chiffres, que l'intervenant annonce chez la personne âgée ;
// - une mise en relation (mission) entre le demandeur et l'intervenant.
//
// Tout se fait dans UNE transaction : soit la demande change de statut ET sa
// mission est créée, soit rien ne change (jamais une demande acceptée sans mission).
import crypto from 'node:crypto'
import { transaction } from '../db.js'
import { modifierStatut, trouverDemande } from '../models/demande.model.js'
import { creerMission, trouverMissionDeDemande } from '../models/mission.model.js'

// Erreur « métier » : un changement refusé par une règle de gestion. Le
// contrôleur la transforme en réponse HTTP avec son code (403 ou 409).
export class RefusMetier extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Changements de statut autorisés (cahier des charges, RG11, RG12 et RG14).
// Pour chaque statut actuel : le nouveau statut possible et QUI peut le décider.
//   'aidant'       = seulement l'intervenant destinataire ;
//   'demandeur'    = seulement la personne âgée qui a envoyé la demande ;
//   'participant'  = l'un ou l'autre (fin ou annulation de la mission).
const TRANSITIONS = {
  en_attente: { acceptee: 'aidant', refusee: 'aidant', annulee: 'demandeur' },
  acceptee: { terminee: 'participant', annulee: 'participant' },
}

// Vérifie que « utilisateurId » a le droit de passer la demande au statut
// « statut ». Lève RefusMetier sinon.
function verifierTransition(demande, utilisateurId, statut) {
  const qui = TRANSITIONS[demande.statut]?.[statut]
  if (!qui) {
    // Exemple : accepter une demande déjà refusée, ou terminer une demande en attente.
    throw new RefusMetier(409, 'Ce changement de statut n’est pas possible pour cette demande.')
  }
  const estAidant = demande.aidant_id === utilisateurId
  const estDemandeur = demande.demandeur_id === utilisateurId
  if (qui === 'aidant' && !estAidant) {
    throw new RefusMetier(403, 'Seul l’intervenant destinataire peut accepter ou refuser cette demande.')
  }
  if (qui === 'demandeur' && !estDemandeur) {
    throw new RefusMetier(403, 'Seule la personne qui a envoyé la demande peut l’annuler.')
  }
}

// Renvoie la demande modifiée, ou null si elle n'existe pas ou si
// l'utilisateur n'y participe pas (=> 404 dans le contrôleur, sans révéler
// qu'une demande existe chez quelqu'un d'autre). Lève RefusMetier si la règle
// de gestion interdit ce changement (=> 403 ou 409).
export function changerStatutDemande(utilisateurId, id, statut) {
  return transaction(async (client) => {
    // Seuls le demandeur et l'intervenant peuvent toucher à la demande.
    // « verrouiller » : deux clics simultanés ne peuvent pas la modifier en même temps.
    const demande = await trouverDemande(id, client, { verrouiller: true })
    if (!demande || (demande.demandeur_id !== utilisateurId && demande.aidant_id !== utilisateurId)) {
      return null
    }
    // Qui a le droit de faire quoi, et à partir de quel statut (RG11, RG12, RG14).
    verifierTransition(demande, utilisateurId, statut)

    // Code d'arrivée créé une seule fois, à la première acceptation.
    // crypto.randomInt : vrai hasard cryptographique, impossible à prévoir.
    const code = statut === 'acceptee' && !demande.code_arrivee
      ? String(crypto.randomInt(10000)).padStart(4, '0')
      : null
    const modifiee = await modifierStatut(id, statut, code, client)

    if (statut === 'acceptee' && !(await trouverMissionDeDemande(id, client))) {
      await creerMission({
        demandeId: id,
        demandeurId: modifiee.demandeur_id,
        aidantId: modifiee.aidant_id,
      }, client)
    }
    return modifiee
  })
}
