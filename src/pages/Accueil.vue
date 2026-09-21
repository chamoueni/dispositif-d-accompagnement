<script setup>
// Page d'accueil : hero + un aperçu concret de chaque section (pas juste des liens).
// Chaque section garde un lien "En savoir plus" vers sa page dédiée pour le détail complet.
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ServiceIcon from '../components/ServiceIcon.vue'
import IconBadge from '../components/IconBadge.vue'
import ReefDivider from '../components/ReefDivider.vue'
import FormulesSection from '../components/FormulesSection.vue'
import PaiementBandeau from '../components/PaiementBandeau.vue'
// Vignette carte des aidants inscrits, posée sur la photo du hero. Remplace
// l'ancien emblème décoratif (components/MayotteSymbol.vue, désormais inutilisé).
import CarteMayotte from '../components/CarteMayotte.vue'
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

const { t } = useI18n()

// Ces tableaux ne contiennent plus que des identifiants : les libelles sont
// resolus dans le template avec t(), sinon ils resteraient figes dans la langue
// active au chargement du module et ne suivraient pas le changement de langue.
const SERVICES = [
  { cle: 'soins', icon: 'soins', photo: soinsPhoto },
  { cle: 'courses', icon: 'courses', photo: coursesPhoto },
  { cle: 'menage', icon: 'menage', photo: menagePhoto },
  { cle: 'garde', icon: 'garde', photo: gardePhoto },
  // Besoin transversal (cahier des charges) plutot qu'un service reservable,
  // mais a desormais sa propre photo comme les autres cartes de cette grille.
  { cle: 'psy', icon: 'psychologique', photo: psychologiquePhoto },
]

const PUBLICS = [
  { cle: 'agees', photo: seniorPhoto },
  { cle: 'sante', photo: santePhoto },
  { cle: 'particuliers', photo: particulierPhoto },
]

const ETAPES = [
  { cle: 'profil', icon: 'profile' },
  { cle: 'dispos', icon: 'calendar' },
  { cle: 'trouver', icon: 'search' },
  { cle: 'suivre', icon: 'shield-check' },
]

