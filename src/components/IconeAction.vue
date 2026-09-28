<script setup>
// Petites icônes d'action, à poser devant un libellé (titre de page, bouton...).
// Remplacent les emoji qui étaient écrits en dur dans les traductions
// (🧾 📅 🔄 🔎 ✎) : un emoji ne s'affiche pas de la même façon selon la police
// système (couleurs différentes, parfois un rectangle vide), alors qu'un SVG
// en currentColor reste net et suit la couleur du texte comme le chevron/la
// coche déjà utilisés dans SelecteurLangue.vue.
defineProps({
  nom: { type: String, required: true }, // 'historique' | 'calendrier' | 'refaire' | 'recherche' | 'crayon'
})
</script>

<template>
  <svg
    class="icone-action"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="nom === 'historique'">
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
      />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </template>
    <template v-else-if="nom === 'calendrier'">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </template>
    <template v-else-if="nom === 'refaire'">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </template>
    <template v-else-if="nom === 'recherche'">
      <circle
        cx="11"
        cy="11"
        r="8"
      />
      <line
        x1="21"
        y1="21"
        x2="16.65"
        y2="16.65"
      />
    </template>
    <template v-else-if="nom === 'crayon'">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </template>
  </svg>
</template>

<style scoped>
.icone-action {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  vertical-align: -0.15em;
}
</style>
