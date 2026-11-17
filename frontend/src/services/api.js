// Point de passage UNIQUE entre le site et le serveur : tous les appels à
// l'API (fetch('/api/...')) passent par apiRequest().
//
// Le site et l'API sont servis par le même serveur Express (alwaysdata), donc
// à la même adresse. Le site peut être publié dans un sous-dossier
// (ex. moustakim.alwaysdata.net/fil) : PREFIXE ajoute ce sous-dossier
// devant « /api/... ». En développement, PREFIXE est vide et le serveur Vite
// redirige /api vers Express (vite.config.js).
//
// Le jeton de connexion (JWT) n'est PAS manipulé ici : il est rangé par le
// serveur dans un cookie httpOnly, que le navigateur joint tout seul à chaque
// appel (credentials: 'same-origin'). Le JavaScript du site ne peut ni le lire
// ni le voler : c'est volontaire, pour protéger les données de santé (RGPD).

const PREFIXE = import.meta.env.BASE_URL.replace(/\/+$/, '')

export async function apiRequest(chemin, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(PREFIXE + chemin, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Réponses toujours fraîches (comptes, demandes…), jamais un ancien cache.
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion internet.', { cause: error })
    }
    throw error
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    // 401 : la connexion a expiré (jeton périmé ou mot de passe changé
    // ailleurs). stores/auth.js écoute cet événement et déconnecte le site.
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'))
    }
    const erreur = new Error(data.message || 'La requête a échoué.')
    erreur.status = response.status
    throw erreur
  }
  return data
}
