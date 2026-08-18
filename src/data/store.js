// Couche données Supabase (tables "profiles", "demandes", "mises_en_relation" —
// voir supabase/schema.sql). Remplace l'ancien mock localStorage : toutes ces
// fonctions sont maintenant asynchrones (elles renvoient des Promises), donc
// chaque appelant doit utiliser await/.then() plutôt qu'un accès synchrone.
import { supabase } from '../lib/supabaseClient'

// Les 17 communes de Mayotte, regroupées par zone géographique approximative.
// Sert à trier par "proximité" sans vraie géolocalisation (cf. spécificité Mayotte :
// recherche par village/commune plutôt que géoloc précise). Donnée statique, pas
// besoin de table Supabase pour ça.
export const COMMUNES_MAYOTTE = [
  { nom: 'Dzaoudzi', zone: 'Petite-Terre' },
  { nom: 'Pamandzi', zone: 'Petite-Terre' },
  { nom: 'Acoua', zone: 'Nord' },
  { nom: 'Bandraboua', zone: 'Nord' },
  { nom: 'Koungou', zone: 'Nord' },
  { nom: 'Mtsamboro', zone: 'Nord' },
  { nom: 'Mtsangamouji', zone: 'Nord' },
  { nom: 'Mamoudzou', zone: 'Centre' },
  { nom: 'Dembeni', zone: 'Centre' },
  { nom: 'Tsingoni', zone: 'Centre' },
  { nom: 'Ouangani', zone: 'Centre' },
  { nom: 'Chiconi', zone: 'Centre' },
  { nom: 'Sada', zone: 'Centre' },
  { nom: 'Bandrele', zone: 'Sud' },
  { nom: 'Boueni', zone: 'Sud' },
  { nom: 'Chirongui', zone: 'Sud' },
  { nom: 'Kani-Keli', zone: 'Sud' },
]

// Retrouve la zone d'une commune (utilisé pour le tri par proximité des demandes).
export function getZoneCommune(nomCommune) {
  const commune = COMMUNES_MAYOTTE.find((c) => c.nom === nomCommune)
  return commune ? commune.zone : null
}

// Formules d'accompagnement payantes, en plus de la mise en relation gratuite
// proposée partout ailleurs sur le site. Statique aussi (pas éditable par les
// utilisateurs), pas besoin de table dédiée.
export const FORMULES = [
  {
    id: 'essentiel',
    nom: 'Essentiel',
    prix: 25,
    miseEnAvant: false,
    fonctionnalites: [
      'Mise en relation illimitée avec des aidants',
      "Jusqu'à 2 demandes actives en même temps",
      'Support par téléphone en semaine',
    ],
  },
  {
    id: 'confort',
    nom: 'Confort',
    prix: 39,
    miseEnAvant: true,
    fonctionnalites: [
      'Tout Essentiel',
      'Demandes illimitées',
      'Accès prioritaire aux aidants disponibles',
      'Service de garde inclus',
    ],
  },
  {
    id: 'premium',
    nom: 'Premium',
    prix: 101,
    miseEnAvant: false,
    fonctionnalites: [
      'Tout Confort',
      'Suivi par un aidant familial à distance',
      'Ligne d’assistance dédiée 7j/7',
      'Bilan mensuel personnalisé',
    ],
  },
]

// ---------------------------------------------------------------------------
// PROFILES
// ---------------------------------------------------------------------------

// Renvoie tous les profils (utilisé par la page Recherche pour filtrer les
// prestataires). La RLS limite déjà ça aux utilisateurs connectés.
export async function getUsers() {
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) {
    console.error('getUsers:', error.message)
    return []
  }
  return data
}

export async function findById(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error) {
    console.error('findById:', error.message)
    return null
  }
  return data
}

// ---------------------------------------------------------------------------
// DEMANDE : une personne âgée sollicite un aidant (personnel de santé ou
// particulier) pour un service donné. Suit un cycle de statuts simple :
// en_attente -> acceptee | refusee, puis acceptee -> terminee | annulee.
// L'acceptation d'une demande crée automatiquement une MISE_EN_RELATION
// (voir addMiseEnRelation ci-dessous), qui représente la mission en cours.
//
// La table Supabase utilise des colonnes snake_case (demandeur_id, ...) ; ces
// fonctions font la conversion vers/depuis le camelCase utilisé côté app.
// ---------------------------------------------------------------------------

function mapDemande(row) {
  return {
    id: row.id,
    demandeurId: row.demandeur_id,
    aidantId: row.aidant_id,
    typeService: row.type_service,
    urgence: row.urgence,
    message: row.message,
    creneauSouhaite: row.creneau_souhaite,
    statut: row.statut,
    dateCreation: row.date_creation,
    dateMiseAJour: row.date_mise_a_jour,
  }
}

export async function getDemandes() {
  const { data, error } = await supabase.from('demandes').select('*')
  if (error) {
    console.error('getDemandes:', error.message)
    return []
  }
  return data.map(mapDemande)
}

