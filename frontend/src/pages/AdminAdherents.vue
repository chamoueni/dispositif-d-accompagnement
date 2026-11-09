<script setup>
// Vue "Adhérents" de l'espace admin (/admin/adherents). Reprend telle quelle
// la logique de l'ancien composant AdherentsManager.vue (store Pinia
// useAdherentsStore, API Express /api/adherents — voir stores/adherents.js) :
// seule la présentation change (formulaire masqué par défaut, filtres en
// tableau aligné avec Comptes, tri en un seul menu au lieu de deux contrôles).
import { computed, onMounted, reactive, ref } from 'vue'
import { useAdherentsStore } from '../stores/adherents'
import AdminIcon from '../components/admin/AdminIcon.vue'
import '../styles/AdminAdherents.css'

const store = useAdherentsStore()
const recherche = ref('')
const triSelection = ref('nom-asc')
const afficherFormulaire = ref(false)
const editionId = ref(null)
const toast = ref({ type: '', message: '' })

function formulaireVide() {
  return { nom: '', email: '', telephone: '', ville: '', role: 'particulier', statut: 'actif' }
}
const formulaire = reactive(formulaireVide())

const ROLE_LABELS = { senior: 'Personne âgée', sante: 'Personnel de santé', particulier: 'Particulier' }
const ROLE_BADGE = { senior: 'ylang', particulier: 'teal', sante: 'teal-solid' }

const adherentsFiltres = computed(() => {
  const terme = recherche.value.trim().toLowerCase()
  const [champ, ordre] = triSelection.value === 'date' ? ['created_at', 'desc'] : ['nom', triSelection.value === 'nom-desc' ? 'desc' : 'asc']
  return [...store.adherents]
    .filter((a) => [a.nom, a.email, a.ville, a.role].join(' ').toLowerCase().includes(terme))
    .sort((a, b) => {
      const g = String(a[champ] || '').toLowerCase()
      const d = String(b[champ] || '').toLowerCase()
      return g.localeCompare(d, 'fr') * (ordre === 'asc' ? 1 : -1)
    })
})

function notifier(message, type = 'success') {
  toast.value = { message, type }
  window.setTimeout(() => { toast.value = { type: '', message: '' } }, 3500)
}

function ouvrirCreation() {
  Object.assign(formulaire, formulaireVide())
  editionId.value = null
  afficherFormulaire.value = true
}

function annuler() {
  afficherFormulaire.value = false
  editionId.value = null
}

function editer(adherent) {
  Object.assign(formulaire, adherent)
  editionId.value = adherent.id
  afficherFormulaire.value = true
}

async function enregistrer() {
  try {
    if (editionId.value) {
      await store.modifierAdherent(editionId.value, formulaire)
      notifier('Adhérent modifié avec succès.')
    } else {
      await store.creerAdherent(formulaire)
      notifier('Adhérent ajouté avec succès.')
    }
    afficherFormulaire.value = false
    editionId.value = null
  } catch (err) {
    notifier(err.message, 'danger')
  }
}

async function supprimer(adherent) {
  if (!window.confirm(`Supprimer ${adherent.nom} ?`)) return
  try {
    await store.supprimerAdherent(adherent.id)
    notifier('Adhérent supprimé.')
  } catch (err) {
    notifier(err.message, 'danger')
  }
}

