// Modèle « demande » : requêtes SQL sur la table « demandes » (une personne
// âgée sollicite un intervenant pour un service).
//
// Remplace la règle RLS « seuls le demandeur et l'intervenant voient la
// demande » : le contrôleur passe l'option « participant » (l'id de
// l'utilisateur connecté) et la requête ne renvoie que SES demandes.
// L'administrateur, lui, n'a pas ce filtre (suivi d'activité).
import { requete, requeteUne } from '../db.js'

// Liste des demandes. Filtres facultatifs :
// - demandeur / aidant : demandes envoyées / reçues par cette personne ;
// - participant : ne garder que les demandes où cette personne est demandeur
//   OU intervenant (c'est ce filtre qui protège les données des autres).
export function listerDemandes({ demandeur, aidant, participant } = {}) {
  const conditions = []
  const params = []
  // Chaque filtre ajoute sa condition et sa valeur ($1, $2… dans l'ordre).
  if (demandeur) {
    params.push(demandeur)
    conditions.push(`demandeur_id = $${params.length}`)
  }
  if (aidant) {
    params.push(aidant)
    conditions.push(`aidant_id = $${params.length}`)
  }
  if (participant) {
    params.push(participant)
    conditions.push(`(demandeur_id = $${params.length} or aidant_id = $${params.length})`)
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  return requete(`select * from demandes ${where} order by date_creation desc`, params)
}

// Une demande par son identifiant, ou null. « verrouiller » (dans une
// transaction) bloque la ligne le temps de la modifier.
export function trouverDemande(id, executant, { verrouiller = false } = {}) {
  return requeteUne(
    `select * from demandes where id = $1 ${verrouiller ? 'for update' : ''}`,
    [id],
    executant,
  )
}

// Enregistre une demande ; la base remplit id, statut « en_attente » et dates.
export function creerDemande({ demandeurId, aidantId, typeService, urgence, message, creneauSouhaite }) {
  return requeteUne(
    `insert into demandes (demandeur_id, aidant_id, type_service, urgence, message, creneau_souhaite)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [
      demandeurId, aidantId, typeService, urgence, message,
      // Colonne jsonb : envoyée en texte JSON (ou null).
      creneauSouhaite == null ? null : JSON.stringify(creneauSouhaite),
    ],
  )
}

// Change le statut (et le code d'arrivée s'il est fourni).
export function modifierStatut(id, statut, codeArrivee, executant) {
  return requeteUne(
    `update demandes
     set statut = $2,
         code_arrivee = coalesce($3, code_arrivee),
         date_mise_a_jour = now()
     where id = $1
     returning *`,
    [id, statut, codeArrivee ?? null],
    executant,
  )
}

// Demandes ACCEPTÉES ou TERMINÉES de cette personne : ce sont elles qui
// autorisent à voir le téléphone et l'adresse de l'autre participant.
export function demandesEnRelation(utilisateurId) {
  return requete(
    `select demandeur_id, aidant_id from demandes
     where (demandeur_id = $1 or aidant_id = $1)
       and statut in ('acceptee', 'terminee')`,
    [utilisateurId],
  )
}
