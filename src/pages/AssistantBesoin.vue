<script setup>
// Page dédiée "Assistant de besoin" (/assistant) : questionnaire en 4 étapes qui
// guide l'utilisateur vers les accompagnements correspondant à son besoin, puis
// affiche les résultats dans la même page (pas de route séparée pour les
// résultats : plus simple, cohérent avec le reste du site qui garde formulaire
// + confirmation dans une seule page, voir NouvelleDemande.vue).
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { COMMUNES_MAYOTTE, getUsers } from '../data/store.js'
import { useAuth } from '../stores/auth'
import ProviderCard from '../components/ProviderCard.vue'
import ServiceIcon from '../components/ServiceIcon.vue'
import SpeakButton from '../components/SpeakButton.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/AssistantBesoin.css'

const { t } = useI18n()
const { user } = useAuth()

// Zones géographiques de Mayotte : noms propres, non traduits (comme les noms
// de commune ailleurs sur le site).
const ZONES = ['Petite-Terre', 'Nord', 'Centre', 'Sud']
// "jour" reste stocké/comparé en français (voir Profil.vue) : JOURS sert au
// calcul interne (jourDemande), JOUR_KEYS uniquement à son affichage traduit.
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOUR_KEYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// disponible: false pour les besoins pas encore rattachés à un vrai service
// réservable côté données (voir data/store.js : seuls role "sante" et les
// services "coursier"/"menage" existent aujourd'hui). Affichés quand même dans
// le questionnaire pour être honnête sur la couverture actuelle du dispositif,
// plutôt que masqués — la carte reste visible mais désactivée avec ce message.
const TYPES_AIDE = [
  { value: 'domicile', labelKey: 'type_aide_domicile', icon: 'menage', disponible: false },
  { value: 'sante', labelKey: 'type_sante_soins', icon: 'soins', disponible: true },
  { value: 'deplacement', labelKey: 'type_deplacement', icon: 'deplacement', disponible: false },
  { value: 'compagnie', labelKey: 'type_compagnie', icon: 'psychologique', disponible: false },
  { value: 'courses', labelKey: 'type_courses', icon: 'courses', disponible: true },
  { value: 'menage', labelKey: 'type_menage', icon: 'menage', disponible: true },
  { value: 'garde', labelKey: 'type_garde', icon: 'garde', disponible: false },
]

const URGENCES = [
  { value: 'normal', labelKey: 'urgence_normal' },
  { value: 'important', labelKey: 'urgence_important' },
  { value: 'urgent', labelKey: 'urgence_urgent' },
]

// step : 1 à 4 pendant le questionnaire, puis 'resultats'.
const step = ref(1)

const answers = reactive({
  pourQui: '',
  typeAide: '',
  zone: '',
  commune: '',
  date: '',
  heureDebut: '',
  heureFin: '',
  urgence: 'normal',
})

const communesDeLaZone = computed(() =>
  answers.zone ? COMMUNES_MAYOTTE.filter((c) => c.zone === answers.zone) : COMMUNES_MAYOTTE,
)

function choisirZone(zone) {
  answers.zone = answers.zone === zone ? '' : zone
  if (answers.commune && !communesDeLaZone.value.some((c) => c.nom === answers.commune)) {
    answers.commune = ''
  }
}

const typeAideChoisi = computed(() => TYPES_AIDE.find((t2) => t2.value === answers.typeAide))

const peutContinuer = computed(() => {
  if (step.value === 1) return Boolean(answers.pourQui)
  if (step.value === 2) return Boolean(answers.typeAide)
  if (step.value === 3) return Boolean(answers.commune)
  if (step.value === 4) return Boolean(answers.date && answers.heureDebut && answers.heureFin)
  return true
})

const users = ref([])
const chargement = ref(false)
const rechercheLancee = ref(false)

async function lancerRecherche() {
  chargement.value = true
  rechercheLancee.value = true
  users.value = await getUsers()
  resultFilters.commune = answers.commune
  resultFilters.disponibiliteJour = false
  chargement.value = false
}

function suivant() {
  if (!peutContinuer.value) return
  if (step.value === 4) {
    step.value = 'resultats'
    lancerRecherche()
  } else {
    step.value += 1
  }
}

function precedent() {
  if (step.value === 'resultats') {
    step.value = 4
    return
  }
  if (typeof step.value === 'number' && step.value > 1) step.value -= 1
}

function modifierReponses() {
  step.value = 1
}

function recommencer() {
  step.value = 1
  rechercheLancee.value = false
  answers.pourQui = ''
  answers.typeAide = ''
  answers.zone = ''
  answers.commune = ''
  answers.date = ''
  answers.heureDebut = ''
  answers.heureFin = ''
  answers.urgence = 'normal'
}

