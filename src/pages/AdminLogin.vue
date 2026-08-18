<script setup>
// Connexion admin séparée de la connexion "grand public" (voir Connexion.vue) :
// même mécanisme Supabase en dessous (un seul système d'authentification), mais
// une page dédiée à l'URL /admin/connexion, pour que l'espace admin se comporte
// comme un site à part plutôt qu'une simple sous-page du site public.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import IconBadge from '../components/IconBadge.vue'
import '../styles/AdminLogin.css'

const router = useRouter()
const { isAdmin, login, logout } = useAuth()

const email = ref('')
const password = ref('')
const afficherMotDePasse = ref(false)
const erreur = ref('')
const chargement = ref(false)

// Si un admin déjà connecté revient sur cette page, autant l'envoyer
// directement au tableau de bord plutôt que de lui remontrer le formulaire.
onMounted(() => {
  if (isAdmin.value) router.push('/admin')
})

async function seConnecter() {
  erreur.value = ''
  chargement.value = true
  try {
    await login(email.value, password.value)
    if (!isAdmin.value) {
      // Identifiants valides mais compte non-admin : on ne laisse pas la
      // session d'un autre utilisateur active sur cette page.
      await logout()
      erreur.value = 'Ce compte n\'a pas les droits administrateur.'
      return
    }
    router.push('/admin')
  } catch (err) {
    erreur.value = err.message
  } finally {
    chargement.value = false
  }
}
</script>

<template>
  <section class="admin-login-page">
    <div class="admin-login-card card">
      <IconBadge
        name="shield-check"
        tone="accent"
      />
      <h1 class="h4 mt-3 mb-1">
        Espace admin
      </h1>
      <p class="text-muted small mb-4">
        Connexion sécurisée
      </p>

      <form @submit.prevent="seConnecter">
        <div class="mb-3">
          <label
            class="form-label"
            for="admin-email"
          >Email</label>
          <input
            id="admin-email"
            v-model="email"
            type="email"
            class="form-control"
            required
          >
        </div>
        <div class="mb-3">
          <label
            class="form-label"
            for="admin-password"
          >Mot de passe</label>
          <div class="admin-login-password">
            <input
              id="admin-password"
              v-model="password"
              :type="afficherMotDePasse ? 'text' : 'password'"
              class="form-control"
              required
            >
            <button
              type="button"
              class="admin-login-toggle"
              :aria-label="afficherMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="afficherMotDePasse = !afficherMotDePasse"
            >
              {{ afficherMotDePasse ? 'Masquer' : 'Afficher' }}
            </button>
          </div>
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
          :disabled="chargement"
        >
          {{ chargement ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <router-link
        to="/"
        class="admin-login-back"
      >
        ← Retour au site
      </router-link>
    </div>
  </section>
</template>
