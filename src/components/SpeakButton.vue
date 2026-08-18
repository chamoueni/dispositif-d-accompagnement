<script setup>
// Bouton "Écouter" : fait lire un texte à voix haute via la synthèse vocale du
// navigateur. Invisible si l'API n'est pas supportée (pas de bouton mort qui ne
// ferait rien au clic).
import { useSpeech } from '../composables/useSpeech'
import '../styles/SpeakButton.css'

defineProps({
  text: {
    type: String,
    required: true,
  },
})

const { supported, speak } = useSpeech()
</script>

<template>
  <button
    v-if="supported"
    type="button"
    class="speak-button"
    aria-label="Écouter cette fiche"
    @click="speak(text)"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    </svg>
    Écouter
  </button>
</template>
