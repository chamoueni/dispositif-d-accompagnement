<script setup>
// Page dédiée "Assistant de besoin" (/assistant) : questionnaire en 4 étapes qui
// guide l'utilisateur vers les accompagnements correspondant à son besoin, puis
// affiche les résultats dans la même page (pas de route séparée pour les
// résultats : plus simple, cohérent avec le reste du site qui garde formulaire
// + confirmation dans une seule page, voir NouvelleDemande.vue).
import { computed, reactive, ref } from 'vue'
import { COMMUNES_MAYOTTE, getUsers } from '../data/store.js'
import { useAuth } from '../stores/auth'
import ProviderCard from '../components/ProviderCard.vue'
import ServiceIcon from '../components/ServiceIcon.vue'
import SpeakButton from '../components/SpeakButton.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/AssistantBesoin.css'

const { user } = useAuth()

const ZONES = ['Petite-Terre', 'Nord', 'Centre', 'Sud']
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// disponible: false pour les besoins pas encore rattachés à un vrai service
// réservable côté données (voir data/store.js : seuls role "sante" et les
// services "coursier"/"menage" existent aujourd'hui). Affichés quand même dans
// le questionnaire pour être honnête sur la couverture actuelle du dispositif,
// plutôt que masqués — la carte reste visible mais désactivée avec ce message.
const TYPES_AIDE = [
  { value: 'domicile', label: 'Aide à domicile', icon: 'menage', disponible: false },
  { value: 'sante', label: 'Santé / soins', icon: 'soins', disponible: true },
  { value: 'deplacement', label: 'Déplacement', icon: 'deplacement', disponible: false },
  { value: 'compagnie', label: 'Compagnie / soutien moral', icon: 'psychologique', disponible: false },
  { value: 'courses', label: 'Courses', icon: 'courses', disponible: true },
  { value: 'menage', label: 'Ménage', icon: 'menage', disponible: true },
  { value: 'garde', label: 'Garde / présence à domicile', icon: 'garde', disponible: false },
]

const URGENCES = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
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

const typeAideChoisi = computed(() => TYPES_AIDE.find((t) => t.value === answers.typeAide))

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
  const pour = answers.pourQui === 'moi' ? 'vous-même' : 'un proche'
  const aide = typeAideChoisi.value?.label || ''
  const quand = answers.date ? `le ${answers.date} de ${answers.heureDebut} à ${answers.heureFin}` : ''
  return `Recherche pour ${pour}, ${aide}, à ${answers.commune}, ${quand}.`
})
</script>

