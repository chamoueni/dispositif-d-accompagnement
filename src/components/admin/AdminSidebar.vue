<script setup>
// Barre latérale de l'espace admin : identité + navigation entre les 5 vues
// (chacune sa route, voir router/index.js) + carte admin connecté. Les
// compteurs viennent directement des stores partagés (adminDashboard,
// adherents) plutôt que d'être passés en props : n'importe quelle vue peut
// modifier ces données (ex. supprimer un message), la sidebar reste à jour
// sans rien recevoir explicitement.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../stores/auth'
import { useAdminDashboard } from '../../stores/adminDashboard'
import { useAdherentsStore } from '../../stores/adherents'
import AdminIcon from './AdminIcon.vue'
import ThemeSwitcher from '../ThemeSwitcher.vue'
import logo from '../../assets/logo.png'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const dashboard = useAdminDashboard()
const adherents = useAdherentsStore()

const ouvert = ref(false)

const liens = computed(() => [
  { nom: 'admin', route: '/admin', icone: 'home', texte: 'Tableau de bord' },
  { nom: 'admin-comptes', route: '/admin/comptes', icone: 'users', texte: 'Comptes', compteur: dashboard.utilisateurs.length },
  { nom: 'admin-adherents', route: '/admin/adherents', icone: 'user-plus', texte: 'Adhérents', compteur: adherents.adherents.length },
  {
    nom: 'admin-demandes',
    route: '/admin/demandes',
    icone: 'inbox',
    texte: 'Demandes & missions',
    compteur: dashboard.demandesEnAttente + dashboard.missionsEnCours,
  },
  { nom: 'admin-messages', route: '/admin/messages', icone: 'message-square', texte: 'Messages', badge: dashboard.messagesNonLus },
])

const initiales = computed(() => {
  const nom = user.value?.nom?.trim()
  if (!nom) return user.value?.email?.[0]?.toUpperCase() || '?'
  const parts = nom.split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
})

async function seDeconnecter() {
  await logout()
  router.push('/')
}
</script>

<template>
  <aside
    class="admin-sidebar"
    :class="{ 'admin-sidebar-ouvert': ouvert }"
  >
    <div class="admin-sidebar-brand">
      <img
        :src="logo"
        alt=""
        class="admin-sidebar-logo"
      >
      <div>
        <span class="admin-sidebar-brand-nom">Dispositif d’accompagnement</span>
        <span class="admin-sidebar-brand-espace">ESPACE ADMIN</span>
      </div>
      <button
        type="button"
        class="admin-sidebar-toggle"
        :aria-expanded="ouvert"
        aria-label="Afficher le menu"
        @click="ouvert = !ouvert"
      >
        <AdminIcon :nom="ouvert ? 'x' : 'menu'" />
      </button>
    </div>

    <nav class="admin-sidebar-nav">
      <router-link
        v-for="lien in liens"
        :key="lien.nom"
        :to="lien.route"
        class="admin-sidebar-link"
        :class="{ 'admin-sidebar-link-active': route.name === lien.nom }"
        @click="ouvert = false"
      >
        <AdminIcon
          :nom="lien.icone"
          class="admin-sidebar-link-icon"
        />
        {{ lien.texte }}
        <span
          v-if="lien.badge"
          class="admin-sidebar-badge"
        >{{ lien.badge }}</span>
        <span
          v-else-if="lien.compteur !== undefined"
          class="admin-sidebar-link-compteur"
        >{{ lien.compteur }}</span>
      </router-link>
    </nav>

    <div class="admin-sidebar-spacer" />

    <div class="admin-sidebar-foot">
      <ThemeSwitcher ouvre-vers-le-haut />

      <div class="admin-sidebar-compte">
        <span class="admin-sidebar-avatar">{{ initiales }}</span>
        <div>
          <p class="admin-sidebar-compte-nom mb-0">
            {{ user?.nom || user?.email }}
          </p>
          <p class="admin-sidebar-compte-role mb-0">
            Administrateur
          </p>
        </div>
        <button
          type="button"
          class="admin-sidebar-logout"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          @click="seDeconnecter"
        >
          <AdminIcon nom="log-out" />
        </button>
      </div>
      <router-link
        to="/"
        class="admin-sidebar-retour"
      >
        <AdminIcon nom="arrow-left" />
        Retour au site
      </router-link>
    </div>
  </aside>
</template>
