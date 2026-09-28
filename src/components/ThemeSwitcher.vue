<script setup>
// Sélecteur d'apparence (clair/sombre/auto + mode confort), réutilisé tel
// quel dans AppNav.vue (site public) et AdminSidebar.vue (espace admin) : un
// seul composant, un seul état (voir composables/useTheme.js), donc passer en
// sombre depuis l'accueil s'applique aussi à l'admin et inversement.
// Bouton déclencheur + menu déroulant, même schéma que SelecteurLangue.vue
// (combobox maison, fermeture au clic dehors/Échap, sans dépendance externe).
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useAccessibility } from '../stores/accessibility'

defineProps({
  // Le menu s'ouvre vers le haut plutôt que vers le bas quand il est posé en
  // bas de la sidebar admin (sinon il sortirait de l'écran vers le bas).
  ouvreVersLeHaut: { type: Boolean, default: false },
})

const { state: themeState, definirTheme } = useTheme()
const { state: confortState, toggle: basculerConfort } = useAccessibility()

const CHOIX = [
  { valeur: 'light', label: 'Clair' },
  { valeur: 'dark', label: 'Sombre' },
  { valeur: 'auto', label: 'Auto' },
]

const ouvert = ref(false)
const racine = ref(null)
const declencheur = ref(null)

function ouvrir() {
  ouvert.value = true
  nextTick(() => racine.value?.querySelector('.theme-switcher-choix button')?.focus())
}

function fermer({ rendreFocus = false } = {}) {
  if (!ouvert.value) return
  ouvert.value = false
  if (rendreFocus) declencheur.value?.focus()
}

function basculer() {
  if (ouvert.value) fermer()
  else ouvrir()
}

function choisir(valeur) {
  definirTheme(valeur)
}

function surClicDocument(evenement) {
  if (!ouvert.value) return
  if (racine.value?.contains(evenement.target)) return
  fermer()
}

function surTouche(evenement) {
  if (evenement.key === 'Escape') {
    evenement.preventDefault()
    fermer({ rendreFocus: true })
  }
}

document.addEventListener('click', surClicDocument)
onBeforeUnmount(() => document.removeEventListener('click', surClicDocument))
</script>

<template>
  <div
    ref="racine"
    class="theme-switcher"
    @keydown="surTouche"
  >
    <button
      ref="declencheur"
      type="button"
      class="theme-switcher-declencheur"
      aria-haspopup="true"
      :aria-expanded="ouvert"
      aria-label="Apparence du site"
      title="Apparence"
      @click="basculer"
    >
      <svg
        v-if="themeState.theme === 'dark'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="4"
        />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>

    <div
      v-show="ouvert"
      class="theme-switcher-menu"
      :class="{ 'theme-switcher-menu-haut': ouvreVersLeHaut }"
      role="menu"
      aria-label="Apparence du site"
    >
      <div
        class="theme-switcher-choix"
        role="group"
        aria-label="Thème"
      >
        <button
          v-for="c in CHOIX"
          :key="c.valeur"
          type="button"
          :aria-pressed="themeState.theme === c.valeur"
          :class="{ 'theme-switcher-choix-actif': themeState.theme === c.valeur }"
          @click="choisir(c.valeur)"
        >
          <svg
            v-if="c.valeur === 'light'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="4"
            />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <svg
            v-else-if="c.valeur === 'dark'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="4"
              width="20"
              height="14"
              rx="2"
            />
            <path d="M8 21h8M12 17v4" />
          </svg>
          {{ c.label }}
        </button>
      </div>

      <button
        type="button"
        class="theme-switcher-confort"
        role="switch"
        :aria-checked="confortState.actif"
        @click="basculerConfort"
      >
        Texte plus grand
        <span
          class="theme-switcher-switch"
          :class="{ 'theme-switcher-switch-actif': confortState.actif }"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-switcher {
  position: relative;
}

.theme-switcher-declencheur {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.theme-switcher-declencheur svg {
  width: 20px;
  height: 20px;
}

.theme-switcher-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1060;
  width: 220px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.theme-switcher-menu-haut {
  top: auto;
  bottom: calc(100% + 8px);
  right: auto;
  left: 0;
}

.theme-switcher-choix {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: var(--bg);
  margin-bottom: 10px;
}

.theme-switcher-choix button {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 6px 2px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.theme-switcher-choix button svg {
  width: 18px;
  height: 18px;
}

.theme-switcher-choix-actif {
  background: var(--teal) !important;
  color: var(--on-teal) !important;
}

.theme-switcher-confort {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.theme-switcher-confort:hover {
  background: var(--bg);
}

.theme-switcher-switch {
  flex-shrink: 0;
  width: 38px;
  height: 22px;
  border-radius: 50rem;
  background: var(--border);
  position: relative;
  transition: background-color 0.15s ease;
}

.theme-switcher-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface);
  transition: transform 0.15s ease;
}

.theme-switcher-switch-actif {
  background: var(--teal);
}

.theme-switcher-switch-actif::after {
  transform: translateX(16px);
}

@media (prefers-reduced-motion: reduce) {
  .theme-switcher-switch,
  .theme-switcher-switch::after {
    transition: none;
  }
}
</style>
