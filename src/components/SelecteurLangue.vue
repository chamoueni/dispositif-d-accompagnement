<script setup>
// Sélecteur de langue, posé en haut de chaque page.
//
// Les trois langues tiennent dans une bande étroite que l'on fait glisser (au
// doigt, à la molette, ou en tabulant). Gros boutons plutôt qu'une liste
// déroulante, et surtout : chaque langue reste atteignable d'un seul geste
// direct. Un sélecteur qui ferait défiler tout seul, ou un bouton unique à
// cliquer plusieurs fois, obligerait à viser une cible mouvante ou à deviner
// l'ordre — deux obstacles de plus pour le public visé.
//
// Le choix est mémorisé d'une visite à l'autre (voir i18n/index.js).
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LANGUES, enregistrerLangue } from '../i18n'
import '../styles/SelecteurLangue.css'

const { locale, t } = useI18n()

const bande = ref(null)

function changerLangue(code) {
  locale.value = code
  enregistrerLangue(code)
  // lang sur <html> : indispensable pour les lecteurs d'écran, qui changent de
  // moteur de prononciation en fonction de cet attribut.
  document.documentElement.setAttribute('lang', code)
}

// Amène la langue active dans la partie visible de la bande. Sans ça, quelqu'un
// qui revient sur le site en kibushi (dernière langue de la liste) ouvrirait la
// page sur une bande affichant "Français", sans voir que son choix est actif.
function centrerLangueActive(fluide = true) {
  const actif = bande.value?.querySelector('.est-active')
  actif?.scrollIntoView({
    inline: 'center',
    block: 'nearest',
    behavior: fluide ? 'smooth' : 'auto',
  })
}

onMounted(() => centrerLangueActive(false))
watch(locale, () => nextTick(() => centrerLangueActive()))

// Molette verticale convertie en défilement horizontal : sur une souris
// classique, c'est le seul geste disponible pour faire glisser la bande.
// On ne bloque le défilement de la page qu'en cas de besoin réel — si la bande
// est déjà en bout de course, ou si tout tient sans déborder, la page reprend
// la main, sinon la molette resterait piégée dans la barre de navigation.
function surMolette(evenement) {
  const el = bande.value
  if (!el) return

  const marge = el.scrollWidth - el.clientWidth
  if (marge <= 1) return

  const sens = evenement.deltaY
  const auDebut = sens < 0 && el.scrollLeft <= 0
  const aLaFin = sens > 0 && el.scrollLeft >= marge - 1
  if (auDebut || aLaFin) return

  evenement.preventDefault()
  el.scrollLeft += sens
}
</script>

<template>
  <div
    ref="bande"
    class="selecteur-langue"
    role="group"
    :aria-label="t('langue.choisir')"
    @wheel="surMolette"
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
