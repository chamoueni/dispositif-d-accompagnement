<script setup>
// Coquille commune à toutes les pages : menu + zone de contenu (router-view) + pied de page.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNav from './components/AppNav.vue'
import SosButton from './components/SosButton.vue'
// Même logo que la navbar (voir AppNav.vue), pour une identité cohérente jusqu'en bas de page.
import logo from './assets/logo.png'

const { t } = useI18n()
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
    id="contenu"
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
          {{ t('footer.description') }}
        </p>
      </div>

      <nav
        class="footer-col"
        :aria-label="t('footer.dispositif_titre')"
      >
        <p class="footer-col-title">
          {{ t('footer.dispositif_titre') }}
        </p>
        <router-link to="/pourquoi">
          {{ t('footer.pourquoi') }}
        </router-link>
        <router-link to="/services">
          {{ t('footer.services') }}
        </router-link>
        <router-link to="/pour-qui">
          {{ t('footer.pour_qui') }}
        </router-link>
        <router-link to="/atouts">
          {{ t('footer.engagements') }}
        </router-link>
      </nav>

      <nav
        class="footer-col"
        :aria-label="t('footer.compte_titre')"
      >
        <p class="footer-col-title">
          {{ t('footer.compte_titre') }}
        </p>
        <router-link to="/inscription">
          {{ t('nav.inscription') }}
        </router-link>
        <router-link to="/connexion">
          {{ t('nav.connexion') }}
        </router-link>
      </nav>

      <div class="footer-col">
        <p class="footer-col-title">
          {{ t('footer.aide_titre') }}
        </p>
        <a
          href="tel:112"
          class="footer-urgence"
        >{{ t('footer.urgence') }}</a>
        <p class="text-muted small mb-0">
          {{ t('footer.probleme') }}
        </p>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container text-center text-muted small">
        {{ t('footer.copyright', { annee: anneeCourante }) }}
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
  /* Compense la navbar en position: fixed (sortie du flux normal). La hauteur
     n'est plus codée en dur : AppNav.vue mesure la barre et publie le résultat
     dans --hauteur-nav. Elle varie avec la seconde bande (langues), le mode
     confort et le repli du titre sur deux lignes ; une valeur fixe laissait
     selon les cas un grand vide ou un titre de page masqué par la barre.
     Les 32px ajoutés reprennent les 16px dont la barre est décollée du haut,
     plus 16px d'air entre elle et le contenu. Le repli à 96px sert le temps du
     tout premier rendu, avant que la mesure ne soit faite. */
  padding-top: calc(var(--hauteur-nav, 96px) + 32px);
}

/* Cible du lien d'évitement : sans cette marge, le haut du contenu atterrirait
   sous la barre flottante après le saut. */
.app-main {
  scroll-margin-top: calc(var(--hauteur-nav, 96px) + 24px);
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
