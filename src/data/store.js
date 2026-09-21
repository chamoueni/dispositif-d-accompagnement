// Couche données Supabase (tables "profiles", "demandes", "mises_en_relation" —
// voir supabase/schema.sql). Remplace l'ancien mock localStorage : toutes ces
// fonctions sont maintenant asynchrones (elles renvoient des Promises), donc
// chaque appelant doit utiliser await/.then() plutôt qu'un accès synchrone.
import { supabase } from '../lib/supabaseClient'
import { API_BASE_URL } from '../lib/apiBase'
import { messageErreurProfil } from '../stores/auth'

// Les 17 communes de Mayotte, regroupées par zone géographique approximative.
// Sert à trier par "proximité" sans vraie géolocalisation (cf. spécificité Mayotte :
// recherche par village/commune plutôt que géoloc précise). Donnée statique, pas
// besoin de table Supabase pour ça.
//
// lat/lng = coordonnées du chef-lieu de la commune. Elles servent à poser les
// marqueurs de la carte d'accueil (voir components/CarteMayotte.vue). Volontairement
// à la maille de la commune et non de l'adresse exacte : "ville" est la seule
// donnée de localisation structurée que le site collecte (le champ "adresse" est
// du texte libre, impossible à positionner sans service de géocodage), et afficher
// publiquement l'adresse précise de personnes âgées poserait un problème évident
// de vie privée. Plusieurs aidants d'une même commune partagent donc le même point
// et se regroupent dans une pastille numérotée, ce qui est le comportement voulu.
export const COMMUNES_MAYOTTE = [
  { nom: 'Dzaoudzi', zone: 'Petite-Terre', lat: -12.7871, lng: 45.2581 },
  { nom: 'Pamandzi', zone: 'Petite-Terre', lat: -12.7975, lng: 45.2811 },
  { nom: 'Acoua', zone: 'Nord', lat: -12.7228, lng: 45.0592 },
  { nom: 'Bandraboua', zone: 'Nord', lat: -12.7047, lng: 45.1225 },
  { nom: 'Koungou', zone: 'Nord', lat: -12.7342, lng: 45.2050 },
  { nom: 'Mtsamboro', zone: 'Nord', lat: -12.6919, lng: 45.0703 },
  { nom: 'Mtsangamouji', zone: 'Nord', lat: -12.7658, lng: 45.0736 },
  { nom: 'Mamoudzou', zone: 'Centre', lat: -12.7806, lng: 45.2278 },
  { nom: 'Dembeni', zone: 'Centre', lat: -12.8419, lng: 45.1836 },
  { nom: 'Tsingoni', zone: 'Centre', lat: -12.7869, lng: 45.1022 },
  { nom: 'Ouangani', zone: 'Centre', lat: -12.8394, lng: 45.1350 },
  { nom: 'Chiconi', zone: 'Centre', lat: -12.8317, lng: 45.1017 },
  { nom: 'Sada', zone: 'Centre', lat: -12.8519, lng: 45.1083 },
  { nom: 'Bandrele', zone: 'Sud', lat: -12.9078, lng: 45.1919 },
  { nom: 'Boueni', zone: 'Sud', lat: -12.9033, lng: 45.0778 },
  { nom: 'Chirongui', zone: 'Sud', lat: -12.9333, lng: 45.1500 },
  { nom: 'Kani-Keli', zone: 'Sud', lat: -12.9594, lng: 45.1053 },
]

// Retrouve les coordonnées d'une commune à partir de son nom tel qu'il est stocké
// dans profiles.ville (les formulaires n'acceptent que des noms de COMMUNES_MAYOTTE,
// la comparaison peut donc rester stricte).
export function getCoordonneesCommune(nomCommune) {
  const commune = COMMUNES_MAYOTTE.find((c) => c.nom === nomCommune)
  return commune ? { lat: commune.lat, lng: commune.lng } : null
}

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
    id: 'basique',
    nom: 'Basique',
    prix: 0,
    miseEnAvant: false,
    essaiGratuit: true,
    fonctionnalites: [
      '3 mises en relation gratuites, sans engagement',
      'Recherche illimitée de prestataires par commune et par service',
      'Passage à une formule payante à tout moment',
    ],
  },
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

