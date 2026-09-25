<script setup>
// Page "Mes demandes" (/mes-demandes) : côté personne âgée, liste les demandes
// qu'elle a envoyées ; côté personnel de santé/particulier, liste les demandes
// reçues et permet de les accepter/refuser. C'est la première interface qui
// pilote réellement updateDemandeStatut (jusqu'ici défini dans data/store.js
// mais jamais appelé nulle part dans l'app).
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getDemandesByDemandeur,
  getDemandesByAidant,
  getMiseEnRelationByDemande,
  updateDemandeStatut,
  getUsers,
  missionDemarree,
} from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/MesDemandes.css'

const { t } = useI18n()

// typeService reste stocké tel quel en base : seul l'affichage est traduit,
// via les mêmes clés que le formulaire de demande (demande.service_*).
const SERVICE_KEYS = {
  soins: 'service_soins',
  coursier: 'service_coursier',
  menage: 'service_menage',
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

// Tique régulièrement pour que le badge "Acceptée" bascule tout seul en "En
// cours" après DELAI_DEMARRAGE_MISSION_MS, sans que l'utilisateur ait besoin
// de recharger la page.
const maintenant = ref(Date.now())
let tickId

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

onMounted(() => {
  charger()
  tickId = setInterval(() => {
    maintenant.value = Date.now()
  }, 15000)
})
onUnmounted(() => clearInterval(tickId))

// Autre partie de la demande : l'aidant pour une personne âgée, le demandeur
// pour un aidant.
function autrePartie(demande) {
  const id = user.value.role === 'senior' ? demande.aidantId : demande.demandeurId
  return profilsParId.value[id]
}

function statutAffiche(demande) {
  if (demande.statut === 'en_attente') return { label: t('statut.en_attente'), classe: 'text-bg-warning' }
  if (demande.statut === 'refusee') return { label: t('statut.refusee'), classe: 'text-bg-danger' }
  if (demande.statut === 'terminee') return { label: t('statut.terminee'), classe: 'text-bg-success' }
  if (demande.statut === 'annulee') return { label: t('statut.annulee'), classe: 'badge-neutral' }
  // 'acceptee' : d'abord "Acceptée" (mise en relation toute fraîche), puis "En
  // cours" automatiquement après quelques minutes (voir missionDemarree),
  // tant que la mission ne dit pas le contraire.
  const mission = missionsParDemande.value[demande.id]
  if (mission?.statutMission === 'terminee') return { label: t('statut.terminee'), classe: 'text-bg-success' }
  if (mission?.statutMission === 'annulee') return { label: t('statut.annulee'), classe: 'badge-neutral' }
  if (mission && missionDemarree(mission, maintenant.value)) {
    return { label: t('statut.en_cours'), classe: 'text-bg-primary' }
  }
  return { label: t('statut.acceptee'), classe: 'text-bg-info' }
}

function libelleService(typeService) {
  const cle = SERVICE_KEYS[typeService]
  return cle ? t(`demande.${cle}`) : typeService
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
  if (!confirm(t('mes_demandes_page.confirm_annuler'))) return
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
        {{ t('mes_demandes_page.titre') }}
      </h1>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        {{ t('commun.chargement') }}
      </p>

      <template v-else>
        <p
          v-if="!demandes.length"
          class="text-muted text-center py-5"
        >
          {{ t('mes_demandes_page.aucune') }}
        </p>

        <div
          v-for="demande in demandes"
          :key="demande.id"
          class="card p-3 mb-3 demande-item"
        >
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <strong>{{ autrePartie(demande)?.nom || t('commun.profil_supprime') }}</strong>
                <span :class="['badge', statutAffiche(demande).classe]">
                  {{ statutAffiche(demande).label }}
                </span>
              </div>
              <p class="text-muted small mb-1">
                {{ libelleService(demande.typeService) }}
                · {{ autrePartie(demande)?.ville || '—' }}
                · {{ formatDate(demande.dateCreation) }}
              </p>
              <p
                v-if="demande.message"
                class="small mb-0"
              >
                « {{ demande.message }} »
              </p>

              <!-- Code d'arrivée : protection contre les faux visiteurs. Il
                   n'apparaît qu'une fois la demande acceptée, puisqu'il est
                   attribué à ce moment-là (voir updateDemandeStatut dans
                   data/store.js). Même bloc pour les deux rôles, avec la
                   consigne inversée : la personne âgée l'attend, l'intervenant
                   l'annonce. -->
              <div
                v-if="demande.statut === 'acceptee' && demande.codeArrivee"
                class="code-arrivee"
              >
                <span class="code-arrivee-libelle">
                  <template v-if="user.role === 'senior'">
                    {{ t('mes_demandes_page.code_arrivee_senior', { nom: autrePartie(demande)?.nom || t('mes_demandes_page.intervenant_defaut') }) }}
                  </template>
                  <template v-else>
                    {{ t('mes_demandes_page.code_arrivee_aidant', { nom: autrePartie(demande)?.nom || t('mes_demandes_page.personne_defaut') }) }}
                  </template>
                </span>
                <strong class="code-arrivee-valeur">{{ demande.codeArrivee }}</strong>
              </div>
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
                  {{ t('commun.accepter') }}
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  :disabled="actionEnCours === demande.id"
                  @click="refuser(demande)"
                >
                  {{ t('commun.refuser') }}
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
                {{ t('commun.annuler') }}
              </button>

              <!-- Refaire la demande : uniquement côté personne âgée, sur une
                   demande terminée. -->
              <button
                v-if="user.role === 'senior' && demande.statut === 'terminee'"
                type="button"
                class="btn btn-outline-primary btn-sm"
                @click="refaire(demande)"
              >
                {{ t('mes_demandes_page.refaire') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
