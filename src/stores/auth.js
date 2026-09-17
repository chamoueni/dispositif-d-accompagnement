// Authentification réelle via Supabase Auth (email + mot de passe), au lieu du
// mock localStorage précédent. Le profil "métier" (rôle, nom, disponibilités...)
// vit dans la table "profiles" (voir supabase/schema.sql), liée 1-pour-1 à
// auth.users via le même id.
import { computed, reactive, toRefs } from 'vue'
import { supabase } from '../lib/supabaseClient'

// Espace admin (/admin) réservé à ce seul email : pas de rôle "admin" séparé
// dans la base pour l'instant, choix volontairement simple (un seul admin).
const ADMIN_EMAIL = 'moustakimsinina05@gmail.com'

const state = reactive({
  user: null,
  // Tant que initialized est false, on ne sait pas encore s'il y a une session
  // existante à restaurer : le routeur doit attendre avant de rediriger vers
  // /connexion, sinon un utilisateur déjà connecté se ferait éjecter au reload.
  initialized: false,
})

const isAdmin = computed(() => state.user?.email === ADMIN_EMAIL)

// Supabase renvoie ses erreurs en anglais : on traduit les cas courants pour
// rester cohérent avec le reste de l'interface (entièrement en français).
// Message générique en repli plutôt que d'afficher le texte anglais brut pour
// une erreur qu'on n'a pas explicitement prévue.
function messageErreurAuth(error) {
  const brut = error?.message || ''
  if (/user already registered|already been registered/i.test(brut)) {
    return 'Un compte existe déjà avec cet email.'
  }
  if (/invalid login credentials/i.test(brut)) return 'Email ou mot de passe incorrect.'
  if (/unable to validate email|invalid email/i.test(brut)) return 'Adresse email invalide.'
  if (/password.*at least|password.*characters/i.test(brut)) {
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  }
  if (/rate limit/i.test(brut)) return 'Trop de tentatives, merci de réessayer dans quelques minutes.'
  if (/network/i.test(brut)) return 'Impossible de contacter le serveur, vérifiez votre connexion.'
  return brut || 'Une erreur est survenue, merci de réessayer.'
}

// Même principe pour les erreurs Postgres/PostgREST (table "profiles") : elles
// sont bien plus rares à remonter jusqu'à l'utilisateur (la RLS les bloque
// normalement avant), mais autant ne jamais lui montrer du texte technique.
function messageErreurProfil(error) {
  const brut = error?.message || ''
  if (/duplicate key/i.test(brut)) return 'Ce compte existe déjà.'
  if (/network|fetch/i.test(brut)) return 'Impossible de contacter le serveur, vérifiez votre connexion.'
  return 'Impossible de sauvegarder ces informations, merci de réessayer.'
}

// Va chercher la ligne "profiles" correspondant à l'utilisateur Supabase connecté
// et la stocke dans state.user. authUser vient de supabase.auth (id + email).
async function chargerProfil(authUser) {
  if (!authUser) {
    state.user = null
    return
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
  if (error) {
    console.error('Impossible de charger le profil :', error.message)
    state.user = null
    return
  }
  state.user = { ...data, email: authUser.email }
}

// Initialisation au chargement de l'app : restaure la session existante (si
// l'utilisateur était déjà connecté lors d'une visite précédente), puis écoute
// les changements (connexion/déconnexion dans un autre onglet, expiration...).
supabase.auth.getSession().then(async ({ data }) => {
  await chargerProfil(data.session?.user ?? null)
  state.initialized = true
})

supabase.auth.onAuthStateChange((_event, session) => {
  chargerProfil(session?.user ?? null)
})

// Crée le compte Supabase Auth puis la ligne de profil associée.
// payload : { nom, email, password, telephone, ville, adresse, role, specialite, services, bio, disponibilites }
async function signup(payload) {
  const { nom, email, password, telephone, ville, adresse, role, specialite, services, bio, disponibilites } =
    payload

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(messageErreurAuth(error))
  if (!data.user) {
    // Cas où la confirmation par email est activée côté Supabase : pas de
    // session immédiate, donc pas moyen de créer le profil tout de suite.
    throw new Error(
      'Compte créé : vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.',
    )
  }

  const { error: profilError } = await supabase.from('profiles').insert({
    id: data.user.id,
    nom,
    telephone,
    ville,
    adresse,
    role,
    specialite,
    services,
    bio,
    disponibilites,
  })
  if (profilError) throw new Error(messageErreurProfil(profilError))

  await chargerProfil(data.user)
  return state.user
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('Email ou mot de passe incorrect.')
  await chargerProfil(data.user)
  return state.user
}

async function logout() {
  await supabase.auth.signOut()
  state.user = null
}

async function updateProfile(patch) {
  if (!state.user) return
  const { error } = await supabase.from('profiles').update(patch).eq('id', state.user.id)
  if (error) throw new Error(messageErreurProfil(error))
  state.user = { ...state.user, ...patch }
}

// Changement de mot de passe pour un utilisateur déjà connecté (page Profil).
// Supabase exige d'être authentifié pour appeler updateUser() : pas besoin de
// redemander l'ancien mot de passe côté client, la session en cours suffit.
async function changerMotDePasse(nouveauMotDePasse) {
  const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse })
  if (error) throw new Error(messageErreurAuth(error))
}

// Mot de passe oublié (utilisateur déconnecté) : envoie un email avec un lien
// qui ouvre /reinitialiser-mot-de-passe avec une session de récupération.
// Supabase ne révèle jamais si l'email existe ou non (retourne un succès dans
// les deux cas), donc l'appelant peut toujours afficher un message générique.
async function demanderReinitialisationMotDePasse(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
  })
  if (error) throw new Error(messageErreurAuth(error))
}

export function useAuth() {
  // toRefs pour que `const { user } = useAuth()` reste réactif dans les
  // composants, comme avec l'ancien computed().
  return {
    ...toRefs(state),
    isAdmin,
    signup,
    login,
    logout,
    updateProfile,
    changerMotDePasse,
    demanderReinitialisationMotDePasse,
  }
}
