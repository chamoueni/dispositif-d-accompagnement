<script setup>
// Page "Mes accompagnements" (/mes-accompagnements) : missions en cours (une
// mise_en_relation par demande acceptée, voir addDemande/updateDemandeStatut
// dans data/store.js). Permet de marquer une mission terminée/annulée, ce qui
// met aussi à jour la demande liée pour qu'elle apparaisse dans l'Historique.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getMisesEnRelation,
  getDemandesByDemandeur,
  getDemandesByAidant,
  updateMiseEnRelationStatut,
  updateDemandeStatut,
  getUsers,
  missionDemarree,
} from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/MesAccompagnements.css'

const { t } = useI18n()

// typeService reste stocké tel quel en base : seul l'affichage est traduit,
// via les mêmes clés que le formulaire de demande (demande.service_*).
const SERVICE_KEYS = {
  soins: 'service_soins',
  coursier: 'service_coursier',
  menage: 'service_menage',
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

// Tique régulièrement pour que les missions tout juste acceptées (encore
// affichées "Acceptée" côté Mes demandes, voir missionDemarree) apparaissent
// ici automatiquement dès que le délai est passé, sans recharger la page.
const maintenant = ref(Date.now())
let tickId

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

// Parmi les missions "en_cours" en base, celles encore toutes fraîches (moins
// de DELAI_DEMARRAGE_MISSION_MS) restent en phase "Acceptée" côté Mes
// demandes : on ne les affiche pas encore ici comme accompagnement actif.
const missionsAffichees = computed(() => missions.value.filter((m) => missionDemarree(m, maintenant.value)))

onMounted(() => {
  charger()
  tickId = setInterval(() => {
    maintenant.value = Date.now()
  }, 15000)
})
onUnmounted(() => clearInterval(tickId))

function autrePartie(mission) {
  const id = user.value.role === 'senior' ? mission.aidantId : mission.demandeurId
  return profilsParId.value[id]
}

function serviceDe(mission) {
  const demande = demandesParId.value[mission.demandeId]
  const cle = demande ? SERVICE_KEYS[demande.typeService] : null
  return cle ? t(`demande.${cle}`) : demande?.typeService || '—'
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
  if (!confirm(t('mes_accompagnements_page.confirm_annuler'))) return
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
        {{ t('mes_accompagnements_page.titre') }}
      </h1>
      <p class="text-muted small mb-4">
        {{ t('mes_accompagnements_page.sous_titre') }}
      </p>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        {{ t('commun.chargement') }}
      </p>

      <template v-else>
        <p
          v-if="!missionsAffichees.length"
          class="text-muted text-center py-5"
        >
          {{ t('mes_accompagnements_page.aucun') }}
        </p>

        <div
          v-for="mission in missionsAffichees"
          :key="mission.id"
          class="card p-3 mb-3 mission-item"
        >
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <strong>{{ autrePartie(mission)?.nom || t('commun.profil_supprime') }}</strong>
              <p class="text-muted small mb-0">
                {{ serviceDe(mission) }} · {{ autrePartie(mission)?.ville || '—' }}
                · {{ t('mes_accompagnements_page.debute_le', { date: formatDate(mission.dateDebut) }) }}
              </p>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="toggleDetails(mission.id)"
              >
                {{ missionOuverte === mission.id ? t('commun.masquer') : t('commun.voir_details') }}
              </button>
              <button
                type="button"
                class="btn btn-success btn-sm"
                :disabled="actionEnCours === mission.id"
                @click="terminer(mission)"
              >
                {{ t('commun.terminer') }}
              </button>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                :disabled="actionEnCours === mission.id"
                @click="annulerMission(mission)"
              >
                {{ t('commun.annuler') }}
              </button>
            </div>
          </div>

          <div
            v-if="missionOuverte === mission.id"
            class="mission-details"
          >
            <p class="mb-1">
              <strong>{{ t('mes_accompagnements_page.telephone_label') }}</strong>
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
