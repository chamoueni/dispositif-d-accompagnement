<script setup>
// Mot-clé mis en avant dans un titre par un dégradé anime (orange -> jaune
// doré -> teinte claire, en boucle). Composant générique : n'importe quel
// mot/texte passé en slot hérite de l'effet, réutilisable sur n'importe quel
// titre du site (pas seulement le hero de l'accueil).
import '../styles/HighlightWord.css'
</script>

<template>
  <span class="highlight-word"><slot /></span>
</template>
