<script setup>
// Page "Mon compte" (/mon-compte) : hub qui regroupe les liens vers l'espace
// personnel (profil, demandes, accompagnements, historique). Uniquement les
// sections effectivement construites : pas de lien vers "Notifications" ou
// "Inviter ma famille" tant que ces fonctionnalités n'existent pas côté
// données, pour ne jamais mener vers une page vide.
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import IconBadge from '../components/IconBadge.vue'
import '../styles/MonCompte.css'

const { user, logout } = useAuth()
const router = useRouter()

const LIENS = [
  { to: '/profil', icon: 'profile', titre: 'Mon profil', texte: 'Vos informations et vos disponibilités.' },
  { to: '/mes-demandes', icon: 'connect', titre: 'Mes demandes', texte: 'Demandes envoyées ou reçues, et leur statut.' },
  { to: '/mes-accompagnements', icon: 'calendar', titre: 'Mes accompagnements', texte: 'Vos missions en cours.' },
  { to: '/historique', icon: 'shield-check', titre: 'Historique', texte: 'Vos missions terminées ou annulées.' },
]

async function seDeconnecter() {
  await logout()
  router.push('/')
}
</script>

<template>
  <section class="mon-compte-page">
    <div class="container">
      <div class="d-flex align-items-center gap-2 mb-4">
        <h1 class="h3 mb-0">
          Mon compte
        </h1>
        <span class="text-muted">— {{ user?.nom || user?.email }}</span>
      </div>

      <div class="row g-4">
        <div
          v-for="lien in LIENS"
          :key="lien.to"
          class="col-sm-6 col-lg-3"
        >
          <router-link
            :to="lien.to"
            class="card p-4 h-100 compte-tile"
          >
            <IconBadge :name="lien.icon" />
            <h2 class="h6 mb-1">
              {{ lien.titre }}
            </h2>
            <p class="text-muted small mb-0">
              {{ lien.texte }}
            </p>
          </router-link>
        </div>
      </div>

      <button
        type="button"
        class="btn btn-outline-secondary mt-4"
        @click="seDeconnecter"
      >
        Déconnexion
      </button>
    </div>
  </section>
</template>
