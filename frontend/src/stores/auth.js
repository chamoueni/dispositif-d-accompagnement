// Authentification via l’API Express : les jetons Supabase restent côté serveur.
import { computed, reactive, toRefs } from 'vue'
import { apiRequest } from '../lib/api'

const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'
const state = reactive({ user: null, initialized: false })
const isAdmin = computed(() => state.user?.email === ADMIN_EMAIL)

export function messageErreurProfil(error) {
  const brut = error?.message || ''
  if (/profiles_telephone_unique/i.test(brut)) {
    return 'Ce numéro de téléphone est déjà utilisé par un autre compte.'
  }
  if (/duplicate key/i.test(brut)) return 'Ce compte existe déjà.'
  if (/network|fetch/i.test(brut)) return 'Impossible de contacter le serveur, vérifiez votre connexion.'
  return 'Impossible de sauvegarder ces informations, merci de réessayer.'
}

async function initialiserSession() {
  try {
    const data = await apiRequest('/api/auth/session')
    state.user = data.user
  } catch (error) {
    if (!/authentification requise/i.test(error.message)) {
      console.error('Impossible de restaurer la session.')
    }
    state.user = null
  } finally {
    state.initialized = true
  }
}

initialiserSession()

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    state.user = null
  })
}

async function signup(payload) {
  const data = await apiRequest('/api/auth/register', { method: 'POST', body: payload })
  if (data.confirmationRequired) throw new Error(data.message)
  state.user = data.user
  return state.user
}

async function login(email, password, remember = false) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password, remember },
  })
  state.user = data.user
  return state.user
}

async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST', body: {} })
  } finally {
    state.user = null
  }
}

async function updateProfile(patch) {
  if (!state.user) return
  await apiRequest('/api/data', {
    method: 'POST',
    body: { action: 'profiles.updateOwn', payload: { patch } },
  })
  state.user = { ...state.user, ...patch }
}

async function changerMotDePasse(nouveauMotDePasse) {
  await apiRequest('/api/auth/password', {
    method: 'PUT',
    body: { password: nouveauMotDePasse },
  })
}

async function demanderReinitialisationMotDePasse(email) {
  await apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email } })
}

async function verifierLienReinitialisation(accessToken) {
  await apiRequest('/api/auth/recovery/verify', {
    method: 'POST',
    body: { accessToken },
  })
}

async function reinitialiserMotDePasse(accessToken, password) {
  await apiRequest('/api/auth/recovery', {
    method: 'POST',
    body: { accessToken, password },
  })
}

export function useAuth() {
  return {
    ...toRefs(state),
    isAdmin,
    signup,
    login,
    logout,
    updateProfile,
    changerMotDePasse,
    demanderReinitialisationMotDePasse,
    verifierLienReinitialisation,
    reinitialiserMotDePasse,
  }
}
