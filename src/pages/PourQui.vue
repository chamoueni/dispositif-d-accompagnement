<script setup>
// Page dédiée "Pour qui" : présente les 3 profils du dispositif.
// Photos Unsplash (licence gratuite), crédit affiché sous chaque carte.
import BackLink from '../components/BackLink.vue'
import '../styles/PourQui.css'

const PUBLICS = [
  {
    title: 'Personnes âgées',
    text: "Vous cherchez un coup de main pour les soins, les courses ou le ménage, sans avoir à démarcher vous-même.",
    photo: 'https://images.unsplash.com/photo-1752084794888-0b27a762b6fd?w=600&h=400&fit=crop&auto=format&q=80',
    credit: 'Chanika Dulnitha',
  },
  {
    title: 'Personnel de santé',
    text: 'Vous êtes infirmier, aide-soignant ou kiné et souhaitez proposer vos soins à domicile selon vos disponibilités.',
    photo: 'https://images.unsplash.com/photo-1762955911431-4c44c7c3f408?w=600&h=400&fit=crop&auto=format&q=80',
    credit: 'Age Cymru',
  },
  {
    title: 'Particuliers',
    text: 'Vous voulez rendre service comme coursier ou pour du ménage, près de chez vous et à votre rythme.',
    photo: 'https://images.unsplash.com/photo-1572195577046-2f25894c06fc?w=600&h=400&fit=crop&auto=format&q=80',
    credit: 'Lucian Alexe',
  },
]

const TEMOIGNAGES = [
  {
    auteur: 'Marie, 72 ans',
    texte: 'J’ai trouvé une aide très rapidement pour les courses et une présence rassurante. Le service est simple et bien accompagné.',
  },
  {
    auteur: 'Rachida, famille d’un proche',
    texte: 'Le dispositif a permis de repérer une aide fiable près de chez nous, sans devoir tout organiser nous-mêmes.',
  },
  {
    auteur: 'Said, infirmier',
    texte: 'Je peux proposer facilement mes disponibilités et aider des personnes qui ont réellement besoin d’un accompagnement de proximité.',
  },
]
</script>

<template>
  <section class="audience-page">
    <div class="container">
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-2">
        À qui s'adresse ce dispositif
      </h1>
      <p class="text-muted intro-text mb-4">
        Trois profils différents, chacun avec son propre parcours d'inscription.
      </p>

      <div class="row g-4">
        <div
          v-for="p in PUBLICS"
          :key="p.title"
          class="col-md-4"
        >
          <div class="card h-100 audience-card">
            <img
              :src="p.photo"
              :alt="p.title"
              class="audience-photo"
              loading="lazy"
            >
            <div class="p-4">
              <h2 class="h6">
                {{ p.title }}
              </h2>
              <p class="text-muted small mb-2">
                {{ p.text }}
              </p>
              <p class="photo-credit mb-0">
                Photo : {{ p.credit }} / Unsplash
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5">
        <h2 class="h5 mb-3">
          Témoignages
        </h2>
        <div class="row g-3">
          <div
            v-for="temoignage in TEMOIGNAGES"
            :key="temoignage.auteur"
            class="col-md-4"
          >
            <blockquote class="card h-100 p-4 mb-0 audience-testimonial">
              <p class="mb-3">“{{ temoignage.texte }}”</p>
              <footer class="text-muted small mb-0">{{ temoignage.auteur }}</footer>
            </blockquote>
          </div>
        </div>
      </div>

      <div class="text-center mt-5">
        <router-link
          to="/inscription"
          class="btn btn-primary btn-lg"
        >
          S'inscrire
        </router-link>
      </div>
    </div>
  </section>
</template>
