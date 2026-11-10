<script setup>
// Page « Cookies » : liste ce que le site enregistre dans le navigateur, montre
// les réglages actuellement mémorisés et permet de les effacer.
//
// Idée reprise du site CRIJ Mayotte (carte « Statut actuel » + boutons), mais
// adaptée : ce site n'utilise QUE des éléments indispensables ou demandés par
// l'utilisateur (connexion, langue, thème...), aucun cookie de mesure
// d'audience ni de publicité. Ces éléments sont exemptés de consentement
// (recommandations de la CNIL), d'où l'absence de bandeau « Accepter / Refuser ».
// Contenu statique, en français : c'est un texte juridique, il n'est pas traduit.
import { ref } from 'vue'
import BackLink from '../components/BackLink.vue'
import '../styles/PagesLegales.css'

// Clés localStorage utilisées ailleurs dans le site (à garder synchronisées) :
// i18n/index.js, composables/useTheme.js, stores/accessibility.js,
// composables/useNouveautesDemandes.js (une clé par compte : demandes-vues-<id>).
const CLE_LANGUE = 'langue'
const CLE_THEME = 'theme'
const CLE_CONFORT = 'dispositif.modeConfort'
const PREFIXE_DEMANDES_VUES = 'demandes-vues-'

const LIBELLES_LANGUE = { fr: 'Français', shi: 'Shimaoré', kib: 'Kibushi' }
const LIBELLES_THEME = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' }

// localStorage peut être bloqué (navigation privée, réglages du navigateur) :
// chaque accès est protégé pour que la page s'affiche quand même.
function lire(cle) {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

const etat = ref({
  langue: LIBELLES_LANGUE[lire(CLE_LANGUE)] || 'Français (par défaut)',
  theme: LIBELLES_THEME[lire(CLE_THEME)] || 'Automatique (par défaut)',
  confort: lire(CLE_CONFORT) === '1' ? 'Activé' : 'Désactivé',
})

const message = ref('')

// Efface les préférences mémorisées sur CET appareil, puis recharge la page
// pour que le site reparte sur les réglages par défaut. La session de connexion
// n'est pas touchée : pour la fermer, il suffit de se déconnecter.
function effacerPreferences() {
  try {
    const cles = [CLE_LANGUE, CLE_THEME, CLE_CONFORT]
    for (let i = 0; i < localStorage.length; i += 1) {
      const cle = localStorage.key(i)
      if (cle?.startsWith(PREFIXE_DEMANDES_VUES)) cles.push(cle)
    }
    cles.forEach((cle) => localStorage.removeItem(cle))
    window.location.reload()
  } catch {
    message.value = 'Votre navigateur bloque l’accès à ces informations : il n’y a rien à effacer.'
  }
}
</script>

<template>
  <section class="legal-page">
    <div class="container">
      <BackLink />
      <p class="legal-surtitre">
        Cookies
      </p>
      <h1 class="h2">
        Cookies et préférences
      </h1>
      <p class="legal-maj">
        Dernière mise à jour : novembre 2026
      </p>

      <div class="legal-encadre">
        <strong>Pas de pistage :</strong> ce site n’utilise aucun cookie publicitaire ni outil de
        mesure d’audience. Il enregistre seulement ce qui sert à vous connecter et à retenir vos
        réglages. C’est pourquoi aucun bandeau ne vous demande votre accord.
      </div>

      <article
        id="enregistre"
        class="legal-bloc"
      >
        <h2>Ce que le site enregistre</h2>
        <div class="legal-tableau">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  Nom
                </th>
                <th scope="col">
                  À quoi ça sert
                </th>
                <th scope="col">
                  Durée
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>__Host-dispositif_session</code><br>(cookie)</td>
                <td>
                  Vous garder connecté(e). Ce cookie est protégé : les scripts de la page ne peuvent
                  pas le lire, et il n’est envoyé qu’à ce site.
                </td>
                <td>12 heures, ou 30 jours avec « Se souvenir de moi »</td>
              </tr>
              <tr>
                <td><code>langue</code></td>
                <td>Retenir la langue choisie (français, shimaoré ou kibushi).</td>
                <td>Jusqu’à ce que vous l’effaciez</td>
              </tr>
              <tr>
                <td><code>theme</code></td>
                <td>Retenir le thème clair, sombre ou automatique.</td>
                <td>Jusqu’à ce que vous l’effaciez</td>
              </tr>
              <tr>
                <td><code>dispositif.modeConfort</code></td>
                <td>Retenir le mode confort (texte plus grand).</td>
                <td>Jusqu’à ce que vous l’effaciez</td>
              </tr>
              <tr>
                <td><code>demandes-vues-…</code></td>
                <td>Savoir quelles réponses à vos demandes vous avez déjà vues, pour signaler les nouvelles.</td>
                <td>Jusqu’à ce que vous l’effaciez</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Sauf le cookie de connexion, ces informations restent dans votre navigateur : elles ne sont
          jamais envoyées au serveur.
        </p>
      </article>

      <article
        id="reglages"
        class="legal-bloc"
      >
        <h2>Vos réglages sur cet appareil</h2>
        <div class="legal-etat">
          <div>
            <span>Langue</span>
            <strong>{{ etat.langue }}</strong>
          </div>
          <div>
            <span>Thème</span>
            <strong>{{ etat.theme }}</strong>
          </div>
          <div>
            <span>Mode confort</span>
            <strong>{{ etat.confort }}</strong>
          </div>
        </div>
        <div class="legal-actions">
          <button
            type="button"
            class="btn btn-outline-primary"
            @click="effacerPreferences"
          >
            Effacer mes préférences sur cet appareil
          </button>
        </div>
        <p
          v-if="message"
          class="text-muted small mt-2"
          role="status"
        >
          {{ message }}
        </p>
        <p class="text-muted small mt-3">
          Le site reviendra aux réglages par défaut. Vous resterez connecté(e) : pour fermer votre
          session, utilisez « Déconnexion ».
        </p>
      </article>

      <article
        id="externes"
        class="legal-bloc"
      >
        <h2>Services extérieurs</h2>
        <p>
          Pour s’afficher, le site charge des polices d’écriture (Google Fonts), des photos (Unsplash)
          et des fonds de carte (IGN). Ces services reçoivent l’adresse IP de votre appareil, comme
          pour toute page web, mais le site ne leur demande de déposer aucun cookie.
        </p>
        <p>
          Vous pouvez aussi supprimer cookies et données de site à tout moment depuis les réglages de
          votre navigateur. Plus d’informations dans la
          <router-link to="/confidentialite">politique de confidentialité</router-link>.
        </p>
      </article>
    </div>
  </section>
</template>
