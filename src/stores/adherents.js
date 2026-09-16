// Store Pinia des adhérents : l'interface ne connaît que cette API métier.
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAdherentsStore = defineStore('adherents', () => {
  const adherents = ref([])
  const chargement = ref(false)
  const erreur = ref('')

  // Centralise les appels fetch vers le backend Express.
  async function appelerApi(url, options = {}) {
    const reponse = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const donnees = reponse.status === 204 ? null : await reponse.json()
    if (!reponse.ok) throw new Error(donnees?.message || 'La requête a échoué.')
    return donnees
  }

  async function chargerAdherents() {
    chargement.value = true
    erreur.value = ''
    try {
      adherents.value = await appelerApi('/api/adherents')
    } catch (err) {
      erreur.value = err.message
      throw err
    } finally {
      chargement.value = false
    }
  }

  async function creerAdherent(formulaire) {
    const adherent = await appelerApi('/api/adherents', {
      method: 'POST',
      body: JSON.stringify(formulaire),
    })
    adherents.value.push(adherent)
    return adherent
  }

  async function modifierAdherent(id, formulaire) {
    const adherent = await appelerApi(`/api/adherents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formulaire),
    })
    const index = adherents.value.findIndex((item) => item.id === id)
    if (index !== -1) adherents.value[index] = adherent
    return adherent
  }

  async function supprimerAdherent(id) {
    await appelerApi(`/api/adherents/${id}`, { method: 'DELETE' })
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
