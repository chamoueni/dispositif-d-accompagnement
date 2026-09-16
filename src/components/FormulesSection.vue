<script setup>
// Les cartes tarifaires ("Nos formules"). Le contenu vient de FORMULES dans
// data/store.js (source unique), pour que le prix affiché ici soit toujours le
// même que celui utilisé sur la page de confirmation d'abonnement.
import { useAuth } from '../stores/auth'
import { FORMULES } from '../data/store'
import '../styles/FormulesSection.css'

const { user } = useAuth()

function estFormuleActive(formule) {
  return user.value?.abonnement?.formuleId === formule.id
}
</script>

<template>
  <div class="row g-4 justify-content-center formules-row">
    <div
      v-for="formule in FORMULES"
      :key="formule.id"
      class="col-md-6 col-lg-4"
    >
      <div
        class="card p-4 h-100 formule-card"
        :class="{ 'formule-card-avant': formule.miseEnAvant, 'formule-card-active': estFormuleActive(formule) }"
      >
        <span
          v-if="estFormuleActive(formule)"
          class="badge text-bg-success formule-badge"
        >
          Votre formule actuelle
        </span>
        <span
          v-else-if="formule.miseEnAvant"
          class="badge text-bg-secondary formule-badge"
        >
          Le plus choisi
        </span>
        <span
          v-else-if="formule.essaiGratuit"
          class="badge text-bg-light border formule-badge"
        >
          Essai gratuit
        </span>
        <h3 class="h5 mb-1">
          {{ formule.nom }}
        </h3>
        <p
          v-if="formule.prix === 0"
          class="formule-prix"
        >
          Gratuit
        </p>
        <p
          v-else
          class="formule-prix"
        >
          {{ formule.prix }} €<span class="text-muted small">/mois</span>
        </p>
        <ul class="formule-liste">
          <li
            v-for="f in formule.fonctionnalites"
            :key="f"
          >
            {{ f }}
          </li>
        </ul>
        <router-link
          :to="`/formule/${formule.id}`"
          class="btn w-100 mt-auto"
          :class="formule.miseEnAvant ? 'btn-primary' : 'btn-outline-secondary'"
        >
          {{ estFormuleActive(formule) ? 'Voir mon abonnement' : `Choisir ${formule.nom}` }}
        </router-link>
      </div>
    </div>
  </div>
</template>
