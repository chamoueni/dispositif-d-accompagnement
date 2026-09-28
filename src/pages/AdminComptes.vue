<script setup>
// Vue "Comptes" de l'espace admin (/admin/comptes) : liste + recherche/filtre,
// modification et suppression (logique reprise telle quelle de l'ancienne
// page Admin.vue, seulement déplacée dans le store partagé useAdminDashboard),
// plus la création d'un compte complet (nouveauté, voir POST /api/admin/comptes
// dans server/index.js — un email est nécessaire, aucun champ mot de passe
// n'étant proposé ici, voir le commentaire de cette route côté serveur).
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { COMMUNES_MAYOTTE } from '../data/store'
import { useAuth } from '../stores/auth'
import { useAdminDashboard } from '../stores/adminDashboard'
import AdminIcon from '../components/admin/AdminIcon.vue'
import '../styles/AdminComptes.css'

const route = useRoute()
const router = useRouter()
const { demanderReinitialisationMotDePasse } = useAuth()
const dashboard = useAdminDashboard()

const ROLES = [
  { valeur: 'senior', label: 'Personne âgée', icone: 'heart' },
  { valeur: 'particulier', label: 'Particulier', icone: 'user-plus' },
  { valeur: 'sante', label: 'Personnel de santé', icone: 'users' },
]
const ROLE_LABELS = { senior: 'Personne âgée', sante: 'Personnel de santé', particulier: 'Particulier' }
const ROLE_BADGE = { senior: 'ylang', particulier: 'teal', sante: 'teal-solid' }

const recherche = ref(route.query.q?.toString() || '')
const filtreRole = ref('tous')

const filtres = computed(() => [
  { valeur: 'tous', label: 'Tous', nb: dashboard.utilisateurs.length },
  { valeur: 'senior', label: 'Personnes âgées', nb: dashboard.utilisateurs.filter((u) => u.role === 'senior').length },
  { valeur: 'particulier', label: 'Particuliers', nb: dashboard.utilisateurs.filter((u) => u.role === 'particulier').length },
  { valeur: 'sante', label: 'Personnel de santé', nb: dashboard.utilisateurs.filter((u) => u.role === 'sante').length },
])

const utilisateursFiltres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return dashboard.utilisateurs.filter((u) => {
    if (filtreRole.value !== 'tous' && u.role !== filtreRole.value) return false
    if (!q) return true
    return (
      (u.nom || '').toLowerCase().includes(q) ||
      (u.ville || '').toLowerCase().includes(q) ||
      (u.telephone || '').toLowerCase().includes(q)
    )
  })
})

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' })
}

