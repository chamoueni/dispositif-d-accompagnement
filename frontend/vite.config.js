import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Le site (Vue) vit dans frontend/, mais deux choses restent à la racine du
// dépôt, volontairement :
// - le fichier .env (partagé avec le serveur backend/) -> envDir ;
// - le dossier dist/ produit par le build -> outDir. Render publie "dist"
//   depuis la racine : le garder là évite de changer ses réglages.
const dossierFrontend = fileURLToPath(new URL('.', import.meta.url))
const racineDepot = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: dossierFrontend,
  envDir: racineDepot,
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
})
