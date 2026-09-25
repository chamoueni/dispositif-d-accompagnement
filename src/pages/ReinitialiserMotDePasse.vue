<script setup>
// Page ouverte depuis le lien reçu par email (voir MotDePasseOublie.vue).
// Supabase transforme automatiquement le jeton présent dans l'URL en une
// session de récupération (event "PASSWORD_RECOVERY") : pas de garde de route
// requiresAuth ici, on vérifie nous-mêmes qu'une session valide existe, car le
// routeur global pourrait tester avant que cette session soit établie.
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../stores/auth'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import '../styles/Connexion.css'

const { t } = useI18n()
const { changerMotDePasse, logout } = useAuth()

const verification = ref(true)
const lienValide = ref(false)
let unsubscribe = null

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  lienValide.value = !!data.session
  verification.value = false

  // Filet de sécurité : si la session de récupération arrive juste après ce
  // premier contrôle (traitement du lien encore en cours), on la détecte ici.
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || session) lienValide.value = true
  })
  unsubscribe = () => listener.subscription.unsubscribe()
})

onUnmounted(() => unsubscribe?.())

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
    await changerMotDePasse(form.nouveau)
    // On referme la session de récupération : l'utilisateur se reconnecte
    // avec son nouveau mot de passe, comme après un changement classique.
    await logout()
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