function initiales(nom) {
  const parts = (nom || '?').trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

// --- Panneau latéral : création ET modification (même formulaire) ----------
const panelOuvert = ref(false)
const modeEdition = ref(false)
const compteEnEditionId = ref(null)
const enCours = ref(false)
const erreur = ref('')

function formulaireVide() {
  return { nom: '', role: 'senior', telephone: '', ville: COMMUNES_MAYOTTE[0].nom, email: '', actif: true }
}
const formulaire = reactive(formulaireVide())

function ouvrirCreation() {
  Object.assign(formulaire, formulaireVide())
  modeEdition.value = false
  compteEnEditionId.value = null
  erreur.value = ''
  panelOuvert.value = true
}

function ouvrirEdition(u) {
  Object.assign(formulaire, {
    nom: u.nom || '',
    role: u.role,
    telephone: u.telephone || '',
    ville: u.ville || COMMUNES_MAYOTTE[0].nom,
    email: '',
    actif: u.actif ?? true,
  })
  modeEdition.value = true
  compteEnEditionId.value = u.id
  erreur.value = ''
  panelOuvert.value = true
}

function fermerPanel() {
  panelOuvert.value = false
}

async function valider() {
  erreur.value = ''
  if (!formulaire.nom.trim()) {
    erreur.value = 'Le nom est obligatoire.'
    return
  }
  enCours.value = true
  try {
    if (modeEdition.value) {
      await dashboard.modifierCompte(compteEnEditionId.value, {
        nom: formulaire.nom,
        role: formulaire.role,
        telephone: formulaire.telephone,
        ville: formulaire.ville,
        actif: formulaire.actif,
      })
    } else {
      const cree = await dashboard.creerCompte({ ...formulaire })
      // Aucun mot de passe n'a été demandé dans ce formulaire : la personne
      // reçoit le même email "définir mon mot de passe" que pour un mot de
      // passe oublié classique (voir stores/auth.js), pour pouvoir se
      // connecter ensuite avec le mot de passe de son choix.
      if (cree.email) {
        demanderReinitialisationMotDePasse(cree.email).catch(() => {})
      }
    }
    panelOuvert.value = false
  } catch (err) {
    erreur.value = err.message
  } finally {
    enCours.value = false
  }
}

const suppressionEnCours = ref(null)
async function supprimer(u) {
  if (!confirm(`Supprimer définitivement le compte de ${u.nom || 'cet utilisateur'} ? Cette action est irréversible.`)) return
  suppressionEnCours.value = u.id
  try {
    await dashboard.supprimerCompte(u.id)
  } catch (err) {
    alert(`Échec de la suppression : ${err.message}`)
  } finally {
    suppressionEnCours.value = null
  }
}

onMounted(() => {
  if (route.query.nouveau === '1') {
    ouvrirCreation()
    router.replace({ path: '/admin/comptes', query: {} })
  }
})
</script>

<template>
  <header class="admin-topbar">
    <div>
      <h1>Comptes</h1>
      <p>{{ dashboard.utilisateurs.length }} comptes au total</p>
    </div>
    <div class="admin-topbar-actions">
      <button
        type="button"
        class="admin-btn admin-btn-primary"
        @click="ouvrirCreation"
      >
        <AdminIcon nom="plus" />
        Nouveau compte
      </button>
    </div>
  </header>

  <div class="admin-comptes-filtres">
    <div class="admin-pills">
      <button
        v-for="f in filtres"
        :key="f.valeur"
        type="button"
        class="admin-pill"
        :class="{ 'admin-pill-active': filtreRole === f.valeur }"
        @click="filtreRole = f.valeur"
      >
        {{ f.label }} ({{ f.nb }})
      </button>
    </div>
    <label class="admin-search">
      <AdminIcon nom="search" />
      <input
        v-model="recherche"
        type="search"
        placeholder="Rechercher…"
        aria-label="Rechercher un compte"
      >
    </label>
  </div>

  <div
    v-if="dashboard.chargementInitial"
    class="admin-loading"
  >
    Chargement…
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
            <th>Rôle</th>
            <th>Commune</th>
            <th>Statut</th>
            <th>Inscrit le</th>
            <th class="text-end">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in utilisateursFiltres"
            :key="u.id"
          >
            <td>
              <div class="admin-cell-personne">
                <span class="admin-avatar">{{ initiales(u.nom) }}</span>
                <div class="admin-cell-personne-texte">
                  <p class="admin-cell-personne-nom mb-0">
                    {{ u.nom || '—' }}
                  </p>
                  <p class="admin-cell-personne-sous mb-0">
                    {{ u.telephone || '—' }}
                  </p>
                </div>
              </div>
            </td>
            <td>
              <span
                class="admin-badge"
                :class="`admin-badge-${ROLE_BADGE[u.role]}`"
              >{{ ROLE_LABELS[u.role] || u.role }}</span>
            </td>
            <td>{{ u.ville || '—' }}</td>
            <td>
              <span class="admin-status">
                <span
                  class="admin-status-dot"
                  :class="{ 'admin-status-dot-off': u.actif === false }"
                />
                {{ u.actif === false ? 'Inactif' : 'Actif' }}
              </span>
            </td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td>
              <div class="admin-row-actions">
                <button
                  type="button"
                  class="admin-icon-btn"
                  aria-label="Modifier ce compte"
                  title="Modifier"
                  @click="ouvrirEdition(u)"
                >
                  <AdminIcon nom="edit" />
                </button>
                <button
                  type="button"
                  class="admin-icon-btn admin-icon-btn-danger"
                  aria-label="Supprimer ce compte"
                  title="Supprimer"
                  :disabled="suppressionEnCours === u.id"
                  @click="supprimer(u)"
                >
                  <AdminIcon nom="trash" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="!utilisateursFiltres.length"
        class="admin-table-empty"
      >
        {{ dashboard.utilisateurs.length ? 'Aucun compte ne correspond à cette recherche.' : 'Aucun compte pour le moment.' }}
      </p>
    </div>
  </div>

  <!-- Panneau latéral : création OU modification, voir ouvrirCreation/ouvrirEdition. -->
  <div
    v-if="panelOuvert"
    class="admin-panel-overlay"
    @click.self="fermerPanel"
  >
    <div class="admin-panel">
      <div class="admin-panel-head">
        <h2>{{ modeEdition ? 'Modifier le compte' : 'Nouveau compte' }}</h2>
        <button
          type="button"
          class="admin-icon-btn"
          aria-label="Fermer"
          @click="fermerPanel"
        >
          <AdminIcon nom="x" />
        </button>
      </div>

      <form @submit.prevent="valider">
        <div class="admin-role-choix">
          <button
            v-for="r in ROLES"
            :key="r.valeur"
            type="button"
            class="admin-role-bouton"
            :class="{ 'admin-role-bouton-active': formulaire.role === r.valeur }"
            @click="formulaire.role = r.valeur"
          >
            <AdminIcon :nom="r.icone" />
            {{ r.label }}
          </button>
        </div>

        <div class="admin-field">
          <label for="compte-nom">Nom complet</label>
          <input
            id="compte-nom"
            v-model="formulaire.nom"
            type="text"
            required
          >
        </div>

        <div class="admin-field-row">
          <div class="admin-field">
            <label for="compte-telephone">Téléphone</label>
            <input
              id="compte-telephone"
              v-model="formulaire.telephone"
              type="tel"
            >
          </div>
          <div class="admin-field">
            <label for="compte-ville">Commune</label>
            <select
              id="compte-ville"
              v-model="formulaire.ville"
            >
              <option
                v-for="c in COMMUNES_MAYOTTE"
                :key="c.nom"
                :value="c.nom"
              >
                {{ c.nom }}
              </option>
            </select>
          </div>
        </div>

        <div
          v-if="!modeEdition"
          class="admin-field"
        >
          <label for="compte-email">Email</label>
          <input
            id="compte-email"
            v-model="formulaire.email"
            type="email"
            required
          >
        </div>
        <p
          v-if="!modeEdition"
          class="admin-info"
        >
          Nécessaire pour créer le compte : la personne recevra un lien pour choisir son mot de passe.
        </p>

        <label class="admin-checkbox">
          <input
            v-model="formulaire.actif"
            type="checkbox"
          >
          Compte actif
        </label>

        <p
          v-if="erreur"
          class="admin-error"
        >
          {{ erreur }}
        </p>

        <div class="admin-panel-foot">
          <button
            type="button"
            class="admin-btn admin-btn-outline"
            @click="fermerPanel"
          >
            Annuler
          </button>
          <button
            type="submit"
            class="admin-btn admin-btn-primary"
            :disabled="enCours"
          >
            {{ enCours ? 'Enregistrement…' : modeEdition ? 'Enregistrer' : 'Créer le compte' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
