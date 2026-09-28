<script setup>
// Icônes traits fins de l'espace admin (même esprit que IconeAction.vue côté
// site public) : un seul composant plutôt qu'une librairie externe, pour
// rester cohérent avec le reste du projet.
defineProps({
  nom: { type: String, required: true },
})
</script>

<template>
  <svg
    class="admin-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="nom === 'home'">
      <path d="M3 9 12 2l9 7" />
      <path d="M5 9v11a1 1 0 0 0 1 1h4v-7h4v7h4a1 1 0 0 0 1-1V9" />
    </template>
    <template v-else-if="nom === 'users'">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle
        cx="9"
        cy="7"
        r="4"
      />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>
    <template v-else-if="nom === 'user-plus'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle
        cx="8.5"
        cy="7"
        r="4"
      />
      <line
        x1="20"
        y1="8"
        x2="20"
        y2="14"
      />
      <line
        x1="23"
        y1="11"
        x2="17"
        y2="11"
      />
    </template>
    <template v-else-if="nom === 'inbox'">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </template>
    <template v-else-if="nom === 'message-square'">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </template>
    <template v-else-if="nom === 'mail'">
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
      />
      <polyline points="22 6 12 13 2 6" />
    </template>
    <template v-else-if="nom === 'clock'">
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <polyline points="12 6 12 12 16 14" />
    </template>
    <template v-else-if="nom === 'heart'">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </template>
    <template v-else-if="nom === 'edit'">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </template>
    <template v-else-if="nom === 'trash'">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line
        x1="10"
        y1="11"
        x2="10"
        y2="17"
      />
      <line
        x1="14"
        y1="11"
        x2="14"
        y2="17"
      />
    </template>
    <template v-else-if="nom === 'search'">
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
    <template v-else-if="nom === 'plus'">
      <line
        x1="12"
        y1="5"
        x2="12"
        y2="19"
      />
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
      />
    </template>
    <template v-else-if="nom === 'chevron-right'">
      <polyline points="9 18 15 12 9 6" />
    </template>
    <template v-else-if="nom === 'arrow-left'">
      <line
        x1="19"
        y1="12"
        x2="5"
        y2="12"
      />
      <polyline points="12 19 5 12 12 5" />
    </template>
    <template v-else-if="nom === 'log-out'">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line
        x1="21"
        y1="12"
        x2="9"
        y2="12"
      />
    </template>
    <template v-else-if="nom === 'check-circle'">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </template>
    <template v-else-if="nom === 'x'">
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
      />
      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
      />
    </template>
    <template v-else-if="nom === 'menu'">
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
      />
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
      />
      <line
        x1="3"
        y1="18"
        x2="21"
        y2="18"
      />
    </template>
  </svg>
</template>

<style scoped>
.admin-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
</style>
