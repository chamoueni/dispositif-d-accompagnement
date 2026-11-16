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

// Renvoie la demande modifiée, ou null si elle n'existe pas ou si
// l'utilisateur n'y participe pas (=> 404 dans le contrôleur, sans révéler
// qu'une demande existe chez quelqu'un d'autre).
export function changerStatutDemande(utilisateurId, id, statut) {
  return transaction(async (client) => {
    // Remplace la règle RLS « seuls le demandeur et l'intervenant modifient la demande ».
    const demande = await trouverDemande(id, client, { verrouiller: true })
    if (!demande || (demande.demandeur_id !== utilisateurId && demande.aidant_id !== utilisateurId)) {
      return null
    }

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
