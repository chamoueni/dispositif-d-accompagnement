<script setup>
// Vignette cartographique posée dans le hero de l'accueil, à la place de
// l'ancien emblème décoratif (components/MayotteSymbol.vue) : petite et
// purement décorative au repos, elle s'agrandit et devient manipulable
// (déplacement, zoom, clic sur les marqueurs) quand on la survole — ou qu'on
// la touche, sur un écran tactile où le survol n'existe pas.
import { onMounted, onBeforeUnmount, ref } from 'vue'
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
import '../styles/CarteMayotte.css'

// Centre et zoom demandés : Mayotte entière tient dans la vignette.
const CENTRE = [-12.8275, 45.1662]
const ZOOM = 10

// Marqueurs d'exemple. C'est le seul endroit à modifier pour brancher de vraies
// données : même forme d'objet, et la carte suit (regroupements compris).
const AIDANTS = [
  { id: 1, nom: 'Fatima A.', service: 'Soins à domicile', commune: 'Mamoudzou', lat: -12.7806, lng: 45.2278 },
  { id: 2, nom: 'Ahmed M.', service: 'Courses', commune: 'Mamoudzou', lat: -12.7752, lng: 45.2191 },
  { id: 3, nom: 'Sitti B.', service: 'Ménage', commune: 'Koungou', lat: -12.7333, lng: 45.2033 },
  { id: 4, nom: 'Nadjima S.', service: 'Service de garde', commune: 'Dzaoudzi', lat: -12.7889, lng: 45.2589 },
  { id: 5, nom: 'Bacar H.', service: 'Soins à domicile', commune: 'Pamandzi', lat: -12.8000, lng: 45.2833 },
  { id: 6, nom: 'Zaïna R.', service: 'Ménage', commune: 'Sada', lat: -12.8519, lng: 45.1083 },
  { id: 7, nom: 'Ibrahim C.', service: 'Courses', commune: 'Chiconi', lat: -12.8333, lng: 45.1000 },
  { id: 8, nom: 'Anfiati D.', service: 'Suivi psychologique', commune: 'Ouangani', lat: -12.8333, lng: 45.1333 },
  { id: 9, nom: 'Moussa T.', service: 'Soins à domicile', commune: 'Bandrele', lat: -12.9078, lng: 45.1919 },
  { id: 10, nom: 'Echati L.', service: 'Service de garde', commune: 'Chirongui', lat: -12.9333, lng: 45.1500 },
  { id: 11, nom: 'Soilihi K.', service: 'Courses', commune: 'Bouéni', lat: -12.9033, lng: 45.0778 },
  { id: 12, nom: 'Halima N.', service: 'Ménage', commune: 'Tsingoni', lat: -12.7833, lng: 45.1000 },
]

const conteneur = ref(null)
const zoneCarte = ref(null)
const estOuverte = ref(false)

let carte = null

// Les commandes que l'on coupe au repos : sans ça, la molette zoomerait la
// carte au lieu de faire défiler la page, ce qui piège le visiteur.
const COMMANDES = ['dragging', 'scrollWheelZoom', 'doubleClickZoom', 'touchZoom', 'boxZoom', 'keyboard']

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
  // La carte reprend son cadrage d'origine : après un zoom ou un déplacement,
  // la vignette repartirait sinon sur un coin d'île sans repère.
  carte?.setView(CENTRE, ZOOM)
}

// Survol (souris) : ouverture à l'entrée, fermeture à la sortie.
function surEntreeSouris() {
  if (peutSurvoler()) ouvrir()
}

function surSortieSouris() {
  if (peutSurvoler()) fermer()
}

// Tactile : le toucher ouvre. La fermeture est gérée par le toucher à
// l'extérieur (voir surPointeurDocument), sinon manipuler la carte ouverte la
// refermerait aussitôt.
function surClic() {
  if (!peutSurvoler()) ouvrir()
}

function surPointeurDocument(evenement) {
  if (!estOuverte.value || peutSurvoler()) return
  if (conteneur.value?.contains(evenement.target)) return
  fermer()
}

// Clavier : la vignette est atteignable au Tab, s'ouvre à la prise de focus et
// se referme à Échap ou quand le focus quitte la zone.
function surSortieFocus(evenement) {
  if (!conteneur.value?.contains(evenement.relatedTarget)) fermer()
}

// invalidateSize() à la fin de l'agrandissement : Leaflet a mémorisé la taille
// de la vignette et n'affiche des tuiles que sur cette surface tant qu'on ne
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
    html: `
      <svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12.4 17 27 17 27s17-14.6 17-27C34 7.6 26.4 0 17 0Z" class="marqueur-goutte"/>
        <path d="M17 8.5 26 16.5h-2.4V26h-13.2v-9.5H8Z" class="marqueur-toit"/>
        <rect x="15" y="20" width="4" height="6" class="marqueur-porte"/>
      </svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -38],
  })
}

// Pastille verte numérotée quand plusieurs marqueurs se touchent.
function iconeRegroupement(groupe) {
  const nombre = groupe.getChildCount()
  return L.divIcon({
    className: 'cluster-aidants',
    html: `<span>${nombre}</span>`,
    iconSize: [40, 40],
  })
}

onMounted(() => {
  carte = L.map(zoneCarte.value, {
    center: CENTRE,
    zoom: ZOOM,
    minZoom: 9,
    maxZoom: 17,
    // Au repos la carte est décorative : toutes les commandes sont coupées et
    // rallumées seulement à l'agrandissement.
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false,
    attributionControl: true,
  })

  // Fond IGN (Géoplateforme, accès libre sans clé) : le "Plan IGN v2" montre
  // les communes et le relief de Mayotte, plus parlant qu'un fond générique.
  L.tileLayer(
    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
      '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM' +
      '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
    {
      attribution: '© <a href="https://www.ign.fr/">IGN</a> — Géoplateforme',
      minZoom: 9,
      maxZoom: 17,
    },
  ).addTo(carte)

  const regroupements = L.markerClusterGroup({
    iconCreateFunction: iconeRegroupement,
    showCoverageOnHover: false,
    maxClusterRadius: 45,
  })

  AIDANTS.forEach((aidant) => {
    L.marker([aidant.lat, aidant.lng], {
      icon: iconeMaison(),
      // Le nom sert d'étiquette accessible au marqueur.
      alt: `${aidant.service} — ${aidant.commune}`,
      keyboard: false,
    })
      .bindPopup(
        `<p class="popup-nom">${aidant.nom}</p>
         <p class="popup-service">${aidant.service}</p>
         <p class="popup-commune">${aidant.commune}</p>`,
      )
      .addTo(regroupements)
  })

  regroupements.addTo(carte)

  document.addEventListener('pointerdown', surPointeurDocument)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', surPointeurDocument)
  carte?.remove()
  carte = null
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
    <!-- Reprend l'étiquette de l'ancien emblème, masquée une fois la carte
         ouverte pour ne pas empiéter sur la légende Leaflet. -->
    <span
      v-show="!estOuverte"
      class="carte-mayotte-label"
    >Mayotte</span>
  </div>
</template>
