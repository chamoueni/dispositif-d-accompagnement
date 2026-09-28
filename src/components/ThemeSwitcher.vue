<script setup>
// Sélecteur d'apparence, réutilisé tel quel dans AppNav.vue (site public) et
// AdminSidebar.vue (espace admin) : un seul composant, un seul état (voir
// composables/useTheme.js), donc passer en sombre depuis l'accueil s'applique
// aussi à l'admin et inversement.
//
// Deux boutons ronds côte à côte, chacun à bascule directe en un clic (pas de
// menu à ouvrir) : thème clair/sombre, puis mode confort ("Aa", texte plus
// grand). Le mode "Auto" n'est plus choisissable ici : il reste la valeur par
// défaut tant que l'utilisateur n'a pas cliqué sur le bouton thème (voir
// useTheme.js, state.theme vaut 'auto' au départ).
import { useTheme } from '../composables/useTheme'
import { useAccessibility } from '../stores/accessibility'

const { state: themeState, definirTheme } = useTheme()
const { state: confortState, toggle: basculerConfort } = useAccessibility()

// Si le thème était sur "auto", ce premier clic le fige sur le contraire de
// ce qui était affiché à l'instant, plutôt que de repartir d'un état arbitraire.
function basculerThemeDirect() {
  definirTheme(themeState.effectif === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <div class="theme-switcher">
    <!-- Bouton thème : rond, bascule tout de suite entre clair et sombre. -->
    <button
      type="button"
      class="theme-switcher-bouton"
      :aria-pressed="themeState.effectif === 'dark'"
      :aria-label="themeState.effectif === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
      :title="themeState.effectif === 'dark' ? 'Mode clair' : 'Mode sombre'"
      @click="basculerThemeDirect"
    >
      <svg
        v-if="themeState.effectif === 'dark'"
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

    <!-- Bouton confort : rond, bascule tout de suite "Texte plus grand". -->
    <button
      type="button"
      class="theme-switcher-bouton theme-switcher-confort"
      :aria-pressed="confortState.actif"
      aria-label="Texte plus grand"
      title="Texte plus grand"
      @click="basculerConfort"
    >
      Aa
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
}

.theme-switcher-bouton {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--teal);
  cursor: pointer;
}

.theme-switcher-bouton:hover {
  border-color: var(--teal);
}

.theme-switcher-bouton svg {
  width: 22px;
  height: 22px;
}

.theme-switcher-confort {
  font-family: var(--heading);
  font-size: 15px;
  font-weight: 700;
  color: var(--muted);
}

.theme-switcher-confort[aria-pressed='true'] {
  border-color: var(--teal);
  color: var(--teal);
  background: var(--teal-soft);
}
</style>