const ENGAGEMENTS = [
  { cle: 'securite', icon: 'shield-check' },
  { cle: 'fiabilite', icon: 'connect' },
  { cle: 'dispo', icon: 'calendar' },
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
    <!-- Hero en deux colonnes : texte à gauche sur le fond rose pêche, photo
         ronde à droite (mise en page demandée, sur le modèle de la référence
         fournie). Remplace l'ancienne photo en fond plein écran + voile sombre :
         le texte n'est plus posé sur l'image, il passe donc en couleur foncée,
         nettement plus lisible pour le public âgé visé. -->
    <section class="hero hero-clair">
      <div class="container hero-inner">
        <div class="hero-text">
          <span class="badge text-bg-secondary mb-3">{{ t('accueil.hero.badge') }}</span>
          <!-- i18n-t plutot qu'une concatenation : la phrase reste une seule unite
               traduisible, et le mot mis en avant est injecte a la place du
               parametre {mot}. Un traducteur peut donc le deplacer dans la phrase. -->
          <i18n-t
            keypath="accueil.hero.titre"
            tag="h1"
            scope="global"
          >
            <template #mot>
              <HighlightWord>{{ t('accueil.hero.mot') }}</HighlightWord>
            </template>
          </i18n-t>
          <p class="lead">
            {{ t('accueil.hero.chapo') }}
          </p>
          <div class="hero-actions">
            <!-- Entrée dédiée vers l'Assistant de besoin (page /assistant) : elle
                 guide directement l'utilisateur vers le bon parcours sans ajouter
                 de bouton de connexion redondant dans le hero. -->
            <router-link
              to="/assistant"
              class="btn btn-primary btn-lg"
            >
              {{ t('accueil.hero.cta_aide') }}
            </router-link>
            <!-- Était en "outline-light" quand le bouton se détachait sur la photo
                 sombre : sur le fond clair, il serait devenu invisible. -->
            <router-link
              to="/inscription"
              class="btn btn-outline-secondary btn-lg"
            >
              {{ t('accueil.hero.cta_aider') }}
            </router-link>
          </div>
        </div>

        <div class="hero-media">
          <img
            :src="heroPhoto"
            alt="Coucher de soleil sur le lagon de Mayotte"
            class="hero-photo"
          >
          <!-- Emplacement réservé à la vignette carte, sous la photo et aligné à
               droite. Ce conteneur occupe la place dans le flux (la vignette,
               elle, est en absolu dedans) : la photo et la carte ne peuvent donc
               jamais se toucher, et l'agrandissement au survol ne décale rien.
               Voir components/CarteMayotte.vue. -->
          <div class="carte-emplacement">
            <CarteMayotte />
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <span class="section-label" />
        <IconBadge name="connect" />
        <h2 class="h3 mb-3">
          {{ t('accueil.pourquoi.titre') }}
        </h2>
        <p class="text-muted intro-text mb-3">
          {{ t('accueil.pourquoi.texte') }}
        </p>
        <router-link
          to="/pourquoi"
          class="teaser-link"
        >
          {{ t('accueil.pourquoi.lien') }}
        </router-link>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          {{ t('accueil.services.titre') }}
        </h2>
        <div
          ref="servicesGrid"
          class="row g-4"
        >
          <div
            v-for="(s, i) in SERVICES"
            :key="s.cle"
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
                :alt="t(`accueil.services.${s.cle}_titre`)"
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
                  {{ t(`accueil.services.${s.cle}_titre`) }}
                </h3>
                <p class="small mb-0">
                  {{ t(`accueil.services.${s.cle}_texte`) }}
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
                {{ t(`accueil.services.${s.cle}_titre`) }}
              </h3>
              <p class="text-muted small mb-0">
                {{ t(`accueil.services.${s.cle}_texte`) }}
              </p>
            </div>
          </div>
        </div>
        <router-link
          to="/services"
          class="teaser-link d-inline-block mt-3"
        >
          {{ t('accueil.services.lien') }}
        </router-link>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          {{ t('accueil.pour_qui.titre') }}
        </h2>
        <div class="row g-4">
          <div
            v-for="p in PUBLICS"
            :key="p.cle"
            class="col-md-4"
          >
            <!-- Même carte "photo en fond" que la section Services juste au-dessus. -->
            <div class="card h-100 service-tile">
              <img
                :src="p.photo"
                :alt="t(`accueil.pour_qui.${p.cle}_titre`)"
                class="service-tile-photo"
              >
              <div
                class="service-tile-scrim"
                aria-hidden="true"
              />
              <div class="service-tile-content">
                <h3 class="h6">
                  {{ t(`accueil.pour_qui.${p.cle}_titre`) }}
                </h3>
                <p class="small mb-0">
                  {{ t(`accueil.pour_qui.${p.cle}_texte`) }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <router-link
          to="/pour-qui"
          class="teaser-link d-inline-block mt-3"
        >
          {{ t('accueil.pour_qui.lien') }}
        </router-link>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          {{ t('accueil.etapes.titre') }}
        </h2>
        <div class="row g-4">
          <div
            v-for="(e, i) in ETAPES"
            :key="e.cle"
            class="col-md-6 col-lg-3"
          >
            <div class="etape-item">
              <IconBadge
                :name="e.icon"
                :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
              />
              <p class="etape-step">
                {{ t('accueil.etapes.numero', { n: i + 1 }) }}
              </p>
              <h3 class="h6 mb-1">
                {{ t(`accueil.etapes.${e.cle}_titre`) }}
              </h3>
              <p class="text-muted small mb-0">
                {{ t(`accueil.etapes.${e.cle}_texte`) }}
              </p>
            </div>
          </div>
        </div>
        <router-link
          to="/inscription"
          class="btn btn-outline-secondary d-inline-block mt-3"
        >
          {{ t('accueil.etapes.cta') }}
        </router-link>
      </div>
    </section>

    <ReefDivider />

    <section class="section">
      <div class="container text-center">
        <span class="section-label" />
        <h2 class="h3 mb-4">
          {{ t('accueil.engagements.titre') }}
        </h2>
        <div class="row g-4 justify-content-center mb-4">
          <div
            v-for="(v, i) in ENGAGEMENTS"
            :key="v.cle"
            class="col-md-4"
          >
            <IconBadge
              :name="v.icon"
              :tone="i % 2 === 0 ? 'accent' : 'accent-2'"
            />
            <h3 class="h6 mb-1">
              {{ t(`accueil.engagements.${v.cle}_titre`) }}
            </h3>
            <p class="text-muted small">
              {{ t(`accueil.engagements.${v.cle}_texte`) }}
            </p>
          </div>
        </div>
        <p class="lead text-muted mb-4">
          {{ t('accueil.engagements.phrase') }}
        </p>
        <router-link
          to="/inscription"
          class="btn btn-primary btn-lg"
        >
          {{ t('accueil.engagements.cta') }}
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
          {{ t('accueil.formules.titre') }}
        </h2>
        <p class="text-muted intro-text mb-4 mx-auto">
          {{ t('accueil.formules.texte') }}
        </p>
        <FormulesSection />
        <PaiementBandeau />
      </div>
    </section>
  </div>
</template>
