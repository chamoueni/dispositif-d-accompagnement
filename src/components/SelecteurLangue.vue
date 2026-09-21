<script setup>
// Sélecteur de langue, posé en haut de chaque page. Trois gros boutons plutôt
// qu'une liste déroulante : le public visé est âgé, et une liste déroulante
// oblige à viser deux fois (ouvrir, puis choisir) sur une cible étroite.
// Le choix est mémorisé d'une visite à l'autre (voir i18n/index.js).
import { useI18n } from 'vue-i18n'
import { LANGUES, enregistrerLangue } from '../i18n'
import '../styles/SelecteurLangue.css'

const { locale, t } = useI18n()

function changerLangue(code) {
  locale.value = code
  enregistrerLangue(code)
  // lang sur <html> : indispensable pour les lecteurs d'écran, qui changent de
  // moteur de prononciation en fonction de cet attribut.
  document.documentElement.setAttribute('lang', code)
}
</script>

<template>
  <div
    class="selecteur-langue"
    role="group"
    :aria-label="t('langue.choisir')"
  >
    <button
      v-for="langue in LANGUES"
      :key="langue.code"
      type="button"
      class="langue-bouton"
      :class="{ 'est-active': locale === langue.code }"
      :aria-pressed="locale === langue.code"
      :lang="langue.code"
      @click="changerLangue(langue.code)"
    >
      {{ langue.libelle }}
    </button>
  </div>
</template>
