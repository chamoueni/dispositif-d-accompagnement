<script setup>
// Page "Mon profil" : édition des infos communes +, selon le rôle, soit un CTA
// vers la recherche (personne âgée), soit la gestion des disponibilités
// (personnel de santé / particulier).
import { computed, reactive, ref } from 'vue'
import { useAuth } from '../stores/auth'
import { COMMUNES_MAYOTTE } from '../data/store'
import ChampMotDePasse from '../components/ChampMotDePasse.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/Profil.css'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const SPECIALITES = ['Infirmier(ère)', 'Aide-soignant(e)', 'Médecin', 'Kinésithérapeute', 'Autre']
const ROLE_LABELS = {
  senior: 'Personne âgée',
  sante: 'Personnel de santé',
  particulier: 'Particulier',
}

const { user, updateProfile, changerMotDePasse } = useAuth()

// "nom" reste stocké comme un nom complet en un seul champ en base (voir
// profiles.nom) — inchangé pour ne pas casser l'affichage navbar ("Prénom N.",
// voir nomAffiche() dans AppNav.vue). On le découpe juste ici en deux champs
// (Prénom/Nom) pour une saisie plus naturelle, puis on les recolle à l'enregistrement.
function decouperNom(nomComplet) {
  const mots = (nomComplet || '').trim().split(/\s+/).filter(Boolean)
  if (mots.length === 0) return { prenom: '', nomFamille: '' }
  if (mots.length === 1) return { prenom: mots[0], nomFamille: '' }
  return { prenom: mots[0], nomFamille: mots.slice(1).join(' ') }
}

// Formulaire local pré-rempli avec les valeurs actuelles ; rien n'est sauvegardé
// tant que handleSave() n'est pas appelé.
const form = reactive({
  ...decouperNom(user.value.nom),
  telephone: user.value.telephone,
  ville: user.value.ville,
  adresse: user.value.adresse,
  bio: user.value.bio,
  specialite: user.value.specialite || SPECIALITES[0],
  services: [...(user.value.services || [])],
})

const slotError = ref('')
const savedMessage = ref('')

function toggleService(service) {
  const index = form.services.indexOf(service)
  if (index === -1) form.services.push(service)
  else form.services.splice(index, 1)
}

// Calendrier de disponibilité : 3 créneaux fixes par jour plutôt qu'un champ
// horaire libre, pour que ça se présente vraiment comme une grille cliquable
// (calendrier) au lieu d'un simple formulaire jour + heure de début/fin.
const CRENEAUX = [
  { id: 'matin', label: 'Matin', heureDebut: '08:00', heureFin: '12:00' },
  { id: 'apres-midi', label: 'Après-midi', heureDebut: '12:00', heureFin: '17:00' },
  { id: 'soir', label: 'Soir', heureDebut: '17:00', heureFin: '20:00' },
]

function estActif(jour, creneau) {
  return user.value.disponibilites.some(
    (d) => d.jour === jour && d.heureDebut === creneau.heureDebut && d.heureFin === creneau.heureFin,
  )
}

// Une case du calendrier = un créneau standard (jour + Matin/Après-midi/Soir).
// Clic : on l'ajoute s'il n'y est pas, on le retire sinon. updateProfile()
// (Supabase) est async : la case ne change d'état qu'une fois l'écriture confirmée.
async function toggleCreneau(jour, creneau) {
  slotError.value = ''
  const dejaActif = estActif(jour, creneau)
  const disponibilites = dejaActif
    ? user.value.disponibilites.filter(
        (d) => !(d.jour === jour && d.heureDebut === creneau.heureDebut && d.heureFin === creneau.heureFin),
      )
    : [...user.value.disponibilites, { jour, heureDebut: creneau.heureDebut, heureFin: creneau.heureFin }]
  try {
    await updateProfile({ disponibilites })
  } catch (err) {
    slotError.value = err.message
  }
}

// D'anciennes disponibilités à horaires libres (avant ce calendrier à créneaux
// fixes) ne correspondent à aucune case de la grille : on les garde visibles
// ici plutôt que de les faire disparaître silencieusement de l'interface.
const autresCreneaux = computed(() =>
  user.value.disponibilites
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !CRENEAUX.some((c) => c.heureDebut === slot.heureDebut && c.heureFin === slot.heureFin)),
)

async function removeSlot(index) {
  const disponibilites = user.value.disponibilites.filter((_, i) => i !== index)
  await updateProfile({ disponibilites })
}

async function handleSave() {
  await updateProfile({
    nom: `${form.prenom} ${form.nomFamille}`.trim(),
    telephone: form.telephone,
    ville: form.ville,
    adresse: form.adresse,
    bio: form.bio,
    specialite: user.value.role === 'sante' ? form.specialite : '',
    services: user.value.role === 'particulier' ? [...form.services] : [],
  })
  savedMessage.value = 'Profil mis à jour.'
  setTimeout(() => (savedMessage.value = ''), 2500)
}

