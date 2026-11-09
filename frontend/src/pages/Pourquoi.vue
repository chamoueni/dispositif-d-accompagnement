<script setup>
// Page dédiée "Pourquoi ce dispositif" : contenu statique, pas de logique particulière.
// L'icône "connect" (même glyphe que le logo navbar) illustre le lien qui manque
// entre personnes âgées isolées et personnes prêtes à les aider.
import { useI18n } from 'vue-i18n'
import IconBadge from '../components/IconBadge.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/Pourquoi.css'

const { t } = useI18n()
</script>

<template>
  <section class="context-page">
    <div class="container">
      <BackLink />
      <span class="section-label" />
      <IconBadge name="connect" />
      <h1 class="h3 mb-3">
        {{ t('accueil.pourquoi.titre') }}
      </h1>
      <p class="text-muted intro-text">
        {{ t('pourquoi_page.intro_1') }}
      </p>
      <p class="text-muted intro-text">
        {{ t('pourquoi_page.intro_2') }}
      </p>

      <div class="text-center mt-5">
        <router-link
          to="/services"
          class="btn btn-outline-secondary btn-lg"
        >
          {{ t('pourquoi_page.cta') }}
        </router-link>
      </div>
    </div>
  </section>
</template>
