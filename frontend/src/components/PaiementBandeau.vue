<script setup>
// Bandeau de réassurance affiché sous "Nos formules". Reste volontairement
// générique (pas de nom de prestataire de paiement, pas de mention de norme
// technique précise comme "certifié PCI-DSS") puisqu'aucun paiement réel n'est
// branché derrière — voir pages/PaiementFormule.vue.
import { useI18n } from 'vue-i18n'
import IconBadge from './IconBadge.vue'
import '../styles/PaiementBandeau.css'

const { t } = useI18n()

const GARANTIES = [
  { icon: 'shield-check', key: 'paiement_securise' },
  { icon: 'calendar', key: 'sans_engagement' },
  { icon: 'connect', key: 'annulable' },
  { icon: 'phone', key: 'support_reactif' },
]
</script>

<template>
  <div class="paiement-bandeau">
    <div
      v-for="g in GARANTIES"
      :key="g.key"
      class="paiement-item"
    >
      <IconBadge
        :name="g.icon"
        compact
      />
      {{ t(`paiement_bandeau.${g.key}`) }}
    </div>
  </div>
</template>
