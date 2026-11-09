<script setup>
// Vue "Messages" de l'espace admin (/admin/messages) : messages envoyés via
// "SOS > Un problème avec le site" (voir components/SosButton.vue). Mêmes
// actions que l'ancienne page Admin.vue (marquer lu, supprimer), plus
// "Répondre" : il n'existe pas de vraie messagerie dans ce projet (un message
// de contact n'est pas lié à un email), donc ce bouton propose d'appeler la
// personne si son compte a un numéro enregistré (retrouvé via messages.userId
// dans les comptes déjà chargés), plutôt que de simuler une fonctionnalité de
// réponse qui n'existe pas côté serveur.
import { computed, ref } from 'vue'
import { useAdminDashboard } from '../stores/adminDashboard'
import '../styles/AdminMessages.css'

const dashboard = useAdminDashboard()

const messagesTries = computed(() =>
  [...dashboard.messages].sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation)),
)

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

function telephone(m) {
  return dashboard.utilisateurs.find((u) => u.id === m.userId)?.telephone || ''
}

async function marquerLu(id) {
  try {
    await dashboard.marquerLu(id)
  } catch (err) {
    alert(`Échec : ${err.message}`)
  }
}

const suppressionEnCours = ref(null)
async function supprimer(id) {
  if (!confirm('Supprimer définitivement ce message ?')) return
  suppressionEnCours.value = id
  try {
    await dashboard.supprimerMessage(id)
  } catch (err) {
    alert(`Échec de la suppression : ${err.message}`)
  } finally {
    suppressionEnCours.value = null
  }
}
</script>

<template>
  <header class="admin-topbar">
    <div>
      <h1>Messages</h1>
      <p>{{ dashboard.messages.length }} messages reçus</p>
    </div>
  </header>

  <div
    v-if="dashboard.chargementInitial"
    class="admin-loading"
  >
    Chargement…
  </div>

  <ul
    v-else
    class="admin-messages-liste"
  >
    <li
      v-for="m in messagesTries"
      :key="m.id"
      class="admin-card admin-message-carte"
      :class="{ 'admin-message-non-lu': !m.lu }"
    >
      <div class="admin-message-entete">
        <p class="admin-message-nom mb-0">
          <strong>{{ m.nom }}</strong>
          <span
            v-if="!m.lu"
            class="admin-badge admin-badge-coral"
          >Non lu</span>
        </p>
        <span class="admin-message-date">{{ formatDate(m.dateCreation) }}</span>
      </div>
      <p class="admin-message-texte">
        {{ m.message }}
      </p>
      <div class="admin-row-actions admin-message-actions">
        <a
          v-if="telephone(m)"
          :href="`tel:${telephone(m)}`"
          class="admin-btn admin-btn-primary admin-btn-sm"
        >
          Répondre
        </a>
        <button
          v-else
          type="button"
          class="admin-btn admin-btn-primary admin-btn-sm"
          disabled
          title="Aucune coordonnée enregistrée pour ce compte"
        >
          Répondre
        </button>
        <button
          v-if="!m.lu"
          type="button"
          class="admin-btn admin-btn-outline admin-btn-sm"
          @click="marquerLu(m.id)"
        >
          Marquer lu
        </button>
        <button
          type="button"
          class="admin-btn-text"
          :disabled="suppressionEnCours === m.id"
          @click="supprimer(m.id)"
        >
          {{ suppressionEnCours === m.id ? 'Suppression…' : 'Supprimer' }}
        </button>
      </div>
    </li>
    <li
      v-if="!messagesTries.length"
      class="admin-empty"
    >
      Aucun message pour le moment.
    </li>
  </ul>
</template>
