// Store Pinia des adhérents : l'interface ne connaît que cette API métier.
// Les appels passent par services/api.js, comme tout le reste du site.
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../services/api'

export const useAdherentsStore = defineStore('adherents', () => {
  const adherents = ref([])
  const chargement = ref(false)
  const erreur = ref('')

  async function chargerAdherents() {
    chargement.value = true
    erreur.value = ''
    try {
      adherents.value = await apiRequest('/api/adherents')
    } catch (err) {
      erreur.value = err.message
      throw err
    } finally {
      chargement.value = false
    }
  }

  async function creerAdherent(formulaire) {
    const adherent = await apiRequest('/api/adherents', { method: 'POST', body: formulaire })
    adherents.value.push(adherent)
    return adherent
  }

  async function modifierAdherent(id, formulaire) {
    const adherent = await apiRequest(`/api/adherents/${id}`, { method: 'PUT', body: formulaire })
    const index = adherents.value.findIndex((item) => item.id === id)
    if (index !== -1) adherents.value[index] = adherent
    return adherent
  }

  async function supprimerAdherent(id) {
    await apiRequest(`/api/adherents/${id}`, { method: 'DELETE' })
    adherents.value = adherents.value.filter((item) => item.id !== id)
  }

  return {
    adherents,
    chargement,
    erreur,
    chargerAdherents,
    creerAdherent,
    modifierAdherent,
    supprimerAdherent,
  }
})
