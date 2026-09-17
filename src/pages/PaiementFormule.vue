<script setup>
// Page de confirmation d'abonnement pour une formule donnée (route /formule/:formuleId).
// Il n'y a pas de vrai prestataire de paiement branché : "Confirmer" enregistre
// directement l'abonnement sur le profil via updateProfile (voir stores/auth.js).
// Les champs carte/facturation ci-dessous sont donc uniquement affichés et
// validés côté client, jamais envoyés ni stockés (on n'a pas à manipuler de
// vraies données de carte bancaire sans prestataire de paiement réel derrière).
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FORMULES, COMMUNES_MAYOTTE } from '../data/store'
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

// Les formules sont un accompagnement pour la personne âgée elle-même (voir
// FormulesSection.vue) : un aidant connecté ne doit pas pouvoir y souscrire,
// même en tapant l'URL directement.
const accesAutorise = computed(() => user.value.role === 'senior')

// Pas de frais pour la formule gratuite : inutile de demander une carte.
const necessitePaiement = computed(() => formule && formule.prix > 0)

const carte = reactive({ titulaire: '', numero: '', expiration: '', cvc: '' })
const facturation = reactive({ adresse: user.value.adresse || '', ville: user.value.ville || COMMUNES_MAYOTTE[0].nom })

function carteValide() {
  const numeroNettoye = carte.numero.replace(/\s+/g, '')
  if (!carte.titulaire.trim()) return 'Merci de renseigner le nom du titulaire de la carte.'
  if (!/^\d{16}$/.test(numeroNettoye)) return 'Le numéro de carte doit contenir 16 chiffres.'
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(carte.expiration)) {
    return "La date d'expiration doit être au format MM/AA."
  }
  if (!/^\d{3,4}$/.test(carte.cvc)) return 'Le CVC doit contenir 3 ou 4 chiffres.'
  if (!facturation.adresse.trim()) return "Merci de renseigner l'adresse de facturation."
  return ''
}

// Passe par updateProfile() (même chemin que le reste du profil) plutôt qu'un
// appel Supabase dédié : ça écrit en base ET met à jour l'état réactif local
// en une seule fois, cohérent avec le reste de la page Profil.
async function handleConfirmer() {
  error.value = ''

  if (necessitePaiement.value) {
    const messageErreur = carteValide()
    if (messageErreur) {
      error.value = messageErreur
      return
    }
  }

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
        v-else-if="!accesAutorise"
        class="alert alert-warning"
      >
        Ces formules d'accompagnement sont réservées aux personnes âgées.
        <router-link to="/mon-compte">
          Retour à mon compte
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
          Vous êtes maintenant abonné(e) à la formule {{ formule.nom }}
          ({{ formule.prix === 0 ? 'gratuite' : `${formule.prix} €/mois` }}).
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
        <p
          v-if="formule.prix === 0"
          class="paiement-prix"
        >
          Gratuit
        </p>
        <p
          v-else
          class="paiement-prix"
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

        <p
          v-if="abonnementActuel"
          class="text-muted small mb-3"
        >
          Vous êtes actuellement abonné(e) à la formule
          {{ FORMULES.find((f) => f.id === abonnementActuel.formuleId)?.nom }}. Confirmer ici
          remplacera cet abonnement par {{ formule.nom }}.
        </p>

        <!-- Uniquement pour les formules payantes : la Basique gratuite n'a
             besoin d'aucune information bancaire. -->
        <form
          v-if="necessitePaiement"
          class="paiement-form"
          @submit.prevent="handleConfirmer"
        >
          <h2 class="h6 mb-2">
            Moyen de paiement
          </h2>
          <div class="mb-3">
            <label class="form-label">Nom du titulaire</label>
            <input
              v-model="carte.titulaire"
              type="text"
              class="form-control"
              autocomplete="cc-name"
            >
          </div>
          <div class="mb-3">
            <label class="form-label">Numéro de carte</label>
            <input
              v-model="carte.numero"
              type="text"
              inputmode="numeric"
              class="form-control"
              placeholder="1234 5678 9012 3456"
              autocomplete="cc-number"
            >
          </div>
          <div class="row">
            <div class="col-6 mb-3">
              <label class="form-label">Expiration (MM/AA)</label>
              <input
                v-model="carte.expiration"
                type="text"
                class="form-control"
                placeholder="MM/AA"
                autocomplete="cc-exp"
              >
            </div>
            <div class="col-6 mb-3">
              <label class="form-label">CVC</label>
              <input
                v-model="carte.cvc"
                type="text"
                inputmode="numeric"
                class="form-control"
                placeholder="123"
                autocomplete="cc-csc"
              >
            </div>
          </div>

          <h2 class="h6 mb-2">
            Adresse de facturation
          </h2>
          <div class="mb-3">
            <label class="form-label">Adresse</label>
            <input
              v-model="facturation.adresse"
              type="text"
              class="form-control"
              placeholder="N°, rue, lieu-dit..."
            >
          </div>
          <div class="mb-3">
            <label class="form-label">Commune</label>
            <select
              v-model="facturation.ville"
              class="form-select"
            >
              <option
                v-for="c in COMMUNES_MAYOTTE"
                :key="c.nom"
                :value="c.nom"
              >
                {{ c.nom }}
              </option>
            </select>
          </div>

          <p
            v-if="error"
            class="text-danger small mb-3"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            class="btn btn-primary w-100"
          >
            Payer et confirmer l'abonnement
          </button>
        </form>

        <template v-else>
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
        </template>
      </div>
    </div>
  </section>
</template>
