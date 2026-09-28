<script setup>
// Carte de chiffre-clé du tableau de bord admin : icône dans un rond coloré,
// gros chiffre, libellé, badge optionnel. Le composant ne fait aucun calcul :
// il affiche ce qu'on lui donne (voir AdminDashboard.vue pour les valeurs).
import AdminIcon from './AdminIcon.vue'

defineProps({
  icone: { type: String, required: true },
  tone: { type: String, default: 'teal' }, // 'teal' | 'coral' | 'ylang' | 'green'
  valeur: { type: [Number, String], required: true },
  libelle: { type: String, required: true },
  badgeTexte: { type: String, default: '' },
  badgeTone: { type: String, default: 'teal' },
  lien: { type: String, default: '' },
})
</script>

<template>
  <component
    :is="lien ? 'router-link' : 'div'"
    :to="lien || undefined"
    class="admin-card admin-stat-card"
  >
    <span
      class="admin-stat-icon"
      :class="`admin-stat-icon-${tone}`"
    >
      <AdminIcon :nom="icone" />
    </span>

    <span
      v-if="badgeTexte"
      class="admin-badge admin-stat-badge"
      :class="`admin-badge-${badgeTone}`"
    >
      {{ badgeTexte }}
    </span>
    <router-link
      v-else-if="lien"
      :to="lien"
      class="admin-link admin-stat-badge"
    >
      Voir
      <AdminIcon nom="chevron-right" />
    </router-link>

    <p class="admin-stat-valeur">
      {{ valeur }}
    </p>
    <p class="admin-stat-libelle">
      {{ libelle }}
    </p>
  </component>
</template>

<style scoped>
.admin-stat-card {
  position: relative;
  display: block;
  text-decoration: none;
  color: inherit;
}

.admin-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 18px;
  margin-bottom: 14px;
}

.admin-stat-icon-teal {
  background: var(--admin-teal-soft);
  color: var(--admin-teal);
}

.admin-stat-icon-coral {
  background: var(--admin-coral-soft);
  color: var(--admin-coral);
}

.admin-stat-icon-ylang {
  background: var(--admin-ylang-soft);
  color: var(--admin-ylang-text);
}

.admin-stat-icon-green {
  background: var(--admin-green-soft);
  color: var(--admin-green);
}

.admin-stat-badge {
  position: absolute;
  top: 20px;
  right: 20px;
}

.admin-stat-valeur {
  font-family: var(--admin-heading);
  font-size: 38px;
  font-weight: 600;
  margin: 0;
  line-height: 1.1;
}

.admin-stat-libelle {
  font-size: 14px;
  color: var(--admin-muted);
  margin: 4px 0 0;
}
</style>
