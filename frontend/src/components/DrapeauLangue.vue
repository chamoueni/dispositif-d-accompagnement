<script setup>
// Icône de langue posée dans le sélecteur (voir SelecteurLangue.vue).
// Remplace les emoji drapeau (🇫🇷/🇾🇹) : ils ne s'affichent pas comme de vrais
// drapeaux sur tous les systèmes (Windows notamment les rend en texte
// "FR"/"YT" faute de police emoji adaptée), d'où ces SVG dessinés à la main.
// Pas de drapeau officiel pour le shimaoré/kibushi (langues locales, pas de
// pays associé) : la silhouette de l'île (même dessin que MayotteSymbol.vue)
// sert de repère visuel pour les deux, comme pour le drapeau français côté "fr".
defineProps({
  code: { type: String, required: true }, // 'fr' | 'shi' | 'kib'
})
</script>

<template>
  <svg
    v-if="code === 'fr'"
    class="drapeau-langue drapeau-langue-fr"
    viewBox="0 0 30 20"
    aria-hidden="true"
  >
    <rect
      width="30"
      height="20"
      fill="#ED2939"
    />
    <rect
      width="20"
      height="20"
      fill="#fff"
    />
    <rect
      width="10"
      height="20"
      fill="#002395"
    />
  </svg>
  <svg
    v-else
    class="drapeau-langue drapeau-langue-mayotte"
    viewBox="0 0 140 140"
    aria-hidden="true"
  >
    <path d="M52 22c10-4 22-2 28 6 5 7 4 15 10 20 7 6 9 15 4 23-4 7-13 9-19 15-7 7-9 17-18 20-9 3-19-2-24-10-4-7-2-15-6-22-5-8-11-14-9-23 2-10 12-14 16-22 4-8 8-23 18-27Z" />
    <circle
      cx="104"
      cy="96"
      r="11"
    />
  </svg>
</template>

<style scoped>
.drapeau-langue {
  flex-shrink: 0;
  border-radius: 3px;
}

.drapeau-langue-fr {
  width: 20px;
  height: 14px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12) inset;
}

.drapeau-langue-mayotte {
  width: 17px;
  height: 17px;
}

.drapeau-langue-mayotte path,
.drapeau-langue-mayotte circle {
  fill: currentColor;
}
</style>
