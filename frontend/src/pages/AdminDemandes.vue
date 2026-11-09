<script setup>
// Vue "Demandes & missions" de l'espace admin (/admin/demandes) : suivi en 4
// colonnes plutôt que les deux tableaux à plat de l'ancienne page Admin.vue.
// Mêmes données (dashboard.demandes / dashboard.missions, voir data/store.js
// getDemandes()/getMisesEnRelation()), seule la présentation change.
import { computed, ref } from 'vue'
import { useAdminDashboard } from '../stores/adminDashboard'
import '../styles/AdminDemandes.css'

const dashboard = useAdminDashboard()

const SERVICE_LABELS = { soins: 'Soins', coursier: 'Coursier', menage: 'Ménage' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' })
}
function nomCompte(id) {
  return dashboard.nomCompte(id)
}

const parDate = (a, b, champ) => new Date(b[champ]) - new Date(a[champ])

const enAttente = computed(() =>
  [...dashboard.demandes].filter((d) => d.statut === 'en_attente').sort((a, b) => parDate(a, b, 'dateCreation')),
)
const acceptees = computed(() =>
  [...dashboard.demandes].filter((d) => d.statut === 'acceptee').sort((a, b) => parDate(a, b, 'dateCreation')),
)
const enCours = computed(() =>
  [...dashboard.missions].filter((m) => m.statutMission === 'en_cours').sort((a, b) => parDate(a, b, 'dateDebut')),
)
const terminees = computed(() =>
  [...dashboard.missions].filter((m) => m.statutMission === 'terminee').sort((a, b) => parDate(a, b, 'dateDebut')),
)
const refusees = computed(() => dashboard.demandes.filter((d) => d.statut === 'refusee'))

const afficherRefusees = ref(false)
</script>

<template>
  <header class="admin-topbar">
    <div>
      <h1>Demandes & missions</h1>
      <p>Suivi de l’activité du dispositif</p>
    </div>
  </header>

  <div
    v-if="dashboard.chargementInitial"
    class="admin-loading"
  >
    Chargement…
  </div>

  <template v-else>
    <div class="admin-kanban">
      <section class="admin-kanban-colonne">
        <h2 class="admin-kanban-titre">
          En attente
          <span class="admin-kanban-compteur">{{ enAttente.length }}</span>
        </h2>
        <article
          v-for="d in enAttente"
          :key="d.id"
          class="admin-card admin-kanban-carte"
        >
          <span class="admin-badge admin-badge-ylang">{{ SERVICE_LABELS[d.typeService] || d.typeService }}</span>
          <p class="admin-kanban-personnes">
            {{ nomCompte(d.demandeurId) }} → {{ nomCompte(d.aidantId) }}
          </p>
          <p class="admin-kanban-date">
            {{ formatDate(d.dateCreation) }}
          </p>
        </article>
        <p
          v-if="!enAttente.length"
          class="admin-empty"
        >
          Aucune demande en attente.
        </p>
      </section>

      <section class="admin-kanban-colonne">
        <h2 class="admin-kanban-titre">
          Acceptées
          <span class="admin-kanban-compteur">{{ acceptees.length }}</span>
        </h2>
        <article
          v-for="d in acceptees"
          :key="d.id"
          class="admin-card admin-kanban-carte"
        >
          <span class="admin-badge admin-badge-green">{{ SERVICE_LABELS[d.typeService] || d.typeService }}</span>
          <p class="admin-kanban-personnes">
            {{ nomCompte(d.demandeurId) }} → {{ nomCompte(d.aidantId) }}
          </p>
          <p class="admin-kanban-date">
            {{ formatDate(d.dateCreation) }}
          </p>
        </article>
        <p
          v-if="!acceptees.length"
          class="admin-empty"
        >
          Aucune demande acceptée.
        </p>
      </section>

      <section class="admin-kanban-colonne">
        <h2 class="admin-kanban-titre">
          Missions en cours
          <span class="admin-kanban-compteur">{{ enCours.length }}</span>
        </h2>
        <article
          v-for="m in enCours"
          :key="m.id"
          class="admin-card admin-kanban-carte"
        >
          <span class="admin-badge admin-badge-teal">En cours</span>
          <p class="admin-kanban-personnes">
            {{ nomCompte(m.demandeurId) }} → {{ nomCompte(m.aidantId) }}
          </p>
          <p class="admin-kanban-date">
            Débutée le {{ formatDate(m.dateDebut) }}
          </p>
        </article>
        <p
          v-if="!enCours.length"
          class="admin-empty"
        >
          Aucune mission en cours.
        </p>
      </section>

      <section class="admin-kanban-colonne">
        <h2 class="admin-kanban-titre">
          Terminées
          <span class="admin-kanban-compteur">{{ terminees.length }}</span>
        </h2>
        <article
          v-for="m in terminees"
          :key="m.id"
          class="admin-card admin-kanban-carte"
        >
          <span class="admin-badge admin-badge-teal-solid">Terminée</span>
          <p class="admin-kanban-personnes">
            {{ nomCompte(m.demandeurId) }} → {{ nomCompte(m.aidantId) }}
          </p>
          <p class="admin-kanban-date">
            {{ formatDate(m.dateFin || m.dateDebut) }}
          </p>
        </article>
        <p
          v-if="!terminees.length"
          class="admin-empty"
        >
          Aucune mission terminée.
        </p>
      </section>
    </div>

    <div class="admin-refusees">
      <button
        type="button"
        class="admin-link admin-refusees-toggle"
        @click="afficherRefusees = !afficherRefusees"
      >
        {{ refusees.length }} demande{{ refusees.length > 1 ? 's' : '' }} refusée{{ refusees.length > 1 ? 's' : '' }}
        · {{ afficherRefusees ? 'Masquer' : 'Voir' }}
      </button>
      <div
        v-if="afficherRefusees"
        class="admin-card admin-card-flush admin-refusees-liste"
      >
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Demandeur</th>
                <th>Aidant</th>
                <th>Service</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="d in refusees"
                :key="d.id"
              >
                <td>{{ nomCompte(d.demandeurId) }}</td>
                <td>{{ nomCompte(d.aidantId) }}</td>
                <td>{{ SERVICE_LABELS[d.typeService] || d.typeService }}</td>
                <td>{{ formatDate(d.dateCreation) }}</td>
              </tr>
            </tbody>
          </table>
          <p
            v-if="!refusees.length"
            class="admin-table-empty"
          >
            Aucune demande refusée.
          </p>
        </div>
      </div>
    </div>
  </template>
</template>
