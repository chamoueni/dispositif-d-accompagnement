<script setup>
// Vignette cartographique posée sur la photo du hero. Repliée elle est
// décorative ; au survol (ou au toucher sur mobile) elle s'agrandit et devient
// une vraie carte manipulable : déplacement, zoom, fond Plan ou Satellite, et
// surtout les aidants inscrits posés sur leur commune.
//
// Les marqueurs ne s'affichent QU'AUX UTILISATEURS CONNECTÉS. Ce n'est pas un
// choix esthétique : la policy RLS "profiles_select_authenticated" réserve la
// lecture des profils aux comptes identifiés — un visiteur anonyme reçoit une
// liste vide, sans erreur. Cela évite au passage d'exposer la localisation des
// inscrits sur une page ouverte à tous.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// ATTENTION À L'ORDRE DES DEUX IMPORTS CI-DESSOUS. leaflet.markercluster est un
// script UMD dont le corps référence un `L` global (L.FeatureGroup.extend...) et
// qui n'exporte rien. Il ne fonctionne que parce que Leaflet, juste au-dessus,
// se publie lui-même sur window.L en fin de module. Les modules ES étant évalués
// dans l'ordre de leurs imports, inverser ces deux lignes (ou les laisser trier
// par un outil de formatage) ferait planter toute la page d'accueil sur un
// "L is not defined".
import 'leaflet.markercluster'
// Uniquement la feuille de positionnement/animation du plugin : sa feuille
// "Default" impose des pastilles bleues, or les regroupements doivent être
// verts (voir .cluster-aidants dans CarteMayotte.css).
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { getUsers, getCoordonneesCommune } from '../data/store.js'
import { useAuth } from '../stores/auth'
import '../styles/CarteMayotte.css'

// Mayotte entière tient dans ce cadrage.
const CENTRE = [-12.8275, 45.1662]
const ZOOM = 10

// Mêmes besoins que la page Recherche (voir pages/RecherchePersonnel.vue) : un
// visiteur qui filtre ici et poursuit sur /recherche retrouve les mêmes
// catégories, sans avoir à retraduire ce qu'il cherche.
const BESOINS = [
  { valeur: 'tous', label: 'Tous' },
  { valeur: 'sante', label: 'Santé' },
  { valeur: 'coursier', label: 'Coursier' },
  { valeur: 'menage', label: 'Ménage' },
]

// Fonds de carte IGN (Géoplateforme, accès libre sans clé). Le satellite tient
// lieu de "vue Google Maps" : les tuiles Google ne peuvent pas être utilisées
// ici, elles exigent une clé facturée et leurs conditions interdisent de les
// servir en dehors du SDK Google.
const MODELE_IGN =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER={couche}&STYLE=normal&TILEMATRIXSET=PM' +
  '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT={format}'

const ATTRIBUTION = '© <a href="https://www.ign.fr/">IGN</a> — Géoplateforme'

const { user, initialized } = useAuth()

const conteneur = ref(null)
const zoneCarte = ref(null)
const estOuverte = ref(false)
const besoin = ref('tous')
const nombreAffiche = ref(0)

let carte = null
let regroupements = null
let observateurTaille = null
let aidants = []

// Commandes coupées tant que la vignette est repliée : sans ça, un clic-glissé
// sur une carte de 210px gênerait plus qu'il n'aiderait.
const COMMANDES = ['dragging', 'doubleClickZoom', 'touchZoom', 'boxZoom', 'keyboard']

// Un écran tactile n'a pas de survol : matchMedia répond pour le pointeur
// principal de l'appareil, et décide donc quel geste ouvre la carte.
const peutSurvoler = () => window.matchMedia('(hover: hover)').matches

function definirCommandes(actives) {
  if (!carte) return
  COMMANDES.forEach((nom) => carte[nom] && carte[nom][actives ? 'enable' : 'disable']())
}

function ouvrir() {
  if (estOuverte.value) return
  estOuverte.value = true
  definirCommandes(true)
}

function fermer() {
  if (!estOuverte.value) return
  estOuverte.value = false
  definirCommandes(false)
  // Retour au cadrage d'origine : après un zoom, la vignette repartirait sinon
  // sur un coin d'île sans repère.
  carte?.setView(CENTRE, ZOOM)
}

function surEntreeSouris() {
  if (peutSurvoler()) ouvrir()
}

