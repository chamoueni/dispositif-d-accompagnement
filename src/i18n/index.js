// Configuration vue-i18n : français, shimaoré et kibushi, les trois langues
// parlées par le public du dispositif à Mayotte.
//
// Les traductions shimaoré et kibushi sont des GABARITS provisoires, marqués
// "À TRADUIRE", à remplacer par de vraies traductions faites par des locuteurs.
// Aucune traduction automatique n'est utilisée : sur des consignes destinées à
// des personnes âgées, un contresens machine serait pire que du français.
import { createI18n } from 'vue-i18n'
import fr from '../locales/fr.json'
import shi from '../locales/shi.json'
import kib from '../locales/kib.json'

export const LANGUES = [
  { code: 'fr', libelle: 'Français' },
  { code: 'shi', libelle: 'Shimaoré' },
  { code: 'kib', libelle: 'Kibushi' },
]

const CLE_STOCKAGE = 'langue'

// Langue retenue d'une visite à l'autre. localStorage peut lever (navigation
// privée, cookies bloqués) : dans ce cas on retombe simplement sur le français.
export function langueEnregistree() {
  try {
    const memorisee = localStorage.getItem(CLE_STOCKAGE)
    return LANGUES.some((l) => l.code === memorisee) ? memorisee : 'fr'
  } catch {
    return 'fr'
  }
}

export function enregistrerLangue(code) {
  try {
    localStorage.setItem(CLE_STOCKAGE, code)
  } catch {
    // Pas de mémorisation possible : la langue reste valable pour la session.
  }
}

export const i18n = createI18n({
  // legacy: false = API Composition (useI18n), cohérent avec le reste du site
  // qui est écrit en <script setup>.
  legacy: false,
  globalInjection: true,
  locale: langueEnregistree(),
  // Repli demandé : toute clé absente d'une traduction retombe sur le français
  // plutôt que d'afficher la clé brute à l'écran.
  fallbackLocale: 'fr',
  // Ces deux avertissements se déclencheraient à chaque clé encore non traduite
  // en shimaoré ou kibushi : c'est l'état attendu du projet, pas une anomalie,
  // et ça noierait la console pendant le développement.
  missingWarn: false,
  fallbackWarn: false,
  messages: { fr, shi, kib },
})

// Texte français d'une clé, quelle que soit la langue affichée. Sert au bouton
// vocal : la synthèse vocale du navigateur ne parle ni shimaoré ni kibushi, elle
// ne doit donc jamais lire autre chose que du français (voir useSpeech.js).
export function texteFrancais(cle) {
  return i18n.global.t(cle, {}, { locale: 'fr' })
}
