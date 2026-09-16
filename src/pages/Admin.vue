<script setup>
// Espace admin : mise en page "sidebar + contenu" (comme un site à part,
// voir App.vue qui masque la navbar/footer publics sur cette route), avec
// cartes stats, tableau des comptes, messages reçus et fil d'activité.
// Accès réservé (voir isAdmin dans stores/auth.js + la garde dans
// router/index.js) — cette page suppose déjà que seul l'admin peut
// l'atteindre, pas de vérification supplémentaire ici.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUsers, getMessagesContact, deleteMessageContact } from '../data/store'
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
const chargement = ref(true)

onMounted(async () => {
  ;[utilisateurs.value, messages.value] = await Promise.all([getUsers(), getMessagesContact()])
  chargement.value = false
})

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

        <div class="row g-4">
          <!-- Colonne principale : comptes + messages. -->
          <div class="col-lg-8">
            <h2
              id="comptes"
              class="h5 mb-3"
            >
              Comptes ({{ utilisateurs.length }})
            </h2>
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="u in utilisateurs"
                      :key="u.id"
                    >
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
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                v-if="!utilisateurs.length"
                class="text-muted text-center py-5 mb-0"
              >
                Aucun compte pour le moment.
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