const resultFilters = reactive({
  commune: '',
  service: '',
  disponibiliteJour: false,
})

// Jour de semaine correspondant à la date choisie (même format que "jour" dans
// disponibilites, voir Profil.vue) : sert au filtre "disponible ce jour-là".
const jourDemande = computed(() => {
  if (!answers.date) return ''
  const d = new Date(`${answers.date}T00:00:00`)
  const idx = (d.getDay() + 6) % 7 // JS: 0=dimanche -> on veut 0=lundi, cohérent avec JOURS
  return JOURS[idx]
})

// Libellé traduit du jour demandé, pour l'affichage uniquement (jourDemande
// reste la valeur française utilisée dans le filtre ci-dessous).
const jourDemandeLabel = computed(() => {
  const idx = JOURS.indexOf(jourDemande.value)
  return idx === -1 ? '' : t(`jours.${JOUR_KEYS[idx]}`)
})

const resultats = computed(() => {
  if (!rechercheLancee.value || !typeAideChoisi.value?.disponible) return []
  return users.value.filter((u) => {
    const matchType =
      answers.typeAide === 'sante'
        ? u.role === 'sante'
        : u.role === 'particulier' &&
          u.services.includes(answers.typeAide === 'courses' ? 'coursier' : 'menage')
    if (!matchType) return false
    if (resultFilters.service) {
      const matchFiltre =
        resultFilters.service === 'sante'
          ? u.role === 'sante'
          : u.services.includes(resultFilters.service)
      if (!matchFiltre) return false
    }
    const matchCommune = !resultFilters.commune || u.ville === resultFilters.commune
    const matchDispo =
      !resultFilters.disponibiliteJour || u.disponibilites.some((d) => d.jour === jourDemande.value)
    return matchCommune && matchDispo
  })
})

const recapTexte = computed(() => {
  const pour = answers.pourQui === 'moi' ? t('assistant_page.pour_vous_meme') : t('assistant_page.pour_un_proche')
  const aide = typeAideChoisi.value ? t(`assistant_page.${typeAideChoisi.value.labelKey}`) : ''
  return t('assistant_page.recap_texte', {
    pour,
    aide,
    commune: answers.commune,
    date: answers.date,
    debut: answers.heureDebut,
    fin: answers.heureFin,
  })
})
</script>

