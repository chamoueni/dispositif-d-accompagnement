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
    files: ['backend/**/*.js', 'frontend/scripts/**/*.js', 'frontend/vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Les composants de frontend/src/pages sont des vues de route (Accueil, Services...),
    // pas des balises réutilisables dans des templates : la règle multi-mots
    // (pensée pour éviter les collisions avec les éléments HTML natifs) ne
    // s'applique pas à ce cas d'usage, c'est une exception standard Vue Router.
    files: ['frontend/src/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // Pages légales : beaucoup de liens <router-link> au milieu d'une phrase.
    // Écrits sur plusieurs lignes (ce que demande cette règle), ils laissent une
    // espace parasite avant la ponctuation (« légales ) », « cookies . »).
    files: [
      'frontend/src/pages/MentionsLegales.vue',
      'frontend/src/pages/Confidentialite.vue',
      'frontend/src/pages/Cookies.vue',
    ],
    rules: {
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
])
