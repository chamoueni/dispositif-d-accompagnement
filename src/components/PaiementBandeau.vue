<script setup>
// Bandeau de réassurance affiché sous "Nos formules". Reste volontairement
// générique (pas de nom de prestataire de paiement, pas de mention de norme
// technique précise comme "certifié PCI-DSS") puisqu'aucun paiement réel n'est
// branché derrière — voir pages/PaiementFormule.vue.
import IconBadge from './IconBadge.vue'
import '../styles/PaiementBandeau.css'

const GARANTIES = [
  { icon: 'shield-check', text: 'Paiement sécurisé' },
  { icon: 'calendar', text: 'Sans engagement' },
  { icon: 'connect', text: 'Annulable à tout moment' },
  { icon: 'phone', text: 'Support réactif' },
]
</script>

<template>
  <div class="paiement-bandeau">
    <div
      v-for="g in GARANTIES"
      :key="g.text"
      class="paiement-item"
    >
      <IconBadge
        :name="g.icon"
        compact
      />
      {{ g.text }}
    </div>
  </div>
</template>
