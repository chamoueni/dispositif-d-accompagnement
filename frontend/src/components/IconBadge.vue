<script setup>
// Icône ronde générique (même style que ServiceIcon) pour illustrer une étape,
// un atout ou une idée, sans dépendre d'une librairie d'icônes externe.
import '../styles/IconBadge.css'

defineProps({
  name: {
    type: String,
    required: true,
    validator: (v) =>
      [
        'profile',
        'calendar',
        'search',
        'map-pin',
        'bolt',
        'shield-check',
        'connect',
        'home',
        'phone',
      ].includes(v),
  },
  tone: {
    type: String,
    default: 'accent',
    validator: (v) => ['accent', 'accent-2'].includes(v),
  },
  // Variante sans le fond rond, pour un usage en ligne (ex. à côté d'un lien de menu)
  // plutôt qu'en illustration de carte.
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <span
    class="icon-badge"
    :class="[`icon-badge-${tone}`, { 'icon-badge-compact': compact }]"
    aria-hidden="true"
  >
    <svg
      v-if="name === 'profile'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
    <svg
      v-else-if="name === 'calendar'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
    <svg
      v-else-if="name === 'search'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m21 21-4.3-4.3" />
    </svg>
    <svg
      v-else-if="name === 'map-pin'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" />
      <circle
        cx="12"
        cy="9.5"
        r="2.3"
      />
    </svg>
    <svg
      v-else-if="name === 'bolt'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
    <svg
      v-else-if="name === 'shield-check'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 3 4.5 5.5v6c0 4.6 3.2 7.9 7.5 9.5 4.3-1.6 7.5-4.9 7.5-9.5v-6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
    <svg
      v-else-if="name === 'home'"
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
      v-else-if="name === 'phone'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
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
