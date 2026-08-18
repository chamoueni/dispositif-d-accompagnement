<script setup>
// Page "Mon profil" : édition des infos communes +, selon le rôle, soit un CTA
// vers la recherche (personne âgée), soit la gestion des disponibilités
// (personnel de santé / particulier).
import { reactive, ref } from 'vue'
import { useAuth } from '../stores/auth'
import { COMMUNES_MAYOTTE } from '../data/store'
import '../styles/Profil.css'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const SPECIALITES = ['Infirmier(ère)', 'Aide-soignant(e)', 'Médecin', 'Kinésithérapeute', 'Autre']
const ROLE_LABELS = {
  senior: 'Personne âgée',
  sante: 'Personnel de santé',
  particulier: 'Particulier',
}

const { user, updateProfile } = useAuth()

// Formulaire local pré-rempli avec les valeurs actuelles ; rien n'est sauvegardé
// tant que handleSave() n'est pas appelé.
const form = reactive({
  nom: user.value.nom,
  telephone: user.value.telephone,
  ville: user.value.ville,
  bio: user.value.bio,
  specialite: user.value.specialite || SPECIALITES[0],
  services: [...(user.value.services || [])],
})

// Créneau horaire précis (et non plus une simple indication "Matin"/"Après-midi") :
// nécessaire pour pouvoir proposer ce créneau lors de l'envoi d'une demande.
const newSlot = reactive({ jour: JOURS[0], heureDebut: '08:00', heureFin: '12:00' })
const slotError = ref('')
const savedMessage = ref('')

function toggleService(service) {
  const index = form.services.indexOf(service)
  if (index === -1) form.services.push(service)
  else form.services.splice(index, 1)
}

// Les disponibilités sont enregistrées immédiatement (pas de bouton "Enregistrer"),
// pour que la liste affichée reste toujours synchronisée avec ce qui est stocké.
// updateProfile() (Supabase) est async : on attend la confirmation d'écriture
// avant de considérer la disponibilité comme ajoutée.
async function addSlot() {
  slotError.value = ''
  if (newSlot.heureFin <= newSlot.heureDebut) {
    slotError.value = "L'heure de fin doit être après l'heure de début."
    return
  }
  const exists = user.value.disponibilites.some(
    (d) =>
      d.jour === newSlot.jour && d.heureDebut === newSlot.heureDebut && d.heureFin === newSlot.heureFin,
  )
  if (exists) return
  const disponibilites = [...user.value.disponibilites, { ...newSlot }]
  try {
    await updateProfile({ disponibilites })
  } catch (err) {
    slotError.value = err.message
  }
}

async function removeSlot(index) {
  const disponibilites = user.value.disponibilites.filter((_, i) => i !== index)
  await updateProfile({ disponibilites })
}

async function handleSave() {
  await updateProfile({
    nom: form.nom,
    telephone: form.telephone,
    ville: form.ville,
    bio: form.bio,
    specialite: user.value.role === 'sante' ? form.specialite : '',
    services: user.value.role === 'particulier' ? [...form.services] : [],
  })
  savedMessage.value = 'Profil mis à jour.'
  setTimeout(() => (savedMessage.value = ''), 2500)
}
</script>

<template>
  <section class="dashboard-page">
    <div class="container">
      <div class="d-flex align-items-center gap-2 mb-4">
        <h1 class="h3 mb-0">
          Mon profil
        </h1>
        <span class="badge text-bg-light border badge-role">{{ ROLE_LABELS[user.role] }}</span>
      </div>

      <div class="row g-4">
        <div class="col-lg-7">
          <div class="card p-4">
            <h2 class="h5 mb-3">
              Informations
            </h2>
            <form @submit.prevent="handleSave">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Nom complet</label>
                  <input
                    v-model="form.nom"
                    type="text"
                    class="form-control"
                  >
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Téléphone</label>
                  <input
                    v-model="form.telephone"
                    type="tel"
                    class="form-control"
                  >
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Commune</label>
                <select
                  v-model="form.ville"
                  class="form-select"
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

              <div
                v-if="user.role === 'sante'"
                class="mb-3"
              >
                <label class="form-label">Spécialité</label>
                <select
                  v-model="form.specialite"
                  class="form-select"
                >
                  <option
                    v-for="s in SPECIALITES"
                    :key="s"
                    :value="s"
                  >
                    {{ s }}
                  </option>
                </select>
              </div>

              <div
                v-if="user.role === 'particulier'"
                class="mb-3"
              >
                <label class="form-label">Services proposés</label>
                <div class="form-check">
                  <input
                    id="svc-coursier"
                    class="form-check-input"
                    type="checkbox"
                    :checked="form.services.includes('coursier')"
                    @change="toggleService('coursier')"
                  >
                  <label
                    class="form-check-label"
                    for="svc-coursier"
                  >Coursier</label>
                </div>
                <div class="form-check">
                  <input
                    id="svc-menage"
                    class="form-check-input"
                    type="checkbox"
                    :checked="form.services.includes('menage')"
                    @change="toggleService('menage')"
                  >
                  <label
                    class="form-check-label"
                    for="svc-menage"
                  >Ménage</label>
                </div>
              </div>

              <div
                v-if="user.role !== 'senior'"
                class="mb-3"
              >
                <label class="form-label">Présentation</label>
                <textarea
                  v-model="form.bio"
                  class="form-control"
                  rows="3"
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary"
              >
                Enregistrer
              </button>
              <span
                v-if="savedMessage"
                class="text-success small ms-3"
              >{{ savedMessage }}</span>
            </form>
          </div>
        </div>

        <div class="col-lg-5">
          <div
            v-if="user.role === 'senior'"
            class="card p-4 text-center senior-cta"
          >
            <h2 class="h5 mb-2">
              Besoin d'aide ?
            </h2>
            <p class="text-muted mb-3">
              Trouvez un personnel de santé, un coursier ou une aide-ménagère près de chez vous.
            </p>
            <router-link
              to="/recherche"
              class="btn btn-secondary"
            >
              Lancer une recherche
            </router-link>
          </div>

          <div
            v-else
            class="card p-4"
          >
            <h2 class="h5 mb-3">
              Mes disponibilités
            </h2>

            <ul class="slot-list">
              <li
                v-for="(slot, index) in user.disponibilites"
                :key="`${slot.jour}-${slot.heureDebut}-${slot.heureFin}`"
              >
                <span>{{ slot.jour }} — {{ slot.heureDebut }} à {{ slot.heureFin }}</span>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="removeSlot(index)"
                >
                  Retirer
                </button>
              </li>
              <li
                v-if="!user.disponibilites.length"
                class="text-muted small"
              >
                Aucune disponibilité renseignée pour le moment.
              </li>
            </ul>

            <div class="add-slot">
              <select
                v-model="newSlot.jour"
                class="form-select form-select-sm"
              >
                <option
                  v-for="j in JOURS"
                  :key="j"
                  :value="j"
                >
                  {{ j }}
                </option>
              </select>
              <input
                v-model="newSlot.heureDebut"
                type="time"
                class="form-control form-control-sm"
              >
              <input
                v-model="newSlot.heureFin"
                type="time"
                class="form-control form-control-sm"
              >
              <button
                type="button"
                class="btn btn-sm btn-primary"
                @click="addSlot"
              >
                Ajouter
              </button>
            </div>
            <p
              v-if="slotError"
              class="text-danger small mt-2 mb-0"
            >
              {{ slotError }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
