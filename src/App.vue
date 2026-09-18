<script setup>
// Coquille commune à toutes les pages : menu + zone de contenu (router-view) + pied de page.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './components/AppNav.vue'
import SosButton from './components/SosButton.vue'
// Même logo que la navbar (voir AppNav.vue), pour une identité cohérente jusqu'en bas de page.
import logo from './assets/logo.png'

const route = useRoute()

// L'espace admin (tableau de bord + sa connexion dédiée) construit sa propre
// mise en page (sidebar, voir pages/Admin.vue) : pas de navbar/footer du site
// public autour, pour que ça se comporte comme un site à part.
const estEspaceAdmin = computed(() => route.name === 'admin' || route.name === 'admin-connexion')

const anneeCourante = new Date().getFullYear()
</script>

<template>
  <AppNav v-if="!estEspaceAdmin" />
  <main
    class="app-main"
    :class="{ 'app-main-admin': estEspaceAdmin }"
  >
    <!-- Le composant affiché ici change selon la route active (voir src/router). -->
    <router-view />
  </main>
  <footer
    v-if="!estEspaceAdmin"
    class="app-footer"
  >
    <div class="container footer-grid">
      <div class="footer-brand">
        <span class="footer-logo">
          <img
            :src="logo"
            alt=""
          >
          <span class="brand-text">Dispositif d’accompagnement</span>
        </span>
        <p class="text-muted small mb-0">
          Aide aux personnes âgées à Mayotte : soins, courses, ménage et service de garde,
          avec du personnel de santé et des particuliers de confiance.
        </p>
      </div>

      <nav
        class="footer-col"
        aria-label="Le dispositif"
      >
        <p class="footer-col-title">
          Le dispositif
        </p>
        <router-link to="/pourquoi">
          Pourquoi ce dispositif
        </router-link>
        <router-link to="/services">
          Nos services
        </router-link>
        <router-link to="/pour-qui">
          Pour qui
        </router-link>
        <router-link to="/atouts">
          Nos engagements
        </router-link>
      </nav>

      <nav
        class="footer-col"
        aria-label="Votre compte"
      >
        <p class="footer-col-title">
          Votre compte
        </p>
        <router-link to="/inscription">
          S'inscrire
        </router-link>
        <router-link to="/connexion">
          Connexion
        </router-link>
      </nav>

      <div class="footer-col">
        <p class="footer-col-title">
          Besoin d'aide
        </p>
        <a
          href="tel:112"
          class="footer-urgence"
        >Urgence : 112</a>
        <p class="text-muted small mb-0">
          Un souci avec le site ? Utilisez le bouton SOS en bas de l'écran.
        </p>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container text-center text-muted small">
        © {{ anneeCourante }} Dispositif d'accompagnement personnalisé — Mayotte
      </div>
    </div>
  </footer>

  <!-- Bouton SOS visible dans tout le site public, y compris les pages de
       présentation, pour orienter les visiteurs et répondre rapidement aux
       questions sans dépendre d'un compte utilisateur. -->
  <SosButton v-if="!estEspaceAdmin" />
</template>

<style scoped>
.app-main {
  flex: 1 1 auto;
  /* Compense la navbar en position: fixed (sortie du flux normal). */
  padding-top: 96px;
}

.app-main-admin {
  /* Pas de navbar fixe au-dessus dans l'espace admin : pas besoin de compenser. */
  padding-top: 0;
}

.app-footer {
  border-top: 1px solid var(--border);
  background: var(--bg-alt);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 32px;
  padding: 48px 0 32px;
}

@media (max-width: 767px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}

.footer-brand {
  max-width: 320px;
}

.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.footer-logo img {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.footer-brand .brand-text {
  font-family: var(--heading);
  font-weight: 700;
  color: var(--text-h);
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-h);
  margin-bottom: 4px;
}

.footer-col a {
  color: var(--text);
  text-decoration: none;
  font-size: 14px;
}

.footer-col a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.footer-urgence {
  font-weight: 700;
  color: var(--danger) !important;
}

.footer-bottom {
  border-top: 1px solid var(--border);
  padding: 16px 0;
}
</style>
