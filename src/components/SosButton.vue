<script setup>
// Bouton d'urgence flottant : visible sur l'ensemble du site pour aider les
// utilisateurs à poser des questions, obtenir une réponse rapide et signaler
// un problème. On garde aussi l'appel d'urgence 112. Le chat pose chaque
// question à l'assistant IA (voir server/index.js) ; si l'appel échoue (API
// injoignable, pas de clé configurée...), on retombe sur des réponses FAQ
// statiques pour que le widget reste utilisable hors-ligne/en démo.
import { nextTick, ref } from 'vue'
import { useAuth } from '../stores/auth'
import { useI18n } from 'vue-i18n'
import { addMessageContact } from '../data/store'
import { API_BASE_URL } from '../lib/apiBase'
import '../styles/SosButton.css'

const { user } = useAuth()
// Textes du bouton d'urgence et du formulaire de contact : voir src/locales/.
const { t } = useI18n()

const ouvert = ref(false)
// vue : 'menu' (choix initial), 'formulaire' (message) ou 'chat'.
const vue = ref('menu')
const message = ref('')
const envoi = ref(false)
const envoye = ref(false)
const erreur = ref('')

// Historique de la conversation du chat IA : [{ role: 'user'|'assistant', texte }].
const historique = ref([])
const reponseEnCours = ref(false)
const chatMessagesEl = ref(null)

const DELAI_MAYOTTE_MINUTES = 12

// Réponses de secours si l'assistant IA est injoignable (pas de clé API
// configurée côté serveur, serveur non déployé, hors-ligne...).
function formulaireReponseAutomatique(texte) {
  const contenu = texte.toLowerCase()

  if (contenu.includes('mayotte') || contenu.includes('zone') || contenu.includes('délai')) {
    return `À Mayotte, le délai moyen de réponse est d'environ ${DELAI_MAYOTTE_MINUTES} minutes pour les demandes de première aide et de mise en relation, puis selon la zone (Nord, Centre, Sud, Petite-Terre).`
  }

  if (contenu.includes('inscription') || contenu.includes('s inscrire') || contenu.includes('compte')) {
    return 'Pour vous inscrire, allez sur la page d’accueil puis choisissez “Je souhaite aider” ou “Je cherche de l’aide”. Le profil est ensuite guidé pas à pas.'
  }

  if (contenu.includes('service') || contenu.includes('aide') || contenu.includes('soin') || contenu.includes('course')) {
    return 'Le dispositif propose des services comme les soins à domicile, les courses, le ménage, la garde et le soutien psychologique selon les profils disponibles près de chez vous.'
  }

  if (contenu.includes('prix') || contenu.includes('gratuit') || contenu.includes('essai')) {
    return 'La mise en relation de base reste gratuite. Une offre découverte peut proposer 3 essais gratuits selon les critères de la recherche et la disponibilité locale.'
  }

  return 'Je peux vous orienter vers les services disponibles à Mayotte, la procédure d’inscription, les zones géographiques et les délais de réponse. Posez une question plus précise.'
}

function ouvrirChat() {
  vue.value = 'chat'
}

function ouvrirFormulaire() {
  vue.value = 'formulaire'
}

function fermer() {
  ouvert.value = false
  setTimeout(() => {
    vue.value = 'menu'
    message.value = ''
    envoye.value = false
    erreur.value = ''
    historique.value = []
  }, 200)
}

async function scrollVersLeBas() {
  await nextTick()
  if (chatMessagesEl.value) {
    chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
  }
}

// Délai max avant d'abandonner l'appel et de retomber sur la FAQ statique :
// le widget ne doit jamais faire attendre l'utilisateur plus de quelques
// secondes, y compris si le serveur Render met du temps à se réveiller
// (mise en veille du plan gratuit après inactivité) ou si l'API IA répond
// lentement.
const DELAI_MAX_REPONSE_IA_MS = 5000

