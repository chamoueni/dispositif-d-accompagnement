// URL du backend Express en production (service Render séparé du site statique
// qui sert le frontend). En dev, le proxy Vite redirige déjà /api vers
// localhost:3001 (voir vite.config.js), donc VITE_API_URL peut rester vide.
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
