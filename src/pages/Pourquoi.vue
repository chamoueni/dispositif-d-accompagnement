<script setup>
// Page dédiée "Pourquoi ce dispositif" : contenu statique, pas de logique particulière.
// L'icône "connect" (même glyphe que le logo navbar) illustre le lien qui manque
// entre personnes âgées isolées et personnes prêtes à les aider.
import IconBadge from '../components/IconBadge.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/Pourquoi.css'
</script>

<template>
  <section class="context-page">
    <div class="container">
      <BackLink />
      <span class="section-label" />
      <IconBadge name="connect" />
      <h1 class="h3 mb-3">
        Pourquoi ce dispositif
      </h1>
      <p class="text-muted intro-text">
        À Mayotte comme ailleurs, beaucoup de personnes âgées peinent à trouver de l'aide pour
        les gestes du quotidien ou pour un suivi de santé régulier. Cette difficulté d'accès
        nourrit un isolement qui pourrait être évité avec un accompagnement de proximité plus
        simple à mobiliser.
      </p>
      <p class="text-muted intro-text">
        Ce dispositif a été pensé pour réduire cette distance : une plateforme unique où
        personnes âgées, personnel de santé et particuliers se retrouvent facilement, sans
        démarche compliquée.
      </p>

      <div class="text-center mt-5">
        <router-link
          to="/services"
          class="btn btn-outline-secondary btn-lg"
        >
          Voir les services proposés
        </router-link>
      </div>
    </div>
  </section>
</template>
