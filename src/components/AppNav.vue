<script setup>
// Barre de navigation, en deux bandes superposées dans une même carte flottante :
//
//   1. la bande principale : logo, liens de navigation, réglage d'affichage et
//      actions de compte (connexion, inscription, déconnexion) ;
//   2. une bande basse entièrement consacrée à la langue.
//
// La langue a sa propre bande parce qu'elle ne se compare à rien d'autre dans la
// barre : quelqu'un qui ne lit pas le français doit la trouver sans avoir à
// interpréter les libellés qui l'entourent. Isolée sous une ligne de séparation
// et précédée d'un pictogramme de globe, elle se repère à sa position et à sa
// forme, pas à son texte. Elle reste aussi hors du menu déroulant : sur
// téléphone, elle ne doit pas dépendre de l'ouverture d'un burger.
//
// Les liens et boutons affichés dépendent de l'état de connexion et du rôle de
// l'utilisateur (useAuth), pas de props : le composant se branche directement
// sur le store d'auth global. Le menu marketing (Services, Pour qui...) n'a de
// sens que pour un visiteur pas encore connecté : une fois connecté (quel que
// soit le rôle), il est remplacé par un menu réduit à l'essentiel avec
// pictogrammes.
//
// Le menu déroulant mobile est piloté par Vue (et non par les data-bs-* de
// Bootstrap) : le JS de Bootstrap ne sait pas qu'on a changé de page dans une
// application à page unique, donc le panneau restait ouvert par-dessus la page
// d'arrivée après chaque clic sur un lien. En le gérant ici, on peut le refermer
// sur changement de route, à la touche Échap et au clic en dehors.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuth } from '../stores/auth'
import SelecteurLangue from './SelecteurLangue.vue'
import { useAccessibility } from '../stores/accessibility'
import IconBadge from './IconBadge.vue'
// Logo fourni par l'utilisateur (rond teal, cœur + sourire) : remplace l'icône
// coeur codée en SVG à la main, réutilisée aussi comme favicon (voir index.html).
import logo from '../assets/logo.png'
import '../styles/AppNav.css'

const { user, isAdmin, logout } = useAuth()
const { state: accessibilite, toggle: toggleAccessibilite } = useAccessibility()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

// Élément racine : sert à détecter les clics faits *en dehors* de la barre, et à
// mesurer la hauteur réelle de la barre (voir plus bas).
const barre = ref(null)
const menuOuvert = ref(false)
// Vrai dès que la page a défilé de quelques pixels. La barre flotte au-dessus du
// contenu (position: fixed) et, par-dessus la photo du hero, son fond très
// translucide laissait passer assez d'image pour gêner la lecture des liens.
// Une fois la page défilée, elle se densifie (voir AppNav.css).
const estDefile = ref(false)

function fermerMenu() {
  menuOuvert.value = false
}

function surDefilement() {
  estDefile.value = window.scrollY > 8
}

// Hauteur de la barre publiée en variable CSS, et non figée en dur : la barre
// étant en position: fixed, App.vue doit réserver l'espace correspondant en haut
// du contenu. Cette hauteur varie maintenant avec la seconde bande, avec le mode
// confort (tout grossit) et avec le repli du titre sur deux lignes en 320px de
// large ; une valeur codée en dur laissait, selon les cas, un grand vide ou un
// titre de page passant sous la barre.
let observateur = null

function mesurerHauteur() {
  // Menu ouvert : la barre s'allonge du panneau déroulant, qui recouvre la page
  // au lieu de la décaler. On garde donc la dernière hauteur "repliée", sinon le
  // contenu ferait un bond à chaque ouverture du menu.
  if (menuOuvert.value || !barre.value) return
  const hauteur = barre.value.getBoundingClientRect().height
  document.documentElement.style.setProperty('--hauteur-nav', `${Math.round(hauteur)}px`)
}

// Échap referme le menu et redonne le focus au bouton qui l'a ouvert : sans ça,
// quelqu'un qui navigue au clavier n'a d'autre issue que de retraverser tous les
// liens du panneau.
function surTouche(evenement) {
  if (evenement.key !== 'Escape' || !menuOuvert.value) return
  fermerMenu()
  barre.value?.querySelector('.navbar-toggler')?.focus()
}

