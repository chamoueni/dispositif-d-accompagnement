// Store Pinia partagé par toutes les vues de l'espace admin (tableau de bord,
// comptes, demandes & missions, messages) : les données sont chargées une
// seule fois au montage de la coquille (voir pages/Admin.vue) plutôt qu'à
// chaque changement de vue, et la sidebar (compteurs) reste synchronisée avec
// ce qui se passe dans une vue (ex. supprimer un message met à jour le badge
// "Messages" sans recharger quoi que ce soit).
// Toutes les fonctions Supabase utilisées ici existaient déjà dans
// data/store.js (voir Admin.vue avant cette refonte) : ce store ne fait que
// centraliser leurs appels et l'état qui en résulte.
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getUsers,
  getMessagesContact,
  marquerMessageContactLu,
  deleteMessageContact,
  getDemandes,
  getMisesEnRelation,
  updateCompteAdmin,
  deleteCompteAdmin,
  createCompteAdmin,
} from '../data/store'

export const useAdminDashboard = defineStore('admin-dashboard', () => {
  const utilisateurs = ref([])
  const messages = ref([])
  const demandes = ref([])
  const missions = ref([])
  const chargement = ref(true)
  const chargementInitial = ref(true)

  async function charger() {
    chargement.value = true
    ;[utilisateurs.value, messages.value, demandes.value, missions.value] = await Promise.all([
      getUsers(),
      getMessagesContact(),
      getDemandes(),
      getMisesEnRelation(),
    ])
    chargement.value = false
    chargementInitial.value = false
  }

  const messagesNonLus = computed(() => messages.value.filter((m) => !m.lu).length)
  const demandesEnAttente = computed(() => demandes.value.filter((d) => d.statut === 'en_attente').length)
  const missionsEnCours = computed(() => missions.value.filter((m) => m.statutMission === 'en_cours').length)

  const nomParId = computed(() => {
    const map = {}
    utilisateurs.value.forEach((u) => { map[u.id] = u.nom || 'Compte supprimé' })
    return map
  })
  function nomCompte(id) {
    return nomParId.value[id] || 'Compte supprimé'
  }

  async function modifierCompte(id, patch) {
    await updateCompteAdmin(id, patch)
    const cible = utilisateurs.value.find((u) => u.id === id)
    if (cible) Object.assign(cible, patch)
  }

  async function supprimerCompte(id) {
    await deleteCompteAdmin(id)
    utilisateurs.value = utilisateurs.value.filter((u) => u.id !== id)
  }

  async function creerCompte(payload) {
    const profil = await createCompteAdmin(payload)
    utilisateurs.value = [profil, ...utilisateurs.value]
    return profil
  }

  async function marquerLu(id) {
    await marquerMessageContactLu(id)
    const cible = messages.value.find((m) => m.id === id)
    if (cible) cible.lu = true
  }

  async function supprimerMessage(id) {
    await deleteMessageContact(id)
    messages.value = messages.value.filter((m) => m.id !== id)
  }

  return {
    utilisateurs,
    messages,
    demandes,
    missions,
    chargement,
    chargementInitial,
    messagesNonLus,
    demandesEnAttente,
    missionsEnCours,
    nomCompte,
    charger,
    modifierCompte,
    supprimerCompte,
    creerCompte,
    marquerLu,
    supprimerMessage,
  }
})
