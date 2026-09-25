<script setup>
// Page dédiée "Nos engagements" : contenu statique, pas de logique particulière.
// Une icône par engagement (icon) pour rendre les 3 points scannables sans tout lire.
// Réutilise les clés accueil.engagements.* (même contenu que le bloc "Nos
// engagements" de l'accueil) plutôt que de dupliquer une traduction identique.
import { useI18n } from 'vue-i18n'
import IconBadge from '../components/IconBadge.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/Atouts.css'

const { t } = useI18n()

const VALEURS = [
  { icon: 'shield-check', titleKey: 'securite_titre', textKey: 'securite_texte' },
  { icon: 'connect', titleKey: 'fiabilite_titre', textKey: 'fiabilite_texte' },
  { icon: 'calendar', titleKey: 'dispo_titre', textKey: 'dispo_texte' },
]
</script>

<template>
  <section class="values-page">
    <div class="container text-center">
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-4">
        {{ t('accueil.engagements.titre') }}
      </h1>
      <div class="row g-4 justify-content-center mb-4">
        <div
          v-for="(v, i) in VALEURS"
          :key="v.titleKey"
          class="col-md-4"
        >
          <IconBadge
            :name="v.icon"
            :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
          />
          <h2 class="h6 mb-1">
            {{ t(`accueil.engagements.${v.titleKey}`) }}
          </h2>
          <p class="text-muted small">
            {{ t(`accueil.engagements.${v.textKey}`) }}
          </p>
        </div>
      </div>
      <p class="lead text-muted mb-4">
        {{ t('accueil.engagements.phrase') }}
      </p>
      <router-link
        to="/inscription"
        class="btn btn-primary btn-lg"
      >
        {{ t('accueil.engagements.cta') }}
      </router-link>
    </div>
  </section>
</template>
