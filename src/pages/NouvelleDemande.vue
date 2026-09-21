<script setup>
// Formulaire d'envoi d'une demande à un prestataire précis (route /nouvelle-demande/:aidantId).
// Accessible uniquement aux personnes âgées connectées : ce sont elles qui sollicitent
// de l'aide, jamais l'inverse dans ce dispositif.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { findById, addDemande, getDemandesByDemandeur } from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import DictateButton from '../components/DictateButton.vue'
import '../styles/NouvelleDemande.css'

const route = useRoute()
const { t } = useI18n()

// Libellés traduits des services (voir src/locales/). Fonction et non constante :
// elle doit être réévaluée au changement de langue.
const libelleService = (code) => t(`demande.service_${code}`)
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
const envoiEnCours = ref(false)
// Demande déjà en cours (en attente ou acceptée) envoyée par ce demandeur à ce
// même aidant, s'il y en a une : sert à bloquer l'envoi d'un doublon plutôt
// que de laisser une personne âgée solliciter plusieurs fois le même prestataire
// avant même d'avoir de réponse.
const demandeExistante = ref(null)

onMounted(async () => {
  aidant.value = await findById(route.params.aidantId)

  if (aidant.value && user.value.role === 'senior') {
    const demandesEnvoyees = await getDemandesByDemandeur(user.value.id)
    demandeExistante.value =
      demandesEnvoyees.find(
        (d) => d.aidantId === aidant.value.id && ['en_attente', 'acceptee'].includes(d.statut),
      ) || null
  }

  // "Refaire cette demande" (voir MesDemandes.vue / Historique.vue) arrive ici
  // avec typeService/urgence/message en query params : on les reprend s'ils
  // sont présents et valides pour cet aidant, sinon comportement inchangé.
  const { typeService, urgence, message } = route.query
  form.typeService =
    typeService && servicesDisponibles.value.includes(typeService)
      ? typeService
      : servicesDisponibles.value[0] || ''
  form.urgence = urgence === 'urgente' ? 'urgente' : 'normale'
  form.message = message || ''
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
  if (demandeExistante.value) return 'deja-envoyee'
  return 'ok'
})

async function handleSubmit() {
  error.value = ''
  if (!form.typeService) {
    error.value = t('demande.erreur_service')
    return
  }
  // Garde-fou en plus du blocage par acces === 'deja-envoyee' : évite qu'un
  // double-clic sur "Envoyer" (avant que envoyee.value ne passe à true) ne
  // crée deux demandes identiques coup sur coup.
  if (envoiEnCours.value) return

  envoiEnCours.value = true
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
  } finally {
    envoiEnCours.value = false
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
        {{ t('demande.chargement') }}
      </p>

      <div
        v-else-if="acces === 'introuvable'"
        class="alert alert-warning"
      >
        {{ t('demande.introuvable') }}
        <router-link to="/recherche">
          {{ t('demande.retour_recherche') }}
        </router-link>
      </div>

      <div
        v-else-if="acces === 'role-invalide'"
        class="alert alert-warning"
      >
        {{ t('demande.role_invalide') }}
      </div>

      <div
        v-else-if="acces === 'deja-envoyee'"
        class="alert alert-warning"
      >
        {{ t('demande.deja_envoyee', {
          statut: demandeExistante.statut === 'acceptee' ? t('demande.deja_acceptee') : t('demande.deja_en_attente'),
          nom: aidant.nom,
        }) }}
        <router-link to="/mes-demandes">
          {{ t('demande.voir_mes_demandes') }}
        </router-link>
      </div>

      <div
        v-else-if="envoyee"
        class="card p-4 mx-auto confirmation-card text-center"
      >
        <h1 class="h5 mb-2">
          {{ t('demande.envoyee_titre') }}
        </h1>
        <p class="text-muted mb-3">
          {{ t('demande.envoyee_texte', { nom: aidant.nom }) }}
        </p>
        <router-link
          to="/recherche"
          class="btn btn-primary"
        >
          {{ t('demande.retour_recherche') }}
        </router-link>
      </div>

      <div
        v-else
        class="card p-4 mx-auto form-card"
      >
        <span class="text-muted small d-block mb-1">{{ t('demande.destinataire', { nom: aidant.nom, ville: aidant.ville }) }}</span>
        <h1 class="h4 mb-3">
          {{ t('demande.titre') }}
        </h1>

        <form @submit.prevent="handleSubmit">
          <div
            v-if="servicesDisponibles.length > 1"
            class="mb-3"
          >
            <label class="form-label">{{ t('demande.type_service') }}</label>
            <select
              v-model="form.typeService"
              class="form-select"
            >
              <option
                v-for="s in servicesDisponibles"
                :key="s"
                :value="s"
              >
                {{ libelleService(s) }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">{{ t('demande.urgence') }}</label>
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
              >{{ t('demande.urgence_normale') }}</label>

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
              >{{ t('demande.urgence_urgente') }}</label>
            </div>
          </div>

          <div
            v-if="aidant.disponibilites.length"
            class="mb-3"
          >
            <label class="form-label">{{ t('demande.creneau') }}</label>
            <select
              v-model="form.creneauSouhaite"
              class="form-select"
            >
              <option
                v-for="slot in aidant.disponibilites"
                :key="`${slot.jour}-${slot.heureDebut}`"
                :value="slot"
              >
                {{ t('demande.creneau_format', { jour: slot.jour, debut: slot.heureDebut, fin: slot.heureFin }) }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">{{ t('demande.message') }}</label>
            <textarea
              v-model="form.message"
              class="form-control"
              rows="3"
              :placeholder="t('demande.message_exemple')"
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
            :disabled="envoiEnCours"
          >
            {{ envoiEnCours ? t('demande.envoi_en_cours') : t('demande.envoyer') }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
