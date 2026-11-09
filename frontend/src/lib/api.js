import { API_BASE_URL } from './apiBase'

export async function apiRequest(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Impossible de joindre le serveur. Vérifiez l’URL de l’API et son autorisation CORS pour ce site.',
        { cause: error },
      )
    }
    throw error
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new Error(data.message || 'La requête a échoué.')
  }
  return data
}
