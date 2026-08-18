<script setup>
// Formulaire d'inscription unique pour les 3 rôles : les champs affichés
// (spécialité, services proposés) changent selon le rôle choisi, mais tout
// reste dans le même <form> pour un parcours en une seule étape.
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { COMMUNES_MAYOTTE } from '../data/store'
import '../styles/Inscription.css'

const SPECIALITES = ['Infirmier(ère)', 'Aide-soignant(e)', 'Médecin', 'Kinésithérapeute', 'Autre']

const router = useRouter()
const { signup } = useAuth()

const form = reactive({
  nom: '',
  email: '',
  password: '',
  telephone: '',
  ville: COMMUNES_MAYOTTE[0].nom,
  role: 'senior',
  specialite: SPECIALITES[0],
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

  if (!form.nom || !form.email || !form.password || !form.telephone || !form.ville) {
    error.value = 'Merci de remplir tous les champs obligatoires.'
    return
  }
  if (form.password.length < 6) {
    error.value = 'Le mot de passe doit contenir au moins 6 caractères.'
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
      role: form.role,
      specialite: form.role === 'sante' ? form.specialite : '',
      services: form.role === 'particulier' ? [...form.services] : [],
      bio: form.bio,
      disponibilites: [],
    })
    router.push('/profil')
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
          Créer un compte
        </h1>
        <p class="text-muted mb-4">
          Trouvez ou proposez de l'aide en quelques minutes.
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label class="form-label">Je suis…</label>
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
                Personne âgée
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
                Personnel de santé
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
                Particulier
              </label>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="nom"
              >Nom complet</label>
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
              >Email</label>
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
              >Mot de passe</label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                class="form-control"
                required
              >
            </div>
            <div class="col-md-6 mb-3">
              <label
                class="form-label"
                for="telephone"
              >Téléphone</label>
              <input
                id="telephone"
                v-model="form.telephone"
                type="tel"
                class="form-control"
                required
              >
            </div>
          </div>

          <div class="mb-3">
            <label
              class="form-label"
              for="ville"
            >Commune</label>
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

          <div
            v-if="form.role === 'sante'"
            class="mb-3"
          >
            <label
              class="form-label"
              for="specialite"
            >Spécialité</label>
            <select
              id="specialite"
              v-model="form.specialite"
              class="form-select"
            >
              <option
                v-for="s in SPECIALITES"
                :key="s"
                :value="s"
              >
                {{ s }}
              </option>
            </select>
          </div>

          <div
            v-if="form.role === 'particulier'"
            class="mb-3"
          >
            <label class="form-label">Services proposés</label>
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
              >Coursier</label>
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
              >Ménage</label>
            </div>
          </div>

          <div
            v-if="form.role !== 'senior'"
            class="mb-3"
          >
            <label
              class="form-label"
              for="bio"
            >Présentation</label>
            <textarea
              id="bio"
              v-model="form.bio"
              class="form-control"
              rows="3"
              placeholder="Quelques mots sur votre expérience et vos disponibilités générales."
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
            Créer mon compte
          </button>
        </form>

        <p class="text-center text-muted small mt-3 mb-0">
          Déjà inscrit ? <router-link to="/connexion">
            Se connecter
          </router-link>
        </p>
      </div>
    </div>
  </section>
</template>
