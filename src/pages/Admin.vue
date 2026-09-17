<script setup>
// Espace admin : mise en page "sidebar + contenu" (comme un site à part,
// voir App.vue qui masque la navbar/footer publics sur cette route), avec
// cartes stats, tableau des comptes, messages reçus et fil d'activité.
// Accès réservé (voir isAdmin dans stores/auth.js + la garde dans
// router/index.js) — cette page suppose déjà que seul l'admin peut
// l'atteindre, pas de vérification supplémentaire ici.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getUsers,
  getMessagesContact,
  deleteMessageContact,
  getDemandes,
  getMisesEnRelation,
  updateCompteAdmin,
  deleteCompteAdmin,
  COMMUNES_MAYOTTE,
} from '../data/store'
import { useAuth } from '../stores/auth'
import IconBadge from '../components/IconBadge.vue'
import AdherentsManager from '../components/AdherentsManager.vue'
import logo from '../assets/logo.png'
import '../styles/Admin.css'

const router = useRouter()
const { user, logout } = useAuth()

const ROLE_LABELS = {
  senior: 'Personne âgée',
  sante: 'Personnel de santé',
  particulier: 'Particulier',
}

const ROLE_BADGE_CLASS = {
  senior: 'text-bg-secondary',
  sante: 'text-bg-primary',
  particulier: 'text-bg-light border',
}

const utilisateurs = ref([])
const messages = ref([])
const demandes = ref([])
const missions = ref([])
const chargement = ref(true)

onMounted(async () => {
  ;[utilisateurs.value, messages.value, demandes.value, missions.value] = await Promise.all([
    getUsers(),
    getMessagesContact(),
    getDemandes(),
    getMisesEnRelation(),
  ])
  chargement.value = false
})

// --- Recherche et filtres sur le tableau des comptes ----------------------
const recherche = ref('')
const filtreRole = ref('tous')

const utilisateursFiltres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return utilisateurs.value.filter((u) => {
    if (filtreRole.value !== 'tous' && u.role !== filtreRole.value) return false
    if (!q) return true
    return (
      (u.nom || '').toLowerCase().includes(q) ||
      (u.ville || '').toLowerCase().includes(q) ||
      (u.telephone || '').toLowerCase().includes(q)
    )
  })
})

// --- Édition d'un compte (admin, voir profiles_update_admin en RLS) -------
const editionId = ref(null)
const editionForm = ref({ nom: '', role: 'senior', ville: '', telephone: '', adresse: '' })
const editionEnCours = ref(false)
const editionErreur = ref('')

function commencerEdition(u) {
  editionId.value = u.id
  editionForm.value = {
    nom: u.nom || '',
    role: u.role,
    ville: u.ville || COMMUNES_MAYOTTE[0].nom,
    telephone: u.telephone || '',
    adresse: u.adresse || '',
  }
  editionErreur.value = ''
}

function annulerEdition() {
  editionId.value = null
}

async function enregistrerEdition(id) {
  editionEnCours.value = true
  editionErreur.value = ''
  try {
    await updateCompteAdmin(id, { ...editionForm.value })
    const cible = utilisateurs.value.find((u) => u.id === id)
    if (cible) Object.assign(cible, editionForm.value)
    editionId.value = null
  } catch (err) {
    editionErreur.value = err.message
  } finally {
    editionEnCours.value = false
  }
}

// --- Suppression complète d'un compte (auth + profil, voir data/store.js) -
const suppressionCompteEnCours = ref(null)

async function supprimerCompte(u) {
  if (
    !confirm(
      `Supprimer définitivement le compte de ${u.nom || 'cet utilisateur'} ? Cette action est irréversible.`,
    )
  ) {
    return
  }
  suppressionCompteEnCours.value = u.id
  try {
    await deleteCompteAdmin(u.id)
    utilisateurs.value = utilisateurs.value.filter((item) => item.id !== u.id)
  } catch (err) {
    alert(`Échec de la suppression : ${err.message}`)
  } finally {
    suppressionCompteEnCours.value = null
  }
}

// --- Suivi de l'activité (demandes + missions, voir demandes_select_admin et
// mer_select_admin en RLS : sans elles l'admin ne verrait que les demandes où
// il serait lui-même participant, donc rien) ---------------------------------
const STATUT_DEMANDE_LABELS = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

