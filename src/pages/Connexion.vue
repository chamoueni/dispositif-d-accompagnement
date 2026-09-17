<script setup>
// Connexion email/mot de passe via Supabase Auth (voir stores/auth.js).
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import '../styles/Connexion.css'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const form = reactive({ email: '', password: '' })
const error = ref('')

// Si on arrive ici via la garde requiresAuth (ex. clic sur "Choisir Confort"
// sans être connecté), on revient après connexion là où on voulait aller
// plutôt que de laisser l'utilisateur sur /profil sans lien avec son clic.
async function handleSubmit() {
  error.value = ''
  try {
    await login(form.email, form.password)
    router.push(route.query.redirect || '/mon-compte')
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <section class="login-page">
    <div class="container">
      <div class="login-card card mx-auto">
        <span class="section-label" />
        <h1 class="h3 mb-1">
          Connexion
        </h1>
        <p class="text-muted mb-4">
          {{ route.query.redirect ? 'Connectez-vous pour continuer.' : 'Accédez à votre espace.' }}
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="mb-3">
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
          <div class="mb-3">
            <label
              class="form-label"
              for="password"
            >Mot de passe</label>
            <ChampMotDePasse
              id="password"
              v-model="form.password"
              required
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
          >
            Se connecter
          </button>
        </form>

        <p class="text-center small mt-3 mb-0">
          <router-link to="/mot-de-passe-oublie">
            Mot de passe oublié ?
          </router-link>
        </p>

        <p class="text-center text-muted small mt-2 mb-0">
          Pas encore de compte ? <router-link to="/inscription">
            S'inscrire
          </router-link>
        </p>
      </div>
    </div>
  </section>
</template>
