<script setup>
// Page dédiée "Pour qui" : présente les 3 profils du dispositif.
// Photos Unsplash (licence gratuite), crédit affiché sous chaque carte.
import { onMounted, ref } from 'vue'
import BackLink from '../components/BackLink.vue'
import { useAuth } from '../stores/auth'
import { addAvis, deleteAvis, getAvis } from '../data/store'
import '../styles/PourQui.css'

const { user, isAdmin } = useAuth()

const PUBLICS = [
  {
    title: 'Personnes âgées',
    text: "Vous cherchez un coup de main pour les soins, les courses ou le ménage, sans avoir à démarcher vous-même.",
    photo: 'https://images.unsplash.com/photo-1752084794888-0b27a762b6fd?w=600&h=400&fit=crop&auto=format&q=80',
    credit: 'Chanika Dulnitha',
  },
  {
    title: 'Personnel de santé',
    text: 'Vous êtes infirmier, aide-soignant ou kiné et souhaitez proposer vos soins à domicile selon vos disponibilités.',
    photo: 'https://images.unsplash.com/photo-1762955911431-4c44c7c3f408?w=600&h=400&fit=crop&auto=format&q=80',
    credit: 'Age Cymru',
  },
  {
    title: 'Particuliers',
    text: 'Vous voulez rendre service comme coursier ou pour du ménage, près de chez vous et à votre rythme.',
    photo: 'https://images.unsplash.com/photo-1572195577046-2f25894c06fc?w=600&h=400&fit=crop&auto=format&q=80',
    credit: 'Lucian Alexe',
  },
]

// Avis réels postés par les utilisateurs (table "avis", voir data/store.js).
// Pas de témoignages statiques/fictifs ici : uniquement du contenu envoyé
// par de vrais comptes.
const avisListe = ref([])
const chargementAvis = ref(true)
const nouvelAvis = ref('')
const envoiAvis = ref(false)
const erreurAvis = ref('')

onMounted(async () => {
  avisListe.value = await getAvis()
  chargementAvis.value = false
})

async function handleAjouterAvis() {
  erreurAvis.value = ''
  if (!nouvelAvis.value.trim()) {
    erreurAvis.value = "Merci d'écrire un avis avant d'envoyer."
    return
  }
  envoiAvis.value = true
  try {
    await addAvis({ userId: user.value.id, nom: user.value.nom, texte: nouvelAvis.value.trim() })
    // Recharge la liste plutôt que d'insérer localement : plus simple, et évite
    // de désynchroniser l'ordre/le format avec ce que renvoie vraiment la base.
    avisListe.value = await getAvis()
    nouvelAvis.value = ''
  } catch (err) {
    erreurAvis.value = err.message
  } finally {
    envoiAvis.value = false
  }
}

// L'auteur ou l'admin peuvent retirer un avis (modération basique, RLS "avis_delete_own_or_admin").
function peutSupprimer(avis) {
  return user.value?.id === avis.user_id || isAdmin.value
}

async function handleSupprimerAvis(id) {
  try {
    await deleteAvis(id)
    avisListe.value = avisListe.value.filter((a) => a.id !== id)
  } catch (err) {
    erreurAvis.value = err.message
  }
}
</script>

<template>
  <section class="audience-page">
    <div class="container">
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-2">
        À qui s'adresse ce dispositif
      </h1>
      <p class="text-muted intro-text mb-4">
        Trois profils différents, chacun avec son propre parcours d'inscription.
      </p>

      <div class="row g-4">
        <div
          v-for="p in PUBLICS"
          :key="p.title"
          class="col-md-4"
        >
          <div class="card h-100 audience-card">
            <img
              :src="p.photo"
              :alt="p.title"
              class="audience-photo"
              loading="lazy"
            >
            <div class="p-4">
              <h2 class="h6">
                {{ p.title }}
              </h2>
              <p class="text-muted small mb-2">
                {{ p.text }}
              </p>
              <p class="photo-credit mb-0">
                Photo : {{ p.credit }} / Unsplash
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5">
        <h2 class="h5 mb-3">
          Témoignages
        </h2>

        <form
          v-if="user"
          class="mb-4 avis-form"
          @submit.prevent="handleAjouterAvis"
        >
          <label
            class="form-label"
            for="nouvel-avis"
          >Partagez votre expérience</label>
          <textarea
            id="nouvel-avis"
            v-model="nouvelAvis"
            class="form-control"
            rows="3"
            placeholder="Votre avis sur le dispositif..."
          />
          <p
            v-if="erreurAvis"
            class="text-danger small mt-2 mb-0"
          >
            {{ erreurAvis }}
          </p>
          <button
            type="submit"
            class="btn btn-primary mt-2"
            :disabled="envoiAvis"
          >
            {{ envoiAvis ? 'Envoi…' : 'Publier mon avis' }}
          </button>
        </form>
        <p
          v-else
          class="text-muted small mb-4"
        >
          <router-link to="/connexion">
            Connectez-vous
          </router-link> pour laisser un avis.
        </p>

        <p
          v-if="chargementAvis"
          class="text-muted small"
        >
          Chargement des avis…
        </p>

        <div
          v-else-if="avisListe.length"
          class="row g-3"
        >
          <div
            v-for="a in avisListe"
            :key="a.id"
            class="col-md-4"
          >
            <blockquote class="card h-100 p-4 mb-0 audience-testimonial">
              <p class="mb-3">
                “{{ a.texte }}”
              </p>
              <footer class="text-muted small mb-0 d-flex justify-content-between align-items-center">
                <span>{{ a.nom }}</span>
                <button
                  v-if="peutSupprimer(a)"
                  type="button"
                  class="btn btn-link btn-sm text-danger p-0"
                  @click="handleSupprimerAvis(a.id)"
                >
                  Supprimer
                </button>
              </footer>
            </blockquote>
          </div>
        </div>
        <p
          v-else
          class="text-muted small"
        >
          Aucun avis pour le moment. Soyez le premier à en laisser un !
        </p>
      </div>

      <div class="text-center mt-5">
        <router-link
          to="/inscription"
          class="btn btn-primary btn-lg"
        >
          S'inscrire
        </router-link>
      </div>
    </div>
  </section>
</template>
