<script setup>
// Page dédiée "Ce que vous pouvez trouver" (liée depuis la landing et le menu).
import ServiceIcon from '../components/ServiceIcon.vue'
import BackLink from '../components/BackLink.vue'
// Photos fournies par l'utilisateur (voir src/assets), une par service.
import soinsPhoto from '../assets/soins a domicile .jpg'
import coursesPhoto from '../assets/course .jpg'
import menagePhoto from '../assets/menage .jpg'
import gardePhoto from '../assets/service de garde .jpg'
import psychologiquePhoto from '../assets/psychologique.jpg'
import '../styles/Services.css'

const SERVICES = [
  {
    icon: 'soins',
    title: 'Soins à domicile',
    text: "Mettez-vous en relation avec des infirmiers, aides-soignants ou kinésithérapeutes disponibles près de chez vous pour un suivi médical régulier.",
    photo: soinsPhoto,
  },
  {
    icon: 'courses',
    title: 'Courses',
    text: 'Un coursier de confiance se charge de vos achats du quotidien quand se déplacer devient compliqué.',
    photo: coursesPhoto,
  },
  {
    icon: 'menage',
    title: 'Ménage',
    text: "Faites appel à une aide à domicile pour l'entretien de votre logement, au rythme qui vous convient.",
    photo: menagePhoto,
  },
  {
    icon: 'garde',
    title: 'Service de garde',
    text: "Une présence rassurante à domicile quelques heures, pour éviter de rester seul(e) trop longtemps.",
    photo: gardePhoto,
  },
  // Besoin transversal plutôt qu'un service au même titre que les 4 précédents
  // (cf. cahier des charges), mais a désormais sa propre photo comme les autres.
  {
    icon: 'psychologique',
    title: 'Suivi psychologique',
    text: 'Un accompagnement humain, pas seulement matériel, pour rompre l’isolement.',
    photo: psychologiquePhoto,
  },
]
</script>

<template>
  <section class="services-page">
    <div class="container">
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-2">
        Ce que vous pouvez trouver
      </h1>
      <p class="text-muted intro-text mb-4">
        Des services concrets, et les besoins plus larges auxquels ils répondent.
      </p>

      <div class="row g-4">
        <div
          v-for="s in SERVICES"
          :key="s.title"
          class="col-md-6 col-lg-4"
        >
          <!-- photo optionnelle par service (toutes les 4 en ont une actuellement,
               mais le v-if garde la carte utilisable même sans photo). -->
          <div
            class="card h-100 service-card"
            :class="{ 'service-card-photo': s.photo }"
          >
            <img
              v-if="s.photo"
              :src="s.photo"
              :alt="s.title"
              class="service-photo"
            >
            <div class="p-4">
              <ServiceIcon :type="s.icon" />
              <h2 class="h6">
                {{ s.title }}
              </h2>
              <p class="text-muted small mb-0">
                {{ s.text }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-5">
        <router-link
          to="/recherche"
          class="btn btn-primary btn-lg me-2"
        >
          Chercher de l'aide
        </router-link>
        <router-link
          to="/inscription"
          class="btn btn-outline-secondary btn-lg"
        >
          S'inscrire
        </router-link>
      </div>
    </div>
  </section>
</template>
