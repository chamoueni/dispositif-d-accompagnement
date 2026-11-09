<script setup>
// Jauge de force affichée sous un champ « mot de passe » (inscription, profil,
// réinitialisation) : une barre colorée et ce qui manque encore, en clair.
// Rien n'est affiché tant que le champ est vide.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { evaluerMotDePasse, MOT_DE_PASSE_MIN } from '../lib/motDePasse'

const props = defineProps({
  motDePasse: { type: String, default: '' },
})

const { t } = useI18n()

const evaluation = computed(() => evaluerMotDePasse(props.motDePasse))

// Largeur de la barre selon le niveau.
const LARGEURS = { faible: 25, moyen: 50, bon: 75, solide: 100 }

const manques = computed(() =>
  evaluation.value.manques.map((m) => t(`mot_de_passe.manque_${m}`, { n: MOT_DE_PASSE_MIN })),
)
</script>

<template>
  <div
    v-if="motDePasse"
    class="jauge-mdp"
    :class="`jauge-mdp-${evaluation.niveau}`"
    aria-live="polite"
  >
    <div class="jauge-mdp-piste">
      <div
        class="jauge-mdp-barre"
        :style="{ width: LARGEURS[evaluation.niveau] + '%' }"
      />
    </div>
    <p class="jauge-mdp-texte">
      <strong>{{ t(`mot_de_passe.niveau_${evaluation.niveau}`) }}</strong>
      <span v-if="manques.length"> — {{ t('mot_de_passe.il_manque') }} {{ manques.join(', ') }}</span>
      <span v-else> ✓</span>
    </p>
  </div>
</template>

<style scoped>
.jauge-mdp {
  margin-top: 8px;
}

.jauge-mdp-piste {
  height: 8px;
  border-radius: 99px;
  background: var(--border);
  overflow: hidden;
}

.jauge-mdp-barre {
  height: 100%;
  border-radius: 99px;
  background: var(--jauge-couleur);
  transition: width 0.25s ease;
}

.jauge-mdp-texte {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--muted);
}

.jauge-mdp-texte strong {
  color: var(--jauge-couleur);
}

/* Couleurs du thème : corail (faible) -> ylang (moyen) -> vert -> turquoise. */
.jauge-mdp-faible { --jauge-couleur: var(--coral-text); }
.jauge-mdp-moyen { --jauge-couleur: var(--ylang-text); }
.jauge-mdp-bon { --jauge-couleur: var(--green); }
.jauge-mdp-solide { --jauge-couleur: var(--teal-text); }

@media (prefers-reduced-motion: reduce) {
  .jauge-mdp-barre {
    transition: none;
  }
}
</style>