<template>
  <section class="assistant-page">
    <div class="container">
      <BackLink />

      <header class="assistant-header">
        <span class="section-label" />
        <h1 class="h3 mb-2">
          Trouvons l'accompagnement qui vous correspond
        </h1>
        <p class="text-muted intro-text mb-0">
          Répondez à 4 questions simples.
        </p>
      </header>

      <!-- Barre de progression : visible pendant le questionnaire uniquement. -->
      <ol
        v-if="step !== 'resultats'"
        class="assistant-progress"
        aria-label="Progression du questionnaire"
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
        Étape {{ step }} sur 4
      </p>

      <!-- ÉTAPE 1 — Pour qui -->
      <div
        v-if="step === 1"
        class="card assistant-step-card p-4"
      >
        <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
          <h2 class="h5 mb-0">
            Pour qui recherchez-vous un accompagnement ?
          </h2>
          <SpeakButton text="Pour qui recherchez-vous un accompagnement ? Moi-même, ou un proche ?" />
        </div>
        <div class="choice-grid choice-grid-2">
          <button
            type="button"
            class="choice-tile"
            :class="{ 'choice-tile-selected': answers.pourQui === 'moi' }"
            @click="answers.pourQui = 'moi'"
          >
            <strong>Moi-même</strong>
            <span class="text-muted small">Je cherche de l'aide pour moi</span>
          </button>
          <button
            type="button"
            class="choice-tile"
            :class="{ 'choice-tile-selected': answers.pourQui === 'proche' }"
            @click="answers.pourQui = 'proche'"
          >
            <strong>Un proche</strong>
            <span class="text-muted small">Je cherche de l'aide pour un proche</span>
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
            Continuer →
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
            Quel type d'aide recherchez-vous ?
          </h2>
          <SpeakButton text="Quel type d'aide recherchez-vous ?" />
        </div>
        <div class="choice-grid choice-grid-4">
          <button
            v-for="t in TYPES_AIDE"
            :key="t.value"
            type="button"
            class="choice-tile choice-tile-compact"
            :class="{
              'choice-tile-selected': answers.typeAide === t.value,
              'choice-tile-disabled': !t.disponible,
            }"
            @click="answers.typeAide = t.value"
          >
            <svg
              v-if="t.icon === 'deplacement'"
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
              :type="t.icon"
            />
            <strong>{{ t.label }}</strong>
            <span
              v-if="!t.disponible"
              class="badge text-bg-light border choice-tile-badge"
            >Bientôt disponible</span>
          </button>
        </div>
        <p
          v-if="typeAideChoisi && !typeAideChoisi.disponible"
          class="text-muted small mt-3 mb-0"
        >
          Cette catégorie n'est pas encore rattachée à des profils réservables sur le
          dispositif. Vous pouvez tout de même continuer : nous vous orienterons vers le
          bouton SOS si besoin.
        </p>
        <div class="assistant-actions">
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="precedent"
          >
            ← Retour
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            Continuer →
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
            Où habitez-vous ?
          </h2>
          <SpeakButton text="Où habitez-vous ? Sélectionnez votre commune." />
        </div>
        <p class="text-muted small mb-3">
          Sélectionnez votre commune. La recherche se fait par commune, pas par
          géolocalisation précise.
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
        >Commune</label>
        <select
          id="assistant-commune"
          v-model="answers.commune"
          class="form-select"
        >
          <option value="">
            Choisir une commune
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
            ← Retour
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            Continuer →
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
            Quand avez-vous besoin d'aide ?
          </h2>
          <SpeakButton text="Quand avez-vous besoin d'aide ? Indiquez une date, une heure de début et une heure de fin." />
        </div>

        <div class="row g-3 mb-3">
          <div class="col-sm-4">
            <label
              class="form-label"
              for="assistant-date"
            >Date</label>
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
            >Heure de début</label>
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
            >Heure de fin</label>
            <input
              id="assistant-fin"
              v-model="answers.heureFin"
              type="time"
              class="form-control"
            >
          </div>
        </div>

        <label class="form-label d-block">Niveau d'urgence</label>
        <div class="urgence-choices mb-3">
          <button
            v-for="u in URGENCES"
            :key="u.value"
            type="button"
            class="urgence-tile"
            :class="[`urgence-tile-${u.value}`, { 'urgence-tile-selected': answers.urgence === u.value }]"
            @click="answers.urgence = u.value"
          >
            {{ u.label }}
          </button>
        </div>

        <div class="assistant-actions">
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="precedent"
          >
            ← Retour
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!peutContinuer"
            @click="suivant"
          >
            Voir les résultats 🔎
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
                    ? `Nous avons trouvé ${resultats.length} accompagnement${resultats.length > 1 ? 's' : ''} correspondant à votre recherche à ${answers.commune}.`
                    : `Aucun accompagnement réservable pour "${typeAideChoisi?.label}" pour le moment à ${answers.commune}.` }}
                </strong>
                <strong v-else>Recherche en cours…</strong>
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
                ✎ Modifier ma réponse
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="recommencer"
              >
                Recommencer
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="!user"
          class="alert alert-info"
        >
          <router-link to="/connexion">
            Connectez-vous
          </router-link>
          ou
          <router-link to="/inscription">
            inscrivez-vous
          </router-link>
          pour pouvoir envoyer une demande à un accompagnant.
        </div>

        <template v-if="typeAideChoisi?.disponible">
          <div class="results-filters card p-3 mb-4">
            <div class="row g-3">
              <div class="col-sm-4">
                <label class="form-label small">Filtrer par commune</label>
                <select
                  v-model="resultFilters.commune"
                  class="form-select form-select-sm"
                >
                  <option value="">
                    Toutes les communes
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
                <label class="form-label small">Type de service</label>
                <select
                  v-model="resultFilters.service"
                  class="form-select form-select-sm"
                >
                  <option value="">
                    Tous
                  </option>
                  <option value="sante">
                    Santé / soins
                  </option>
                  <option value="coursier">
                    Courses
                  </option>
                  <option value="menage">
                    Ménage
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
                    Disponible le {{ jourDemande }}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <p
            v-if="chargement"
            class="text-muted text-center py-5"
          >
            Chargement…
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
            Aucun résultat pour ces critères. Essayez une autre commune ou un autre filtre.
          </p>
        </template>

        <div
          v-else
          class="card p-4 text-center"
        >
          <p class="text-muted mb-3">
            Ce besoin n'est pas encore couvert par une catégorie réservable sur le
            dispositif. Contactez-nous via le bouton SOS pour être orienté, ou choisissez
            une autre catégorie.
          </p>
          <button
            type="button"
            class="btn btn-primary mx-auto"
            @click="modifierReponses"
          >
            Modifier ma réponse
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
