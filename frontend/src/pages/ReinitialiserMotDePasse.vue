<script setup>
// Page ouverte depuis le lien de récupération reçu par email.
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import '../styles/Connexion.css'

const { t } = useI18n()
const { verifierLienReinitialisation, reinitialiserMotDePasse } = useAuth()

const verification = ref(true)
const lienValide = ref(false)
let jetonReinitialisation = ''

onMounted(async () => {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  jetonReinitialisation = hash.get('type') === 'recovery' ? hash.get('access_token') || '' : ''
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  if (jetonReinitialisation) {
    try {
      await verifierLienReinitialisation(jetonReinitialisation)
      lienValide.value = true
    } catch {
      lienValide.value = false
    }
  }
  verification.value = false
})

const form = reactive({ nouveau: '', confirmation: '' })
const erreur = ref('')
const enCours = ref(false)
const reussi = ref(false)

async function handleSubmit() {
  erreur.value = ''

  if (form.nouveau.length < 6) {
    erreur.value = t('reinit_mdp_page.erreur_court')
    return
  }
  if (form.nouveau !== form.confirmation) {
    erreur.value = t('reinit_mdp_page.erreur_diff')
    return
  }

  enCours.value = true
  try {
    await reinitialiserMotDePasse(jetonReinitialisation, form.nouveau)
    reussi.value = true
  } catch (err) {
    erreur.value = err.message
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <div class="container">
      <div class="login-card card mx-auto">
        <span class="section-label" />
        <h1 class="h3 mb-1">
          {{ t('reinit_mdp_page.titre') }}
        </h1>

        <p
          v-if="verification"
          class="text-muted"
        >
          {{ t('reinit_mdp_page.verification') }}
        </p>

        <template v-else-if="reussi">
          <p class="text-success small mb-3">
            {{ t('reinit_mdp_page.reussi_texte') }}
          </p>
          <router-link
            to="/connexion"
            class="btn btn-primary w-100"
          >
            {{ t('reinit_mdp_page.aller_connexion') }}
          </router-link>
        </template>

        <template v-else-if="!lienValide">
          <p class="text-danger small mb-3">
            {{ t('reinit_mdp_page.lien_invalide') }}
          </p>
          <router-link
            to="/mot-de-passe-oublie"
            class="btn btn-outline-secondary w-100"
          >
            {{ t('reinit_mdp_page.redemander') }}
          </router-link>
        </template>

        <form
          v-else
          @submit.prevent="handleSubmit"
        >
          <div class="mb-3">
            <label
              class="form-label"
              for="nouveau"
            >{{ t('reinit_mdp_page.nouveau_label') }}</label>
            <ChampMotDePasse
              id="nouveau"
              v-model="form.nouveau"
              name="new-password"
              autocomplete="new-password"
              required
            />
          </div>
          <div class="mb-3">
            <label
              class="form-label"
              for="confirmation"
            >{{ t('reinit_mdp_page.confirmer_label') }}</label>
            <ChampMotDePasse
              id="confirmation"
              v-model="form.confirmation"
              name="new-password-confirm"
              autocomplete="new-password"
              required
            />
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
            :disabled="enCours"
          >
            {{ enCours ? t('commun.enregistrement_en_cours') : t('reinit_mdp_page.cta_valider') }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
