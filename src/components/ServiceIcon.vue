<script setup>
// Icône ronde illustrant un service (croix médicale / sac de courses / maison).
// Dessinée en SVG inline pour éviter une dépendance à une librairie d'icônes.
import '../styles/ServiceIcon.css'

defineProps({
  type: {
    type: String,
    required: true,
    validator: (v) =>
      ['soins', 'courses', 'menage', 'garde', 'psychologique'].includes(v),
  },
  // 'light' : rond blanc translucide, pour poser l'icône sur une photo plutôt
  // que sur un fond de carte uni (voir la grille "Ce que vous pouvez trouver"
  // sur l'accueil, où chaque carte a maintenant une photo en fond).
  tone: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'light'].includes(v),
  },
})
</script>

<template>
  <span
    class="service-icon"
    :class="[tone === 'light' ? 'service-icon-light' : `service-icon-${type}`]"
    aria-hidden="true"
  >
    <svg
      v-if="type === 'soins'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3v6M9 6h6" />
      <path d="M6 9v4a6 6 0 0 0 12 0V9" />
      <circle
        cx="19"
        cy="8"
        r="2"
      />
    </svg>
    <svg
      v-else-if="type === 'courses'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
    <svg
      v-else-if="type === 'menage'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
    <svg
      v-else-if="type === 'garde'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3.5 2" />
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M20.8 8.6c0 4.5-8.8 10.4-8.8 10.4S3.2 13.1 3.2 8.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z" />
    </svg>
  </span>
</template>
