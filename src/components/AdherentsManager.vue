<script setup>
// Composant réutilisable pour afficher et administrer les adhérents.
import { computed, onMounted, reactive, ref } from 'vue'
import { useAdherentsStore } from '../stores/adherents'
import '../styles/AdherentsManager.css'

const store = useAdherentsStore()
const recherche = ref('')
const tri = ref('nom')
const ordre = ref('asc')
const editionId = ref(null)
const toast = ref({ type: '', message: '' })
const formulaire = reactive(formulaireVide())

function formulaireVide() {
  return { nom: '', email: '', telephone: '', ville: '', role: 'particulier', statut: 'actif' }
}

// Filtre puis trie localement pour garder la recherche instantanée.
const adherentsFiltres = computed(() => {
  const terme = recherche.value.trim().toLowerCase()
  return [...store.adherents]
    .filter((adherent) => [adherent.nom, adherent.email, adherent.ville, adherent.role]
      .join(' ').toLowerCase().includes(terme))
    .sort((a, b) => {
      const gauche = String(a[tri.value] || '').toLowerCase()
      const droite = String(b[tri.value] || '').toLowerCase()
      return gauche.localeCompare(droite, 'fr') * (ordre.value === 'asc' ? 1 : -1)
    })
})

function notifier(message, type = 'success') {
  toast.value = { message, type }
  window.setTimeout(() => { toast.value = { type: '', message: '' } }, 3500)
}

function reinitialiserFormulaire() {
  Object.assign(formulaire, formulaireVide())
  editionId.value = null
}

function editer(adherent) {
  Object.assign(formulaire, adherent)
  editionId.value = adherent.id
  document.querySelector('#formulaire-adherent')?.scrollIntoView({ behavior: 'smooth' })
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
    reinitialiserFormulaire()
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

function inverserTri() {
  ordre.value = ordre.value === 'asc' ? 'desc' : 'asc'
}

onMounted(async () => {
  try {
    await store.chargerAdherents()
  } catch (err) {
    notifier(err.message, 'danger')
  }
})
</script>

<template>
  <section
    id="adherents"
    class="adherents-manager"
  >
    <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
      <div>
        <h2 class="h5 mb-1">
          Adhérents ({{ store.adherents.length }})
        </h2>
        <p class="text-muted small mb-0">
          Gestion synchronisée avec l’API et Supabase.
        </p>
      </div>
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        @click="reinitialiserFormulaire"
      >
        Nouvel adhérent
      </button>
    </div>

    <div
      v-if="toast.message"
      :class="['alert', `alert-${toast.type}`]"
      role="status"
    >
      {{ toast.message }}
    </div>

    <form
      id="formulaire-adherent"
      class="card p-3 mb-4"
      @submit.prevent="enregistrer"
    >
      <h3 class="h6">
        {{ editionId ? 'Modifier un adhérent' : 'Créer un adhérent' }}
      </h3>
      <div class="row g-3">
        <div class="col-md-6">
          <label
            class="form-label"
            for="adherent-nom"
          >Nom complet</label>
          <input
            id="adherent-nom"
            v-model="formulaire.nom"
            class="form-control"
            required
          >
        </div>
        <div class="col-md-6">
          <label
            class="form-label"
            for="adherent-email"
          >Email</label>
          <input
            id="adherent-email"
            v-model="formulaire.email"
            class="form-control"
            type="email"
            required
          >
        </div>
        <div class="col-md-4">
          <label
            class="form-label"
            for="adherent-telephone"
          >Téléphone</label>
          <input
            id="adherent-telephone"
            v-model="formulaire.telephone"
            class="form-control"
          >
        </div>
        <div class="col-md-4">
          <label
            class="form-label"
            for="adherent-ville"
          >Commune</label>
          <input
            id="adherent-ville"
            v-model="formulaire.ville"
            class="form-control"
          >
        </div>
        <div class="col-md-2">
          <label
            class="form-label"
            for="adherent-role"
          >Rôle</label>
          <select
            id="adherent-role"
            v-model="formulaire.role"
            class="form-select"
          >
            <option value="senior">
              Senior
            </option>
            <option value="sante">
              Santé
            </option>
            <option value="particulier">
              Particulier
            </option>
          </select>
        </div>
        <div class="col-md-2">
          <label
            class="form-label"
            for="adherent-statut"
          >Statut</label>
          <select
            id="adherent-statut"
            v-model="formulaire.statut"
            class="form-select"
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
      <div class="d-flex gap-2 mt-3">
        <button
          class="btn btn-primary"
          type="submit"
        >
          {{ editionId ? 'Enregistrer' : 'Ajouter' }}
        </button>
        <button
          v-if="editionId"
          class="btn btn-outline-secondary"
          type="button"
          @click="reinitialiserFormulaire"
        >
          Annuler
        </button>
      </div>
    </form>

    <div class="d-flex gap-2 mb-3 flex-wrap">
      <input
        v-model="recherche"
        class="form-control adherents-search"
        placeholder="Rechercher un adhérent…"
      >
      <select
        v-model="tri"
        class="form-select adherents-sort"
        aria-label="Trier les adhérents"
      >
        <option value="nom">
          Trier par nom
        </option>
        <option value="ville">
          Trier par commune
        </option>
        <option value="role">
          Trier par rôle
        </option>
        <option value="created_at">
          Trier par date
        </option>
      </select>
      <button
        class="btn btn-outline-secondary"
        type="button"
        aria-label="Inverser l’ordre du tri"
        @click="inverserTri"
      >
        {{ ordre === 'asc' ? 'A à Z' : 'Z à A' }}
      </button>
    </div>

    <div
      v-if="store.chargement"
      class="text-muted text-center py-4"
    >
      Chargement…
    </div>
    <div
      v-else-if="store.erreur"
      class="alert alert-danger"
    >
      {{ store.erreur }}
    </div>
    <div
      v-else
      class="table-responsive card"
    >
      <table class="table admin-table mb-0">
        <thead><tr><th>Nom</th><th>Email</th><th>Commune</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr
            v-for="adherent in adherentsFiltres"
            :key="adherent.id"
          >
            <td>{{ adherent.nom }}</td>
            <td>{{ adherent.email }}</td>
            <td>{{ adherent.ville || '—' }}</td>
            <td>{{ adherent.role }}</td>
            <td><span :class="['badge', adherent.statut === 'actif' ? 'text-bg-success' : 'text-bg-secondary']">{{ adherent.statut }}</span></td>
            <td class="text-nowrap">
              <button
                class="btn btn-sm btn-outline-primary me-1"
                type="button"
                @click="editer(adherent)"
              >
                Modifier
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                type="button"
                @click="supprimer(adherent)"
              >
                Supprimer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="!adherentsFiltres.length"
        class="text-muted text-center py-4 mb-0"
      >
        Aucun adhérent trouvé.
      </p>
    </div>
  </section>
</template>
