<script setup>
// Carte "Ma position" de la page Mon compte (/mon-compte), donc réservée aux
// utilisateurs connectés (la route exige une session, voir router/index.js).
// Elle était auparavant une vignette sur la page d'accueil, ouverte à tous ;
// déplacée ici le 9 novembre 2026 à la demande du propriétaire du site.
//
// Ce qu'elle montre :
// - la commune de l'utilisateur (champ "ville" de son profil), avec un repère
//   "Vous êtes ici" et un cadrage centré dessus ;
// - sur demande (bouton "Me localiser"), sa position précise via le GPS du
//   navigateur. Cette position reste dans le navigateur : elle n'est ni envoyée
//   au serveur ni enregistrée ;
// - les aidants inscrits, posés sur leur commune (jamais leur adresse exacte),
//   filtrables par besoin.
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// ATTENTION À L'ORDRE DES DEUX IMPORTS CI-DESSOUS. leaflet.markercluster est un
// script UMD dont le corps référence un `L` global (L.FeatureGroup.extend...) et
// qui n'exporte rien. Il ne fonctionne que parce que Leaflet, juste au-dessus,
// se publie lui-même sur window.L en fin de module. Inverser ces deux lignes
// ferait planter la page sur un "L is not defined".
import 'leaflet.markercluster'
// Uniquement la feuille de positionnement/animation du plugin : sa feuille
// "Default" impose des pastilles bleues, or les regroupements doivent être
// verts (voir .cluster-aidants dans CarteMayotte.css).
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { useI18n } from 'vue-i18n'
import { getCoordonneesCommune } from '../data/store.js'
import { useAidants } from '../composables/useAidants'
import { useAuth } from '../stores/auth'
import '../styles/CarteMayotte.css'

// Mayotte entière tient dans ce cadrage (utilisé si la commune est inconnue).
const CENTRE_MAYOTTE = [-12.8275, 45.1662]
const ZOOM_ILE = 10
// Cadrage sur une commune : assez près pour voir les villages voisins.
const ZOOM_COMMUNE = 13
// Cadrage sur la position GPS : niveau rue.
const ZOOM_POSITION = 16

// Mêmes besoins que la page Recherche (voir pages/RecherchePersonnel.vue).
// Seulement des identifiants : le libellé est résolu dans le template avec t().
const BESOINS = ['tous', 'sante', 'coursier', 'menage']

// Fonds de carte IGN (Géoplateforme, accès libre sans clé).
const MODELE_IGN =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER={couche}&STYLE=normal&TILEMATRIXSET=PM' +
  '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT={format}'
const ATTRIBUTION = '© <a href="https://www.ign.fr/">IGN</a> — Géoplateforme'

const { t } = useI18n()
const { user } = useAuth()

const zoneCarte = ref(null)
const besoin = ref('tous')
const nombreAffiche = ref(0)
// État du bouton "Me localiser" : '' | 'recherche' | 'trouvee' | 'refus' | 'indisponible'
const etatLocalisation = ref('')

// Liste partagée avec le compteur de l'accueil (voir composables/useAidants.js).
const { aidants } = useAidants()

// Point de la commune du profil, ou null si la commune n'est pas renseignée.
const pointCommune = computed(() => getCoordonneesCommune(user.value?.ville))

// Le navigateur ne propose la géolocalisation que sur une page sécurisée (HTTPS
// ou localhost) : sans elle, on n'affiche même pas le bouton.
const geolocalisationDisponible = typeof navigator !== 'undefined' && 'geolocation' in navigator

let carte = null
let regroupements = null
let repereCommune = null
let reperePosition = null
let cerclePrecision = null
let observateurTaille = null

// Marqueur des aidants : goutte rose foncé avec une maison blanche.
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

