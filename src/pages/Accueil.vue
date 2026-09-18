<script setup>
// Page d'accueil : hero + un aperçu concret de chaque section (pas juste des liens).
// Chaque section garde un lien "En savoir plus" vers sa page dédiée pour le détail complet.
import { onMounted, onUnmounted, ref } from 'vue'
import ServiceIcon from '../components/ServiceIcon.vue'
import IconBadge from '../components/IconBadge.vue'
import ReefDivider from '../components/ReefDivider.vue'
import FormulesSection from '../components/FormulesSection.vue'
import PaiementBandeau from '../components/PaiementBandeau.vue'
import MayotteSymbol from '../components/MayotteSymbol.vue'
// Effet "dégradé animé" sur les mots-clés du titre (voir components/HighlightWord.vue) :
// réutilisable sur n'importe quel titre, pas seulement celui-ci.
import HighlightWord from '../components/HighlightWord.vue'
// Photo fournie par l'utilisateur (coucher de soleil sur le lagon) : importée comme
// un module pour que Vite l'inclue dans le build avec un nom de fichier "hashé".
import heroPhoto from '../assets/image.jpg'
// Mêmes photos que sur /services (voir pages/Services.vue), réutilisées ici en
// fond de carte avec le texte par-dessus, comme demandé.
import soinsPhoto from '../assets/soins a domicile .jpg'
import coursesPhoto from '../assets/course .jpg'
import menagePhoto from '../assets/menage .jpg'
import gardePhoto from '../assets/service de garde .jpg'
import psychologiquePhoto from '../assets/psychologique.jpg'
// Photos "Pour qui" : repassées en JPEG (le PNG compresse mal les photos, les
// fichiers d'origine faisaient plus de 2 Mo chacun même redimensionnés).
import seniorPhoto from '../assets/personnes-agees.jpg'
import santePhoto from '../assets/personnel-de-sante.jpg'
import particulierPhoto from '../assets/particuliers.jpg'
import '../styles/Accueil.css'

const SERVICES = [
  {
    icon: 'soins',
    title: 'Soins à domicile',
    text: 'Infirmiers, aides-soignants ou kinésithérapeutes disponibles près de chez vous.',
    photo: soinsPhoto,
  },
  {
    icon: 'courses',
    title: 'Courses',
    text: 'Un coursier de confiance se charge de vos achats du quotidien.',
    photo: coursesPhoto,
  },
  {
    icon: 'menage',
    title: 'Ménage',
    text: "Une aide à domicile pour l'entretien de votre logement.",
    photo: menagePhoto,
  },
  {
    icon: 'garde',
    title: 'Service de garde',
    text: 'Une présence rassurante à domicile quelques heures dans la journée.',
    photo: gardePhoto,
  },
  // Besoin transversal (cahier des charges) plutôt qu'un service réservable,
  // mais a désormais sa propre photo comme les autres cartes de cette grille.
  {
    icon: 'psychologique',
    title: 'Suivi psychologique',
    text: 'Un accompagnement humain pour rompre l’isolement.',
    photo: psychologiquePhoto,
  },
]

const PUBLICS = [
  { title: 'Personnes âgées', text: 'Un coup de main pour les soins, les courses ou le ménage.', photo: seniorPhoto },
  { title: 'Personnel de santé', text: 'Proposez vos soins à domicile selon vos disponibilités.', photo: santePhoto },
  { title: 'Particuliers', text: 'Rendez service comme coursier ou pour du ménage.', photo: particulierPhoto },
]

const ETAPES = [
  { icon: 'profile', title: 'Créez votre profil', text: 'Personne âgée, personnel de santé ou particulier.' },
  { icon: 'calendar', title: 'Indiquez vos disponibilités', text: 'Si vous proposez un service.' },
  { icon: 'search', title: 'Trouvez la bonne personne', text: 'Par ville et par type de besoin.' },
  { icon: 'shield-check', title: 'Suivez votre demande', text: "Statut visible à chaque étape, jusqu'à la mission terminée." },
]

const ENGAGEMENTS = [
  { icon: 'shield-check', title: 'Sécurité', text: 'Rôle, services et disponibilités visibles avant tout contact.' },
  { icon: 'connect', title: 'Fiabilité', text: 'Des profils actifs et à jour, pour des mises en relation qui aboutissent.' },
  { icon: 'calendar', title: 'Disponibilité', text: 'Des aidants joignables aux horaires qui vous conviennent.' },
]

