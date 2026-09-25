<script setup>
// Page dédiée "Ce que vous pouvez trouver" (liée depuis la landing et le menu).
import { useI18n } from 'vue-i18n'
import ServiceIcon from '../components/ServiceIcon.vue'
import BackLink from '../components/BackLink.vue'
// Photos fournies par l'utilisateur (voir src/assets), une par service.
import soinsPhoto from '../assets/soins a domicile .jpg'
import coursesPhoto from '../assets/course .jpg'
import menagePhoto from '../assets/menage .jpg'
import gardePhoto from '../assets/service de garde .jpg'
import psychologiquePhoto from '../assets/psychologique.jpg'
import '../styles/Services.css'

const { t } = useI18n()

// titleKey/textKey pointent vers les clés déjà utilisées pour ces mêmes services
// sur l'accueil (accueil.services.*) : une seule traduction à tenir à jour dans
// les 3 langues plutôt qu'un doublon par page.
const SERVICES = [
  {
    icon: 'soins',
    titleKey: 'soins_titre',
    textKey: 'soins_texte',
    photo: soinsPhoto,
  },
  {
    icon: 'courses',
    titleKey: 'courses_titre',
    textKey: 'courses_texte',
    photo: coursesPhoto,
  },
  {
    icon: 'menage',
    titleKey: 'menage_titre',
    textKey: 'menage_texte',
    photo: menagePhoto,
  },
  {
    icon: 'garde',
    titleKey: 'garde_titre',
    textKey: 'garde_texte',
    photo: gardePhoto,
  },
  // Besoin transversal plutôt qu'un service au même titre que les 4 précédents
  // (cf. cahier des charges), mais a désormais sa propre photo comme les autres.
  {
    icon: 'psychologique',
    titleKey: 'psy_titre',
    textKey: 'psy_texte',
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
        {{ t('accueil.services.titre') }}
      </h1>
      <p class="text-muted intro-text mb-4">
        {{ t('services_page.intro') }}
      </p>

      <div class="row g-4">
        <div
          v-for="s in SERVICES"
          :key="s.titleKey"
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
              :alt="t(`accueil.services.${s.titleKey}`)"
              class="service-photo"
            >
            <div class="p-4">
              <ServiceIcon :type="s.icon" />
              <h2 class="h6">
                {{ t(`accueil.services.${s.titleKey}`) }}
              </h2>
              <p class="text-muted small mb-0">
                {{ t(`accueil.services.${s.textKey}`) }}
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
          {{ t('services_page.cta_chercher') }}
        </router-link>
        <router-link
          to="/inscription"
          class="btn btn-outline-secondary btn-lg"
        >
          {{ t('nav.inscription') }}
        </router-link>
      </div>
    </div>
  </section>
</template>
