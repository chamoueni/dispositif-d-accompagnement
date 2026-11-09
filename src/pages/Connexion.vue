<script setup>
// Connexion email/mot de passe via l’API sécurisée du serveur.
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import '../styles/BackLink.css'
import '../styles/Connexion.css'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { login } = useAuth()

// Arrivée ici via un clic sur une formule sans être connecté (garde requiresAuth,
// voir router/index.js) : on propose de retourner choisir une autre formule
// plutôt que de laisser l'utilisateur bloqué sur ce formulaire de connexion
// sans lien avec "Nos formules".
const vientDUneFormule = route.query.redirect?.toString().startsWith('/formule/')

const form = reactive({ email: '', password: '', remember: false })
const error = ref('')

// Demande au navigateur de proposer « Enregistrer le mot de passe ? ».
// Comme la connexion passe par fetch (pas de rechargement de page), certains
// navigateurs ne détectent pas toujours la connexion : l'API Credential
// Management (Chrome, Edge, Opera, Android) affiche alors sa fenêtre native.
// Firefox et Safari ne la connaissent pas, mais repèrent eux-mêmes le
// formulaire grâce aux attributs autocomplete="username"/"current-password".
// Le mot de passe va directement au gestionnaire du navigateur : le site ne le
// stocke jamais.
async function proposerEnregistrementMotDePasse(email, password) {
  if (!window.PasswordCredential || !navigator.credentials?.store) return
  try {
    await navigator.credentials.store(
      new window.PasswordCredential({ id: email, password, name: email }),
    )
  } catch {
    // Refus de l'utilisateur ou navigateur incompatible : ce n'est pas bloquant.
  }
}

// Si on arrive ici via la garde requiresAuth (ex. clic sur "Choisir Confort"
// sans être connecté), on revient après connexion là où on voulait aller
// plutôt que de laisser l'utilisateur sur /profil sans lien avec son clic.
async function handleSubmit() {
  error.value = ''
  try {
    await login(form.email, form.password, form.remember)
    // Seulement après une connexion réussie : on ne propose jamais
    // d'enregistrer un mot de passe erroné.
    await proposerEnregistrementMotDePasse(form.email, form.password)
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
        <router-link
          v-if="vientDUneFormule"
          to="/#nos-formules"
          class="back-link"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          {{ t('connexion_page.retour_formules') }}
        </router-link>
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
              name="email"
              type="email"
              class="form-control"
              autocomplete="username"
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
              name="password"
              autocomplete="current-password"
              required
            />
          </div>
          <div class="form-check mb-3">
            <input
              id="remember"
              v-model="form.remember"
              class="form-check-input"
              type="checkbox"
            >
            <label
              class="form-check-label"
              for="remember"
            >{{ t('connexion_page.se_souvenir') }}</label>
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
