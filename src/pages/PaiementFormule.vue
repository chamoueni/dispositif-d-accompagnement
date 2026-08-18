<script setup>
// Page de confirmation d'abonnement pour une formule donnée (route /formule/:formuleId).
// Il n'y a pas de vrai prestataire de paiement branché : "Confirmer" enregistre
// directement l'abonnement sur le profil via updateProfile (voir stores/auth.js).
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FORMULES } from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/PaiementFormule.css'

const route = useRoute()
const { user, updateProfile } = useAuth()

const formule = FORMULES.find((f) => f.id === route.params.formuleId)
const confirmee = ref(false)
const error = ref('')

// L'abonnement en cours (s'il existe déjà), pour ne pas laisser resouscrire
// à l'identique sans s'en rendre compte.
const abonnementActuel = computed(() => user.value.abonnement)

// Passe par updateProfile() (même chemin que le reste du profil) plutôt qu'un
// appel Supabase dédié : ça écrit en base ET met à jour l'état réactif local
// en une seule fois, cohérent avec le reste de la page Profil.
async function handleConfirmer() {
  error.value = ''
  try {
    await updateProfile({
      abonnement: { formuleId: formule.id, dateDebut: new Date().toISOString() },
    })
    confirmee.value = true
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <section class="paiement-page">
    <div class="container">
      <BackLink />

      <div
        v-if="!formule"
        class="alert alert-warning"
      >
        Cette formule n'existe pas.
        <router-link to="/">
          Retour à l'accueil
        </router-link>
      </div>

      <div
        v-else-if="confirmee"
        class="card p-4 mx-auto confirmation-card text-center"
      >
        <h1 class="h5 mb-2">
          Abonnement confirmé
        </h1>
        <p class="text-muted mb-3">
          Vous êtes maintenant abonné(e) à la formule {{ formule.nom }} ({{ formule.prix }} €/mois).
        </p>
        <router-link
          to="/profil"
          class="btn btn-primary"
        >
          Voir mon profil
        </router-link>
      </div>

      <div
        v-else
        class="card p-4 mx-auto form-card"
      >
        <h1 class="h4 mb-1">
          Formule {{ formule.nom }}
        </h1>
        <p class="paiement-prix">
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

        <p
          v-if="abonnementActuel"
          class="text-muted small mb-3"
        >
          Vous êtes actuellement abonné(e) à la formule
          {{ FORMULES.find((f) => f.id === abonnementActuel.formuleId)?.nom }}. Confirmer ici
          remplacera cet abonnement par {{ formule.nom }}.
        </p>

        <p
          v-if="error"
          class="text-danger small mb-3"
        >
          {{ error }}
        </p>

        <button
          type="button"
          class="btn btn-primary w-100"
          @click="handleConfirmer"
        >
          Confirmer l'abonnement
        </button>
      </div>
    </div>
  </section>
</template>
