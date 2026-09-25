<script setup>
// Champ mot de passe avec bouton "Afficher/Masquer" : évite de dupliquer ce
// bouton (état local `visible`) dans chaque formulaire (Connexion, Inscription,
// Profil, Réinitialisation) qui a besoin d'un champ mot de passe.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, required: true },
  autocomplete: { type: String, default: 'current-password' },
  required: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const visible = ref(false)
</script>

<template>
  <div class="input-group">
    <input
      :id="id"
      :type="visible ? 'text' : 'password'"
      class="form-control"
      :autocomplete="autocomplete"
      :required="required"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <button
      type="button"
      class="btn btn-outline-secondary"
      :aria-label="visible ? t('champ_mdp.masquer_aria') : t('champ_mdp.afficher_aria')"
      @click="visible = !visible"
    >
      {{ visible ? t('champ_mdp.masquer') : t('champ_mdp.afficher') }}
    </button>
  </div>
</template>
