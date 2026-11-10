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
  console.error('Erreur API :', error?.name || 'Erreur')
  res.status(500).json({ message: 'Une erreur serveur est survenue.' })
}
