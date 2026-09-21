<script setup>
// Bouton "Écouter" : lit un texte à voix haute. Invisible si la synthèse vocale
// n'est pas supportée (pas de bouton mort qui ne ferait rien au clic).
//
// En shimaoré ou en kibushi, la lecture passe par un enregistrement humain si la
// clé `cle` est fournie et que le fichier existe ; sinon c'est le texte français
// qui est lu. Voir composables/useSpeech.js pour le détail de cette règle.
import { useI18n } from 'vue-i18n'
import { useSpeech } from '../composables/useSpeech'
import '../styles/SpeakButton.css'

defineProps({
  // Texte français à lire. Pour les contenus venant de la base (fiche d'un
  // aidant...), c'est déjà du français : le lire avec la voix française est
  // correct, même quand l'interface est affichée dans une autre langue.
  text: {
    type: String,
    required: true,
  },
  // Clé de traduction, quand la phrase vient des fichiers de langue. C'est elle
  // qui permet de retrouver l'enregistrement public/audio/{langue}/{cle}.mp3.
  cle: {
    type: String,
    default: '',
  },
})

const { t } = useI18n()
const { supported, speak } = useSpeech()
</script>

<template>
  <button
    v-if="supported"
    type="button"
    class="speak-button"
    :aria-label="t('vocal.aria')"
    @click="speak(text, cle)"
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
    {{ t('vocal.ecouter') }}
  </button>
</template>
