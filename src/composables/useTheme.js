// Thème (clair/sombre/auto) du site entier (pages publiques + espace admin).
// État partagé hors composant (même pattern que stores/auth.js) : un seul
// état, quel que soit le composant qui l'utilise (voir ThemeSwitcher.vue,
// posé à la fois dans AppNav.vue et AdminSidebar.vue).
//
// Le mode confort ("Texte plus grand") n'est PAS géré ici : il existe déjà en
// entier dans stores/accessibility.js (classe .mode-confort, clé localStorage
// dispositif.modeConfort, déjà branché sur le bouton "Aa" de la navbar). Le
// réutiliser directement évite deux mécanismes de confort désynchronisés l'un
// de l'autre ; ThemeSwitcher.vue importe les deux composables et les affiche
// ensemble dans un seul menu.
//
// Le flash au chargement (thème par défaut avant que ce fichier ne s'exécute)
// est évité par un petit script identique posé directement dans index.html,
// qui lit la même clé localStorage ("theme") et pose data-theme sur <html>
// avant le premier rendu. Ce composable prend ensuite le relais (état
// réactif, écoute prefers-color-scheme en mode "auto").
import { reactive, watchEffect } from 'vue'

const THEME_KEY = 'theme'

const media = window.matchMedia('(prefers-color-scheme: dark)')

const state = reactive({
  // 'light' | 'dark' | 'auto'
  theme: localStorage.getItem(THEME_KEY) || 'auto',
  // Résolution de 'theme' ('auto' -> 'light'/'dark' selon le système) : exposée
  // à part pour le bouton principal du sélecteur (voir ThemeSwitcher.vue), qui
  // affiche l'icône soleil/lune réellement appliquée et bascule directement
  // entre les deux au clic, sans passer par le menu.
  effectif: 'light',
})

function calculerEffectif() {
  return state.theme === 'auto' ? (media.matches ? 'dark' : 'light') : state.theme
}

function appliquer() {
  state.effectif = calculerEffectif()
  document.documentElement.setAttribute('data-theme', state.effectif)
}

watchEffect(() => {
  localStorage.setItem(THEME_KEY, state.theme)
  appliquer()
})

// Le "auto" dépend de prefers-color-scheme, qui n'est pas un état Vue réactif :
// sans cet écouteur, changer le thème du système (nuit tombante, bascule OS...)
// pendant que le site est ouvert ne mettrait pas la page à jour.
media.addEventListener('change', () => {
  if (state.theme === 'auto') appliquer()
})

function definirTheme(valeur) {
  state.theme = valeur
}

export function useTheme() {
  return { state, definirTheme }
}
