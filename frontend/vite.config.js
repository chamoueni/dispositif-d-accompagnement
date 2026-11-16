import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Le site (Vue) vit dans frontend/, mais deux choses restent à la racine du
// dépôt, volontairement :
// - le fichier .env (partagé avec le serveur backend/) -> envDir ;
// - le dossier dist/ produit par le build -> outDir. Le serveur Express
//   (backend/app.js) sert ce dossier à la racine du dépôt sur alwaysdata.
const dossierFrontend = fileURLToPath(new URL('.', import.meta.url))
const racineDepot = fileURLToPath(new URL('..', import.meta.url))

// Sous-dossier où le site est publié, déduit de son adresse publique
// (VITE_SITE_URL) : https://moustakim.alwaysdata.net/aufildesages donne
// « /aufildesages/ ». Sans sous-dossier (ou en local), « / ». Vite ajoute alors
// ce préfixe à tous les fichiers construits et le donne au code dans
// import.meta.env.BASE_URL (routeur, appels à l'API, fichiers audio…).
function sousDossier(adresse) {
  if (!adresse) return '/'
  const chemin = new URL(adresse).pathname.replace(/\/+$/, '')
  return `${chemin}/`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  root: dossierFrontend,
  envDir: racineDepot,
  // Une valeur passée dans la ligne de commande (build de production) passe
  // avant celle du fichier .env.
  base: sousDossier(process.env.VITE_SITE_URL || loadEnv(mode, racineDepot).VITE_SITE_URL),
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    // outDir est hors de frontend/ : Vite exige cette option pour le vider.
    emptyOutDir: true,
  },
  server: {
    // Les appels /api du frontend sont redirigés vers Express en développement.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
}))
