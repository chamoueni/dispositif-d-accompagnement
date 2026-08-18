<script setup>
// Page dédiée "Comment ça marche" : parcours en 3 étapes, valable pour les 3 rôles.
// Chaque étape a une icône dédiée (icon) en plus de son numéro d'ordre, pour que
// le sens de l'étape se comprenne d'un coup d'œil sans lire le texte.
import IconBadge from '../components/IconBadge.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/CommentCaMarche.css'

const ETAPES = [
  {
    icon: 'profile',
    title: 'Créez votre profil',
    text: 'En tant que personne âgée, personnel de santé ou particulier, en quelques champs.',
  },
  {
    icon: 'calendar',
    title: 'Indiquez vos disponibilités',
    text: "Si vous proposez un service, précisez les jours et créneaux où vous êtes joignable.",
  },
  {
    icon: 'search',
    title: 'Trouvez la bonne personne',
    text: 'Recherchez par ville et par type de besoin, puis envoyez une demande.',
  },
  {
    icon: 'shield-check',
    title: 'Suivez votre demande',
    text: "Statut visible à chaque étape (en attente, acceptée, terminée), jusqu'à la mission terminée.",
  },
]
</script>

<template>
  <section class="how-page">
    <div class="container">
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-2">
        Comment ça marche
      </h1>
      <p class="text-muted intro-text mb-4">
        Quatre étapes suffisent pour proposer ou trouver de l'aide.
      </p>

      <!-- Cartes horizontales (icône à gauche, texte à droite) plutôt qu'une grille :
           plus facile à suivre dans l'ordre, une étape après l'autre. -->
      <div class="etapes-list">
        <div
          v-for="(e, i) in ETAPES"
          :key="e.title"
          class="etape-item-horizontal"
        >
          <IconBadge
            :name="e.icon"
            :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
          />
          <div>
            <p class="etape-step">
              Étape {{ i + 1 }}
            </p>
            <h2 class="h6 mb-1">
              {{ e.title }}
            </h2>
            <p class="text-muted small mb-0">
              {{ e.text }}
            </p>
          </div>
        </div>
      </div>

      <div class="text-center mt-5">
        <router-link
          to="/inscription"
          class="btn btn-primary btn-lg"
        >
          Commencer
        </router-link>
      </div>
    </div>
  </section>
</template>
