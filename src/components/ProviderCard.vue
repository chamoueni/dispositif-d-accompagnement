<script setup>
// Carte résultat affichée dans la page Recherche : identité + service(s) proposé(s)
// + disponibilités + un lien tel: direct pour contacter le prestataire, et le bouton
// "Envoyer une demande" (réservé aux personnes âgées, qui sont les seules à demander).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import SpeakButton from './SpeakButton.vue'
import '../styles/ProviderCard.css'

const props = defineProps({
  provider: {
    type: Object,
    required: true,
  },
})

// "service" (coursier/menage) est stocké tel quel en base : seul l'affichage
// passe par ces clés, qui reprennent les mêmes libellés que le formulaire de
// demande (demande.service_*).
const SERVICE_KEYS = {
  coursier: 'service_coursier',
  menage: 'service_menage',
}

// "jour" (dans disponibilites) est stocké en français en base (voir Profil.vue) :
// cette table fait juste le lien vers le libellé traduit affiché ici.
const JOUR_KEYS = {
  Lundi: 'lundi',
  Mardi: 'mardi',
  Mercredi: 'mercredi',
  Jeudi: 'jeudi',
  Vendredi: 'vendredi',
  Samedi: 'samedi',
  Dimanche: 'dimanche',
}

const { t, locale } = useI18n()
const { user } = useAuth()

function libelleService(service) {
  const cle = SERVICE_KEYS[service]
  return cle ? t(`demande.${cle}`) : service
}

function libelleJour(jour) {
  const cle = JOUR_KEYS[jour]
  return cle ? t(`jours.${cle}`) : jour
}

// Résumé de la fiche pour la synthèse vocale (bouton "Écouter") : toujours en
// français, quelle que soit la langue affichée (voir i18n/index.js et
// useSpeech.js — la synthèse vocale du navigateur ne parle ni shimaoré ni
// kibushi). "locale" est listé en dépendance uniquement pour recalculer ce
// résumé au changement de langue même si son contenu reste français.
const resume = computed(() => {
  void locale.value
  const p = props.provider
  const service = p.role === 'sante' ? p.specialite : p.services.map((s) => (s === 'coursier' ? 'Coursier' : 'Ménage')).join(', ')
  const dispo = p.disponibilites.length
    ? p.disponibilites.map((s) => `${s.jour} de ${s.heureDebut} à ${s.heureFin}`).join(', ')
    : 'aucune disponibilité renseignée'
  return `${p.nom}, à ${p.ville}. ${service}. ${p.bio || ''} Disponibilités : ${dispo}.`
})
</script>

<template>
  <article class="provider-card card p-4">
    <div class="d-flex justify-content-between align-items-start mb-2">
      <h3 class="h6 mb-0">
        {{ provider.nom }}
      </h3>
      <span class="badge text-bg-light border">{{ provider.ville }}</span>
    </div>

    <SpeakButton
      :text="resume"
      class="mb-2"
    />

    <p
      v-if="provider.role === 'sante'"
      class="badge text-bg-primary mb-2"
    >
      {{ provider.specialite }}
    </p>
    <div
      v-else
      class="mb-2 d-flex gap-2 flex-wrap"
    >
      <span
        v-for="s in provider.services"
        :key="s"
        class="badge text-bg-secondary"
      >
        {{ libelleService(s) }}
      </span>
    </div>

    <p class="text-muted small mb-3">
      {{ provider.bio || t('provider_card.aucune_bio') }}
    </p>

    <div
      v-if="provider.disponibilites.length"
      class="mb-3"
    >
      <p class="fw-semibold small mb-1">
        {{ t('provider_card.disponibilites') }}
      </p>
      <div class="d-flex gap-2 flex-wrap">
        <span
          v-for="slot in provider.disponibilites"
          :key="`${slot.jour}-${slot.heureDebut}-${slot.heureFin}`"
          class="badge text-bg-light border"
        >
          {{ libelleJour(slot.jour) }} · {{ slot.heureDebut }}-{{ slot.heureFin }}
        </span>
      </div>
    </div>

    <div class="d-flex gap-2">
      <a
        :href="`tel:${provider.telephone}`"
        class="btn btn-secondary btn-sm flex-fill"
      >
        {{ t('provider_card.appeler') }}
      </a>
      <router-link
        v-if="user && user.role === 'senior'"
        :to="`/nouvelle-demande/${provider.id}`"
        class="btn btn-primary btn-sm flex-fill"
      >
        {{ t('provider_card.envoyer_demande') }}
      </router-link>
    </div>
  </article>
</template>