const STATUT_MISSION_LABELS = {
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

// Mêmes clés que SERVICE_LABELS dans NouvelleDemande.vue (source des valeurs
// réellement enregistrées en base pour type_service).
const SERVICE_LABELS = {
  soins: 'Soins',
  coursier: 'Coursier',
  menage: 'Ménage',
}

const nomParId = computed(() => {
  const map = {}
  utilisateurs.value.forEach((u) => {
    map[u.id] = u.nom || 'Compte supprimé'
  })
  return map
})

function nomCompte(id) {
  return nomParId.value[id] || 'Compte supprimé'
}

const demandesEnAttente = computed(() => demandes.value.filter((d) => d.statut === 'en_attente').length)
const missionsEnCours = computed(() => missions.value.filter((m) => m.statutMission === 'en_cours').length)

// Les plus récentes en premier, comme les autres listes de la page.
const demandesTriees = computed(() =>
  [...demandes.value].sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation)),
)
const missionsTriees = computed(() =>
  [...missions.value].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut)),
)

async function seDeconnecter() {
  await logout()
  router.push('/')
}

const suppressionEnCours = ref(null)

// Confirmation native : geste destructif et irréversible (pas de corbeille),
// donc on s'assure que ce n'est pas un clic accidentel avant d'appeler Supabase.
async function supprimerMessage(id) {
  if (!confirm('Supprimer définitivement ce message ?')) return
  suppressionEnCours.value = id
  try {
    await deleteMessageContact(id)
    messages.value = messages.value.filter((m) => m.id !== id)
  } catch (err) {
    alert(`Échec de la suppression : ${err.message}`)
  } finally {
    suppressionEnCours.value = null
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

const messagesNonLus = computed(() => messages.value.filter((m) => !m.lu).length)

const nouveauxCeMois = computed(() => {
  const maintenant = new Date()
  return utilisateurs.value.filter((u) => {
    const d = new Date(u.created_at)
    return d.getMonth() === maintenant.getMonth() && d.getFullYear() === maintenant.getFullYear()
  }).length
})

// Fusionne comptes créés et messages reçus en un seul fil chronologique, pour
// la colonne "Activité récente" — plus lisible que deux listes séparées quand
// on veut juste voir "qu'est-ce qui vient de se passer".
const activiteRecente = computed(() => {
  const evenements = [
    ...utilisateurs.value.map((u) => ({
      id: `compte-${u.id}`,
      icon: 'profile',
      texte: `${u.nom || 'Un compte'} — ${ROLE_LABELS[u.role] || u.role}`,
      date: u.created_at,
    })),
    ...messages.value.map((m) => ({
      id: `message-${m.id}`,
      icon: 'phone',
      texte: `Message de ${m.nom}`,
      date: m.dateCreation,
    })),
  ]
  return evenements.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)
})
</script>

<template>
  <div class="admin-shell">
    <!-- Sidebar : identité de l'espace admin + navigation + déconnexion. Une
         seule page pour l'instant (Tableau de bord), donc les raccourcis
         Comptes/Messages sont de simples ancres vers les sections plus bas. -->
    <aside class="admin-sidebar">
      <div class="admin-sidebar-brand">
        <img
          :src="logo"
          alt=""
          class="admin-sidebar-logo"
        >
        <span>Espace admin</span>
      </div>

      <nav class="admin-sidebar-nav">
        <span class="admin-sidebar-link admin-sidebar-link-active">
          <IconBadge
            name="home"
            tone="accent"
            compact
          />
          Tableau de bord
        </span>
        <!-- Raccourcis vers les sections de la page (une seule page pour l'instant,
             donc de simples ancres plutôt que des routes séparées). -->
        <a
          href="#comptes"
          class="admin-sidebar-link"
        >
          <IconBadge
            name="profile"
            tone="accent"
            compact
          />
          Comptes
        </a>
        <a
          href="#messages"
          class="admin-sidebar-link"
        >
          <IconBadge
            name="phone"
            tone="accent-2"
            compact
          />
          Messages
        </a>
        <a
          href="#activite"
          class="admin-sidebar-link"
        >
          <IconBadge
            name="calendar"
            tone="accent"
            compact
          />
          Activité
        </a>
        <a
          href="#adherents"
          class="admin-sidebar-link"
        >
          <IconBadge
            name="profile"
            tone="accent-2"
            compact
          />
          Adhérents
        </a>
        <router-link
          to="/"
          class="admin-sidebar-link"
        >
          ← Retour au site
        </router-link>
      </nav>

      <button
        type="button"
        class="admin-sidebar-link admin-sidebar-logout"
        @click="seDeconnecter"
      >
        Déconnexion
      </button>
    </aside>

    <div class="admin-content">
      <header class="admin-topbar">
        <div>
          <h1 class="h4 mb-0">
            Tableau de bord
          </h1>
          <p class="text-muted small mb-0">
            Vue d'ensemble des comptes et des messages
          </p>
        </div>
        <div class="admin-topbar-user">
          {{ user?.nom || user?.email }}
        </div>
      </header>

      <div
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        Chargement…
      </div>

      <template v-else>
        <!-- Cartes stats colorées, une par indicateur clé. Doublent aussi comme
             raccourcis : cliquer une carte défile jusqu'à la section concernée. -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-sm-6 col-lg-3">
            <a
              href="#messages"
              class="admin-stat-card admin-stat-danger admin-stat-link"
            >
              <IconBadge
                name="phone"
                tone="accent-2"
                compact
              />
              <p class="admin-stat">
                {{ messagesNonLus }}
              </p>
              <p class="admin-stat-label">
                Messages non lus
              </p>
            </a>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <a
              href="#comptes"
              class="admin-stat-card admin-stat-accent admin-stat-link"
            >
              <IconBadge
                name="profile"
                tone="accent"
                compact
              />
              <p class="admin-stat">
                {{ utilisateurs.length }}
              </p>
              <p class="admin-stat-label">
                Comptes au total
              </p>
            </a>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <a
              href="#comptes"
              class="admin-stat-card admin-stat-accent2 admin-stat-link"
            >
              <IconBadge
                name="calendar"
                tone="accent-2"
                compact
              />
              <p class="admin-stat">
                {{ nouveauxCeMois }}
              </p>
              <p class="admin-stat-label">
                Nouveaux ce mois
              </p>
            </a>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <a
              href="#messages"
              class="admin-stat-card admin-stat-accent admin-stat-link"
            >
              <IconBadge
                name="connect"
                tone="accent"
                compact
              />
              <p class="admin-stat">
                {{ messages.length }}
              </p>
              <p class="admin-stat-label">
                Messages au total
              </p>
            </a>
          </div>
        </div>

        <!-- Deuxième rangée de cartes : suivi de l'activité (demandes et
             missions), invisible côté admin avant l'ajout des policies RLS
             demandes_select_admin / mer_select_admin. -->
        <div class="row g-3 mb-4">
          <div class="col-12 col-sm-6 col-lg-3">
            <a
              href="#activite"
              class="admin-stat-card admin-stat-accent2 admin-stat-link"
            >
              <IconBadge
                name="calendar"
                tone="accent-2"
                compact
              />
              <p class="admin-stat">
                {{ demandesEnAttente }}
              </p>
              <p class="admin-stat-label">
                Demandes en attente
              </p>
            </a>
          </div>
          <div class="col-12 col-sm-6 col-lg-3">
            <a
              href="#activite"
              class="admin-stat-card admin-stat-accent admin-stat-link"
            >
              <IconBadge
                name="shield-check"
                tone="accent"
                compact
              />
              <p class="admin-stat">
                {{ missionsEnCours }}
              </p>
              <p class="admin-stat-label">
                Missions en cours
              </p>
            </a>
          </div>
        </div>

        <div class="row g-4">
          <!-- Colonne principale : comptes + messages. -->
          <div class="col-lg-8">
            <h2
              id="comptes"
              class="h5 mb-3"
            >
              Comptes ({{ utilisateurs.length }})
            </h2>

            <!-- Recherche (nom, commune, téléphone) + filtre par rôle : le
                 tableau ci-dessous reste toujours en base sur "utilisateurs",
                 seul l'affichage change (utilisateursFiltres). -->
            <div class="admin-filtres mb-3">
              <input
                v-model="recherche"
                type="search"
                class="form-control"
                placeholder="Rechercher un nom, une commune, un téléphone…"
              >
              <select
                v-model="filtreRole"
                class="form-select"
              >
                <option value="tous">
                  Tous les rôles
                </option>
                <option value="senior">
                  Personnes âgées
                </option>
                <option value="sante">
                  Personnel de santé
                </option>
                <option value="particulier">
                  Particuliers
                </option>
              </select>
            </div>

            <div class="card p-0 mb-5">
              <div class="table-responsive">
                <table class="table admin-table mb-0">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Rôle</th>
                      <th>Commune</th>
                      <th>Téléphone</th>
                      <th>Inscrit le</th>
                      <th class="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="u in utilisateursFiltres"
                      :key="u.id"
                    >
                      <!-- Ligne normale, ou formulaire d'édition inline si
                           c'est le compte en cours de modification. -->
                      <tr v-if="editionId !== u.id">
                        <td>{{ u.nom || '—' }}</td>
                        <td>
                          <span :class="['badge', ROLE_BADGE_CLASS[u.role]]">
                            {{ ROLE_LABELS[u.role] || u.role }}
                          </span>
                        </td>
                        <td>{{ u.ville || '—' }}</td>
                        <td>{{ u.telephone || '—' }}</td>
                        <td class="text-muted small">
                          {{ formatDate(u.created_at) }}
                        </td>
                        <td class="text-end">
                          <div class="admin-row-actions">
                            <button
                              type="button"
                              class="btn btn-outline-secondary btn-sm"
                              @click="commencerEdition(u)"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              class="btn btn-outline-danger btn-sm"
                              :disabled="suppressionCompteEnCours === u.id"
                              @click="supprimerCompte(u)"
                            >
                              {{ suppressionCompteEnCours === u.id ? 'Suppression…' : 'Supprimer' }}
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr v-else>
                        <td colspan="6">
                          <div class="admin-edition-form">
                            <div class="admin-edition-champs">
                              <input
                                v-model="editionForm.nom"
                                type="text"
                                class="form-control form-control-sm"
                                placeholder="Nom complet"
                              >
                              <select
                                v-model="editionForm.role"
                                class="form-select form-select-sm"
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
                              <select
                                v-model="editionForm.ville"
                                class="form-select form-select-sm"
                              >
                                <option
                                  v-for="c in COMMUNES_MAYOTTE"
                                  :key="c.nom"
                                  :value="c.nom"
                                >
                                  {{ c.nom }}
                                </option>
                              </select>
                              <input
                                v-model="editionForm.telephone"
                                type="tel"
                                class="form-control form-control-sm"
                                placeholder="Téléphone"
                              >
                              <input
                                v-model="editionForm.adresse"
                                type="text"
                                class="form-control form-control-sm"
                                placeholder="Adresse postale"
                              >
                            </div>
                            <p
                              v-if="editionErreur"
                              class="text-danger small mb-2"
                            >
                              {{ editionErreur }}
                            </p>
                            <div class="admin-row-actions">
                              <button
                                type="button"
                                class="btn btn-primary btn-sm"
                                :disabled="editionEnCours"
                                @click="enregistrerEdition(u.id)"
                              >
                                {{ editionEnCours ? 'Enregistrement…' : 'Enregistrer' }}
                              </button>
                              <button
                                type="button"
                                class="btn btn-outline-secondary btn-sm"
                                :disabled="editionEnCours"
                                @click="annulerEdition"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
              <p
                v-if="!utilisateursFiltres.length"
                class="text-muted text-center py-5 mb-0"
              >
                {{ utilisateurs.length ? 'Aucun compte ne correspond à cette recherche.' : 'Aucun compte pour le moment.' }}
              </p>
            </div>

            <!-- Module CRUD séparé : les comptes Supabase existants restent
                 inchangés, tandis que les adhérents métier passent par l'API. -->
            <AdherentsManager />

            <!-- Messages envoyés via "SOS > Un problème avec le site" (voir
                 components/SosButton.vue). userId est vide pour un visiteur non connecté. -->
            <h2
              id="messages"
              class="h5 mb-3"
            >
              Messages reçus ({{ messages.length }})
            </h2>
            <div
              v-if="messages.length"
              class="admin-messages"
            >
              <div
                v-for="m in messages"
                :key="m.id"
                class="card p-3 admin-message"
              >
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <strong>{{ m.nom }}</strong>
                  <span class="text-muted small">{{ formatDate(m.dateCreation) }}</span>
                </div>
                <p class="mb-2">
                  {{ m.message }}
                </p>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  :disabled="suppressionEnCours === m.id"
                  @click="supprimerMessage(m.id)"
                >
                  {{ suppressionEnCours === m.id ? 'Suppression…' : 'Supprimer' }}
                </button>
              </div>
            </div>
            <p
              v-else
              class="text-muted text-center py-5"
            >
              Aucun message pour le moment.
            </p>

            <!-- Suivi de l'activité "métier" du dispositif : demandes envoyées
                 par les personnes âgées, puis missions démarrées une fois une
                 demande acceptée (voir data/store.js). Nécessite les policies
                 RLS demandes_select_admin / mer_select_admin (voir schema.sql),
                 sinon ces deux tableaux resteraient vides pour l'admin. -->
            <h2
              id="activite"
              class="h5 mb-3 mt-5"
            >
              Suivi de l'activité
            </h2>

            <h3 class="h6 text-muted mb-2">
              Demandes ({{ demandes.length }})
            </h3>
            <div class="card p-0 mb-4">
              <div class="table-responsive">
                <table class="table admin-table mb-0">
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
                      v-for="d in demandesTriees"
                      :key="d.id"
                    >
                      <td>{{ nomCompte(d.demandeurId) }}</td>
                      <td>{{ nomCompte(d.aidantId) }}</td>
                      <td>{{ SERVICE_LABELS[d.typeService] || d.typeService }}</td>
                      <td>
                        <span class="badge text-bg-light border">
                          {{ STATUT_DEMANDE_LABELS[d.statut] || d.statut }}
                        </span>
                      </td>
                      <td class="text-muted small">
                        {{ formatDate(d.dateCreation) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                v-if="!demandes.length"
                class="text-muted text-center py-4 mb-0"
              >
                Aucune demande pour le moment.
              </p>
            </div>

            <h3 class="h6 text-muted mb-2">
              Missions ({{ missions.length }})
            </h3>
            <div class="card p-0 mb-5">
              <div class="table-responsive">
                <table class="table admin-table mb-0">
                  <thead>
                    <tr>
                      <th>Demandeur</th>
                      <th>Aidant</th>
                      <th>Statut</th>
                      <th>Début</th>
                      <th>Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="m in missionsTriees"
                      :key="m.id"
                    >
                      <td>{{ nomCompte(m.demandeurId) }}</td>
                      <td>{{ nomCompte(m.aidantId) }}</td>
                      <td>
                        <span class="badge text-bg-light border">
                          {{ STATUT_MISSION_LABELS[m.statutMission] || m.statutMission }}
                        </span>
                      </td>
                      <td class="text-muted small">
                        {{ formatDate(m.dateDebut) }}
                      </td>
                      <td class="text-muted small">
                        {{ m.dateFin ? formatDate(m.dateFin) : '—' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                v-if="!missions.length"
                class="text-muted text-center py-4 mb-0"
              >
                Aucune mission pour le moment.
              </p>
            </div>
          </div>

          <!-- Colonne latérale : fil d'activité récente (comptes + messages mélangés). -->
          <div class="col-lg-4">
            <h2 class="h5 mb-3">
              Activité récente
            </h2>
            <div class="card p-3">
              <ul class="admin-activity-list">
                <li
                  v-for="e in activiteRecente"
                  :key="e.id"
                >
                  <IconBadge
                    :name="e.icon"
                    tone="accent"
                    compact
                  />
                  <div>
                    <p class="mb-0">
                      {{ e.texte }}
                    </p>
                    <p class="text-muted small mb-0">
                      {{ formatDate(e.date) }}
                    </p>
                  </div>
                </li>
                <li
                  v-if="!activiteRecente.length"
                  class="text-muted small"
                >
                  Rien à afficher pour le moment.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
