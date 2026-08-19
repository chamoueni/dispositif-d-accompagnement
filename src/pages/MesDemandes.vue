<script setup>
// Page "Mes demandes" (/mes-demandes) : côté personne âgée, liste les demandes
// qu'elle a envoyées ; côté personnel de santé/particulier, liste les demandes
// reçues et permet de les accepter/refuser. C'est la première interface qui
// pilote réellement updateDemandeStatut (jusqu'ici défini dans data/store.js
// mais jamais appelé nulle part dans l'app).
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getDemandesByDemandeur,
  getDemandesByAidant,
  getMiseEnRelationByDemande,
  updateDemandeStatut,
  getUsers,
} from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/MesDemandes.css'

const SERVICE_LABELS = {
  soins: 'Soins',
  coursier: 'Coursier',
  menage: 'Ménage',
}

const { user } = useAuth()
const router = useRouter()

const demandes = ref([])
const profilsParId = ref({})
// id de mise_en_relation par demande acceptée, pour distinguer "Acceptée" (pas
// encore de mission trouvée) de "En cours" (mission active) dans l'affichage.
const missionsParDemande = ref({})
const chargement = ref(true)
const actionEnCours = ref(null)

async function charger() {
  chargement.value = true
  const [liste, profils] = await Promise.all([
    user.value.role === 'senior'
      ? getDemandesByDemandeur(user.value.id)
      : getDemandesByAidant(user.value.id),
    getUsers(),
  ])
  demandes.value = liste.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
  profilsParId.value = Object.fromEntries(profils.map((p) => [p.id, p]))

  // Pour chaque demande acceptée, on va chercher sa mission pour savoir si elle
  // est "en_cours", déjà "terminee" ou "annulee" côté mission.
  const acceptees = demandes.value.filter((d) => d.statut === 'acceptee')
  const missions = await Promise.all(acceptees.map((d) => getMiseEnRelationByDemande(d.id)))
  missionsParDemande.value = Object.fromEntries(
    acceptees.map((d, i) => [d.id, missions[i]]).filter(([, m]) => m),
  )

  chargement.value = false
}

onMounted(charger)

// Autre partie de la demande : l'aidant pour une personne âgée, le demandeur
// pour un aidant.
function autrePartie(demande) {
  const id = user.value.role === 'senior' ? demande.aidantId : demande.demandeurId
  return profilsParId.value[id]
}

function statutAffiche(demande) {
  if (demande.statut === 'en_attente') return { label: 'En attente', classe: 'text-bg-warning' }
  if (demande.statut === 'refusee') return { label: 'Refusée', classe: 'text-bg-danger' }
  if (demande.statut === 'terminee') return { label: 'Terminée', classe: 'text-bg-success' }
  if (demande.statut === 'annulee') return { label: 'Annulée', classe: 'badge-neutral' }
  // 'acceptee' : en_cours tant que la mission ne dit pas le contraire.
  const mission = missionsParDemande.value[demande.id]
  if (mission?.statutMission === 'terminee') return { label: 'Terminée', classe: 'text-bg-success' }
  if (mission?.statutMission === 'annulee') return { label: 'Annulée', classe: 'badge-neutral' }
  return { label: 'En cours', classe: 'text-bg-primary' }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function accepter(demande) {
  actionEnCours.value = demande.id
  try {
    await updateDemandeStatut(demande.id, 'acceptee')
    await charger()
  } finally {
    actionEnCours.value = null
  }
}

async function refuser(demande) {
  actionEnCours.value = demande.id
  try {
    await updateDemandeStatut(demande.id, 'refusee')
    await charger()
  } finally {
    actionEnCours.value = null
  }
}

async function annuler(demande) {
  if (!confirm('Annuler cette demande ?')) return
  actionEnCours.value = demande.id
  try {
    await updateDemandeStatut(demande.id, 'annulee')
    await charger()
  } finally {
    actionEnCours.value = null
  }
}

// "Refaire cette demande" : renvoie vers Nouvelle demande avec les mêmes
// aidant/service/urgence/message pré-remplis (voir NouvelleDemande.vue, qui
// lit ces query params s'ils sont présents).
function refaire(demande) {
  router.push({
    path: `/nouvelle-demande/${demande.aidantId}`,
    query: { typeService: demande.typeService, urgence: demande.urgence, message: demande.message },
  })
}

</script>

<template>
  <section class="mes-demandes-page">
    <div class="container">
      <BackLink />
      <h1 class="h3 mb-4">
        Mes demandes
      </h1>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        Chargement…
      </p>

      <template v-else>
        <p
          v-if="!demandes.length"
          class="text-muted text-center py-5"
        >
          Aucune demande pour le moment.
        </p>

        <div
          v-for="demande in demandes"
          :key="demande.id"
          class="card p-3 mb-3 demande-item"
        >
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <strong>{{ autrePartie(demande)?.nom || 'Profil supprimé' }}</strong>
                <span :class="['badge', statutAffiche(demande).classe]">
                  {{ statutAffiche(demande).label }}
                </span>
              </div>
              <p class="text-muted small mb-1">
                {{ SERVICE_LABELS[demande.typeService] || demande.typeService }}
                · {{ autrePartie(demande)?.ville || '—' }}
                · {{ formatDate(demande.dateCreation) }}
              </p>
              <p
                v-if="demande.message"
                class="small mb-0"
              >
                « {{ demande.message }} »
              </p>
            </div>

            <div class="d-flex gap-2 flex-shrink-0">
              <!-- Aidant : accepter/refuser une demande en attente. -->
              <template v-if="user.role !== 'senior' && demande.statut === 'en_attente'">
                <button
                  type="button"
                  class="btn btn-success btn-sm"
                  :disabled="actionEnCours === demande.id"
                  @click="accepter(demande)"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  :disabled="actionEnCours === demande.id"
                  @click="refuser(demande)"
                >
                  Refuser
                </button>
              </template>

              <!-- Personne âgée : peut annuler tant que ce n'est pas déjà traité. -->
              <button
                v-if="user.role === 'senior' && demande.statut === 'en_attente'"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="actionEnCours === demande.id"
                @click="annuler(demande)"
              >
                Annuler
              </button>

              <!-- Refaire la demande : uniquement côté personne âgée, sur une
                   demande terminée. -->
              <button
                v-if="user.role === 'senior' && statutAffiche(demande).label === 'Terminée'"
                type="button"
                class="btn btn-outline-primary btn-sm"
                @click="refaire(demande)"
              >
                🔄 Refaire cette demande
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
