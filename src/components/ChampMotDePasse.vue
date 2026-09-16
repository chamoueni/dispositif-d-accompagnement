<script setup>
// Champ mot de passe avec bouton "Afficher/Masquer" : évite de dupliquer ce
// bouton (état local `visible`) dans chaque formulaire (Connexion, Inscription,
// Profil, Réinitialisation) qui a besoin d'un champ mot de passe.
import { ref } from 'vue'

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
      :aria-label="visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      @click="visible = !visible"
    >
      {{ visible ? 'Masquer' : 'Afficher' }}
    </button>
  </div>
</template>