// Repère "Vous êtes ici" : point turquoise cerclé, bien distinct des maisons
// roses des aidants. `classe` permet de varier le style (commune ou GPS).
function iconeVous(classe) {
  return L.divIcon({
    className: 'marqueur-vous ' + classe,
    html: '<span></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  })
}

// Pastille verte numérotée quand plusieurs aidants se touchent.
function iconeRegroupement(groupe) {
  return L.divIcon({
    className: 'cluster-aidants',
    html: '<span>' + groupe.getChildCount() + '</span>',
    iconSize: [42, 42],
  })
}

// Même logique de filtrage que la page Recherche.
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

// Les textes des profils sont saisis par les utilisateurs : on les échappe
// avant de les mettre dans le HTML des infobulles.
function echapper(texte) {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c])
}

function dessinerAidants() {
  if (!regroupements) return
  regroupements.clearLayers()

  let poses = 0
  aidants.value
    // L'utilisateur lui-même est déjà représenté par le repère "Vous êtes ici".
    .filter((aidant) => aidant.id !== user.value?.id)
    .filter(correspondAuBesoin)
    .forEach((aidant) => {
      const point = getCoordonneesCommune(aidant.ville)
      // Un profil sans commune connue n'est pas plaçable : on le laisse de côté.
      if (!point) return

      L.marker([point.lat, point.lng], {
        icon: iconeMaison(),
        alt: libelleAidant(aidant) + ' — ' + aidant.ville,
      })
        .bindPopup(
          [
            '<p class="popup-nom">' + echapper(aidant.nom || 'Aidant inscrit') + '</p>',
            '<p class="popup-service">' + echapper(libelleAidant(aidant)) + '</p>',
            '<p class="popup-commune">' + echapper(aidant.ville) + '</p>',
          ].join(''),
        )
        .addTo(regroupements)
      poses += 1
    })

  nombreAffiche.value = poses
}

// Place (ou déplace) le repère de la commune du profil et centre la carte dessus.
function placerCommune() {
  if (!carte) return
  repereCommune?.remove()
  repereCommune = null

  const point = pointCommune.value
  if (!point) {
    carte.setView(CENTRE_MAYOTTE, ZOOM_ILE)
    return
  }
  repereCommune = L.marker([point.lat, point.lng], {
    icon: iconeVous('marqueur-vous-commune'),
    alt: t('carte_position.vous_etes_ici'),
    zIndexOffset: 1000,
  })
    .bindPopup('<p class="popup-nom">' + echapper(t('carte_position.vous_etes_ici')) + '</p>'
      + '<p class="popup-commune">' + echapper(t('carte_position.votre_commune', { commune: user.value.ville })) + '</p>')
    .addTo(carte)
  carte.setView([point.lat, point.lng], ZOOM_COMMUNE)
}

// Bouton "Me localiser" : demande la position au navigateur (qui affiche sa
// propre autorisation). Rien n'est envoyé au serveur.
function meLocaliser() {
  if (!geolocalisationDisponible || !carte) return
  etatLocalisation.value = 'recherche'
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!carte) return
      const point = [coords.latitude, coords.longitude]
      reperePosition?.remove()
      cerclePrecision?.remove()
      // Cercle de précision : le GPS d'un ordinateur peut se tromper de
      // plusieurs centaines de mètres, autant le montrer honnêtement.
      cerclePrecision = L.circle(point, {
        radius: coords.accuracy,
        className: 'cercle-precision',
        interactive: false,
      }).addTo(carte)
      reperePosition = L.marker(point, {
        icon: iconeVous('marqueur-vous-gps'),
        alt: t('carte_position.ma_position'),
        zIndexOffset: 1100,
      })
        .bindPopup('<p class="popup-nom">' + echapper(t('carte_position.ma_position')) + '</p>'
          + '<p class="popup-commune">' + echapper(t('carte_position.precision', { metres: Math.round(coords.accuracy) })) + '</p>')
        .addTo(carte)
      carte.setView(point, ZOOM_POSITION)
      reperePosition.openPopup()
      etatLocalisation.value = 'trouvee'
    },
    (erreur) => {
      // Code 1 = l'utilisateur a refusé ; les autres = position introuvable.
      etatLocalisation.value = erreur.code === 1 ? 'refus' : 'indisponible'
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  )
}

