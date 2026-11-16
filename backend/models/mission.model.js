// Modèle « mission » : requêtes SQL sur la table « mises_en_relation ».
// Une mission naît quand une demande est acceptée et suit la prestation
// elle-même (début, fin, statut).
//
// Comme pour les demandes, l'option « participant » remplace la règle RLS :
// seules les missions où cette personne est demandeur ou intervenant sortent.
import { requete, requeteUne } from '../db.js'

// Liste des missions. Filtres facultatifs : demande (id de la demande
// d'origine) et participant (id de l'utilisateur connecté).
export function listerMissions({ demande, participant } = {}) {
  const conditions = []
  const params = []
  if (demande) {
    params.push(demande)
    conditions.push(`demande_id = $${params.length}`)
  }
  if (participant) {
    params.push(participant)
    conditions.push(`(demandeur_id = $${params.length} or aidant_id = $${params.length})`)
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  return requete(`select * from mises_en_relation ${where} order by date_debut desc`, params)
}

export function trouverMission(id) {
  return requeteUne('select * from mises_en_relation where id = $1', [id])
}

// Mission liée à une demande, ou null.
export function trouverMissionDeDemande(demandeId, executant) {
  return requeteUne('select * from mises_en_relation where demande_id = $1', [demandeId], executant)
}

export function creerMission({ demandeId, demandeurId, aidantId }, executant) {
  return requeteUne(
    `insert into mises_en_relation (demande_id, demandeur_id, aidant_id)
     values ($1, $2, $3)
     returning *`,
    [demandeId, demandeurId, aidantId],
    executant,
  )
}

// Change le statut ; la date de fin est posée quand la mission se termine ou
// est annulée, effacée si elle repasse « en cours ».
export function modifierStatutMission(id, statutMission) {
  return requeteUne(
    `update mises_en_relation
     set statut_mission = $2,
         date_fin = case when $2 = 'en_cours' then null else now() end
     where id = $1
     returning *`,
    [id, statutMission],
  )
}