function surSortieSouris() {
  if (peutSurvoler()) fermer()
}

// Tactile : le toucher ouvre. La fermeture passe par le toucher à l'extérieur
// (voir surPointeurDocument), sinon manipuler la carte la refermerait aussitôt.
function surClic() {
  if (!peutSurvoler()) ouvrir()
}

function surPointeurDocument(evenement) {
  if (!estOuverte.value || peutSurvoler()) return
  if (conteneur.value?.contains(evenement.target)) return
  fermer()
}

function surSortieFocus(evenement) {
  if (!conteneur.value?.contains(evenement.relatedTarget)) fermer()
}

// invalidateSize() à la fin de l'agrandissement : Leaflet a mémorisé la taille
// de la vignette et ne dessine de tuiles que sur cette surface tant qu'on ne
// lui signale pas le changement. On filtre sur "width" car `transition: all`
// déclenche l'évènement une fois par propriété animée.
function surFinTransition(evenement) {
  if (evenement.propertyName !== 'width') return
  carte?.invalidateSize()
}

// Marqueur maison rose foncé : un divIcon (HTML) plutôt qu'une image, pour que
// la couleur reste pilotable en CSS et que le dessin reste net en haute densité.
function iconeMaison() {
  return L.divIcon({
    className: 'marqueur-aidant',
    html: [
      '<svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true">',
      '<path d="M17 0C7.6 0 0 7.6 0 17c0 12.4 17 27 17 27s17-14.6 17-27C34 7.6 26.4 0 17 0Z" class="marqueur-goutte"/>',
      '<path d="M17 8.5 26 16.5h-2.4V26h-13.2v-9.5H8Z" class="marqueur-toit"/>',
      '<rect x="15" y="20" width="4" height="6" class="marqueur-porte"/>',
      '</svg>',
    ].join(''),
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -38],
  })
}

// Pastille verte numérotée quand plusieurs aidants se touchent. Comme tous les
// aidants d'une même commune partagent le point du chef-lieu, ce chiffre se lit
// naturellement comme "nombre d'aidants dans cette commune".
function iconeRegroupement(groupe) {
  return L.divIcon({
    className: 'cluster-aidants',
    html: '<span>' + groupe.getChildCount() + '</span>',
    iconSize: [42, 42],
  })
}

// Même logique de filtrage que la page Recherche : "sante" porte sur le rôle,
// "coursier"/"menage" sur le service coché par un particulier dans son profil.
function correspondAuBesoin(aidant) {
  if (besoin.value === 'sante') return aidant.role === 'sante'
  if (besoin.value === 'tous') return true
  return aidant.role === 'particulier' && (aidant.services || []).includes(besoin.value)
}

function libelleAidant(aidant) {
  if (aidant.role === 'sante') return aidant.specialite || 'Personnel de santé'
  const services = (aidant.services || [])
    .map((s) => (s === 'coursier' ? 'Coursier' : s === 'menage' ? 'Ménage' : s))
    .join(' · ')
  return services || 'Particulier'
}

function dessinerMarqueurs() {
  if (!regroupements) return
  regroupements.clearLayers()

  let poses = 0
  aidants.filter(correspondAuBesoin).forEach((aidant) => {
    const point = getCoordonneesCommune(aidant.ville)
    // Un profil sans commune connue n'est pas plaçable : on le laisse de côté
    // plutôt que de l'inventer au centre de l'île.
    if (!point) return

    L.marker([point.lat, point.lng], {
      icon: iconeMaison(),
      alt: libelleAidant(aidant) + ' — ' + aidant.ville,
    })
      .bindPopup(
        [
          '<p class="popup-nom">' + (aidant.nom || 'Aidant inscrit') + '</p>',
          '<p class="popup-service">' + libelleAidant(aidant) + '</p>',
          '<p class="popup-commune">' + aidant.ville + '</p>',
        ].join(''),
      )
      .addTo(regroupements)
    poses += 1
  })

  nombreAffiche.value = poses
}

// Charge les aidants dès qu'une session existe, et vide la carte à la
// déconnexion. immediate: true couvre le cas d'une session déjà restaurée avant
// le montage de ce composant.
watch(
  user,
  async (compte) => {
    if (!compte) {
      aidants = []
      dessinerMarqueurs()
      return
    }
    const profils = await getUsers()
    aidants = profils.filter((u) => u.role === 'sante' || u.role === 'particulier')
    dessinerMarqueurs()
  },
  { immediate: true },
)

