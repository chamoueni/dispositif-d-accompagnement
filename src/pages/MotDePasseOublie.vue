<script setup>
// Demande de réinitialisation de mot de passe (utilisateur déconnecté).
// Envoie un email Supabase avec un lien vers /reinitialiser-mot-de-passe.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import '../styles/Connexion.css'

const { t } = useI18n()
const { demanderReinitialisationMotDePasse } = useAuth()

const email = ref('')
const envoi = ref(false)
const envoye = ref(false)
const erreur = ref('')

// Message générique dans tous les cas (Supabase ne révèle jamais si l'email
// existe ou non) : on évite de laisser deviner quels emails ont un compte.
async function handleSubmit() {
  erreur.value = ''
  envoi.value = true
  try {
    await demanderReinitialisationMotDePasse(email.value)
  } catch (err) {
    erreur.value = err.message
  } finally {
    envoi.value = false
    envoye.value = true
  }
}
</script>

<template>
  <section class="login-page">
    <div class="container">
      <div class="login-card card mx-auto">
        <span class="section-label" />
        <h1 class="h3 mb-1">
          {{ t('mdp_oublie_page.titre') }}
        </h1>
        <p class="text-muted mb-4">
          {{ t('mdp_oublie_page.intro') }}
        </p>

        <div v-if="envoye">
          <p class="text-success small mb-3">
            {{ t('mdp_oublie_page.envoye_texte') }}
          </p>
          <router-link
            to="/connexion"
            class="btn btn-outline-secondary w-100"
          >
            {{ t('mdp_oublie_page.retour_connexion') }}
          </router-link>
        </div>

        <form
          v-else
          @submit.prevent="handleSubmit"
        >
          <div class="mb-3">
            <label
              class="form-label"
              for="email"
            >{{ t('mdp_oublie_page.email_label') }}</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-control"
              required
            >
          </div>

          <p
            v-if="erreur"
            class="text-danger small mb-3"
          >
            {{ erreur }}
          </p>

          <button
            type="submit"
            class="btn btn-primary w-100"
            :disabled="envoi"
          >
            {{ envoi ? t('demande.envoi_en_cours') : t('mdp_oublie_page.cta_envoyer') }}
          </button>
        </form>

        <p
          v-if="!envoye"
          class="text-center text-muted small mt-3 mb-0"
        >
          <router-link to="/connexion">
            {{ t('mdp_oublie_page.retour_connexion') }}
          </router-link>
        </p>
      </div>
    </div>
  </section>
</template>
