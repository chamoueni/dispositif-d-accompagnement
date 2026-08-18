import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,vue}'],
    extends: [js.configs.recommended, pluginVue.configs['flat/recommended']],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Les composants de src/pages sont des vues de route (Accueil, Services...),
    // pas des balises réutilisables dans des templates : la règle multi-mots
    // (pensée pour éviter les collisions avec les éléments HTML natifs) ne
    // s'applique pas à ce cas d'usage, c'est une exception standard Vue Router.
    files: ['src/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
])
