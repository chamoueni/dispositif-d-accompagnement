<script setup>
// Vue "Tableau de bord" de l'espace admin (/admin) : cartes de chiffres-clés,
// messages à traiter, demandes récentes, activité et répartition des comptes.
// Pure lecture/mise en forme des données du store partagé (useAdminDashboard,
// chargé une fois par la coquille, voir pages/Admin.vue) : aucune logique
// Supabase propre à cette vue.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useAdminDashboard } from '../stores/adminDashboard'
import StatCard from '../components/admin/StatCard.vue'
import AdminIcon from '../components/admin/AdminIcon.vue'
import '../styles/AdminDashboard.css'

const router = useRouter()
const { user } = useAuth()
const dashboard = useAdminDashboard()

const prenom = computed(() => (user.value?.nom || '').split(/\s+/)[0] || 'Admin')

const dateDuJour = computed(() => {
  const texte = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return texte.charAt(0).toUpperCase() + texte.slice(1)
})

const ROLE_LABELS = { senior: 'Personne âgée', sante: 'Personnel de santé', particulier: 'Particulier' }
const STATUT_DEMANDE_TONE = { en_attente: 'ylang', acceptee: 'green', refusee: 'coral', terminee: 'teal', annulee: 'coral' }
const STATUT_DEMANDE_LABELS = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  terminee: 'Terminée',
  annulee: 'Annulée',
}
const SERVICE_LABELS = { soins: 'Soins', coursier: 'Coursier', menage: 'Ménage' }

const nouveauxCeMois = computed(() => {
  const maintenant = new Date()
  return dashboard.utilisateurs.filter((u) => {
    const d = new Date(u.created_at)
    return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear()
  }).length
})

const messagesNonLus = computed(() => dashboard.messages.filter((m) => !m.lu))

const demandesRecentes = computed(() =>
  [...dashboard.demandes].sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation)).slice(0, 4),
)

// Fusionne comptes créés et messages reçus en un seul fil chronologique. Le
// nom (mis en gras dans le template) est séparé du reste du texte plutôt que
// d'interpoler une seule chaîne, pour pouvoir le styler différemment.
const activiteRecente = computed(() => {
  const evenements = [
    ...dashboard.utilisateurs.map((u) => ({
      id: `compte-${u.id}`,
      dotTone: u.role === 'senior' ? 'ylang' : u.role === 'sante' ? 'teal' : 'teal-clair',
      nom: u.nom || 'Un compte',
      suite: `s’est inscrit (${ROLE_LABELS[u.role] || u.role})`,
      date: u.created_at,
    })),
    ...dashboard.messages.map((m) => ({
      id: `message-${m.id}`,
      dotTone: 'coral',
      nom: m.nom,
      suite: 'a envoyé un message',
      date: m.dateCreation,
    })),
  ]
  return evenements.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)
})

const comptesParRole = computed(() => {
  const compte = { senior: 0, particulier: 0, sante: 0 }
  dashboard.utilisateurs.forEach((u) => { if (compte[u.role] !== undefined) compte[u.role] += 1 })
  const total = compte.senior + compte.particulier + compte.sante || 1
  return [
    { cle: 'senior', label: 'Personnes âgées', tone: 'ylang', valeur: compte.senior, pct: (compte.senior / total) * 100 },
    { cle: 'particulier', label: 'Particuliers (aidants)', tone: 'teal-clair', valeur: compte.particulier, pct: (compte.particulier / total) * 100 },
    { cle: 'sante', label: 'Personnel de santé', tone: 'teal', valeur: compte.sante, pct: (compte.sante / total) * 100 },
  ]
})

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function nomCompte(id) {
  return dashboard.nomCompte(id)
}

const rechercheSaisie = ref('')
function lancerRecherche() {
  router.push({ path: '/admin/comptes', query: rechercheSaisie.value ? { q: rechercheSaisie.value } : {} })
}

async function marquerLu(id) {
  try {
    await dashboard.marquerLu(id)
  } catch {
    // Rien de plus à faire ici : le message reste affiché comme non lu, ce qui
    // est déjà le signal d'échec le plus clair pour l'admin.
  }
}
</script>

