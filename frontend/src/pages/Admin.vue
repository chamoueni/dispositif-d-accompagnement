<script setup>
// Coquille de l'espace admin : sidebar fixe + zone de contenu, chaque entrée
// du menu affichant sa propre vue via des sous-routes (/admin, /admin/comptes,
// /admin/adherents, /admin/demandes, /admin/messages — voir router/index.js
// et AdminSidebar.vue) plutôt qu'une seule longue page qui défile.
// Accès réservé (voir isAdmin dans stores/auth.js + la garde dans
// router/index.js, appliquée à la route parente donc héritée par toutes les
// sous-routes) — cette page suppose déjà que seul l'admin peut l'atteindre.
import { onMounted } from 'vue'
import { useAdminDashboard } from '../stores/adminDashboard'
import { useAdherentsStore } from '../stores/adherents'
import AdminSidebar from '../components/admin/AdminSidebar.vue'
import '../styles/Admin.css'

const dashboard = useAdminDashboard()
const adherents = useAdherentsStore()

// Chargé une seule fois ici (pas dans chaque vue) : les compteurs de la
// sidebar et le contenu des vues partagent le même état réactif.
onMounted(() => {
  dashboard.charger()
  adherents.chargerAdherents().catch(() => {})
})
</script>

<template>
  <div class="admin-shell">
    <AdminSidebar />
    <div class="admin-content">
      <router-view />
    </div>
  </div>
</template>
