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
  // Confirmation par email activée (voir Authentication > Providers > Email
  // sur Supabase) : Supabase bloque la connexion tant que le lien reçu par
  // mail n'a pas été cliqué.
  if (/email not confirmed/i.test(brut)) {
    return 'Merci de confirmer votre adresse email avant de vous connecter : vérifiez votre boîte mail (et vos spams).'
  }
  return brut || 'Une erreur est survenue, merci de réessayer.'
}

// Même principe pour les erreurs Postgres/PostgREST (table "profiles") : elles
// sont bien plus rares à remonter jusqu'à l'utilisateur (la RLS les bloque
// normalement avant), mais autant ne jamais lui montrer du texte technique.
// Exportée (contrairement à messageErreurAuth) : réutilisée par
// updateCompteAdmin() dans data/store.js, seul autre endroit qui écrit dans
// "profiles" en dehors de ce fichier.
export function messageErreurProfil(error) {
  const brut = error?.message || ''
  // Contrainte profiles_telephone_unique (voir supabase/schema.sql) : message
  // spécifique, plus juste que le générique "Ce compte existe déjà" ci-dessous
  // (le compte lui-même n'existe pas forcément déjà, c'est le numéro qui est pris).
  if (/profiles_telephone_unique/i.test(brut)) {
    return 'Ce numéro de téléphone est déjà utilisé par un autre compte.'
  }
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
    // PGRST116 = aucune ligne trouvée. Arrive quand la confirmation par email
    // est activée : signup() n'a pas pu créer le profil tout de suite (pas de
    // session à ce moment-là, donc RLS refuse l'insert) et l'a laissé en
    // attente dans les métadonnées du compte Auth (voir signup ci-dessous).
    // On le crée maintenant, à cette toute première connexion réussie.
    if (error.code === 'PGRST116') {
      const cree = await creerProfilDepuisMetadata(authUser)
      if (cree) return
    }
    console.error('Impossible de charger le profil :', error.message)
    state.user = null
    return
  }
  state.user = { ...data, email: authUser.email }
}

async function creerProfilDepuisMetadata(authUser) {
  const meta = authUser.user_metadata || {}
  // Pas de "role" dans les métadonnées : ce n'est pas un compte issu de notre
  // formulaire d'inscription (ou déjà traité) ; rien à recréer automatiquement.
  if (!meta.role) return false

  const { error } = await supabase.from('profiles').insert({
    id: authUser.id,
    nom: meta.nom || '',
    telephone: meta.telephone || '',
    ville: meta.ville || '',
    adresse: meta.adresse || '',
    role: meta.role,
    specialite: meta.specialite || '',
    services: meta.services || [],
    bio: meta.bio || '',
    disponibilites: meta.disponibilites || [],
  })
  if (error) {
    console.error('Impossible de créer le profil après confirmation :', error.message)
    return false
  }
  await chargerProfil(authUser)
  return true
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

  // Les infos du formulaire partent aussi dans les métadonnées du compte Auth
  // (raw_user_meta_data), pas seulement dans l'insert "profiles" plus bas :
  // avec la confirmation par email activée, on n'a pas encore de session ici
  // pour créer la ligne "profiles" (RLS l'interdirait), donc ces métadonnées
  // servent à la recréer automatiquement à la première connexion réussie, une
  // fois l'email confirmé (voir creerProfilDepuisMetadata ci-dessus).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom, telephone, ville, adresse, role, specialite, services, bio, disponibilites } },
  })
  if (error) throw new Error(messageErreurAuth(error))

  if (!data.session) {
    // Confirmation par email activée : Supabase renvoie bien "data.user" (mais
    // sans session tant que le lien reçu par mail n'est pas cliqué) — vérifier
    // data.session plutôt que data.user est ce qui distingue vraiment ce cas.
    throw new Error(
      "Compte créé : un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien qu'il contient, puis connectez-vous.",
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