// Anime chaque carte de "Ce que vous pouvez trouver" (fondu + léger décalage
// vers le haut) au moment où elle entre dans le viewport, plutôt qu'au
// chargement de la page : la section est sous la ligne de flottaison, une
// animation lancée au chargement serait déjà terminée avant que l'utilisateur
// ne scrolle jusque-là.
const servicesGrid = ref(null)
let observateurServices = null

onMounted(() => {
  const cartes = servicesGrid.value?.querySelectorAll('.reveal-card') ?? []
  observateurServices = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible')
          // Une seule fois : pas besoin de réanimer si on rescrolle dessus.
          observateurServices.unobserve(entree.target)
        }
      })
    },
    { threshold: 0.15 },
  )
  cartes.forEach((carte) => observateurServices.observe(carte))
})

onUnmounted(() => observateurServices?.disconnect())
</script>

<template>
  <div class="landing">
    <!-- Photo en fond plein écran (plus une petite vignette) : image + voile sombre
         dégradé pour que le texte reste lisible par-dessus, comme demandé. -->
    <section class="hero hero-photo-bg">
      <img
        :src="heroPhoto"
        alt="Coucher de soleil sur le lagon de Mayotte"
        class="hero-bg-image"
      >
      <div
        class="hero-scrim"
        aria-hidden="true"
      />

      <div class="container hero-inner">
        <div class="hero-text">
          <span class="badge text-bg-secondary mb-3">Aide aux personnes âgées à Mayotte</span>
          <h1>Un accompagnement de <HighlightWord>confiance</HighlightWord>, en quelques clics</h1>
          <p class="lead">
            Le dispositif met en relation les personnes âgées avec du personnel de santé, des
            coursiers et des aides à domicile. 
          </p>
          <div class="hero-actions">
            <!-- Entrée dédiée vers l'Assistant de besoin (page /assistant) : elle
                 guide directement l'utilisateur vers le bon parcours sans ajouter
                 de bouton de connexion redondant dans le hero. -->
            <router-link
              to="/assistant"
              class="btn btn-primary btn-lg"
            >
              Je cherche de l'aide
            </router-link>
            <router-link
              to="/inscription"
              class="btn btn-outline-light btn-lg"
            >
              Je souhaite aider
            </router-link>
          </div>
        </div>
      </div>

      <!-- Symbole de Mayotte, posé d'un seul côté (en bas à droite, loin du texte
           et des boutons à gauche) pour ancrer visuellement la page dans l'île. -->
      <div
        class="hero-mayotte"
        aria-hidden="true"
      >
        <MayotteSymbol />
        <span class="hero-mayotte-label">Mayotte</span>
      </div>

      <!-- Vague "découpée" dans le bas de la photo (même couleur que le fond de
           page juste en dessous) : contrairement à ReefDivider (une ligne posée
           entre deux sections déjà de la même couleur), ici la forme doit se
           fondre directement dans la photo, sans bande de fond visible entre
           les deux. D'où un SVG rempli et positionné en absolu par-dessus le
           bas de l'image plutôt que le composant ReefDivider habituel. -->
      <svg
        class="hero-wave"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,30 Q60,10 120,30 T240,30 T360,30 T480,30 T600,30 T720,30 T840,30 T960,30 T1080,30 T1200,30 T1320,30 T1440,30 L1440,60 L0,60 Z"
        />
      </svg>
    </section>

    <section class="section">
      <div class="container">
        <span class="section-label" />
        <IconBadge name="connect" />
        <h2 class="h3 mb-3">
          Pourquoi ce dispositif
        </h2>
        <p class="text-muted intro-text mb-3">
          À Mayotte comme ailleurs, beaucoup de personnes âgées peinent à trouver de l'aide pour
          les gestes du quotidien ou pour un suivi de santé régulier, ce qui nourrit leur isolement.
        </p>
        <router-link
          to="/pourquoi"
          class="teaser-link"
        >
          Comprendre le contexte →
        </router-link>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          Ce que vous pouvez trouver
        </h2>
        <div
          ref="servicesGrid"
          class="row g-4"
        >
          <div
            v-for="(s, i) in SERVICES"
            :key="s.title"
            class="col-md-6 col-lg-4"
          >
            <!-- Même principe que le hero : photo en fond + voile dégradé pour que
                 le texte blanc reste lisible par-dessus. Les 2 besoins transversaux
                 (pas de photo dédiée) retombent sur une carte pleine classique.
                 "reveal-card" + --delay : anime chaque carte en fondu/décalage
                 quand elle entre dans le viewport, avec un léger décalage entre
                 chaque carte pour un effet de vague plutôt qu'un bloc unique. -->
            <div
              v-if="s.photo"
              class="card h-100 service-tile reveal-card"
              :style="{ '--delay': `${i * 0.08}s` }"
            >
              <img
                :src="s.photo"
                :alt="s.title"
                class="service-tile-photo"
              >
              <div
                class="service-tile-scrim"
                aria-hidden="true"
              />
              <div class="service-tile-content">
                <ServiceIcon
                  :type="s.icon"
                  tone="light"
                />
                <h3 class="h6">
                  {{ s.title }}
                </h3>
                <p class="small mb-0">
                  {{ s.text }}
                </p>
              </div>
            </div>
            <div
              v-else
              class="card p-4 h-100 reveal-card"
              :style="{ '--delay': `${i * 0.08}s` }"
            >
              <ServiceIcon :type="s.icon" />
              <h3 class="h6">
                {{ s.title }}
              </h3>
              <p class="text-muted small mb-0">
                {{ s.text }}
              </p>
            </div>
          </div>
        </div>
        <router-link
          to="/services"
          class="teaser-link d-inline-block mt-3"
        >
          Voir tous les services →
        </router-link>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          Pour qui
        </h2>
        <div class="row g-4">
          <div
            v-for="p in PUBLICS"
            :key="p.title"
            class="col-md-4"
          >
            <!-- Même carte "photo en fond" que la section Services juste au-dessus. -->
            <div class="card h-100 service-tile">
              <img
                :src="p.photo"
                :alt="p.title"
                class="service-tile-photo"
              >
              <div
                class="service-tile-scrim"
                aria-hidden="true"
              />
              <div class="service-tile-content">
                <h3 class="h6">
                  {{ p.title }}
                </h3>
                <p class="small mb-0">
                  {{ p.text }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <router-link
          to="/pour-qui"
          class="teaser-link d-inline-block mt-3"
        >
          Voir qui est concerné →
        </router-link>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          Comment ça marche
        </h2>
        <div class="row g-4">
          <div
            v-for="(e, i) in ETAPES"
            :key="e.title"
            class="col-md-6 col-lg-3"
          >
            <div class="etape-item">
              <IconBadge
                :name="e.icon"
                :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
              />
              <p class="etape-step">
                Étape {{ i + 1 }}
              </p>
              <h3 class="h6 mb-1">
                {{ e.title }}
              </h3>
              <p class="text-muted small mb-0">
                {{ e.text }}
              </p>
            </div>
          </div>
        </div>
        <router-link
          to="/inscription"
          class="btn btn-outline-secondary d-inline-block mt-3"
        >
          Commencer
        </router-link>
      </div>
    </section>

    <ReefDivider />

    <section class="section">
      <div class="container text-center">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          Nos engagements
        </h2>
        <div class="row g-4 justify-content-center mb-4">
          <div
            v-for="(v, i) in ENGAGEMENTS"
            :key="v.title"
            class="col-md-4"
          >
            <IconBadge
              :name="v.icon"
              :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
            />
            <h3 class="h6 mb-1">
              {{ v.title }}
            </h3>
            <p class="text-muted small">
              {{ v.text }}
            </p>
          </div>
        </div>
        <p class="lead text-muted mb-4">
          Un dispositif pensé pour le bien-être et l'autonomie des personnes âgées.
        </p>
        <router-link
          to="/inscription"
          class="btn btn-primary btn-lg"
        >
          Rejoindre le dispositif
        </router-link>
      </div>
    </section>

    <!-- Formules payantes : accompagnement continu, en plus de la mise en relation
         gratuite proposée dans le reste du site. Composants dédiés (voir
         components/FormulesSection.vue et PaiementBandeau.vue) plutôt que du
         balisage inline, pour rester cohérent avec le reste du design system. -->
    <section
      id="nos-formules"
      class="section section-alt"
      style="scroll-margin-top: 96px"
    >
      <div class="container text-center">
        <span class="section-label" />
        <h2 class="h3 mb-2">
          Nos formules
        </h2>
        <p class="text-muted intro-text mb-4 mx-auto">
          Un accompagnement mensuel, en plus de la mise en relation gratuite, pour un suivi plus régulier.
        </p>
        <FormulesSection />
        <PaiementBandeau />
      </div>
    </section>
  </div>
</template>