// Interroge l'assistant IA côté serveur (voir server/index.js, endpoint
// /api/chat-ia). En cas d'échec ou de dépassement du délai (réseau, clé
// absente, serveur non déployé/endormi), on relève l'erreur pour que
// l'appelant retombe sur la FAQ statique.
async function demanderAssistantIA(texte) {
  const controleur = new AbortController()
  const delai = setTimeout(() => controleur.abort(), DELAI_MAX_REPONSE_IA_MS)
  try {
    const reponse = await fetch(`${API_BASE_URL}/api/chat-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: texte,
        historique: historique.value.slice(-10),
      }),
      signal: controleur.signal,
    })
    if (!reponse.ok) throw new Error('assistant IA indisponible')
    const donnees = await reponse.json()
    return donnees.reponse
  } finally {
    clearTimeout(delai)
  }
}

async function envoyerMessage() {
  if (!message.value.trim()) {
    erreur.value = 'Merci de décrire le problème avant d’envoyer.'
    return
  }

  if (vue.value === 'chat') {
    const texte = message.value.trim()
    historique.value.push({ role: 'user', texte })
    message.value = ''
    erreur.value = ''
    reponseEnCours.value = true
    scrollVersLeBas()
    try {
      const texteReponse = await demanderAssistantIA(texte)
      historique.value.push({ role: 'assistant', texte: texteReponse })
    } catch {
      historique.value.push({ role: 'assistant', texte: formulaireReponseAutomatique(texte) })
    } finally {
      reponseEnCours.value = false
      scrollVersLeBas()
    }
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
        <button
          type="button"
          class="sos-menu-item"
          @click="ouvrirChat"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M7 9h10M7 13h7M5 18l-2 2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7Z" />
          </svg>
          <span>
            <strong>{{ t('sos.question_titre') }}</strong>
            <small>{{ t('sos.question_texte') }}</small>
          </span>
        </button>
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
            <strong>{{ t('sos.urgence_titre') }}</strong>
            <small>{{ t('sos.urgence_texte') }}</small>
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
            <strong>{{ t('sos.probleme_titre') }}</strong>
            <small>{{ t('sos.probleme_texte') }}</small>
          </span>
        </button>
      </template>

      <template v-else-if="vue === 'chat'">
        <div class="sos-chat">
          <div
            ref="chatMessagesEl"
            class="sos-chat-messages"
          >
            <p class="sos-confirmation">
              {{ t('sos.chat_accueil') }}
            </p>
            <p
              v-for="(m, i) in historique"
              :key="i"
              class="sos-chat-bubble"
              :class="m.role === 'user' ? 'sos-chat-bubble-user' : 'sos-chat-bubble-ia'"
            >
              {{ m.texte }}
            </p>
            <p
              v-if="reponseEnCours"
              class="sos-chat-bubble sos-chat-bubble-ia sos-chat-bubble-loading"
              aria-live="polite"
            >
              …
            </p>
          </div>
          <form
            class="sos-form"
            @submit.prevent="envoyerMessage"
          >
            <label
              class="visually-hidden"
              for="sos-chat-message"
            >{{ t('sos.chat_label') }}</label>
            <textarea
              id="sos-chat-message"
              v-model="message"
              class="form-control form-control-sm"
              rows="2"
              :placeholder="t('sos.chat_exemple')"
              :disabled="reponseEnCours"
            />
            <button
              type="submit"
              class="btn btn-primary btn-sm w-100 mt-2"
              :disabled="reponseEnCours"
            >
              {{ reponseEnCours ? t('sos.chat_en_cours') : t('sos.envoyer') }}
            </button>
          </form>
        </div>
      </template>

      <template v-else-if="envoye">
        <p class="sos-confirmation">
          {{ t('sos.contact_envoye') }}
        </p>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm w-100"
          @click="fermer"
        >
          {{ t('sos.fermer') }}
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
        >{{ t('sos.contact_label') }}</label>
        <textarea
          id="sos-message"
          v-model="message"
          class="form-control form-control-sm"
          rows="4"
          :placeholder="t('sos.contact_exemple')"
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
          {{ envoi ? t('sos.envoi_en_cours') : t('sos.envoyer') }}
        </button>
      </form>
    </div>

    <button
      type="button"
      class="sos-button"
      :aria-expanded="ouvert"
      :aria-label="t('sos.bouton_aria')"
      @click="ouvert ? fermer() : (ouvert = true)"
    >
      {{ t('sos.bouton') }}
    </button>
  </div>
</template>