// Changement de mot de passe : formulaire séparé de "Informations" (pas de
// bouton "Enregistrer" commun) pour ne pas mélanger deux actions différentes.
const motDePasse = reactive({ nouveau: '', confirmation: '' })
const motDePasseErreur = ref('')
const motDePasseMessage = ref('')
const motDePasseEnCours = ref(false)

async function handleChangerMotDePasse() {
  motDePasseErreur.value = ''
  motDePasseMessage.value = ''

  if (motDePasse.nouveau.length < 6) {
    motDePasseErreur.value = 'Le mot de passe doit contenir au moins 6 caractères.'
    return
  }
  if (motDePasse.nouveau !== motDePasse.confirmation) {
    motDePasseErreur.value = 'Les deux mots de passe ne correspondent pas.'
    return
  }

  motDePasseEnCours.value = true
  try {
    await changerMotDePasse(motDePasse.nouveau)
    motDePasseMessage.value = 'Mot de passe mis à jour.'
    motDePasse.nouveau = ''
    motDePasse.confirmation = ''
    setTimeout(() => (motDePasseMessage.value = ''), 2500)
  } catch (err) {
    motDePasseErreur.value = err.message
  } finally {
    motDePasseEnCours.value = false
  }
}
</script>

<template>
  <section class="dashboard-page">
    <div class="container">
      <BackLink />
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
                  <label class="form-label">Prénom</label>
                  <input
                    v-model="form.prenom"
                    type="text"
                    class="form-control"
                  >
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Nom</label>
                  <input
                    v-model="form.nomFamille"
                    type="text"
                    class="form-control"
                  >
                </div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Téléphone</label>
                  <input
                    v-model="form.telephone"
                    type="tel"
                    class="form-control"
                  >
                </div>
                <div class="col-md-6 mb-3">
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
              </div>

              <div class="mb-3">
                <label class="form-label">Adresse postale</label>
                <input
                  v-model="form.adresse"
                  type="text"
                  class="form-control"
                  placeholder="N°, rue, lieu-dit..."
                >
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

          <div class="card p-4 mt-4">
            <h2 class="h5 mb-3">
              Sécurité
            </h2>
            <form @submit.prevent="handleChangerMotDePasse">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Nouveau mot de passe</label>
                  <ChampMotDePasse
                    id="nouveau-mot-de-passe"
                    v-model="motDePasse.nouveau"
                    autocomplete="new-password"
                  />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label">Confirmer le mot de passe</label>
                  <ChampMotDePasse
                    id="confirmation-mot-de-passe"
                    v-model="motDePasse.confirmation"
                    autocomplete="new-password"
                  />
                </div>
              </div>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="motDePasseEnCours"
              >
                {{ motDePasseEnCours ? 'Enregistrement…' : 'Changer le mot de passe' }}
              </button>
              <span
                v-if="motDePasseMessage"
                class="text-success small ms-3"
              >{{ motDePasseMessage }}</span>
              <p
                v-if="motDePasseErreur"
                class="text-danger small mt-2 mb-0"
              >
                {{ motDePasseErreur }}
              </p>
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
            <h2 class="h5 mb-1">
              Mon calendrier de disponibilité
            </h2>
            <p class="text-muted small mb-3">
              Cliquez sur un créneau pour le proposer ou le retirer.
            </p>

            <div class="dispo-calendrier">
              <div class="dispo-calendrier-entete">
                <span />
                <span
                  v-for="j in JOURS"
                  :key="j"
                >{{ j.slice(0, 3) }}</span>
              </div>
              <div
                v-for="creneau in CRENEAUX"
                :key="creneau.id"
                class="dispo-calendrier-ligne"
              >
                <span class="dispo-calendrier-label">{{ creneau.label }}</span>
                <button
                  v-for="j in JOURS"
                  :key="`${creneau.id}-${j}`"
                  type="button"
                  class="dispo-case"
                  :class="{ 'dispo-case-active': estActif(j, creneau) }"
                  :aria-pressed="estActif(j, creneau)"
                  :aria-label="`${creneau.label} ${j}`"
                  @click="toggleCreneau(j, creneau)"
                />
              </div>
            </div>

            <p
              v-if="slotError"
              class="text-danger small mt-3 mb-0"
            >
              {{ slotError }}
            </p>

            <!-- Créneaux à horaires libres enregistrés avant ce calendrier :
                 gardés visibles/supprimables plutôt que masqués silencieusement. -->
            <div
              v-if="autresCreneaux.length"
              class="mt-3"
            >
              <p class="text-muted small mb-2">
                Autres créneaux enregistrés :
              </p>
              <ul class="slot-list">
                <li
                  v-for="{ slot, index } in autresCreneaux"
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
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
