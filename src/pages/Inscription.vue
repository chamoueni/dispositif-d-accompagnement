<script setup>
// Formulaire d'inscription unique pour les 3 rôles : les champs affichés
// (spécialité, services proposés) changent selon le rôle choisi, mais tout
// reste dans le même <form> pour un parcours en une seule étape.
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import { COMMUNES_MAYOTTE } from '../data/store'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import '../styles/Inscription.css'

const { t } = useI18n()

// Clés vers specialites.* (voir locales) : mêmes libellés que sur Profil.vue.
const SPECIALITE_KEYS = ['infirmier', 'aide_soignant', 'medecin', 'kine', 'autre']

// Format email basique (au-delà du type="email" du navigateur, qui laisse
// passer des choses comme "a@b" sans domaine complet).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Numéros français/réunionnais/mahorais : local à 10 chiffres (0X XX XX XX XX,
// le format utilisé aussi bien en France qu'à La Réunion et Mayotte) ou
// international +33/+262. Espaces, points et tirets tolérés à la saisie.
const TELEPHONE_REGEX = /^(0\d{9}|\+33\d{9}|\+262\d{9})$/

const router = useRouter()
const { signup } = useAuth()

const form = reactive({
  nom: '',
  email: '',
  password: '',
  telephone: '',
  ville: COMMUNES_MAYOTTE[0].nom,
  adresse: '',
  role: 'senior',
  specialite: t(`specialites.${SPECIALITE_KEYS[0]}`),
  services: [],
  bio: '',
})

const error = ref('')
const submitting = ref(false)

// Ajoute/retire un service (coursier, ménage) de la liste cochée par le particulier.
function toggleService(service) {
  const index = form.services.indexOf(service)
  if (index === -1) form.services.push(service)
  else form.services.splice(index, 1)
}

async function handleSubmit() {
  error.value = ''

  if (!form.nom || !form.email || !form.password || !form.telephone || !form.ville || !form.adresse) {
    error.value = t('inscription_page.erreur_champs')
    return
  }
  if (!EMAIL_REGEX.test(form.email.trim())) {
    error.value = t('inscription_page.erreur_email')
    return
  }
  if (!TELEPHONE_REGEX.test(form.telephone.replace(/[\s.-]/g, ''))) {
    error.value = t('inscription_page.erreur_telephone')
    return
  }
  if (form.password.length < 6) {
    error.value = t('inscription_page.erreur_password')
    return
  }

  submitting.value = true
  try {
    // On ne garde que les champs pertinents pour le rôle choisi (specialite pour
    // le personnel de santé, services pour les particuliers), le reste part vide.
    await signup({
      nom: form.nom,
      email: form.email,
      password: form.password,
      telephone: form.telephone,
      ville: form.ville,
      adresse: form.adresse,
      role: form.role,
      specialite: form.role === 'sante' ? form.specialite : '',
      services: form.role === 'particulier' ? [...form.services] : [],
      bio: form.bio,
      disponibilites: [],
    })
    router.push('/mon-compte')
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="signup-page">
    <div class="container">
      <div class="signup-card card mx-auto">
        <span class="section-label" />
        <h1 class="h3 mb-1">
          {{ t('inscription_page.titre') }}
        </h1>
        <p class="text-muted mb-4">
          {{ t('inscription_page.sous_titre') }}
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label class="form-label">{{ t('inscription_page.je_suis') }}</label>
            <div class="role-choices">
              <label
                class="role-choice"
                :class="{ active: form.role === 'senior' }"
              >
                <input
                  v-model="form.role"
                  type="radio"
                  value="senior"
                >
                {{ t('inscription_page.role_senior') }}
              </label>
              <label
                class="role-choice"
                :class="{ active: form.role === 'sante' }"
              >
                <input
                  v-model="form.role"
                  type="radio"
                  value="sante"
                >
                {{ t('inscription_page.role_sante') }}
              </label>
              <label
                class="role-choice"
                :class="{ active: form.role === 'particulier' }"
              >
                <input
                  v-model="form.role"
                  type="radio"
                  value="particulier"
                >
                {{ t('inscription_page.role_particulier') }}
              </label>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="nom"
              >{{ t('inscription_page.nom_label') }}</label>
              <input
                id="nom"
                v-model="form.nom"
                type="text"
                class="form-control"
                required
              >
            </div>
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="email"
              >{{ t('inscription_page.email_label') }}</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-control"
                required
              >
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="password"
              >{{ t('inscription_page.password_label') }}</label>
              <ChampMotDePasse
                id="password"
                v-model="form.password"
                autocomplete="new-password"
                required
              />
            </div>
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="telephone"
              >{{ t('inscription_page.telephone_label') }}</label>
              <input
                id="telephone"
                v-model="form.telephone"
                type="tel"
                class="form-control"
                required
              >
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="ville"
              >{{ t('inscription_page.commune_label') }}</label>
              <select
                id="ville"
                v-model="form.ville"
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
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="adresse"
              >{{ t('inscription_page.adresse_label') }}</label>
              <input
                id="adresse"
                v-model="form.adresse"
                type="text"
                class="form-control"
                :placeholder="t('inscription_page.adresse_placeholder')"
                required
              >
            </div>
          </div>

          <div
            v-if="form.role === 'sante'"
            class="mb-3"
          >
            <label
              class="form-label"
              for="specialite"
            >{{ t('inscription_page.specialite_label') }}</label>
            <select
              id="specialite"
              v-model="form.specialite"
              class="form-select"
            >
              <option
                v-for="s in SPECIALITE_KEYS"
                :key="s"
                :value="t(`specialites.${s}`)"
              >
                {{ t(`specialites.${s}`) }}
              </option>
            </select>
          </div>

          <div
            v-if="form.role === 'particulier'"
            class="mb-3"
          >
            <label class="form-label">{{ t('inscription_page.services_label') }}</label>
            <div class="form-check">
              <input
                id="svc-coursier"
                class="form-check-input"
                type="checkbox"
                :checked="form.services.includes('coursier')"
                @change="toggleService('coursier')"
              >
              <label
                class="form-check-label"
                for="svc-coursier"
              >{{ t('inscription_page.coursier') }}</label>
            </div>
            <div class="form-check">
              <input
                id="svc-menage"
                class="form-check-input"
                type="checkbox"
                :checked="form.services.includes('menage')"
                @change="toggleService('menage')"
              >
              <label
                class="form-check-label"
                for="svc-menage"
              >{{ t('inscription_page.menage') }}</label>
            </div>
          </div>

          <div
            v-if="form.role !== 'senior'"
            class="mb-3"
          >
            <label
              class="form-label"
              for="bio"
            >{{ t('inscription_page.bio_label') }} <span class="text-muted small">{{ t('inscription_page.bio_facultatif') }}</span></label>
            <textarea
              id="bio"
              v-model="form.bio"
              class="form-control"
              rows="3"
              :placeholder="t('inscription_page.bio_placeholder')"
            />
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
            :disabled="submitting"
          >
            {{ t('inscription_page.cta') }}
          </button>
        </form>

        <p class="text-center text-muted small mt-3 mb-0">
          {{ t('inscription_page.deja_inscrit') }} <router-link to="/connexion">
            {{ t('inscription_page.se_connecter') }}
          </router-link>
        </p>
      </div>
    </div>
  </section>
</template>