export async function getDemandesByDemandeur(demandeurId) {
  const { data, error } = await supabase
    .from('demandes')
    .select('*')
    .eq('demandeur_id', demandeurId)
  if (error) {
    console.error('getDemandesByDemandeur:', error.message)
    return []
  }
  return data.map(mapDemande)
}

export async function getDemandesByAidant(aidantId) {
  const { data, error } = await supabase.from('demandes').select('*').eq('aidant_id', aidantId)
  if (error) {
    console.error('getDemandesByAidant:', error.message)
    return []
  }
  return data.map(mapDemande)
}

// Crée une nouvelle demande au statut "en_attente".
// payload attendu : { demandeurId, aidantId, typeService, urgence, message, creneauSouhaite }
export async function addDemande(payload) {
  const { data, error } = await supabase
    .from('demandes')
    .insert({
      demandeur_id: payload.demandeurId,
      aidant_id: payload.aidantId,
      type_service: payload.typeService,
      urgence: payload.urgence,
      message: payload.message,
      creneau_souhaite: payload.creneauSouhaite,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapDemande(data)
}

// Change le statut d'une demande. Si le nouveau statut est "acceptee", une
// MISE_EN_RELATION est créée dans la foulée pour représenter la mission qui démarre.
export async function updateDemandeStatut(id, statut) {
  const { data, error } = await supabase
    .from('demandes')
    .update({ statut, date_mise_a_jour: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)

  const demande = mapDemande(data)
  if (statut === 'acceptee') {
    await addMiseEnRelation({
      demandeId: demande.id,
      demandeurId: demande.demandeurId,
      aidantId: demande.aidantId,
    })
  }
  return demande
}

// ---------------------------------------------------------------------------
// MISE_EN_RELATION : entité distincte de DEMANDE. La demande représente la
// sollicitation initiale (avant/pendant la négociation), la mise en relation
// représente la mission elle-même une fois acceptée (début, fin, statut de
// la mission). Une demande acceptée a exactement une mise en relation.
// ---------------------------------------------------------------------------

function mapMiseEnRelation(row) {
  return {
    id: row.id,
    demandeId: row.demande_id,
    demandeurId: row.demandeur_id,
    aidantId: row.aidant_id,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    statutMission: row.statut_mission,
  }
}

export async function getMisesEnRelation() {
  const { data, error } = await supabase.from('mises_en_relation').select('*')
  if (error) {
    console.error('getMisesEnRelation:', error.message)
    return []
  }
  return data.map(mapMiseEnRelation)
}

export async function getMiseEnRelationByDemande(demandeId) {
  const { data, error } = await supabase
    .from('mises_en_relation')
    .select('*')
    .eq('demande_id', demandeId)
    .maybeSingle()
  if (error) {
    console.error('getMiseEnRelationByDemande:', error.message)
    return null
  }
  return data ? mapMiseEnRelation(data) : null
}

// payload attendu : { demandeId, demandeurId, aidantId }
export async function addMiseEnRelation(payload) {
  const { data, error } = await supabase
    .from('mises_en_relation')
    .insert({
      demande_id: payload.demandeId,
      demandeur_id: payload.demandeurId,
      aidant_id: payload.aidantId,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapMiseEnRelation(data)
}

// Termine ou annule une mission ; renseigne date_fin dans les deux cas.
export async function updateMiseEnRelationStatut(id, statutMission) {
  const { data, error } = await supabase
    .from('mises_en_relation')
    .update({
      statut_mission: statutMission,
      date_fin: statutMission === 'en_cours' ? null : new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return mapMiseEnRelation(data)
}

// ---------------------------------------------------------------------------
// MESSAGES_CONTACT : "Un problème avec le site" dans le menu SOS. N'importe
// qui peut en envoyer un (même sans compte) ; seul l'admin peut les lire
// (voir les policies RLS dans supabase/schema.sql).
// ---------------------------------------------------------------------------

function mapMessageContact(row) {
  return {
    id: row.id,
    userId: row.user_id,
    nom: row.nom,
    message: row.message,
    lu: row.lu,
    dateCreation: row.created_at,
  }
}

// payload attendu : { userId, nom, message }. userId est optionnel (visiteur
// non connecté).
export async function addMessageContact(payload) {
  const { error } = await supabase.from('messages_contact').insert({
    user_id: payload.userId ?? null,
    nom: payload.nom,
    message: payload.message,
  })
  if (error) throw new Error(error.message)
}

// Réservé à l'admin : la RLS renverrait de toute façon une liste vide pour
// n'importe qui d'autre, mais autant ne l'appeler que depuis la page Admin.
export async function getMessagesContact() {
  const { data, error } = await supabase
    .from('messages_contact')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getMessagesContact:', error.message)
    return []
  }
  return data.map(mapMessageContact)
}

// Réservé à l'admin (la policy RLS "messages_contact_delete_admin" refuse tout
// le reste). Supprime définitivement le message ; pas de corbeille/annulation.
export async function deleteMessageContact(id) {
  const { error } = await supabase.from('messages_contact').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
