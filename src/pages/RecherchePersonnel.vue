<script setup>
// Recherche de prestataires : filtre côté client sur la liste complète des
// utilisateurs (pas de pagination/API, le volume de données mock reste petit).
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getUsers, COMMUNES_MAYOTTE } from '../data/store.js'
import ProviderCard from '../components/ProviderCard.vue'
import BackLink from '../components/BackLink.vue'
import '../styles/Recherche.css'

const { t } = useI18n()

const TYPES = [
  { value: 'sante', labelKey: 'type_sante' },
  { value: 'coursier', labelKey: 'type_coursier' },
  { value: 'menage', labelKey: 'type_menage' },
]

const route = useRoute()

// "Besoin d'aide" dans le profil d'une personne âgée (voir Profil.vue) mène
// ici avec ?type=coursier|menage|sante : on préremplit le filtre pour arriver
// directement sur les résultats du service demandé plutôt qu'une recherche
// vide à reconfigurer. Type inconnu/absent : comportement inchangé (santé).
const typeInitial = TYPES.some((t2) => t2.value === route.query.type) ? route.query.type : 'sante'

// ville : '' = toutes les communes. Le select ne propose que des noms de
// commune canoniques (COMMUNES_MAYOTTE), donc la comparaison peut être stricte.
const filters = reactive({
  type: typeInitial,
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
      <BackLink />
      <span class="section-label" />
      <h1 class="h3 mb-4">
        {{ t('nav.trouver_aide') }}
      </h1>

      <div class="filters card p-3 mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-md-6">
            <label class="form-label">{{ t('recherche_page.type_service_label') }}</label>
            <select
              v-model="filters.type"
              class="form-select"
            >
              <option
                v-for="t2 in TYPES"
                :key="t2.value"
                :value="t2.value"
              >
                {{ t(`recherche_page.${t2.labelKey}`) }}
              </option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">{{ t('recherche_page.commune_label') }}</label>
            <select
              v-model="filters.ville"
              class="form-select"
            >
              <option value="">
                {{ t('commun.toutes_communes') }}
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
        <span>{{ t('recherche_page.offre_titre') }}</span>
        <router-link
          to="/formule/basique"
          class="btn btn-success btn-sm"
        >
          {{ t('recherche_page.essai_gratuit_cta') }}
        </router-link>
      </div>

      <p
        v-if="!chargement"
        class="text-muted small mb-3"
      >
        {{ results.length }} {{ t('recherche_page.resultat', results.length) }}
      </p>

      <p
        v-if="chargement"
        class="text-muted text-center py-5"
      >
        {{ t('commun.chargement') }}
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
        {{ t('recherche_page.aucun_resultat') }}
      </p>
    </div>
  </section>
</template>
