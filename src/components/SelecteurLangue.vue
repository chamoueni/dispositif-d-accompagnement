<script setup>
// Sélecteur de langue, posé dans la navbar (voir AppNav.vue).
//
// Menu déroulant compact plutôt que la bande de gros boutons utilisée avant :
// demande explicite (2026-09), qui accepte le compromis accessibilité de
// l'ancienne version (chaque langue restait atteignable d'un seul geste direct,
// sans avoir à ouvrir puis viser une liste). Pour ne pas perdre trop de ce
// confort au clavier/lecteur d'écran, le déclencheur reste un vrai bouton
// combobox (aria-haspopup="listbox" + aria-expanded) et les flèches ↑/↓
// déplacent le focus dans la liste une fois ouverte.
//
// Le choix est mémorisé d'une visite à l'autre (voir i18n/index.js).
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LANGUES, enregistrerLangue } from '../i18n'
import '../styles/SelecteurLangue.css'

// Pas de vrai drapeau national pour le shimaoré/kibushi (langues locales, pas de
// pays associé) : le drapeau de Mayotte sert de repère visuel pour les deux,
// comme demandé.
const DRAPEAUX = { fr: '🇫🇷', shi: '🇾🇹', kib: '🇾🇹' }

const { locale, t } = useI18n()

const ouvert = ref(false)
const racine = ref(null)
const options = ref([])

const langueActive = computed(() => LANGUES.find((l) => l.code === locale.value) ?? LANGUES[0])

function ouvrir() {
  ouvert.value = true
  // Focus posé sur l'option active dès l'ouverture : quelqu'un qui navigue au
  // clavier n'a pas à retraverser toute la liste pour retrouver son choix actuel.
  nextTick(() => {
    const index = LANGUES.findIndex((l) => l.code === locale.value)
    options.value[index]?.focus()
  })
}

function fermer({ rendreFocus = false } = {}) {
  if (!ouvert.value) return
  ouvert.value = false
  if (rendreFocus) racine.value?.querySelector('.langue-declencheur')?.focus()
}

function basculer() {
  if (ouvert.value) fermer()
  else ouvrir()
}

function choisir(code) {
  locale.value = code
  enregistrerLangue(code)
  // lang sur <html> : indispensable pour les lecteurs d'écran, qui changent de
  // moteur de prononciation en fonction de cet attribut.
  document.documentElement.setAttribute('lang', code)
  fermer({ rendreFocus: true })
}

// ↑/↓ pour circuler dans la liste ouverte sans repasser par la souris ; Échap
// referme et rend le focus au bouton, comme n'importe quel menu.
function surToucheOption(evenement, index) {
  if (evenement.key === 'ArrowDown') {
    evenement.preventDefault()
    options.value[(index + 1) % LANGUES.length]?.focus()
  } else if (evenement.key === 'ArrowUp') {
    evenement.preventDefault()
    options.value[(index - 1 + LANGUES.length) % LANGUES.length]?.focus()
  } else if (evenement.key === 'Escape') {
    evenement.preventDefault()
    fermer({ rendreFocus: true })
  }
}

// Clic en dehors du menu : le referme, comme n'importe quel menu déroulant.
function surClicDocument(evenement) {
  if (!ouvert.value) return
  if (racine.value?.contains(evenement.target)) return
  fermer()
}

document.addEventListener('click', surClicDocument)
onBeforeUnmount(() => document.removeEventListener('click', surClicDocument))
</script>

<template>
  <div
    ref="racine"
    class="selecteur-langue"
  >
    <button
      type="button"
      class="langue-declencheur"
      aria-haspopup="listbox"
      :aria-expanded="ouvert"
      :aria-label="t('langue.choisir')"
      @click="basculer"
      @keydown.down.prevent="ouvrir"
    >
      <span aria-hidden="true">{{ DRAPEAUX[langueActive.code] }}</span>
      <span class="langue-declencheur-texte">{{ langueActive.libelle }}</span>
      <svg
        class="langue-chevron"
        :class="{ 'langue-chevron-ouvert': ouvert }"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </button>

    <ul
      v-show="ouvert"
      class="langue-menu"
      role="listbox"
      :aria-label="t('langue.choisir')"
    >
      <li
        v-for="(langue, index) in LANGUES"
        :key="langue.code"
      >
        <button
          :ref="(el) => (options[index] = el)"
          type="button"
          role="option"
          class="langue-option"
          :class="{ 'est-active': locale === langue.code }"
          :aria-selected="locale === langue.code"
          :lang="langue.code"
          @click="choisir(langue.code)"
          @keydown="surToucheOption($event, index)"
        >
          <span aria-hidden="true">{{ DRAPEAUX[langue.code] }}</span>
          <span class="langue-option-texte">{{ langue.libelle }}</span>
          <svg
            v-if="locale === langue.code"
            class="langue-coche"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8.5 6.2 12 13 4" />
          </svg>
        </button>
      </li>
    </ul>
  </div>
</template>
