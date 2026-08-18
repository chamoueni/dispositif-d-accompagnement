// Petit wrapper autour de la Web Speech API (synthèse vocale native du navigateur,
// aucune dépendance/librairie externe). Support correct sur Chrome/Edge/Safari ;
// absent sur certains navigateurs, d'où le drapeau `supported` à vérifier avant
// d'afficher un bouton "Écouter".
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  function speak(text) {
    if (!supported || !text) return
    // Annule toute lecture en cours avant d'en démarrer une nouvelle, pour éviter
    // que deux lectures se chevauchent si on clique plusieurs fois.
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (supported) window.speechSynthesis.cancel()
  }

  return { supported, speak, stop }
}
