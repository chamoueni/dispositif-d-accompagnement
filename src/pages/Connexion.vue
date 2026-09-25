<script setup>
// Connexion email/mot de passe via Supabase Auth (voir stores/auth.js).
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import '../styles/Connexion.css'

const { t } = useI18n()
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
          {{ t('connexion_page.titre') }}
        </h1>
        <p class="text-muted mb-4">
          {{ route.query.redirect ? t('connexion_page.sous_titre_redirect') : t('connexion_page.sous_titre_defaut') }}
        </p>

        <form @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label
              class="form-label"
              for="email"
            >{{ t('connexion_page.email_label') }}</label>
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
            >{{ t('connexion_page.password_label') }}</label>
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
            {{ t('connexion_page.cta') }}
          </button>
        </form>

        <p class="text-center small mt-3 mb-0">
          <router-link to="/mot-de-passe-oublie">
            {{ t('connexion_page.mdp_oublie') }}
          </router-link>
        </p>

        <p class="text-center text-muted small mt-2 mb-0">
          {{ t('connexion_page.pas_de_compte') }} <router-link to="/inscription">
            {{ t('nav.inscription') }}
          </router-link>
        </p>
      </div>
    </div>
  </section>
</template>
