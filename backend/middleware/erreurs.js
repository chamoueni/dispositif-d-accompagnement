// Derniers middlewares de la chaîne (voir app.js).

// Adresse /api/... qui ne correspond à aucune route.
export function routeIntrouvable(_req, res) {
  res.status(404).json({ message: 'Route API introuvable.' })
}

// Erreur inattendue : message général pour le visiteur, sans détail technique
// (ni données personnelles) ; seul le type d'erreur va dans le journal.
// Express reconnaît un gestionnaire d'erreurs à ses quatre paramètres.
export function gestionErreurs(error, _req, res, _next) {
  void _next
  // Fichier du site introuvable (express.static de /assets) : simple 404.
  if (error?.status === 404) return res.status(404).json({ message: 'Fichier introuvable.' })
  // JSON mal formé envoyé par le navigateur : erreur du client, pas du serveur.
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Données invalides.' })
  // Problème de connexion à la base : on note le message (sans donnée
  // personnelle) pour comprendre la panne ; pour les autres erreurs, seulement le type.
  const connexion = /terminated|timeout|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(`${error?.code} ${error?.message}`)
  console.error('Erreur API :', error?.name || 'Erreur', error?.code || '', connexion ? `(${error.message})` : '')
  res.status(500).json({ message: 'Une erreur serveur est survenue.' })
}