function initiales(nom) {
  const parts = (nom || '?').trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

onMounted(async () => {
  if (!store.adherents.length) {
    try {
      await store.chargerAdherents()
    } catch (err) {
      notifier(err.message, 'danger')
    }
  }
})
</script>

<template>
  <header class="admin-topbar">
    <div>
      <h1>Adhérents</h1>
      <p>{{ store.adherents.length }} adhérents · synchronisé avec Supabase</p>
    </div>
    <div class="admin-topbar-actions">
      <button
        type="button"
        class="admin-btn admin-btn-primary"
        @click="ouvrirCreation"
      >
        <AdminIcon nom="plus" />
        Nouvel adhérent
      </button>
    </div>
  </header>

  <p
    v-if="toast.message"
    class="admin-badge admin-adherents-toast"
    :class="toast.type === 'danger' ? 'admin-badge-coral' : 'admin-badge-green'"
    role="status"
  >
    {{ toast.message }}
  </p>

  <form
    v-if="afficherFormulaire"
    class="admin-card admin-adherents-form"
    @submit.prevent="enregistrer"
  >
    <h2 class="mb-3">
      {{ editionId ? 'Modifier un adhérent' : 'Créer un adhérent' }}
    </h2>
    <div class="admin-adherents-form-grille">
      <div class="admin-field">
        <label for="adherent-nom">Nom complet</label>
        <input
          id="adherent-nom"
          v-model="formulaire.nom"
          type="text"
          required
        >
      </div>
      <div class="admin-field">
        <label for="adherent-email">Email</label>
        <input
          id="adherent-email"
          v-model="formulaire.email"
          type="email"
          required
        >
      </div>
      <div class="admin-field">
        <label for="adherent-telephone">Téléphone</label>
        <input
          id="adherent-telephone"
          v-model="formulaire.telephone"
          type="tel"
        >
      </div>
      <div class="admin-field">
        <label for="adherent-ville">Commune</label>
        <input
          id="adherent-ville"
          v-model="formulaire.ville"
          type="text"
        >
      </div>
      <div class="admin-field">
        <label for="adherent-role">Rôle</label>
        <select
          id="adherent-role"
          v-model="formulaire.role"
        >
          <option value="senior">
            Personne âgée
          </option>
          <option value="sante">
            Personnel de santé
          </option>
          <option value="particulier">
            Particulier
          </option>
        </select>
      </div>
      <div class="admin-field">
        <label for="adherent-statut">Statut</label>
        <select
          id="adherent-statut"
          v-model="formulaire.statut"
        >
          <option value="actif">
            Actif
          </option>
          <option value="inactif">
            Inactif
          </option>
        </select>
      </div>
    </div>
    <div class="admin-panel-foot admin-adherents-form-actions">
      <button
        type="button"
        class="admin-btn admin-btn-outline"
        @click="annuler"
      >
        Annuler
      </button>
      <button
        type="submit"
        class="admin-btn admin-btn-primary"
      >
        {{ editionId ? 'Enregistrer' : "Ajouter l'adhérent" }}
      </button>
    </div>
  </form>

  <div class="admin-comptes-filtres">
    <label class="admin-search">
      <AdminIcon nom="search" />
      <input
        v-model="recherche"
        type="search"
        placeholder="Rechercher un adhérent…"
        aria-label="Rechercher un adhérent"
      >
    </label>
    <select
      v-model="triSelection"
      class="admin-adherents-tri"
      aria-label="Trier les adhérents"
    >
      <option value="nom-asc">
        Trier par nom (A → Z)
      </option>
      <option value="nom-desc">
        Trier par nom (Z → A)
      </option>
      <option value="date">
        Trier par date
      </option>
    </select>
  </div>

  <div
    v-if="store.chargement"
    class="admin-loading"
  >
    Chargement…
  </div>
  <div
    v-else-if="store.erreur"
    class="admin-error"
  >
    {{ store.erreur }}
  </div>
  <div
    v-else
    class="admin-card admin-card-flush"
  >
    <div class="admin-table-wrap">
      <table class="admin-table admin-table-comptes">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Commune</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th class="text-end">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="a in adherentsFiltres"
            :key="a.id"
          >
            <td>
              <div class="admin-cell-personne">
                <span class="admin-avatar">{{ initiales(a.nom) }}</span>
                <span class="admin-cell-personne-nom">{{ a.nom }}</span>
              </div>
            </td>
            <td>{{ a.email }}</td>
            <td>{{ a.ville || 'Non renseignée' }}</td>
            <td>
              <span
                class="admin-badge"
                :class="`admin-badge-${ROLE_BADGE[a.role] || 'teal'}`"
              >{{ ROLE_LABELS[a.role] || a.role }}</span>
            </td>
            <td>
              <span class="admin-status">
                <span
                  class="admin-status-dot"
                  :class="{ 'admin-status-dot-off': a.statut !== 'actif' }"
                />
                {{ a.statut === 'actif' ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td>
              <div class="admin-row-actions">
                <button
                  type="button"
                  class="admin-icon-btn"
                  aria-label="Modifier cet adhérent"
                  title="Modifier"
                  @click="editer(a)"
                >
                  <AdminIcon nom="edit" />
                </button>
                <button
                  type="button"
                  class="admin-icon-btn admin-icon-btn-danger"
                  aria-label="Supprimer cet adhérent"
                  title="Supprimer"
                  @click="supprimer(a)"
                >
                  <AdminIcon nom="trash" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="!adherentsFiltres.length"
        class="admin-table-empty"
      >
        Aucun adhérent trouvé.
      </p>
    </div>
  </div>
</template>
