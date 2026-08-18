<script setup>
// Carte résultat affichée dans la page Recherche : identité + service(s) proposé(s)
// + disponibilités + un lien tel: direct pour contacter le prestataire, et le bouton
// "Envoyer une demande" (réservé aux personnes âgées, qui sont les seules à demander).
import { computed } from 'vue'
import { useAuth } from '../stores/auth'
import SpeakButton from './SpeakButton.vue'
import '../styles/ProviderCard.css'

const props = defineProps({
  provider: {
    type: Object,
    required: true,
  },
})

const SERVICE_LABELS = {
  coursier: 'Coursier',
  menage: 'Ménage',
}

const { user } = useAuth()

// Résumé de la fiche pour la synthèse vocale (bouton "Écouter") : reprend les
// mêmes informations que la carte, en phrases plutôt qu'en badges/étiquettes.
const resume = computed(() => {
  const p = props.provider
  const service = p.role === 'sante' ? p.specialite : p.services.map((s) => SERVICE_LABELS[s]).join(', ')
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
        {{ SERVICE_LABELS[s] }}
      </span>
    </div>

    <p class="text-muted small mb-3">
      {{ provider.bio || 'Aucune présentation renseignée.' }}
    </p>

    <div
      v-if="provider.disponibilites.length"
      class="mb-3"
    >
      <p class="fw-semibold small mb-1">
        Disponibilités
      </p>
      <div class="d-flex gap-2 flex-wrap">
        <span
          v-for="slot in provider.disponibilites"
          :key="`${slot.jour}-${slot.heureDebut}-${slot.heureFin}`"
          class="badge text-bg-light border"
        >
          {{ slot.jour }} · {{ slot.heureDebut }}-{{ slot.heureFin }}
        </span>
      </div>
    </div>

    <div class="d-flex gap-2">
      <a
        :href="`tel:${provider.telephone}`"
        class="btn btn-secondary btn-sm flex-fill"
      >
        Appeler
      </a>
      <router-link
        v-if="user && user.role === 'senior'"
        :to="`/nouvelle-demande/${provider.id}`"
        class="btn btn-primary btn-sm flex-fill"
      >
        Envoyer une demande
      </router-link>
    </div>
  </article>
</template>
