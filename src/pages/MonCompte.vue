<script setup>
// Page "Mon compte" (/mon-compte) : hub qui regroupe les liens vers l'espace
// personnel (profil, demandes, accompagnements, historique). Uniquement les
// sections effectivement construites : pas de lien vers "Notifications" ou
// "Inviter ma famille" tant que ces fonctionnalités n'existent pas côté
// données, pour ne jamais mener vers une page vide.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import { FORMULES } from '../data/store'
import IconBadge from '../components/IconBadge.vue'
import '../styles/MonCompte.css'

const { t } = useI18n()
const { user, logout } = useAuth()
const router = useRouter()

// Formule active de l'utilisateur (choisie sur /formule/:id, voir PaiementFormule.vue),
// pour l'afficher ici plutôt que de la laisser invisible une fois l'abonnement souscrit.
const formuleActive = computed(() => FORMULES.find((f) => f.id === user.value?.abonnement?.formuleId))

// Tuiles adaptées au rôle : le texte (et pour le senior, la tuile "Trouver de
// l'aide" en plus) change selon qui consulte, pour que chacun retrouve tout de
// suite les actions qui le concernent plutôt qu'un intitulé générique flou.
const LIENS = computed(() => {
  if (user.value?.role === 'senior') {
    return [
      { to: '/recherche', icon: 'search', titre: t('mon_compte_page.senior_recherche_titre'), texte: t('mon_compte_page.senior_recherche_texte') },
      { to: '/profil', icon: 'profile', titre: t('mon_compte_page.profil_titre'), texte: t('mon_compte_page.profil_texte_senior') },
      { to: '/mes-demandes', icon: 'connect', titre: t('mon_compte_page.demandes_titre_senior'), texte: t('mon_compte_page.demandes_texte_senior') },
      { to: '/mes-accompagnements', icon: 'calendar', titre: t('mon_compte_page.accompagnements_titre_senior'), texte: t('mon_compte_page.accompagnements_texte_senior') },
      { to: '/historique', icon: 'shield-check', titre: t('mon_compte_page.historique_titre'), texte: t('mon_compte_page.historique_texte') },
    ]
  }
  // Personnel de santé / particulier : ce sont eux qui reçoivent les demandes
  // et proposent des créneaux, d'où des intitulés tournés vers l'offre d'aide.
  return [
    { to: '/profil', icon: 'profile', titre: t('mon_compte_page.profil_titre'), texte: t('mon_compte_page.profil_texte_aidant') },
    { to: '/mes-demandes', icon: 'connect', titre: t('mon_compte_page.demandes_titre_aidant'), texte: t('mon_compte_page.demandes_texte_aidant') },
    { to: '/mes-accompagnements', icon: 'calendar', titre: t('mon_compte_page.accompagnements_titre_aidant'), texte: t('mon_compte_page.accompagnements_texte_aidant') },
    { to: '/historique', icon: 'shield-check', titre: t('mon_compte_page.historique_titre'), texte: t('mon_compte_page.historique_texte') },
  ]
})

async function seDeconnecter() {
  await logout()
  router.push('/')
}
</script>

<template>
  <section class="mon-compte-page">
    <div class="container">
      <div class="d-flex align-items-center gap-2 mb-4">
        <h1 class="h3 mb-0">
          {{ t('mon_compte_page.titre') }}
        </h1>
        <span class="text-muted">— {{ user?.nom || user?.email }}</span>
      </div>

      <!-- Les formules d'accompagnement sont réservées aux personnes âgées
           (voir FormulesSection.vue) : pas la peine d'en parler à un aidant. -->
      <div
        v-if="user?.role === 'senior'"
        class="card p-3 mb-4 d-flex flex-row align-items-center justify-content-between flex-wrap gap-2 abonnement-statut"
      >
        <span v-if="formuleActive">
          {{ t('mon_compte_page.formule_active') }} <strong>{{ formuleActive.nom }}</strong>
          <span class="text-muted">
            ({{ formuleActive.prix === 0 ? t('mon_compte_page.gratuite') : t('mon_compte_page.prix_mois', { prix: formuleActive.prix }) }})
          </span>
        </span>
        <span
          v-else
          class="text-muted"
        >
          {{ t('mon_compte_page.aucun_abonnement') }}
        </span>
        <router-link
          to="/#nos-formules"
          class="btn btn-outline-secondary btn-sm"
        >
          {{ formuleActive ? t('mon_compte_page.changer_formule') : t('mon_compte_page.voir_formules') }}
        </router-link>
      </div>

      <div class="row g-4">
        <div
          v-for="lien in LIENS"
          :key="lien.to"
          class="col-sm-6 col-lg-3"
        >
          <router-link
            :to="lien.to"
            class="card p-4 h-100 compte-tile"
          >
            <IconBadge :name="lien.icon" />
            <h2 class="h6 mb-1">
              {{ lien.titre }}
            </h2>
            <p class="text-muted small mb-0">
              {{ lien.texte }}
            </p>
          </router-link>
        </div>
      </div>

      <button
        type="button"
        class="btn btn-outline-secondary mt-4"
        @click="seDeconnecter"
      >
        {{ t('nav.deconnexion') }}
      </button>
    </div>
  </section>
</template>
