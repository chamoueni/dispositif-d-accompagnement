<script setup>
// Page "Mes accompagnements" (/mes-accompagnements) : missions en cours (une
// mise_en_relation par demande acceptée, voir addDemande/updateDemandeStatut
// dans data/store.js). Permet de marquer une mission terminée/annulée, ce qui
// met aussi à jour la demande liée pour qu'elle apparaisse dans l'Historique.
import { onMounted, ref } from 'vue'
import {
  getMisesEnRelation,
  getDemandesByDemandeur,
  getDemandesByAidant,
  updateMiseEnRelationStatut,
  updateDemandeStatut,
  getUsers,
} from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/MesAccompagnements.css'

const SERVICE_LABELS = {
  soins: 'Soins',
  coursier: 'Coursier',
  menage: 'Ménage',
}

const { user } = useAuth()

const missions = ref([])
const demandesParId = ref({})
const profilsParId = ref({})
const chargement = ref(true)
const actionEnCours = ref(null)
// id de mission actuellement dépliée pour "Voir les détails" (pas de route
// séparée : un simple accordéon suffit pour le peu d'infos supplémentaires).
const missionOuverte = ref(null)

async function charger() {
  chargement.value = true
  const [toutesMissions, mesDemandes, profils] = await Promise.all([
    getMisesEnRelation(),
    user.value.role === 'senior'
      ? getDemandesByDemandeur(user.value.id)
      : getDemandesByAidant(user.value.id),
    getUsers(),
  ])
  demandesParId.value = Object.fromEntries(mesDemandes.map((d) => [d.id, d]))
  profilsParId.value = Object.fromEntries(profils.map((p) => [p.id, p]))
  // "en cours" = à venir/active ; missions terminées/annulées se retrouvent
  // dans l'Historique via la demande liée, pas ici.
  missions.value = toutesMissions
    .filter((m) => m.statutMission === 'en_cours')
    .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
  chargement.value = false
}

onMounted(charger)

function autrePartie(mission) {
  const id = user.value.role === 'senior' ? mission.aidantId : mission.demandeurId
  return profilsParId.value[id]
}

function serviceDe(mission) {
  const demande = demandesParId.value[mission.demandeId]
  return demande ? SERVICE_LABELS[demande.typeService] || demande.typeService : '—'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toggleDetails(id) {
  missionOuverte.value = missionOuverte.value === id ? null : id
}

// Termine la mission ET la demande liée (les deux statuts existent séparément
// en base, voir schema.sql, mais doivent rester cohérents pour l'utilisateur :
// l'Historique se base sur le statut de la demande, pas de la mission).
async function terminer(mission) {
  actionEnCours.value = mission.id
  try {
    await updateMiseEnRelationStatut(mission.id, 'terminee')
    await updateDemandeStatut(mission.demandeId, 'terminee')
    await charger()
  } finally {
    actionEnCours.value = null
  }
}

async function annulerMission(mission) {
  if (!confirm('Annuler cet accompagnement ?')) return
  actionEnCours.value = mission.id
  try {
    await updateMiseEnRelationStatut(mission.id, 'annulee')
    await updateDemandeStatut(mission.demandeId, 'annulee')
    await charger()
  } finally {
    actionEnCours.value = null
  }
}
</script>

<template>
  <section class="mes-accompagnements-page">
    <div class="container">
      <BackLink />
      <h1 class="h3 mb-2">
        📅 Mes accompagnements
      </h1>
      <p class="text-muted small mb-4">
        Vos accompagnements à venir ou en cours.
      </p>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        Chargement…
      </p>

      <template v-else>
        <p
          v-if="!missions.length"
          class="text-muted text-center py-5"
        >
          Aucun accompagnement en cours pour le moment.
        </p>

        <div
          v-for="mission in missions"
          :key="mission.id"
          class="card p-3 mb-3 mission-item"
        >
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <strong>{{ autrePartie(mission)?.nom || 'Profil supprimé' }}</strong>
              <p class="text-muted small mb-0">
                {{ serviceDe(mission) }} · {{ autrePartie(mission)?.ville || '—' }}
                · débuté le {{ formatDate(mission.dateDebut) }}
              </p>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="toggleDetails(mission.id)"
              >
                {{ missionOuverte === mission.id ? 'Masquer' : 'Voir les détails' }}
              </button>
              <button
                type="button"
                class="btn btn-success btn-sm"
                :disabled="actionEnCours === mission.id"
                @click="terminer(mission)"
              >
                Terminer
              </button>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                :disabled="actionEnCours === mission.id"
                @click="annulerMission(mission)"
              >
                Annuler
              </button>
            </div>
          </div>

          <div
            v-if="missionOuverte === mission.id"
            class="mission-details"
          >
            <p class="mb-1">
              <strong>Téléphone :</strong>
              <a :href="`tel:${autrePartie(mission)?.telephone}`">{{ autrePartie(mission)?.telephone || '—' }}</a>
            </p>
            <p
              v-if="autrePartie(mission)?.bio"
              class="mb-0 text-muted small"
            >
              {{ autrePartie(mission).bio }}
            </p>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
