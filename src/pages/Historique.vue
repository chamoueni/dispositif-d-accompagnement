<script setup>
// Page "Historique" (/historique) : missions passées (demandes terminées ou
// annulées), avec filtres. Réutilise le même statut que Mes demandes plutôt
// que la table mises_en_relation directement : plus simple pour l'utilisateur,
// et déjà tenu à jour par MesAccompagnements.vue (terminer/annulerMission y
// mettent aussi à jour la demande liée).
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getDemandesByDemandeur, getDemandesByAidant, getUsers } from '../data/store'
import { useAuth } from '../stores/auth'
import BackLink from '../components/BackLink.vue'
import '../styles/Historique.css'

const SERVICE_LABELS = {
  soins: 'Soins',
  coursier: 'Coursier',
  menage: 'Ménage',
}

const { user } = useAuth()
const router = useRouter()

const demandes = ref([])
const profilsParId = ref({})
const chargement = ref(true)

onMounted(async () => {
  const [liste, profils] = await Promise.all([
    user.value.role === 'senior'
      ? getDemandesByDemandeur(user.value.id)
      : getDemandesByAidant(user.value.id),
    getUsers(),
  ])
  demandes.value = liste
    .filter((d) => d.statut === 'terminee' || d.statut === 'annulee')
    .sort((a, b) => new Date(b.dateMiseAJour) - new Date(a.dateMiseAJour))
  profilsParId.value = Object.fromEntries(profils.map((p) => [p.id, p]))
  chargement.value = false
})

function autrePartie(demande) {
  const id = user.value.role === 'senior' ? demande.aidantId : demande.demandeurId
  return profilsParId.value[id]
}

const filtres = reactive({
  periode: '', // '' | '30j' | '90j'
  service: '',
  accompagnant: '',
  statut: '',
})

const resultats = computed(() => {
  return demandes.value.filter((d) => {
    if (filtres.service && d.typeService !== filtres.service) return false
    if (filtres.statut && d.statut !== filtres.statut) return false
    if (filtres.accompagnant) {
      const nom = autrePartie(d)?.nom?.toLowerCase() || ''
      if (!nom.includes(filtres.accompagnant.toLowerCase())) return false
    }
    if (filtres.periode) {
      const jours = filtres.periode === '30j' ? 30 : 90
      const limite = new Date()
      limite.setDate(limite.getDate() - jours)
      if (new Date(d.dateMiseAJour) < limite) return false
    }
    return true
  })
})

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const detailOuvert = ref(null)
function toggleDetail(id) {
  detailOuvert.value = detailOuvert.value === id ? null : id
}

function refaire(demande) {
  router.push({
    path: `/nouvelle-demande/${demande.aidantId}`,
    query: { typeService: demande.typeService, urgence: demande.urgence, message: demande.message },
  })
}
</script>

<template>
  <section class="historique-page">
    <div class="container">
      <BackLink />
      <h1 class="h3 mb-4">
        🧾 Historique de mes accompagnements
      </h1>

      <div class="card p-3 mb-4 historique-filters">
        <div class="row g-3">
          <div class="col-sm-3">
            <label class="form-label small">Période</label>
            <select
              v-model="filtres.periode"
              class="form-select form-select-sm"
            >
              <option value="">
                Toutes
              </option>
              <option value="30j">
                30 derniers jours
              </option>
              <option value="90j">
                90 derniers jours
              </option>
            </select>
          </div>
          <div class="col-sm-3">
            <label class="form-label small">Type de service</label>
            <select
              v-model="filtres.service"
              class="form-select form-select-sm"
            >
              <option value="">
                Tous
              </option>
              <option
                v-for="(label, value) in SERVICE_LABELS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </div>
          <div class="col-sm-3">
            <label class="form-label small">Accompagnant</label>
            <input
              v-model="filtres.accompagnant"
              type="text"
              class="form-control form-control-sm"
              placeholder="Rechercher un nom"
            >
          </div>
          <div class="col-sm-3">
            <label class="form-label small">Statut</label>
            <select
              v-model="filtres.statut"
              class="form-select form-select-sm"
            >
              <option value="">
                Tous
              </option>
              <option value="terminee">
                Terminé
              </option>
              <option value="annulee">
                Annulé
              </option>
            </select>
          </div>
        </div>
      </div>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        Chargement…
      </p>

      <template v-else>
        <p
          v-if="!resultats.length"
          class="text-muted text-center py-5"
        >
          Aucune mission dans l'historique pour ces critères.
        </p>

        <div
          v-for="demande in resultats"
          :key="demande.id"
          class="card p-3 mb-3 historique-item"
        >
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span>{{ formatDate(demande.dateMiseAJour) }}</span>
                <span>·</span>
                <strong>{{ SERVICE_LABELS[demande.typeService] || demande.typeService }}</strong>
                <span>·</span>
                <span>{{ autrePartie(demande)?.nom || 'Profil supprimé' }}</span>
                <span
                  :class="['badge', demande.statut === 'terminee' ? 'text-bg-success' : 'badge-neutral']"
                >
                  {{ demande.statut === 'terminee' ? 'Terminé' : 'Annulé' }}
                </span>
              </div>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="toggleDetail(demande.id)"
              >
                {{ detailOuvert === demande.id ? 'Masquer' : 'Voir les détails' }}
              </button>
              <button
                v-if="user.role === 'senior' && demande.statut === 'terminee'"
                type="button"
                class="btn btn-outline-primary btn-sm"
                @click="refaire(demande)"
              >
                🔄 Refaire cette demande
              </button>
            </div>
          </div>

          <div
            v-if="detailOuvert === demande.id"
            class="historique-details"
          >
            <p class="mb-1 small">
              <strong>Commune :</strong> {{ autrePartie(demande)?.ville || '—' }}
            </p>
            <p
              v-if="demande.message"
              class="mb-0 small"
            >
              <strong>Message :</strong> « {{ demande.message }} »
            </p>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
