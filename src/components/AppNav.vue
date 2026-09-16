<script setup>
// Barre de navigation Bootstrap. Les liens et boutons affichés dépendent de l'état
// de connexion et du rôle de l'utilisateur (useAuth), pas de props : le composant
// se branche directement sur le store d'auth global.
//
// Le menu marketing (Services, Pour qui...) n'a de sens que pour un visiteur pas
// encore connecté : une fois connecté (quel que soit le rôle), il est remplacé
// par un menu réduit à l'essentiel avec pictogrammes, pour ne pas surcharger la
// barre avec des liens de présentation qui ne servent plus à rien à ce stade.
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useAccessibility } from '../stores/accessibility'
import IconBadge from './IconBadge.vue'
// Logo fourni par l'utilisateur (rond teal, cœur + sourire) : remplace l'icône
// coeur codée en SVG à la main, réutilisée aussi comme favicon (voir index.html).
import logo from '../assets/logo.png'
import '../styles/AppNav.css'

const ROLE_LABELS = {
  senior: 'Personne âgée',
  sante: 'Personnel de santé',
  particulier: 'Particulier',
}

const { user, isAdmin, logout } = useAuth()
const { state: accessibilite, toggle: toggleAccessibilite } = useAccessibility()
const router = useRouter()

function handleLogout() {
  logout()
  router.push('/')
}
</script>

<template>
  <header class="app-nav navbar navbar-expand-lg">
    <div class="container">
      <router-link
        to="/"
        class="navbar-brand"
      >
        <img
          :src="logo"
          alt=""
          class="brand-logo"
        >
        <span class="brand-text">Dispositif d’accompagnement</span>
      </router-link>

      <!-- Bouton "burger" mobile : ouvre/ferme #navMain via l'API JS de Bootstrap. -->
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navMain"
        aria-controls="navMain"
        aria-expanded="false"
        aria-label="Ouvrir la navigation"
      >
        <span class="navbar-toggler-icon" />
      </button>

      <div
        id="navMain"
        class="collapse navbar-collapse"
      >
        <!-- Menu réduit pour toute personne connectée (hors admin) : Mon profil,
             plus Recherche pour une personne âgée (seul rôle qui utilise cette
             page). L'admin a son propre espace (sidebar dédiée), donc ces liens
             ne lui servent à rien ici. "Accueil" n'est plus listé ici : le logo
             de la navbar (cliquable, voir plus haut) fait déjà ce lien. -->
        <ul
          v-if="user && !isAdmin"
          class="navbar-nav me-auto"
        >
          <li
            v-if="user.role === 'senior'"
            class="nav-item"
          >
            <router-link
              to="/recherche"
              class="nav-link"
            >
              <IconBadge
                name="search"
                compact
              />Trouver de l'aide
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="/mon-compte"
              class="nav-link"
            >
              <IconBadge
                name="profile"
                compact
              />Mon compte
            </router-link>
          </li>
        </ul>

        <!-- Menu complet (présentation du dispositif), uniquement pour un visiteur
             pas encore connecté. "Accueil" retiré ici aussi : le logo cliquable
             de la navbar y mène déjà. -->
        <ul
          v-else-if="!user"
          class="navbar-nav me-auto"
        >
          <li class="nav-item">
            <router-link
              to="/services"
              class="nav-link"
            >
              Services
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="/pour-qui"
              class="nav-link"
            >
              Pour qui
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="/comment-ca-marche"
              class="nav-link"
            >
              Comment ça marche
            </router-link>
          </li>
        </ul>

        <div class="nav-actions">
          <template v-if="!user">
            <router-link
              to="/connexion"
              class="btn btn-outline-secondary btn-sm"
            >
              Connexion
            </router-link>
          </template>

          <!-- Mode confort : texte et boutons agrandis dans tout le site (voir index.css). -->
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm confort-toggle"
            :aria-pressed="accessibilite.actif"
            @click="toggleAccessibilite"
          >
            <span aria-hidden="true">Aa</span>
            <span class="visually-hidden-focusable"> Mode confort</span>
          </button>

          <template v-if="user">
            <router-link
              v-if="isAdmin"
              to="/admin"
              class="btn btn-outline-secondary btn-sm"
            >
              Admin
            </router-link>
            <span
              v-if="!isAdmin"
              class="badge text-bg-light border badge-role"
            >{{ ROLE_LABELS[user.role] }}</span>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="handleLogout"
            >
              Déconnexion
            </button>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