// Clic en dehors de la barre : referme le menu, comme le ferait n'importe quel
// panneau déroulant. L'écoute est posée sur le document car le clic peut
// atterrir n'importe où dans la page.
function surClicDocument(evenement) {
  if (!menuOuvert.value) return
  if (barre.value?.contains(evenement.target)) return
  fermerMenu()
}

onMounted(() => {
  surDefilement()
  mesurerHauteur()
  window.addEventListener('scroll', surDefilement, { passive: true })
  document.addEventListener('keydown', surTouche)
  document.addEventListener('click', surClicDocument)
  // ResizeObserver plutôt qu'un simple écouteur de redimensionnement de fenêtre :
  // la barre change aussi de hauteur sans que la fenêtre bouge (mode confort
  // activé, libellés plus longs après un changement de langue).
  observateur = new ResizeObserver(mesurerHauteur)
  observateur.observe(barre.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', surDefilement)
  document.removeEventListener('keydown', surTouche)
  document.removeEventListener('click', surClicDocument)
  observateur?.disconnect()
})

// Changement de page = menu refermé. C'est le cas que le JS de Bootstrap ne
// couvrait pas. On surveille l'URL complète plutôt que le nom de route, pour
// couvrir aussi un changement de paramètre sur une même route.
watch(() => route.fullPath, fermerMenu)

// À la fermeture du menu, la barre reprend sa hauteur repliée : c'est le moment
// de la remesurer, la mesure ayant été ignorée pendant toute l'ouverture.
watch(menuOuvert, (ouvert) => {
  if (!ouvert) mesurerHauteur()
})

// Affiche "Prénom N." plutôt que le rôle (senior/santé/particulier) dans la
// navbar : plus personnel, et le rôle est de toute façon déjà visible ailleurs
// (page Profil). "nom" est saisi comme un nom complet en un seul champ à
// l'inscription (voir Inscription.vue) : on ne garde que le 1er mot comme
// prénom et l'initiale du dernier mot comme nom, sans supposer qu'il y a
// forcément 2 mots (un seul mot renseigné reste affiché tel quel).
function nomAffiche(nom) {
  if (!nom) return ''
  const mots = nom.trim().split(/\s+/)
  if (mots.length === 1) return mots[0]
  return `${mots[0]} ${mots[mots.length - 1][0]}.`
}

function handleLogout() {
  fermerMenu()
  logout()
  router.push('/')
}
</script>

<template>
  <!-- Lien d'évitement : première cible au clavier sur chaque page, il permet de
       sauter la navigation pour atteindre directement le contenu. Invisible tant
       qu'il n'a pas le focus (voir AppNav.css). La cible #contenu est posée sur
       le <main> de App.vue. -->
  <a
    href="#contenu"
    class="lien-evitement"
  >{{ t('nav.aller_contenu') }}</a>

  <header
    ref="barre"
    class="app-nav"
    :class="{ 'app-nav-defile': estDefile, 'app-nav-ouvert': menuOuvert }"
  >
    <!-- ================= Bande 1 : navigation et compte ================= -->
    <div class="nav-bande nav-bande-principale navbar navbar-expand-lg">
      <div class="container">
        <router-link
          to="/"
          class="navbar-brand"
        >
          <img
            :src="logo"
            alt=""
            class="brand-logo"
          >
          <span class="brand-text">Dispositif d’accompagnement</span>
        </router-link>

        <!-- Bouton "burger" mobile : ouvre/ferme #navMain. Le libellé accessible
             change avec l'état, pour qu'un lecteur d'écran annonce l'action à
             venir et non un intitulé figé. -->
        <button
          class="navbar-toggler"
          type="button"
          aria-controls="navMain"
          :aria-expanded="menuOuvert"
          :aria-label="menuOuvert ? t('nav.fermer_menu') : t('nav.ouvrir_menu')"
          @click="menuOuvert = !menuOuvert"
        >
          <span class="navbar-toggler-icon" />
        </button>

        <div
          id="navMain"
          class="collapse navbar-collapse"
          :class="{ show: menuOuvert }"
        >
          <!-- Menu réduit pour toute personne connectée (hors admin) : Mon compte,
               plus Recherche pour une personne âgée (seul rôle qui utilise cette
               page). L'admin a son propre espace (sidebar dédiée), donc ces liens
               ne lui servent à rien ici. "Accueil" n'est pas listé : le logo de la
               navbar (cliquable, voir plus haut) fait déjà ce lien. -->
          <ul
            v-if="user && !isAdmin"
            class="navbar-nav me-auto"
          >
            <li
              v-if="user.role === 'senior'"
              class="nav-item"
            >
              <router-link
                to="/recherche"
                class="nav-link"
              >
                <IconBadge
                  name="search"
                  compact
                />{{ t('nav.trouver_aide') }}
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/mon-compte"
                class="nav-link"
              >
                <IconBadge
                  name="profile"
                  compact
                />{{ t('nav.mon_compte') }}
              </router-link>
            </li>
          </ul>

          <!-- Menu complet (présentation du dispositif), uniquement pour un visiteur
               pas encore connecté. "Accueil" retiré ici aussi : le logo cliquable
               de la navbar y mène déjà. -->
          <ul
            v-else-if="!user"
            class="navbar-nav me-auto"
          >
            <li class="nav-item">
              <router-link
                to="/pourquoi"
                class="nav-link"
              >
                {{ t('nav.pourquoi') }}
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/services"
                class="nav-link"
              >
                {{ t('nav.services') }}
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/pour-qui"
                class="nav-link"
              >
                {{ t('nav.pour_qui') }}
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/atouts"
                class="nav-link"
              >
                {{ t('nav.engagements') }}
              </router-link>
            </li>
          </ul>

          <div class="nav-actions">
            <!-- Mode confort : texte et boutons agrandis dans tout le site (voir
                 index.css). -->
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm confort-toggle"
              :title="t('nav.confort_titre')"
              :aria-pressed="accessibilite.actif"
              @click="toggleAccessibilite"
            >
              <span aria-hidden="true">Aa</span>
              <span class="visually-hidden-focusable"> {{ t('nav.confort') }}</span>
            </button>

            <!-- Séparateur : marque la frontière entre le réglage d'affichage
                 ci-dessus et les actions de compte ci-dessous, qui se confondaient
                 une fois alignés (même taille, même contour). -->
            <span
              class="nav-separateur"
              aria-hidden="true"
            />

            <!-- Visiteur : "S'inscrire" est l'action principale du site, donc en
                 bouton plein, avec Connexion en second plan à côté. -->
            <template v-if="!user">
              <router-link
                to="/connexion"
                class="btn btn-outline-secondary btn-sm"
              >
                {{ t('nav.connexion') }}
              </router-link>
              <router-link
                to="/inscription"
                class="btn btn-primary btn-sm"
              >
                {{ t('nav.inscription') }}
              </router-link>
            </template>

            <template v-else>
              <router-link
                v-if="isAdmin"
                to="/admin"
                class="btn btn-outline-secondary btn-sm"
              >
                {{ t('nav.admin') }}
              </router-link>
              <span
                v-else
                class="badge text-bg-light border badge-role"
              >{{ nomAffiche(user.nom) }}</span>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="handleLogout"
              >
                {{ t('nav.deconnexion') }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== Bande 2 : la langue ======================= -->
    <!-- Volontairement en dehors de #navMain : sur téléphone, la langue doit
         rester visible sans ouvrir le menu burger. C'est le premier réglage dont
         a besoin quelqu'un qui ne lit pas le français, et il ne peut pas deviner
         qu'il se cache derrière un bouton dont le libellé est en français. -->
    <div class="nav-bande nav-bande-langues">
      <div class="container nav-langues">
        <!-- Globe : repère non textuel de ce à quoi sert la bande. Décoratif pour
             les lecteurs d'écran (aria-hidden), le groupe de boutons portant déjà
             son propre libellé (voir SelecteurLangue.vue). -->
        <svg
          class="nav-langues-globe"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.7 2.5 15.3 0 18-2.5-2.7-2.5-15.3 0-18Z" />
        </svg>
        <SelecteurLangue />
      </div>
    </div>
  </header>
</template>
