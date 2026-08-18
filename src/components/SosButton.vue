<script setup>
// Bouton d'urgence flottant : toujours visible dans l'espace personne âgée (posé
// dans App.vue, pas dans une page en particulier). Au clic, propose deux options
// bien distinctes pour ne pas confondre une urgence réelle avec un souci d'usage :
// - appel direct au 112 (numéro d'urgence européen, valide à Mayotte)
// - un message enregistré directement en base pour un problème avec le site.
//   Pas de lien mailto: ici : ça ne marche que si un client mail est configuré
//   sur l'appareil, ce qu'on ne peut pas supposer pour le public visé.
import { ref } from 'vue'
import { useAuth } from '../stores/auth'
import { addMessageContact } from '../data/store'
import '../styles/SosButton.css'

const { user } = useAuth()

const ouvert = ref(false)
// vue : 'menu' (choix initial) ou 'formulaire' (saisie du message).
const vue = ref('menu')
const message = ref('')
const envoi = ref(false)
const envoye = ref(false)
const erreur = ref('')

function ouvrirFormulaire() {
  vue.value = 'formulaire'
}

function fermer() {
  ouvert.value = false
  // Reset après la fermeture (petite temporisation pour ne pas voir le menu
  // "sauter" pendant que le panneau se referme).
  setTimeout(() => {
    vue.value = 'menu'
    message.value = ''
    envoye.value = false
    erreur.value = ''
  }, 200)
}

async function envoyerMessage() {
  if (!message.value.trim()) {
    erreur.value = 'Merci de décrire le problème avant d’envoyer.'
    return
  }
  erreur.value = ''
  envoi.value = true
  try {
    await addMessageContact({
      userId: user.value?.id,
      nom: user.value?.nom || 'Visiteur non connecté',
      message: message.value,
    })
    envoye.value = true
  } catch (err) {
    erreur.value = err.message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="sos-widget">
    <div
      v-if="ouvert"
      class="sos-menu"
    >
      <template v-if="vue === 'menu'">
        <a
          href="tel:112"
          class="sos-menu-item sos-menu-item-urgence"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
          </svg>
          <span>
            <strong>Urgence</strong>
            <small>Appeler le 112</small>
          </span>
        </a>
        <button
          type="button"
          class="sos-menu-item"
          @click="ouvrirFormulaire"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <path d="m4 7 8 6 8-6" />
          </svg>
          <span>
            <strong>Un problème avec le site</strong>
            <small>Nous envoyer un message</small>
          </span>
        </button>
      </template>

      <template v-else-if="envoye">
        <p class="sos-confirmation">
          Message envoyé, merci. On vous répondra dès que possible.
        </p>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm w-100"
          @click="fermer"
        >
          Fermer
        </button>
      </template>

      <form
        v-else
        class="sos-form"
        @submit.prevent="envoyerMessage"
      >
        <label
          class="form-label small"
          for="sos-message"
        >Décrivez le problème</label>
        <textarea
          id="sos-message"
          v-model="message"
          class="form-control form-control-sm"
          rows="4"
          placeholder="Qu'est-ce qui ne fonctionne pas ?"
        />
        <p
          v-if="erreur"
          class="text-danger small mt-2 mb-0"
        >
          {{ erreur }}
        </p>
        <button
          type="submit"
          class="btn btn-primary btn-sm w-100 mt-2"
          :disabled="envoi"
        >
          {{ envoi ? 'Envoi…' : 'Envoyer' }}
        </button>
      </form>
    </div>

    <button
      type="button"
      class="sos-button"
      :aria-expanded="ouvert"
      aria-label="Aide et urgence"
      @click="ouvert ? fermer() : (ouvert = true)"
    >
      SOS
    </button>
  </div>
</template>
