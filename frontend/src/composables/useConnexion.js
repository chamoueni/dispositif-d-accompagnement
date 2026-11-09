// État de connexion internet, partagé par tout le site (même pattern que
// composables/useTheme.js : un seul état hors composant). navigator.onLine
// reflète la connectivité réseau du système, mis à jour par les événements
// natifs 'online'/'offline' — sert à afficher un message clair (voir
// ConnexionBanner.vue) au lieu de laisser les appels Supabase échouer en
// silence quand la connexion coupe pendant l'utilisation du site.
import { ref } from 'vue'

const enLigne = ref(navigator.onLine)

window.addEventListener('online', () => { enLigne.value = true })
window.addEventListener('offline', () => { enLigne.value = false })

export function useConnexion() {
  return { enLigne }
}
