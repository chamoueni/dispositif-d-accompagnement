<script setup>
// Formulaire d'envoi d'une demande à un prestataire précis (route /nouvelle-demande/:aidantId).
// Accessible uniquement aux personnes âgées connectées : ce sont elles qui sollicitent
// de l'aide, jamais l'inverse dans ce dispositif.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { findById, addDemande } from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import DictateButton from '../components/DictateButton.vue'
import '../styles/NouvelleDemande.css'

const SERVICE_LABELS = {
  soins: 'Soins',
  coursier: 'Coursier',
  menage: 'Ménage',
}

const route = useRoute()
const { user } = useAuth()

// Le prestataire ciblé est maintenant chargé de façon asynchrone (Supabase) au
// montage, plutôt que lu directement dans le mock au moment du setup().
const aidant = ref(null)
const chargement = ref(true)

// Services proposés par cet aidant précis : un seul (soins) pour le personnel de
// santé, un ou plusieurs (coursier/ménage) pour un particulier.
const servicesDisponibles = computed(() => {
  if (!aidant.value) return []
  return aidant.value.role === 'sante' ? ['soins'] : aidant.value.services || []
})

const form = reactive({
  typeService: '',
  urgence: 'normale',
  message: '',
  creneauSouhaite: null,
})

const error = ref('')
const envoyee = ref(false)

onMounted(async () => {
  aidant.value = await findById(route.params.aidantId)
  form.typeService = servicesDisponibles.value[0] || ''
  form.creneauSouhaite = aidant.value?.disponibilites?.[0] || null
  chargement.value = false
})

// Ajoute le texte dicté au message existant plutôt que de l'écraser, pour
// permettre plusieurs dictées successives.
function handleDictate(transcript) {
  form.message = form.message ? `${form.message} ${transcript}` : transcript
}

// Accès refusé si la fiche n'existe pas, ou si l'utilisateur connecté n'est pas
// une personne âgée (seul rôle habilité à envoyer une demande).
const acces = computed(() => {
  if (chargement.value) return 'chargement'
  if (!aidant.value) return 'introuvable'
  if (user.value.role !== 'senior') return 'role-invalide'
  return 'ok'
})

async function handleSubmit() {
  error.value = ''
  if (!form.typeService) {
    error.value = 'Merci de choisir un type de service.'
    return
  }

  try {
    await addDemande({
      demandeurId: user.value.id,
      aidantId: aidant.value.id,
      typeService: form.typeService,
      urgence: form.urgence,
      message: form.message,
      creneauSouhaite: form.creneauSouhaite,
    })
    envoyee.value = true
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <section class="nouvelle-demande-page">
    <div class="container">
      <BackLink />

      <p
        v-if="acces === 'chargement'"
        class="text-muted text-center py-5"
      >
        Chargement…
      </p>

      <div
        v-else-if="acces === 'introuvable'"
        class="alert alert-warning"
      >
        Ce profil n'existe pas ou plus.
        <router-link to="/recherche">
          Retour à la recherche
        </router-link>
      </div>

      <div
        v-else-if="acces === 'role-invalide'"
        class="alert alert-warning"
      >
        Seules les personnes âgées peuvent envoyer une demande.
      </div>

      <div
        v-else-if="envoyee"
        class="card p-4 mx-auto confirmation-card text-center"
      >
        <h1 class="h5 mb-2">
          Demande envoyée
        </h1>
        <p class="text-muted mb-3">
          {{ aidant.nom }} recevra votre demande et pourra l'accepter ou la refuser.
        </p>
        <router-link
          to="/recherche"
          class="btn btn-primary"
        >
          Retour à la recherche
        </router-link>
      </div>

      <div
        v-else
        class="card p-4 mx-auto form-card"
      >
        <span class="text-muted small d-block mb-1">Demande à {{ aidant.nom }} · {{ aidant.ville }}</span>
        <h1 class="h4 mb-3">
          Envoyer une demande
        </h1>

        <form @submit.prevent="handleSubmit">
          <div
            v-if="servicesDisponibles.length > 1"
            class="mb-3"
          >
            <label class="form-label">Type de service</label>
            <select
              v-model="form.typeService"
              class="form-select"
            >
              <option
                v-for="s in servicesDisponibles"
                :key="s"
                :value="s"
              >
                {{ SERVICE_LABELS[s] }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Urgence</label>
            <div
              class="btn-group w-100"
              role="group"
            >
              <input
                id="urgence-normale"
                v-model="form.urgence"
                type="radio"
                class="btn-check"
                value="normale"
              >
              <label
                class="btn btn-outline-secondary"
                for="urgence-normale"
              >Normale</label>

              <input
                id="urgence-urgente"
                v-model="form.urgence"
                type="radio"
                class="btn-check"
                value="urgente"
              >
              <label
                class="btn btn-outline-secondary"
                for="urgence-urgente"
              >Urgente</label>
            </div>
          </div>

          <div
            v-if="aidant.disponibilites.length"
            class="mb-3"
          >
            <label class="form-label">Créneau souhaité</label>
            <select
              v-model="form.creneauSouhaite"
              class="form-select"
            >
              <option
                v-for="slot in aidant.disponibilites"
                :key="`${slot.jour}-${slot.heureDebut}`"
                :value="slot"
              >
                {{ slot.jour }} · {{ slot.heureDebut }} à {{ slot.heureFin }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Message (optionnel)</label>
            <textarea
              v-model="form.message"
              class="form-control"
              rows="3"
              placeholder="Précisez votre besoin si nécessaire."
            />
            <DictateButton @dictate="handleDictate" />
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
            Envoyer la demande
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
