// Reconnaissance vocale native (Web Speech API) pour dicter du texte au lieu de le
// taper. Support inégal selon les navigateurs (fiable sur Chrome/Edge, absent sur
// Firefox) : `supported` doit être vérifié avant d'afficher un bouton de dictée.
import { ref } from 'vue'

export function useVoiceInput() {
  const SpeechRecognitionCtor =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const supported = Boolean(SpeechRecognitionCtor)
  const listening = ref(false)

  // Démarre une écoute unique (pas de mode continu) : dès qu'une phrase est
  // reconnue, onResult(transcript) est appelé et l'écoute s'arrête d'elle-même.
  function start(onResult) {
    if (!supported || listening.value) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      onResult(event.results[0][0].transcript)
    }
    recognition.onerror = () => {
      listening.value = false
    }
    recognition.onend = () => {
      listening.value = false
    }

    listening.value = true
    recognition.start()
  }

  return { supported, listening, start }
}
