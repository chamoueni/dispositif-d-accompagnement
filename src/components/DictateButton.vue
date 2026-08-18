<script setup>
// Bouton micro : dicte du texte à voix haute plutôt que de le taper (utile pour
// formuler une demande sans clavier). Émet "dictate" avec le texte reconnu ;
// invisible si la reconnaissance vocale n'est pas supportée par le navigateur.
import { useVoiceInput } from '../composables/useVoiceInput'
import '../styles/DictateButton.css'

const emit = defineEmits(['dictate'])

const { supported, listening, start } = useVoiceInput()

function handleClick() {
  start((transcript) => emit('dictate', transcript))
}
</script>

<template>
  <button
    v-if="supported"
    type="button"
    class="dictate-button"
    :class="{ 'dictate-button-active': listening }"
    :aria-label="listening ? 'Écoute en cours' : 'Dicter le message'"
    @click="handleClick"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
      />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
    {{ listening ? 'Je vous écoute…' : 'Dicter' }}
  </button>
</template>
