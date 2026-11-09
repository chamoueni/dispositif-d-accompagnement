<script setup>
// Page de confirmation d'abonnement pour une formule donnée (route /formule/:formuleId).
// Il n'y a pas de vrai prestataire de paiement branché : "Confirmer" enregistre
// directement l'abonnement sur le profil via updateProfile (voir stores/auth.js).
// Les champs carte/facturation ci-dessous sont donc uniquement affichés et
// validés côté client, jamais envoyés ni stockés (on n'a pas à manipuler de
// vraies données de carte bancaire sans prestataire de paiement réel derrière).
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FORMULES, COMMUNES_MAYOTTE } from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/PaiementFormule.css'

const { t } = useI18n()
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
  if (!carte.titulaire.trim()) return t('paiement_page.erreur_titulaire')
  if (!/^\d{16}$/.test(numeroNettoye)) return t('paiement_page.erreur_numero')
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(carte.expiration)) {
    return t('paiement_page.erreur_expiration')
  }
  if (!/^\d{3,4}$/.test(carte.cvc)) return t('paiement_page.erreur_cvc')
  if (!facturation.adresse.trim()) return t('paiement_page.erreur_adresse')
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
        {{ t('paiement_page.formule_inexistante') }}
        <router-link to="/">
          {{ t('paiement_page.retour_accueil') }}
        </router-link>
      </div>

      <div
        v-else-if="!accesAutorise"
        class="alert alert-warning"
      >
        {{ t('paiement_page.reserve_seniors') }}
        <router-link to="/mon-compte">
          {{ t('paiement_page.retour_compte') }}
        </router-link>
      </div>

      <div
        v-else-if="confirmee"
        class="card p-4 mx-auto confirmation-card text-center"
      >
        <h1 class="h5 mb-2">
          {{ t('paiement_page.abonnement_confirme') }}
        </h1>
        <p class="text-muted mb-3">
          {{ t('paiement_page.abonne_a', { nom: formule.nom, prix: formule.prix === 0 ? t('paiement_page.gratuite') : `${formule.prix} €/mois` }) }}
        </p>
        <router-link
          to="/profil"
          class="btn btn-primary"
        >
          {{ t('paiement_page.voir_profil') }}
        </router-link>
      </div>

      <div
        v-else
        class="card p-4 mx-auto form-card"
      >
        <h1 class="h4 mb-1">
          {{ formule.nom }}
        </h1>
        <p
          v-if="formule.prix === 0"
          class="paiement-prix"
        >
          {{ t('paiement_page.gratuit_label') }}
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
          {{ t('paiement_page.deja_abonne', { nom: FORMULES.find((f) => f.id === abonnementActuel.formuleId)?.nom, nouvelle: formule.nom }) }}
        </p>

        <!-- Uniquement pour les formules payantes : la Basique gratuite n'a
             besoin d'aucune information bancaire. -->
        <form
          v-if="necessitePaiement"
          class="paiement-form"
          @submit.prevent="handleConfirmer"
        >
          <h2 class="h6 mb-2">
            {{ t('paiement_page.moyen_paiement') }}
          </h2>
          <div class="mb-3">
            <label class="form-label">{{ t('paiement_page.titulaire_label') }}</label>
            <input
              v-model="carte.titulaire"
              type="text"
              class="form-control"
              autocomplete="cc-name"
            >
          </div>
          <div class="mb-3">
            <label class="form-label">{{ t('paiement_page.numero_carte_label') }}</label>
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
              <label class="form-label">{{ t('paiement_page.expiration_label') }}</label>
              <input
                v-model="carte.expiration"
                type="text"
                class="form-control"
                placeholder="MM/AA"
                autocomplete="cc-exp"
              >
            </div>
            <div class="col-6 mb-3">
              <label class="form-label">{{ t('paiement_page.cvc_label') }}</label>
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
            {{ t('paiement_page.adresse_facturation') }}
          </h2>
          <div class="mb-3">
            <label class="form-label">{{ t('paiement_page.adresse_label') }}</label>
            <input
              v-model="facturation.adresse"
              type="text"
              class="form-control"
              placeholder="N°, rue, lieu-dit..."
            >
          </div>
          <div class="mb-3">
            <label class="form-label">{{ t('paiement_page.commune_label') }}</label>
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
            {{ t('paiement_page.payer_confirmer') }}
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
            {{ t('paiement_page.confirmer_abonnement') }}
          </button>
        </template>
      </div>
    </div>
  </section>
</template>