// Réservé à l'admin (policy RLS "profiles_update_admin") : modifie n'importe
// quel profil depuis l'espace admin, contrairement à updateProfile() dans
// stores/auth.js qui ne touche qu'au profil de l'utilisateur connecté.
export async function updateCompteAdmin(id, patch) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('id')
  if (error) throw new Error(messageErreurProfil(error))
  if (!data || data.length === 0) {
    throw new Error('Modification refusée par la base (droits insuffisants).')
  }
}

// Supprime un compte entièrement (compte Supabase Auth + profil) via l'API
// backend, seule à détenir la clé service role nécessaire pour supprimer un
// utilisateur Auth (voir server/index.js). Une suppression RLS de la seule
// ligne "profiles" laisserait le compte Auth en place, bloquant toute
// réinscription avec le même email par la suite.
export async function deleteCompteAdmin(id) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const response = await fetch(`${API_BASE_URL}/api/admin/comptes/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'Échec de la suppression du compte.')
  }
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

// Délai entre l'acceptation d'une demande (création de la mise en relation)
// et son passage à l'affichage "En cours" : le temps que la mise en relation
// soit vraiment effective (premier contact, etc.) plutôt qu'un statut "En
// cours" instantané dès le clic sur "Accepter". Purement un délai d'affichage
// (voir MesDemandes.vue / MesAccompagnements.vue) : statut_mission reste
// "en_cours" en base dès la création, seule la présentation à l'écran change.
export const DELAI_DEMARRAGE_MISSION_MS = 3 * 60 * 1000

// "maintenant" est injecté par l'appelant (plutôt que Date.now() interne) pour
// que ça reste réactif côté Vue : le composant fait dépendre ce paramètre d'un
// ref qui tique régulièrement, ce qui refait évaluer cette fonction et change
// l'affichage automatiquement, sans recharger la page.
export function missionDemarree(mission, maintenant = Date.now()) {
  return maintenant - new Date(mission.dateDebut).getTime() >= DELAI_DEMARRAGE_MISSION_MS
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
// .select() force Supabase à renvoyer les lignes effectivement supprimées :
// sans ça, un delete() bloqué par la RLS "réussit" quand même côté client
// (0 ligne affectée, mais pas d'erreur) et le message semblait supprimé
// jusqu'au prochain rechargement.
export async function deleteMessageContact(id) {
  const { data, error } = await supabase.from('messages_contact').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error(
      "Suppression refusée par la base (droits insuffisants) : le message n'a pas été supprimé.",
    )
  }
}

// ---------------------------------------------------------------------------
// AVIS (témoignages postés par les utilisateurs, page "Pour qui")
// ---------------------------------------------------------------------------

// Page publique : accessible même sans connexion (RLS "avis_select_anyone").
export async function getAvis() {
  const { data, error } = await supabase
    .from('avis')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getAvis:', error.message)
    return []
  }
  return data
}

// payload attendu : { userId, nom, texte }. Réservé aux utilisateurs connectés
// (RLS "avis_insert_own" vérifie que userId correspond bien à l'appelant).
export async function addAvis(payload) {
  const { error } = await supabase.from('avis').insert({
    user_id: payload.userId,
    nom: payload.nom,
    texte: payload.texte,
  })
  if (error) throw new Error(error.message)
}

// L'auteur (ou l'admin) peut retirer son propre avis. Même garde-fou que
// deleteMessageContact() : un delete() bloqué par la RLS ne renvoie pas
// d'erreur, juste 0 ligne affectée, donc on le détecte nous-mêmes.
export async function deleteAvis(id) {
  const { data, error } = await supabase.from('avis').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error("Suppression refusée par la base (droits insuffisants) : l'avis n'a pas été supprimé.")
  }
}
