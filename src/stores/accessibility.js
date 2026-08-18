// Store "mode confort" : agrandit le texte et les zones cliquables partout sur le
// site. Préférence persistée en localStorage pour rester active d'une visite à l'autre.
// Un seul état réactif partagé (même pattern que stores/auth.js).
import { reactive, watchEffect } from 'vue'

const STORAGE_KEY = 'dispositif.modeConfort'

const state = reactive({
  actif: localStorage.getItem(STORAGE_KEY) === '1',
})

// Répercute l'état sur <html> (classe CSS) et le sauvegarde à chaque changement.
watchEffect(() => {
  document.documentElement.classList.toggle('mode-confort', state.actif)
  localStorage.setItem(STORAGE_KEY, state.actif ? '1' : '0')
})

function toggle() {
  state.actif = !state.actif
}

export function useAccessibility() {
  return { state, toggle }
}
