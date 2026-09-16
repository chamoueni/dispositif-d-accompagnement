<script setup>
// Recherche de prestataires : filtre côté client sur la liste complète des
// utilisateurs (pas de pagination/API, le volume de données mock reste petit).
import { computed, onMounted, reactive, ref } from 'vue'
import { getUsers, COMMUNES_MAYOTTE } from '../data/store.js'
import ProviderCard from '../components/ProviderCard.vue'
import '../styles/Recherche.css'

const TYPES = [
  { value: 'sante', label: 'Personnel de santé' },
  { value: 'coursier', label: 'Coursier' },
  { value: 'menage', label: 'Ménage' },
]

// ville : '' = toutes les communes. Le select ne propose que des noms de
// commune canoniques (COMMUNES_MAYOTTE), donc la comparaison peut être stricte.
const filters = reactive({
  type: 'sante',
  ville: '',
})

// getUsers() est maintenant asynchrone (Supabase) : on charge la liste une fois
// au montage plutôt qu'à chaque calcul du computed ci-dessous.
const users = ref([])
const chargement = ref(true)

onMounted(async () => {
  users.value = await getUsers()
  chargement.value = false
})

// "sante" filtre sur le rôle ; "coursier"/"menage" filtrent les particuliers
// selon le service qu'ils ont coché dans leur profil.
const results = computed(() => {
  return users.value.filter((u) => {
    const matchesType =
      filters.type === 'sante' ? u.role === 'sante' : u.role === 'particulier' && u.services.includes(filters.type)
    const matchesVille = !filters.ville || u.ville === filters.ville
    return matchesType && matchesVille
  })
})

const offreEssaiDisponible = computed(() => {
  return results.value.length > 0 && results.value.some((provider) => provider.role === 'sante' || provider.services?.length)
})
</script>

<template>
  <section class="search-page">
    <div class="container">
      <span class="section-label" />
      <h1 class="h3 mb-4">
        Trouver de l'aide
      </h1>

      <div class="filters card p-3 mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <label class="form-label">Type de service</label>
            <select
              v-model="filters.type"
              class="form-select"
            >
              <option
                v-for="t in TYPES"
                :key="t.value"
                :value="t.value"
              >
                {{ t.label }}
              </option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Commune</label>
            <select
              v-model="filters.ville"
              class="form-select"
            >
              <option value="">
                Toutes les communes
              </option>
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
      </div>

      <div
        v-if="!chargement && offreEssaiDisponible"
        class="alert alert-success d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"
        role="status"
      >
        <span>Offre découverte : 3 mises en relation gratuites disponibles pour cette recherche.</span>
        <router-link
          to="/formule/basique"
          class="btn btn-success btn-sm"
        >
          Profiter de l'essai gratuit
        </router-link>
      </div>

      <p
        v-if="!chargement"
        class="text-muted small mb-3"
      >
        {{ results.length }} résultat{{ results.length > 1 ? 's' : '' }}
      </p>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        Chargement…
      </p>

      <div
        v-else
        class="row g-4"
      >
        <div
          v-for="provider in results"
          :key="provider.id"
          class="col-md-6 col-lg-4"
        >
          <ProviderCard :provider="provider" />
        </div>
      </div>

      <p
        v-if="!chargement && !results.length"
        class="text-muted text-center py-5"
      >
        Aucun résultat pour ces critères. Essayez une autre commune ou un autre service.
      </p>
    </div>
  </section>
</template>