// Revenir sur la commune du profil après une localisation GPS.
function recentrer() {
  if (pointCommune.value) carte?.setView([pointCommune.value.lat, pointCommune.value.lng], ZOOM_COMMUNE)
  else carte?.setView(CENTRE_MAYOTTE, ZOOM_ILE)
}

// La liste des aidants arrive après le montage (requête) : on redessine.
watch(aidants, dessinerAidants)
watch(besoin, dessinerAidants)
// Changement de commune dans le profil, ou session chargée après coup.
watch(() => user.value?.ville, placerCommune)

onMounted(() => {
  carte = L.map(zoneCarte.value, {
    center: CENTRE_MAYOTTE,
    zoom: ZOOM_ILE,
    minZoom: 9,
    maxZoom: 18,
    // Pas de zoom à la molette : sur une carte au milieu d'une page, il
    // détourne le défilement. Les boutons +/- et le pincement suffisent.
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

  // Leaflet ne mesure son conteneur qu'à la création : on lui signale tout
  // changement de taille (fenêtre, mode confort...) pour éviter une bande vide.
  observateurTaille = new ResizeObserver(() => {
    requestAnimationFrame(() => carte?.invalidateSize())
  })
  observateurTaille.observe(zoneCarte.value)

  placerCommune()
  dessinerAidants()
})

onBeforeUnmount(() => {
  observateurTaille?.disconnect()
  observateurTaille = null
  carte?.remove()
  carte = null
  regroupements = null
  repereCommune = null
  reperePosition = null
  cerclePrecision = null
})
</script>

<template>
  <section
    class="card p-3 p-md-4 carte-position"
    :aria-label="t('carte_position.titre')"
  >
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h2 class="h5 mb-1 carte-position-titre">
          {{ t('carte_position.titre') }}
        </h2>
        <p class="text-muted small mb-0">
          <template v-if="pointCommune">
            {{ t('carte_position.votre_commune', { commune: user.ville }) }} ·
          </template>
          <template v-else>
            {{ t('carte_position.sans_commune') }}
            <router-link to="/profil">
              {{ t('carte_position.completer_profil') }}
            </router-link> ·
          </template>
          {{ t('carte_position.aidants', { n: nombreAffiche }) }}
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="geolocalisationDisponible"
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="etatLocalisation === 'recherche'"
          @click="meLocaliser"
        >
          {{ etatLocalisation === 'recherche' ? t('carte_position.recherche') : t('carte_position.me_localiser') }}
        </button>
        <button
          v-if="etatLocalisation === 'trouvee'"
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="recentrer"
        >
          {{ t('carte_position.recentrer') }}
        </button>
      </div>
    </div>

    <!-- Filtre par besoin : mêmes catégories que la page Recherche. -->
    <div
      class="d-flex flex-wrap gap-2 mb-3"
      role="group"
      :aria-label="t('accueil.carte.filtre_titre')"
    >
      <button
        v-for="b in BESOINS"
        :key="b"
        type="button"
        class="btn btn-sm"
        :class="besoin === b ? 'btn-primary' : 'btn-outline-secondary'"
        :aria-pressed="besoin === b"
        @click="besoin = b"
      >
        {{ t('accueil.carte.filtre_' + b) }}
      </button>
    </div>

    <div
      ref="zoneCarte"
      class="carte-mayotte carte-mayotte-zone"
    />

    <p
      class="small mt-2 mb-0"
      :class="etatLocalisation === 'refus' || etatLocalisation === 'indisponible' ? 'text-danger' : 'text-muted'"
      aria-live="polite"
    >
      <template v-if="etatLocalisation === 'refus'">
        {{ t('carte_position.erreur_refus') }}
      </template>
      <template v-else-if="etatLocalisation === 'indisponible'">
        {{ t('carte_position.erreur_indisponible') }}
      </template>
      <template v-else>
        {{ t('carte_position.confidentialite') }}
      </template>
    </p>
  </section>
</template>
