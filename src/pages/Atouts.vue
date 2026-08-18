<script setup>
// Page dédiée "Nos engagements" : contenu statique, pas de logique particulière.
// Une icône par engagement (icon) pour rendre les 3 points scannables sans tout lire.
import IconBadge from '../components/IconBadge.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/Atouts.css'

const VALEURS = [
  {
    icon: 'shield-check',
    title: 'Sécurité',
    text: 'Chaque profil précise le rôle, les services et les disponibilités avant tout contact, pour savoir à qui vous avez affaire.',
  },
  {
    icon: 'connect',
    title: 'Fiabilité',
    text: 'Des profils actifs et à jour, pour des mises en relation qui aboutissent vraiment.',
  },
  {
    icon: 'calendar',
    title: 'Disponibilité',
    text: 'Des aidants joignables aux horaires qui vous conviennent, y compris en dehors des heures classiques.',
  },
]
</script>

<template>
  <section class="values-page">
    <div class="container text-center">
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-4">
        Nos engagements
      </h1>
      <div class="row g-4 justify-content-center mb-4">
        <div
          v-for="(v, i) in VALEURS"
          :key="v.title"
          class="col-md-4"
        >
          <IconBadge
            :name="v.icon"
            :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
          />
          <h2 class="h6 mb-1">
            {{ v.title }}
          </h2>
          <p class="text-muted small">
            {{ v.text }}
          </p>
        </div>
      </div>
      <p class="lead text-muted mb-4">
        Un dispositif pensé pour le bien-être et l'autonomie des personnes âgées.
      </p>
      <router-link
        to="/inscription"
        class="btn btn-primary btn-lg"
      >
        Rejoindre le dispositif
      </router-link>
    </div>
  </section>
</template>
