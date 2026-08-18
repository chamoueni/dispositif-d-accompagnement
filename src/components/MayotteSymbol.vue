<script setup>
// Symbole décoratif représentant Mayotte : silhouette stylisée de l'île (Grande-Terre
// + Petite-Terre) entourée du lagon, en ligne blanche semi-transparente. Dessin
// original (pas une reproduction d'un logo officiel) — juste de quoi ancrer
// visuellement la page dans l'île, comme demandé dans le cahier des charges.
import '../styles/MayotteSymbol.css'
</script>

<template>
  <svg
    class="mayotte-symbol"
    viewBox="0 0 140 140"
    aria-hidden="true"
  >
    <!-- Lagon / barrière de corail : anneau en pointillés autour des deux îles. -->
    <ellipse
      cx="68"
      cy="70"
      rx="62"
      ry="58"
      class="mayotte-lagon"
    />
    <!-- Grande-Terre : silhouette irrégulière, dessinée à la main. -->
    <path
      d="M52 22c10-4 22-2 28 6 5 7 4 15 10 20 7 6 9 15 4 23-4 7-13 9-19 15-7 7-9 17-18 20-9 3-19-2-24-10-4-7-2-15-6-22-5-8-11-14-9-23 2-10 12-14 16-22 4-8 8-23 18-27Z"
      class="mayotte-land"
    />
    <!-- Petite-Terre : îlot secondaire, en bas à droite du lagon. -->
    <circle
      cx="104"
      cy="96"
      r="11"
      class="mayotte-land"
    />
  </svg>
</template>
