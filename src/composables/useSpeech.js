// Lecture à voix haute, selon la langue affichée.
//
// Français : synthèse vocale native du navigateur (Web Speech API), comme avant.
//
// Shimaoré et kibushi : la synthèse vocale des navigateurs ne connaît aucune de
// ces deux langues. Lui faire lire du shimaoré avec un moteur français ne donne
// pas un accent approximatif, mais une suite de sons faux, inutilisable pour la
// personne qui écoute. On lit donc un enregistrement humain s'il existe
// (public/audio/{langue}/{clé}.mp3), et à défaut on repasse au texte FRANÇAIS —
// jamais au texte traduit.
import { useI18n } from 'vue-i18n'
import { texteFrancais } from '../i18n'

// Le site est déployé sur un hébergement statique qui renvoie index.html (en
// 200, pas en 404) pour tout chemin inconnu. Un simple `response.ok` déclarerait
// donc "présent" un fichier audio absent, et le lecteur échouerait en silence
// sans jamais basculer sur la voix française. D'où la vérification du type de
// contenu renvoyé.
async function audioExiste(url) {
  try {
    const reponse = await fetch(url, { method: 'HEAD' })
    if (!reponse.ok) return false
    const type = reponse.headers.get('content-type') || ''
    return type.includes('audio') || type.includes('mpeg')
  } catch {
    // Hors ligne ou requête bloquée : on ne bloque pas l'utilisateur, la voix
    // française prend le relais.
    return false
  }
}

export function useSpeech() {
  const { locale } = useI18n()

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  let lecteur = null

  function arreterAudio() {
    if (!lecteur) return
    lecteur.pause()
    lecteur = null
  }

  function lireEnFrancais(texte) {
    if (!supported || !texte) return
    // Annule toute lecture en cours avant d'en démarrer une nouvelle, pour éviter
    // que deux lectures se chevauchent si on clique plusieurs fois.
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(texte)
    utterance.lang = 'fr-FR'
    window.speechSynthesis.speak(utterance)
  }

  // texte : contenu français à lire (données de la base, ou texte d'origine).
  // cle  : clé de traduction, quand la phrase provient des fichiers de langue.
  //        Sans clé, aucun enregistrement ne peut être retrouvé : on lit le
  //        français, ce qui reste correct puisque `texte` est du français.
  async function speak(texte, cle) {
    arreterAudio()

    if (locale.value === 'fr' || !cle) {
      lireEnFrancais(texte)
      return
    }

    const url = `/audio/${locale.value}/${cle}.mp3`
    if (await audioExiste(url)) {
      window.speechSynthesis?.cancel()
      lecteur = new Audio(url)
      // Échec de lecture malgré un fichier présent (format illisible, geste
      // utilisateur manquant) : on ne laisse pas l'utilisateur sans retour.
      lecteur.play().catch(() => lireEnFrancais(texteFrancais(cle)))
      return
    }

    // Pas d'enregistrement : on lit la version FRANÇAISE de cette clé, jamais la
    // traduction shimaoré ou kibushi affichée à l'écran.
    lireEnFrancais(texteFrancais(cle))
  }

  function stop() {
    arreterAudio()
    if (supported) window.speechSynthesis.cancel()
  }

  return { supported, speak, stop }
}
