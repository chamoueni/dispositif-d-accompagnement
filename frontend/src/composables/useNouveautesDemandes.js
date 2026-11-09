// Nombre de nouveautés sur « Mes demandes », pour les pastilles de la barre du
// haut (AppNav.vue) et de la page Mon compte (MonCompte.vue).
//
// - Personne âgée : une demande devient « nouvelle » quand l'aidant y répond
//   (acceptée, refusée, terminée...).
// - Aidant : une demande reçue en attente est « nouvelle ».
//
// Ce qui a déjà été vu est retenu dans le navigateur (localStorage), demande
// par demande avec son statut : si le statut change ensuite, elle redevient
// nouvelle. La page Mes demandes appelle marquerDemandesVues() à l'ouverture.
// État au niveau du module : la barre et Mon compte partagent le même compteur
// et une seule requête.
import { computed, ref, watch } from 'vue'
import { getDemandesByAidant, getDemandesByDemandeur } from '../data/store'
import { useAuth } from '../stores/auth'

const demandes = ref([])
const vues = ref({})
let dernierChargement = 0
let compteCharge = null

const cle = (userId) => `demandes-vues-${userId}`

function lireVues(userId) {
  try {
    return JSON.parse(localStorage.getItem(cle(userId)) || '{}')
  } catch {
    return {}
  }
}

function ecrireVues(userId, valeur) {
  try {
    localStorage.setItem(cle(userId), JSON.stringify(valeur))
  } catch {
    // Stockage indisponible (navigation privée...) : la pastille reviendra, sans gravité.
  }
}

export function useNouveautesDemandes() {
  const { user, isAdmin } = useAuth()

  // Recharge au plus toutes les 30 s (appelé à chaque changement de page).
  async function rafraichir(force = false) {
    const compte = user.value
    if (!compte || isAdmin.value) {
      demandes.value = []
      return
    }
    if (!force && compteCharge === compte.id && Date.now() - dernierChargement < 30000) return
    compteCharge = compte.id
    dernierChargement = Date.now()
    vues.value = lireVues(compte.id)
    try {
      demandes.value = compte.role === 'senior'
        ? await getDemandesByDemandeur(compte.id)
        : await getDemandesByAidant(compte.id)
    } catch {
      demandes.value = []
    }
  }

  const nombre = computed(() => {
    const role = user.value?.role
    return demandes.value.filter((d) => {
      const pertinente = role === 'senior' ? d.statut !== 'en_attente' : d.statut === 'en_attente'
      return pertinente && vues.value[d.id] !== d.statut
    }).length
  })

  // Appelé par Mes demandes : tout ce qui est affiché est désormais « vu ».
  function marquerDemandesVues(liste) {
    if (!user.value) return
    const suivantes = { ...lireVues(user.value.id) }
    for (const d of liste) suivantes[d.id] = d.statut
    ecrireVues(user.value.id, suivantes)
    vues.value = suivantes
  }

  watch(() => user.value?.id, () => rafraichir(true), { immediate: true })

  return { nombre, rafraichir, marquerDemandesVues }
}
