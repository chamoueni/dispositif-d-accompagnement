<script setup>
// Bouton "Retour" générique, affiché en haut des pages secondaires : repère fixe
// et toujours au même endroit pour ne jamais se sentir "perdu" dans le site.
// Utilise l'historique du navigateur (router.back()) plutôt qu'un lien fixe vers
// l'accueil, pour revenir exactement là d'où l'utilisateur vient.
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import '../styles/BackLink.css'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="back-link"
    @click="router.back()"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
    {{ t('commun.retour') }}
  </button>
</template>
