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
import { prenomDe } from '../lib/nom'
import { useNouveautesDemandes } from '../composables/useNouveautesDemandes'
import IconBadge from '../components/IconBadge.vue'
// Carte "Ma position" : sa commune, sa position GPS sur demande et les
// aidants autour. Réservée à cette page, donc aux utilisateurs connectés.
import CarteMayotte from '../components/CarteMayotte.vue'
import '../styles/MonCompte.css'

const { t } = useI18n()
const { user, logout } = useAuth()
// Nouveautés sur Mes demandes : pastille sur la tuile correspondante.
const { nombre: nouveautesDemandes } = useNouveautesDemandes()
const texteNouveautes = computed(() => t(
  user.value?.role === 'senior' ? 'mon_compte_page.nouvelles_reponses' : 'mon_compte_page.nouvelles_demandes',
  nouveautesDemandes.value,
))
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

// Salutation personnalisée : "Bonjour Mariama" plutôt qu'un titre générique.
const prenom = computed(() => prenomDe(user.value?.nom) || user.value?.email || '')

// Toutes les tuiles sur une seule ligne sur grand écran (5 pour une personne
// âgée, 4 pour un aidant) : avant, la 5e tuile restait seule sur sa ligne.
const colonnesGrandEcran = computed(() => `row-cols-lg-${LIENS.value.length}`)

async function seDeconnecter() {
  await logout()
  router.push('/')
}
</script>

<template>
  <section class="mon-compte-page">
    <div class="container">
      <div class="mb-4">
        <p class="compte-surtitre mb-1">
          {{ t('mon_compte_page.titre') }}
        </p>
        <h1 class="h3 mb-1">
          {{ t('mon_compte_page.bonjour', { prenom }) }}
        </h1>
        <p class="text-muted mb-0">
          {{ t('mon_compte_page.sous_titre') }}
        </p>
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

      <div
        class="row g-3 row-cols-1 row-cols-sm-2"
        :class="colonnesGrandEcran"
      >
        <div
          v-for="lien in LIENS"
          :key="lien.to"
          class="col"
        >
          <router-link
            :to="lien.to"
            class="card h-100 compte-tile"
            :class="{ 'compte-tile-nouveau': lien.to === '/mes-demandes' && nouveautesDemandes }"
          >
            <span
              v-if="lien.to === '/mes-demandes' && nouveautesDemandes"
              class="pastille-tuile"
            >{{ texteNouveautes }}</span>
            <IconBadge :name="lien.icon" />
            <!-- Titre + texte groupés : sur téléphone, la tuile passe en
                 ligne (icône à gauche, textes à droite), voir MonCompte.css. -->
            <div>
              <h2 class="h6 mb-1">
                {{ lien.titre }}
              </h2>
              <p class="text-muted small mb-0">
                {{ lien.texte }}
              </p>
            </div>
          </router-link>
        </div>
      </div>

      <div class="mt-4">
        <CarteMayotte />
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
