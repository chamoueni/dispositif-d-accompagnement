// Couche de données via l’API Express, qui applique l’authentification BFF et
// conserve les règles RLS Supabase. Toutes ces fonctions sont asynchrones.
import { apiRequest } from '../lib/api'
import { messageErreurProfil } from '../stores/auth'

async function appelerDonnees(action, payload = {}) {
  return apiRequest('/api/data', {
    method: 'POST',
    body: { action, payload },
  })
}

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
  try {
    return await appelerDonnees('profiles.list')
  } catch (error) {
    console.error('getUsers:', error.message)
    return []
  }
}

export async function findById(id) {
  try {
    return await appelerDonnees('profiles.find', { id })
  } catch (error) {
    console.error('findById:', error.message)
    return null
  }
}

// Réservé à l'admin (policy RLS "profiles_update_admin") : modifie n'importe
// quel profil depuis l'espace admin, contrairement à updateProfile() dans
// stores/auth.js qui ne touche qu'au profil de l'utilisateur connecté.
export async function updateCompteAdmin(id, patch) {
  try {
    await appelerDonnees('profiles.updateAdmin', { id, patch })
  } catch (error) {
    throw new Error(messageErreurProfil(error), { cause: error })
  }
}

// Supprime un compte entièrement (compte Supabase Auth + profil) via l'API
// backend, seule à détenir la clé service role nécessaire pour supprimer un
// utilisateur Auth (voir backend/index.js). Une suppression RLS de la seule
// ligne "profiles" laisserait le compte Auth en place, bloquant toute
// réinscription avec le même email par la suite.
export async function deleteCompteAdmin(id) {
  await apiRequest(`/api/admin/comptes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// Crée un compte complet (Auth + profil) depuis l'espace admin, via l'API
// backend, seule à détenir la clé service role nécessaire pour créer un
// utilisateur Auth sans mot de passe choisi par lui-même (voir backend/index.js).
// payload : { nom, email, telephone, ville, role, actif }.
export async function createCompteAdmin(payload) {
  return apiRequest('/api/admin/comptes', { method: 'POST', body: payload })
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
    codeArrivee: row.code_arrivee,
    dateCreation: row.date_creation,
    dateMiseAJour: row.date_mise_a_jour,
  }
}

export async function getDemandes() {
  try {
    return (await appelerDonnees('demandes.list')).map(mapDemande)
  } catch (error) {
    console.error('getDemandes:', error.message)
    return []
  }
}

export async function getDemandesByDemandeur(demandeurId) {
  try {
    return (await appelerDonnees('demandes.byDemandeur', { id: demandeurId })).map(mapDemande)
  } catch (error) {
    console.error('getDemandesByDemandeur:', error.message)
    return []
  }
}

export async function getDemandesByAidant(aidantId) {
  try {
    return (await appelerDonnees('demandes.byAidant', { id: aidantId })).map(mapDemande)
  } catch (error) {
    console.error('getDemandesByAidant:', error.message)
    return []
  }
}

// Crée une nouvelle demande au statut "en_attente".
// payload attendu : { demandeurId, aidantId, typeService, urgence, message, creneauSouhaite }
export async function addDemande(payload) {
  return mapDemande(await appelerDonnees('demandes.create', { demande: payload }))
}

// Change le statut d'une demande. Si le nouveau statut est "acceptee", une
// MISE_EN_RELATION est créée dans la foulée pour représenter la mission qui démarre,
// et un code d'arrivée est attribué.
export async function updateDemandeStatut(id, statut) {
  return mapDemande(await appelerDonnees('demandes.updateStatut', { id, statut }))
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
  try {
    return (await appelerDonnees('missions.list')).map(mapMiseEnRelation)
  } catch (error) {
    console.error('getMisesEnRelation:', error.message)
    return []
  }
}

export async function getMiseEnRelationByDemande(demandeId) {
  try {
    const data = await appelerDonnees('missions.byDemande', { demandeId })
    return data ? mapMiseEnRelation(data) : null
  } catch (error) {
    console.error('getMiseEnRelationByDemande:', error.message)
    return null
  }
}

// payload attendu : { demandeId, demandeurId, aidantId }
export async function addMiseEnRelation(payload) {
  return mapMiseEnRelation(await appelerDonnees('missions.create', { mission: payload }))
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
  return mapMiseEnRelation(await appelerDonnees('missions.updateStatut', { id, statutMission }))
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
  await appelerDonnees('contact.create', payload)
}

// Réservé à l'admin : la RLS renverrait de toute façon une liste vide pour
// n'importe qui d'autre, mais autant ne l'appeler que depuis la page Admin.
export async function getMessagesContact() {
  try {
    return (await appelerDonnees('messages.list')).map(mapMessageContact)
  } catch (error) {
    console.error('getMessagesContact:', error.message)
    return []
  }
}

// Réservé à l'admin ("messages_contact_update_admin" en RLS) : bouton
// "Marquer lu" de l'espace admin.
export async function marquerMessageContactLu(id) {
  await appelerDonnees('messages.markRead', { id })
}

// Réservé à l'admin (la policy RLS "messages_contact_delete_admin" refuse tout
// le reste). Supprime définitivement le message ; pas de corbeille/annulation.
// .select() force Supabase à renvoyer les lignes effectivement supprimées :
// sans ça, un delete() bloqué par la RLS "réussit" quand même côté client
// (0 ligne affectée, mais pas d'erreur) et le message semblait supprimé
// jusqu'au prochain rechargement.
export async function deleteMessageContact(id) {
  await appelerDonnees('messages.delete', { id })
}

// ---------------------------------------------------------------------------
// AVIS (témoignages postés par les utilisateurs, page "Pour qui")
// ---------------------------------------------------------------------------

// Page publique : accessible même sans connexion (RLS "avis_select_anyone").
export async function getAvis() {
  try {
    return await appelerDonnees('avis.list')
  } catch (error) {
    console.error('getAvis:', error.message)
    return []
  }
}

// payload attendu : { userId, nom, texte }. Réservé aux utilisateurs connectés
// (RLS "avis_insert_own" vérifie que userId correspond bien à l'appelant).
export async function addAvis(payload) {
  await appelerDonnees('avis.create', payload)
}

// L'auteur (ou l'admin) peut retirer son propre avis. Même garde-fou que
// deleteMessageContact() : un delete() bloqué par la RLS ne renvoie pas
// d'erreur, juste 0 ligne affectée, donc on le détecte nous-mêmes.
export async function deleteAvis(id) {
  await appelerDonnees('avis.delete', { id })
}
