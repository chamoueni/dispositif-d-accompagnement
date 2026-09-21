import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Bootstrap recompilé avec nos variables Sass (couleurs, rayons...) plutôt que le CSS par défaut.
import './styles/bootstrap-custom.scss'
// JS de Bootstrap (menu mobile, etc.), nécessaire pour les data-bs-* utilisés dans Nav.vue.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// Design tokens (couleurs, styles de base) partagés par tous les composants.
import './index.css'
import './styles/ui.css'
// Multilingue (francais / shimaore / kibushi), voir src/i18n/index.js.
import { i18n, langueEnregistree } from './i18n'
import App from './App.vue'
import router from './router'

// L'attribut lang de <html> doit refleter la langue choisie des le premier
// rendu : les lecteurs d'ecran s'en servent pour choisir leur prononciation.
document.documentElement.setAttribute('lang', langueEnregistree())

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