watch(besoin, dessinerMarqueurs)

onMounted(() => {
  carte = L.map(zoneCarte.value, {
    center: CENTRE,
    zoom: ZOOM,
    minZoom: 9,
    maxZoom: 18,
    dragging: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    // Jamais réactivé, même carte ouverte : sur une carte posée au milieu d'une
    // page, le zoom molette détourne le défilement. Les boutons +/- suffisent.
    scrollWheelZoom: false,
  })

  const plan = L.tileLayer(
    MODELE_IGN.replace('{couche}', 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2').replace('{format}', 'image/png'),
    { attribution: ATTRIBUTION, minZoom: 9, maxZoom: 18 },
  ).addTo(carte)

  const satellite = L.tileLayer(
    MODELE_IGN.replace('{couche}', 'ORTHOIMAGERY.ORTHOPHOTOS').replace('{format}', 'image/jpeg'),
    { attribution: ATTRIBUTION, minZoom: 9, maxZoom: 18 },
  )

  L.control.layers({ Plan: plan, Satellite: satellite }, null, { position: 'topright' }).addTo(carte)

  regroupements = L.markerClusterGroup({
    iconCreateFunction: iconeRegroupement,
    showCoverageOnHover: false,
    maxClusterRadius: 45,
  })
  regroupements.addTo(carte)

  // Leaflet ne mesure son conteneur qu'à la création et ne dessine de tuiles que
  // sur la surface mesurée. Toute variation ultérieure — agrandissement au
  // survol, chargement différé de la feuille de styles, redimensionnement de la
  // fenêtre, mode confort — laisse sinon une bande vide à côté de la carte.
  // Le rAF évite l'avertissement "ResizeObserver loop" que provoque une
  // modification synchrone du layout depuis le callback.
  observateurTaille = new ResizeObserver(() => {
    requestAnimationFrame(() => carte?.invalidateSize())
  })
  observateurTaille.observe(zoneCarte.value)

  dessinerMarqueurs()
  document.addEventListener('pointerdown', surPointeurDocument)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', surPointeurDocument)
  observateurTaille?.disconnect()
  observateurTaille = null
  carte?.remove()
  carte = null
  regroupements = null
})
</script>

<template>
  <div
    ref="conteneur"
    class="carte-mayotte"
    :class="{ 'est-ouverte': estOuverte }"
    role="button"
    tabindex="0"
    :aria-expanded="estOuverte"
    aria-label="Carte des aidants à Mayotte : agrandir pour l'explorer"
    @mouseenter="surEntreeSouris"
    @mouseleave="surSortieSouris"
    @click="surClic"
    @focusin="ouvrir"
    @focusout="surSortieFocus"
    @keydown.esc="fermer"
    @transitionend="surFinTransition"
  >
    <div
      ref="zoneCarte"
      class="carte-mayotte-zone"
    />

    <!-- Filtre par besoin : n'apparaît qu'une fois la carte agrandie, il serait
         illisible et intouchable à la taille de la vignette. -->
    <div
      v-show="estOuverte && user"
      class="carte-filtres"
      role="group"
      aria-label="Filtrer les aidants par besoin"
    >
      <button
        v-for="b in BESOINS"
        :key="b.valeur"
        type="button"
        class="btn btn-sm"
        :class="besoin === b.valeur ? 'btn-primary' : 'btn-outline-secondary'"
        :aria-pressed="besoin === b.valeur"
        @click.stop="besoin = b.valeur"
      >
        {{ b.label }}
      </button>
    </div>

    <!-- Sans session, la base ne renvoie aucun profil (RLS) : mieux vaut le dire
         que laisser croire qu'aucun aidant n'est inscrit. -->
    <div
      v-if="initialized && !user"
      v-show="estOuverte"
      class="carte-voile-connexion"
    >
      <p>Connectez-vous pour voir les aidants près de chez vous.</p>
      <router-link
        to="/connexion"
        class="btn btn-primary btn-sm"
        @click.stop
      >
        Se connecter
      </router-link>
    </div>

    <span
      v-show="!estOuverte"
      class="carte-mayotte-label"
    >{{ user && nombreAffiche ? nombreAffiche + ' aidants' : 'Mayotte' }}</span>
  </div>
</template>
