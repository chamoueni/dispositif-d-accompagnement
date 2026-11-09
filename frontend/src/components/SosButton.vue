<script setup>
// Bouton d'urgence flottant, visible sur l'ensemble du site. Deux choix :
// appeler le 112, ou écrire à l'équipe (problème avec le site, question).
// Le message est enregistré dans la table messages_contact et l'admin le lit
// dans son espace (Messages). Il n'y a plus de chat assistant (retiré le
// 9 novembre 2026, à la demande du propriétaire du site).
import { ref } from 'vue'
import { useAuth } from '../stores/auth'
import { useI18n } from 'vue-i18n'
import { useVoiceInput } from '../composables/useVoiceInput'
import DictateButton from './DictateButton.vue'
import { addMessageContact } from '../data/store'
import '../styles/SosButton.css'

const { user } = useAuth()
// Textes du bouton d'urgence et du formulaire de contact : voir frontend/src/locales/.
const { t } = useI18n()

const ouvert = ref(false)
// vue : 'menu' (choix initial) ou 'formulaire' (message à l'équipe).
const vue = ref('menu')

// --- Commande vocale du menu ------------------------------------------------
// Permet d'atteindre l'urgence ou le message à l'équipe en
// parlant, sans avoir a viser un bouton. Pensé pour le public âgé : c'est le
// geste de pointage, pas la lecture, qui bloque le plus souvent.
const { supported: vocalSupporte, listening: ecouteMenu, start: ecouter } = useVoiceInput()
const retourVocal = ref('')
// Met en évidence l'entrée Urgence quand elle a été demandée à la voix.
const urgenceEnAvant = ref(false)

// Mots-clés par destination. L'ordre du parcours compte : "urgence" est testé en
// premier pour qu'une demande de secours ne soit jamais happée par un autre mot
// présent dans la même phrase.
const MOTS_CLES = [
  ['urgence', ['urgence', 'urgent', 'secours', 'pompier', 'ambulance', 'malade', 'danger', '112', 'samu']],
  // Les mots d'une simple question mènent aussi au formulaire de contact :
  // depuis le retrait du chat assistant, c'est là qu'on écrit à l'équipe.
  ['probleme', ['probleme', 'bug', 'panne', 'erreur', 'marche pas', 'fonctionne pas', 'site', 'bloque',
    'question', 'renseignement', 'information', 'demander', 'parler', 'aide', 'savoir', 'message']],
]

// Accents et majuscules retirés avant comparaison : la reconnaissance vocale
// renvoie "problème" ou "Problème" selon les cas.
function normaliser(texte) {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function routerCommande(transcript) {
  const dit = normaliser(transcript)
  const trouve = MOTS_CLES.find(([, mots]) => mots.some((m) => dit.includes(m)))

  if (!trouve) {
    retourVocal.value = t('sos.non_compris')
    return
  }

  const [destination] = trouve
  if (destination === 'probleme') {
    retourVocal.value = ''
    ouvrirFormulaire()
    return
  }

  // Urgence : on met le 112 en avant, mais on NE DECLENCHE PAS l'appel.
  // Une reconnaissance vocale se trompe, et un appel aux secours parti par
  // erreur mobilise des moyens réels. La personne confirme d'un geste.
  urgenceEnAvant.value = true
  retourVocal.value = t('sos.urgence_confirmer')
}

function lancerEcoute() {
  retourVocal.value = ''
  urgenceEnAvant.value = false
  ecouter(routerCommande)
}

// Dictée dans une zone de texte : on ajoute à la suite plutôt que d'écraser,
// pour permettre plusieurs dictées successives.
function ajouterDictee(transcript) {
  message.value = message.value ? message.value + ' ' + transcript : transcript
}
const message = ref('')
const envoi = ref(false)
const envoye = ref(false)
const erreur = ref('')

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
    retourVocal.value = ''
    urgenceEnAvant.value = false
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
        <!-- Commande vocale : atteindre l'urgence ou le signalement
             d'un probleme en parlant. Masquee si le navigateur ne sait pas
             reconnaitre la parole, pour ne pas laisser un bouton sans effet. -->
        <button
          v-if="vocalSupporte"
          type="button"
          class="sos-parler"
          :class="{ 'sos-parler-actif': ecouteMenu }"
          @click="lancerEcoute"
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
              x="9"
              y="3"
              width="6"
              height="11"
              rx="3"
            />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
          {{ ecouteMenu ? t('sos.ecoute') : t('sos.parler') }}
        </button>
        <p
          v-if="vocalSupporte"
          class="sos-vocal-aide"
        >
          {{ retourVocal || t('sos.vocal_aide') }}
        </p>

        <a
          href="tel:112"
          class="sos-menu-item sos-menu-item-urgence"
          :class="{ 'sos-menu-item-signale': urgenceEnAvant }"
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
        <DictateButton @dictate="ajouterDictee" />
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