<template>
  <header class="admin-topbar">
    <div>
      <h1>Bonjour {{ prenom }}</h1>
      <p>{{ dateDuJour }} · voici ce qui se passe sur la plateforme</p>
    </div>
    <div class="admin-topbar-actions">
      <form
        class="admin-search"
        @submit.prevent="lancerRecherche"
      >
        <AdminIcon nom="search" />
        <input
          v-model="rechercheSaisie"
          type="search"
          placeholder="Rechercher un nom, une commune…"
        >
      </form>
      <router-link
        to="/admin/comptes?nouveau=1"
        class="admin-btn admin-btn-primary"
      >
        <AdminIcon nom="plus" />
        Nouveau compte
      </router-link>
    </div>
  </header>

  <div
    v-if="dashboard.chargementInitial"
    class="admin-loading"
  >
    Chargement…
  </div>

  <template v-else>
    <div class="admin-stats-row">
      <StatCard
        icone="mail"
        tone="coral"
        :valeur="messagesNonLus.length"
        libelle="Message non lu"
        :badge-texte="messagesNonLus.length ? 'À lire' : 'Tout est traité'"
        :badge-tone="messagesNonLus.length ? 'coral' : 'green'"
        lien="/admin/messages"
      />
      <StatCard
        icone="clock"
        tone="ylang"
        :valeur="dashboard.demandesEnAttente"
        libelle="Demande en attente"
        :badge-texte="dashboard.demandesEnAttente ? 'À traiter' : 'Tout est traité'"
        :badge-tone="dashboard.demandesEnAttente ? 'ylang' : 'green'"
        lien="/admin/demandes"
      />
      <StatCard
        icone="heart"
        tone="teal"
        :valeur="dashboard.missionsEnCours"
        libelle="Missions en cours"
        lien="/admin/demandes"
      />
      <StatCard
        icone="users"
        tone="teal"
        :valeur="dashboard.utilisateurs.length"
        libelle="Comptes inscrits"
        :badge-texte="`+${nouveauxCeMois} ce mois`"
        badge-tone="teal"
        lien="/admin/comptes"
      />
    </div>

    <div class="admin-dashboard-grid">
      <div class="admin-dashboard-col-principale">
        <section class="admin-card">
          <div class="admin-card-head">
            <h2>À traiter aujourd’hui</h2>
          </div>
          <ul class="admin-a-traiter-liste">
            <li
              v-for="m in messagesNonLus"
              :key="m.id"
              class="admin-a-traiter-item"
            >
              <span class="admin-avatar">{{ (m.nom || '?').slice(0, 2).toUpperCase() }}</span>
              <div class="admin-a-traiter-texte">
                <p class="mb-0">
                  <strong>{{ m.nom }}</strong> vous a envoyé un message · {{ formatDate(m.dateCreation) }}
                </p>
                <p class="admin-a-traiter-citation mb-0">
                  « {{ m.message }} »
                </p>
              </div>
              <div class="admin-a-traiter-actions">
                <button
                  type="button"
                  class="admin-btn admin-btn-outline admin-btn-sm"
                  @click="marquerLu(m.id)"
                >
                  Marquer lu
                </button>
                <router-link
                  to="/admin/messages"
                  class="admin-btn admin-btn-primary admin-btn-sm"
                >
                  Répondre
                </router-link>
              </div>
            </li>
            <li
              v-if="!messagesNonLus.length"
              class="admin-empty"
            >
              Rien à traiter pour le moment.
            </li>
          </ul>
        </section>

        <section class="admin-card admin-card-flush admin-dashboard-demandes">
          <div class="admin-card-head admin-card-head-padded">
            <h2>Demandes récentes</h2>
            <router-link
              to="/admin/demandes"
              class="admin-link"
            >
              Tout voir
              <AdminIcon nom="chevron-right" />
            </router-link>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Demandeur</th>
                  <th>Aidant</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th>Créée le</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="d in demandesRecentes"
                  :key="d.id"
                >
                  <td><strong>{{ nomCompte(d.demandeurId) }}</strong></td>
                  <td>{{ nomCompte(d.aidantId) }}</td>
                  <td>{{ SERVICE_LABELS[d.typeService] || d.typeService }}</td>
                  <td>
                    <span
                      class="admin-badge"
                      :class="`admin-badge-${STATUT_DEMANDE_TONE[d.statut] || 'teal'}`"
                    >{{ STATUT_DEMANDE_LABELS[d.statut] || d.statut }}</span>
                  </td>
                  <td>{{ formatDate(d.dateCreation) }}</td>
                </tr>
              </tbody>
            </table>
            <p
              v-if="!demandesRecentes.length"
              class="admin-table-empty"
            >
              Aucune demande pour le moment.
            </p>
          </div>
        </section>
      </div>

      <div class="admin-dashboard-col-laterale">
        <section class="admin-card">
          <h2 class="mb-3">
            Activité récente
          </h2>
          <ul class="admin-activite-liste">
            <li
              v-for="e in activiteRecente"
              :key="e.id"
            >
              <span
                class="admin-activite-point"
                :class="`admin-activite-point-${e.dotTone}`"
              />
              <div>
                <p class="mb-0">
                  <strong>{{ e.nom }}</strong> {{ e.suite }}
                </p>
                <p class="admin-activite-date mb-0">
                  {{ formatDate(e.date) }}
                </p>
              </div>
            </li>
            <li
              v-if="!activiteRecente.length"
              class="admin-empty"
            >
              Rien à afficher pour le moment.
            </li>
          </ul>
        </section>

        <section class="admin-card">
          <h2 class="mb-3">
            Comptes par rôle
          </h2>
          <div class="admin-repartition-barre">
            <span
              v-for="r in comptesParRole"
              :key="r.cle"
              :class="`admin-repartition-segment-${r.tone}`"
              :style="{ width: r.pct + '%' }"
            />
          </div>
          <ul class="admin-repartition-legende">
            <li
              v-for="r in comptesParRole"
              :key="r.cle"
            >
              <span :class="`admin-repartition-puce admin-repartition-puce-${r.tone}`" />
              {{ r.label }}
              <strong>{{ r.valeur }}</strong>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </template>
</template>
