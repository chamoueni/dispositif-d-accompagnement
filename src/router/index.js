import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth'

// Chaque page est chargée en lazy (import dynamique) : Vite génère un chunk JS
// séparé par page, chargé uniquement quand on visite la route correspondante.
const routes = [
  {
    path: '/',
    name: 'accueil',
    component: () => import('../pages/Accueil.vue'),
  },
  // Pages de présentation publiques (accessibles sans être connecté).
  {
    path: '/pourquoi',
    name: 'pourquoi',
    component: () => import('../pages/Pourquoi.vue'),
  },
  {
    path: '/services',
    name: 'services',
    component: () => import('../pages/Services.vue'),
  },
  {
    path: '/pour-qui',
    name: 'pour-qui',
    component: () => import('../pages/PourQui.vue'),
  },
  {
    path: '/comment-ca-marche',
    name: 'comment-ca-marche',
    component: () => import('../pages/CommentCaMarche.vue'),
  },
  // Questionnaire "Je cherche de l'aide" en 4 étapes, public (pas de connexion
  // requise pour explorer les résultats ; envoyer une demande nécessite un
  // compte, déjà géré par la garde requiresAuth de /nouvelle-demande).
  {
    path: '/assistant',
    name: 'assistant',
    component: () => import('../pages/AssistantBesoin.vue'),
  },
  {
    path: '/atouts',
    name: 'atouts',
    component: () => import('../pages/Atouts.vue'),
  },
  // guestOnly : réservé aux visiteurs non connectés (redirige vers /profil sinon).
  {
    path: '/inscription',
    name: 'inscription',
    component: () => import('../pages/Inscription.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/connexion',
    name: 'connexion',
    component: () => import('../pages/Connexion.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/mot-de-passe-oublie',
    name: 'mot-de-passe-oublie',
    component: () => import('../pages/MotDePasseOublie.vue'),
    meta: { guestOnly: true },
  },
  // Pas de guestOnly/requiresAuth ici : la page gère elle-même la validité de
  // la session de récupération (voir le composant), la garde globale ne doit
  // pas trancher avant que cette session ne soit établie.
  {
    path: '/reinitialiser-mot-de-passe',
    name: 'reinitialiser-mot-de-passe',
    component: () => import('../pages/ReinitialiserMotDePasse.vue'),
  },
  // requiresAuth : redirige vers /connexion si personne n'est connecté.
  {
    path: '/profil',
    name: 'profil',
    component: () => import('../pages/Profil.vue'),
    meta: { requiresAuth: true },
  },
  // Espace personnel : hub "Mon compte" + ses sous-pages (demandes, missions
  // en cours, historique). Toutes réservées aux utilisateurs connectés.
  {
    path: '/mon-compte',
    name: 'mon-compte',
    component: () => import('../pages/MonCompte.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mes-demandes',
    name: 'mes-demandes',
    component: () => import('../pages/MesDemandes.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mes-accompagnements',
    name: 'mes-accompagnements',
    component: () => import('../pages/MesAccompagnements.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/historique',
    name: 'historique',
    component: () => import('../pages/Historique.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/recherche',
    name: 'recherche',
    component: () => import('../pages/RecherchePersonnel.vue'),
    meta: { requiresAuth: true },
  },
  // :aidantId identifie le prestataire ciblé (id récupéré via useRoute() dans la page).
  {
    path: '/nouvelle-demande/:aidantId',
    name: 'nouvelle-demande',
    component: () => import('../pages/NouvelleDemande.vue'),
    meta: { requiresAuth: true },
  },
  // :formuleId correspond à un id de FORMULES (voir data/store.js).
  {
    path: '/formule/:formuleId',
    name: 'formule',
    component: () => import('../pages/PaiementFormule.vue'),
    meta: { requiresAuth: true },
  },
  // Espace admin : page de connexion dédiée (pas de guestOnly ici, la page
  // gère elle-même la redirection si un admin est déjà connecté), puis le
  // tableau de bord réservé au compte admin (voir isAdmin dans stores/auth.js).
  {
    path: '/admin/connexion',
    name: 'admin-connexion',
    component: () => import('../pages/AdminLogin.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../pages/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// Supabase restaure la session de façon asynchrone au démarrage : tant que ce
// n'est pas fait, on ne sait pas encore si quelqu'un est connecté. Sans cette
// attente, un utilisateur déjà connecté se ferait rediriger vers /connexion à
// chaque rechargement de page, le temps que la session soit restaurée.
function attendreInitialisation(initialized) {
  if (initialized.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(initialized, (prete) => {
      if (prete) {
        stop()
        resolve()
      }
    })
  })
}

// Garde de navigation globale : applique les règles requiresAuth / guestOnly
// définies sur chaque route avant de laisser passer.
router.beforeEach(async (to) => {
  const { user, isAdmin, initialized } = useAuth()
  await attendreInitialisation(initialized)

  // Cas particulier de /admin : on renvoie vers la connexion admin dédiée,
  // pas vers la connexion "grand public" ni l'accueil.
  if (to.meta.requiresAdmin && (!user.value || !isAdmin.value)) {
    return { name: 'admin-connexion' }
  }
  // On garde la destination visée (ex. /formule/confort) dans l'URL de connexion,
  // pour pouvoir y renvoyer l'utilisateur une fois connecté au lieu de le laisser
  // sur /profil sans lien avec ce qu'il voulait faire (voir Connexion.vue).
  if (to.meta.requiresAuth && !user.value) {
    return { name: 'connexion', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && user.value) {
    return { name: 'profil' }
  }
  return true
})

export default router
