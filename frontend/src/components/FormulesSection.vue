<script setup>
// Les cartes tarifaires ("Nos formules"). Le contenu vient de FORMULES dans
// data/store.js (source unique), pour que le prix affiché ici soit toujours le
// même que celui utilisé sur la page de confirmation d'abonnement.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import { FORMULES } from '../data/store'
import '../styles/FormulesSection.css'

const { t } = useI18n()
const { user } = useAuth()

function estFormuleActive(formule) {
  return user.value?.abonnement?.formuleId === formule.id
}

// Ces formules sont un accompagnement pour la personne âgée elle-même : un
// aidant connecté (santé/particulier) peut les regarder mais pas y souscrire
// à sa place. Un visiteur non connecté garde le bouton (il choisira son rôle
// à l'inscription, juste après).
const peutSouscrire = computed(() => !user.value || user.value.role === 'senior')
</script>

<template>
  <p
    v-if="user && user.role !== 'senior'"
    class="text-muted small mb-3"
  >
    {{ t('formules_section.reserve_message') }}
  </p>
  <div class="row g-4 justify-content-center formules-row">
    <div
      v-for="formule in FORMULES"
      :key="formule.id"
      class="col-md-6 col-lg-3"
    >
      <div
        class="card p-4 h-100 formule-card"
        :class="{ 'formule-card-avant': formule.miseEnAvant, 'formule-card-active': estFormuleActive(formule) }"
      >
        <span
          v-if="estFormuleActive(formule)"
          class="badge text-bg-success formule-badge"
        >
          {{ t('formules_section.formule_actuelle') }}
        </span>
        <span
          v-else-if="formule.miseEnAvant"
          class="badge text-bg-secondary formule-badge"
        >
          {{ t('formules_section.plus_choisi') }}
        </span>
        <span
          v-else-if="formule.essaiGratuit"
          class="badge text-bg-light border formule-badge"
        >
          {{ t('formules_section.essai_gratuit') }}
        </span>
        <h3 class="h5 mb-1">
          {{ formule.nom }}
        </h3>
        <p
          v-if="formule.prix === 0"
          class="formule-prix"
        >
          {{ t('formules_section.gratuit') }}
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
          v-if="peutSouscrire"
          :to="`/formule/${formule.id}`"
          class="btn w-100 mt-auto"
          :class="formule.miseEnAvant ? 'btn-primary' : 'btn-outline-secondary'"
        >
          {{ estFormuleActive(formule) ? t('formules_section.voir_abonnement') : t('formules_section.choisir', { nom: formule.nom }) }}
        </router-link>
        <button
          v-else
          type="button"
          class="btn btn-outline-secondary w-100 mt-auto"
          disabled
        >
          {{ t('formules_section.reserve_bouton') }}
        </button>
      </div>
    </div>
  </div>
</template>
