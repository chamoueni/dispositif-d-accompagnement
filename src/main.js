import { createApp } from 'vue'
// Bootstrap recompilé avec nos variables Sass (couleurs, rayons...) plutôt que le CSS par défaut.
import './styles/bootstrap-custom.scss'
// JS de Bootstrap (menu mobile, etc.), nécessaire pour les data-bs-* utilisés dans Nav.vue.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// Design tokens (couleurs, styles de base) partagés par tous les composants.
import './index.css'
import './styles/ui.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