<template>
  <section class="assistant-page">
    <div class="container">
      <BackLink />

      <header class="assistant-header">
        <span class="section-label" />
        <h1 class="h3 mb-2">
          {{ t('assistant_page.titre') }}
        </h1>
        <p class="text-muted intro-text mb-0">
          {{ t('assistant_page.sous_titre') }}
        </p>
      </header>

      <!-- Barre de progression : visible pendant le questionnaire uniquement. -->
      <ol
        v-if="step !== 'resultats'"
        class="assistant-progress"
        :aria-label="t('assistant_page.progression_aria')"
      >
        <li
          v-for="n in 4"
          :key="n"
          class="progress-step"
          :class="{ 'progress-step-active': n === step, 'progress-step-done': n < step }"
        >
          <span class="progress-step-dot">{{ n }}</span>
        </li>
      </ol>
      <p
        v-if="step !== 'resultats'"
        class="text-muted small text-center mb-4"
      >
        {{ t('assistant_page.etape_sur_4', { n: step }) }}
      </p>

      <!-- ÉTAPE 1 — Pour qui -->
      <div
        v-if="step === 1"
        class="card assistant-step-card p-4"
      >
        <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
          <h2 class="h5 mb-0">
            {{ t('assistant_page.step1_titre') }}
          </h2>
          <SpeakButton :text="t('assistant_page.step1_vocal')" />
        </div>
        <div class="choice-grid choice-grid-2">
          <button
            type="button"
            class="choice-tile"
            :class="{ 'choice-tile-selected': answers.pourQui === 'moi' }"
            @click="answers.pourQui = 'moi'"
          >
            <strong>{{ t('assistant_page.moi_meme') }}</strong>
            <span class="text-muted small">{{ t('assistant_page.moi_meme_texte') }}</span>
          </button>
          <button
            type="button"
            class="choice-tile"
            :class="{ 'choice-tile-selected': answers.pourQui === 'proche' }"
            @click="answers.pourQui = 'proche'"
          >
            <strong>{{ t('assistant_page.un_proche') }}</strong>
            <span class="text-muted small">{{ t('assistant_page.un_proche_texte') }}</span>
          </button>
        </div>
        <div class="assistant-actions">
          <span />
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            {{ t('assistant_page.continuer') }}
          </button>
        </div>
      </div>

      <!-- ÉTAPE 2 — Type d'aide -->
      <div
        v-else-if="step === 2"
        class="card assistant-step-card p-4"
      >
        <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
          <h2 class="h5 mb-0">
            {{ t('assistant_page.step2_titre') }}
          </h2>
          <SpeakButton :text="t('assistant_page.step2_vocal')" />
        </div>
        <div class="choice-grid choice-grid-4">
          <button
            v-for="t2 in TYPES_AIDE"
            :key="t2.value"
            type="button"
            class="choice-tile choice-tile-compact"
            :class="{
              'choice-tile-selected': answers.typeAide === t2.value,
              'choice-tile-disabled': !t2.disponible,
            }"
            @click="answers.typeAide = t2.value"
          >
            <svg
              v-if="t2.icon === 'deplacement'"
              class="assistant-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13" />
              <rect
                x="3"
                y="13"
                width="18"
                height="5"
                rx="1.5"
              />
              <circle
                cx="7.5"
                cy="18.5"
                r="1.5"
              />
              <circle
                cx="16.5"
                cy="18.5"
                r="1.5"
              />
            </svg>
            <ServiceIcon
              v-else
              :type="t2.icon"
            />
            <strong>{{ t(`assistant_page.${t2.labelKey}`) }}</strong>
            <span
              v-if="!t2.disponible"
              class="badge text-bg-light border choice-tile-badge"
            >{{ t('assistant_page.bientot_disponible') }}</span>
          </button>
        </div>
        <p
          v-if="typeAideChoisi && !typeAideChoisi.disponible"
          class="text-muted small mt-3 mb-0"
        >
          {{ t('assistant_page.note_indisponible') }}
        </p>
        <div class="assistant-actions">
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="precedent"
          >
            {{ t('assistant_page.retour') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            {{ t('assistant_page.continuer') }}
          </button>
        </div>
      </div>

      <!-- ÉTAPE 3 — Localisation -->
      <div
        v-else-if="step === 3"
        class="card assistant-step-card p-4"
      >
        <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
          <h2 class="h5 mb-0">
            {{ t('assistant_page.step3_titre') }}
          </h2>
          <SpeakButton :text="t('assistant_page.step3_vocal')" />
        </div>
        <p class="text-muted small mb-3">
          {{ t('assistant_page.step3_texte') }}
        </p>

        <div class="zone-tabs mb-3">
          <button
            v-for="z in ZONES"
            :key="z"
            type="button"
            class="zone-tab"
            :class="{ 'zone-tab-active': answers.zone === z }"
            @click="choisirZone(z)"
          >
            {{ z }}
          </button>
        </div>

        <label
          class="form-label"
          for="assistant-commune"
        >{{ t('assistant_page.commune_label') }}</label>
        <select
          id="assistant-commune"
          v-model="answers.commune"
          class="form-select"
        >
          <option value="">
            {{ t('assistant_page.choisir_commune') }}
          </option>
          <option
            v-for="c in communesDeLaZone"
            :key="c.nom"
            :value="c.nom"
          >
            {{ c.nom }}
          </option>
        </select>

        <div class="assistant-actions">
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="precedent"
          >
            {{ t('assistant_page.retour') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            {{ t('assistant_page.continuer') }}
          </button>
        </div>
      </div>

      <!-- ÉTAPE 4 — Date et horaires -->
      <div
        v-else-if="step === 4"
        class="card assistant-step-card p-4"
      >
        <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
          <h2 class="h5 mb-0">
            {{ t('assistant_page.step4_titre') }}
          </h2>
          <SpeakButton :text="t('assistant_page.step4_vocal')" />
        </div>

        <div class="row g-3 mb-3">
          <div class="col-sm-4">
            <label
              class="form-label"
              for="assistant-date"
            >{{ t('assistant_page.date_label') }}</label>
            <input
              id="assistant-date"
              v-model="answers.date"
              type="date"
              class="form-control"
            >
          </div>
          <div class="col-sm-4">
            <label
              class="form-label"
              for="assistant-debut"
            >{{ t('assistant_page.heure_debut_label') }}</label>
            <input
              id="assistant-debut"
              v-model="answers.heureDebut"
              type="time"
              class="form-control"
            >
          </div>
          <div class="col-sm-4">
            <label
              class="form-label"
              for="assistant-fin"
            >{{ t('assistant_page.heure_fin_label') }}</label>
            <input
              id="assistant-fin"
              v-model="answers.heureFin"
              type="time"
              class="form-control"
            >
          </div>
        </div>

        <label class="form-label d-block">{{ t('assistant_page.urgence_label') }}</label>
        <div class="urgence-choices mb-3">
          <button
            v-for="u in URGENCES"
            :key="u.value"
            type="button"
            class="urgence-tile"
            :class="[`urgence-tile-${u.value}`, { 'urgence-tile-selected': answers.urgence === u.value }]"
            @click="answers.urgence = u.value"
          >
            {{ t(`assistant_page.${u.labelKey}`) }}
          </button>
        </div>

        <div class="assistant-actions">
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="precedent"
          >
            {{ t('assistant_page.retour') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            {{ t('assistant_page.voir_resultats') }}
          </button>
        </div>
      </div>

      <!-- RÉSULTATS -->
      <div v-else-if="step === 'resultats'">
        <div class="results-banner card p-4 mb-4">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <p class="mb-1">
                <strong v-if="!chargement">
                  {{ typeAideChoisi?.disponible
                    ? t('assistant_page.trouve', { commune: answers.commune }, resultats.length)
                    : t('assistant_page.aucun_reservable', { label: t(`assistant_page.${typeAideChoisi?.labelKey}`), commune: answers.commune }) }}
                </strong>
                <strong v-else>{{ t('assistant_page.recherche_en_cours') }}</strong>
              </p>
              <p class="text-muted small mb-0">
                {{ recapTexte }}
              </p>
            </div>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="modifierReponses"
              >
                {{ t('assistant_page.modifier_reponse') }}
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="recommencer"
              >
                {{ t('assistant_page.recommencer') }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="!user"
          class="alert alert-info"
        >
          <router-link to="/connexion">
            {{ t('assistant_page.connectez_vous') }}
          </router-link>
          {{ t('assistant_page.ou') }}
          <router-link to="/inscription">
            {{ t('assistant_page.inscrivez_vous') }}
          </router-link>
          {{ t('assistant_page.pour_envoyer') }}
        </div>

        <template v-if="typeAideChoisi?.disponible">
          <div class="results-filters card p-3 mb-4">
            <div class="row g-3">
              <div class="col-sm-4">
                <label class="form-label small">{{ t('assistant_page.filtrer_commune') }}</label>
                <select
                  v-model="resultFilters.commune"
                  class="form-select form-select-sm"
                >
                  <option value="">
                    {{ t('commun.toutes_communes') }}
                  </option>
                  <option
                    v-for="c in COMMUNES_MAYOTTE"
                    :key="c.nom"
                    :value="c.nom"
                  >
                    {{ c.nom }}
                  </option>
                </select>
              </div>
              <div class="col-sm-4">
                <label class="form-label small">{{ t('assistant_page.type_service') }}</label>
                <select
                  v-model="resultFilters.service"
                  class="form-select form-select-sm"
                >
                  <option value="">
                    {{ t('commun.tous') }}
                  </option>
                  <option value="sante">
                    {{ t('assistant_page.type_sante_option') }}
                  </option>
                  <option value="coursier">
                    {{ t('assistant_page.type_courses_option') }}
                  </option>
                  <option value="menage">
                    {{ t('assistant_page.type_menage_option') }}
                  </option>
                </select>
              </div>
              <div class="col-sm-4 d-flex align-items-end">
                <div class="form-check">
                  <input
                    id="assistant-filtre-dispo"
                    v-model="resultFilters.disponibiliteJour"
                    class="form-check-input"
                    type="checkbox"
                  >
                  <label
                    class="form-check-label small"
                    for="assistant-filtre-dispo"
                  >
                    {{ t('assistant_page.disponible_le', { jour: jourDemandeLabel }) }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <p
            v-if="chargement"
            class="text-muted text-center py-5"
          >
            {{ t('commun.chargement') }}
          </p>
          <div
            v-else
            class="row g-4"
          >
            <div
              v-for="provider in resultats"
              :key="provider.id"
              class="col-md-6 col-lg-4"
            >
              <ProviderCard :provider="provider" />
            </div>
          </div>
          <p
            v-if="!chargement && !resultats.length"
            class="text-muted text-center py-5"
          >
            {{ t('assistant_page.aucun_resultat_filtre') }}
          </p>
        </template>

        <div
          v-else
          class="card p-4 text-center"
        >
          <p class="text-muted mb-3">
            {{ t('assistant_page.non_couvert_message') }}
          </p>
          <button
            type="button"
            class="btn btn-primary mx-auto"
            @click="modifierReponses"
          >
            {{ t('assistant_page.modifier_reponse_simple') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
