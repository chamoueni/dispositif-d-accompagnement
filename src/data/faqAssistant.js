// Assistant de secours du chat SOS : répond sans IA ni réseau aux questions
// les plus fréquentes. Utilisé quand l'assistant IA du serveur ne répond pas
// (pas de clé Anthropic configurée, serveur injoignable, délai dépassé...).
//
// Principe : chaque sujet a une liste de mots-clés ; on retient le sujet qui
// en reconnaît le plus dans la question. Les prix et les communes viennent
// directement de store.js, donc les réponses restent justes si on les modifie.
import { COMMUNES_MAYOTTE, FORMULES } from './store'

const DELAI_REPONSE_MINUTES = 12

// Accents, majuscules et ponctuation retirés, espaces aux extrémités : permet
// de chercher " mot " pour éviter les faux positifs (ex. "aide" dans "aidez").
function normaliser(texte) {
  const simple = texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9€]+/g, ' ')
  return ` ${simple.trim()} `
}

// Un mot-clé terminé par "*" accepte toutes les fins de mot
// (ex. "inscri*" reconnaît "inscrire", "inscription", "inscrit").
function contient(texte, motCle) {
  if (motCle.endsWith('*')) return texte.includes(` ${motCle.slice(0, -1)}`)
  return texte.includes(` ${motCle} `)
}

function prix(formule) {
  return formule.prix === 0 ? 'gratuite' : `${formule.prix} € par mois`
}

function reponseFormules(texte) {
  // Question sur une formule précise : on détaille seulement celle-là.
  const demandee = FORMULES.find((f) => contient(texte, normaliser(f.nom).trim()))
  if (demandee) {
    return `La formule ${demandee.nom} est ${prix(demandee)}. Elle comprend : ${demandee.fonctionnalites.join(', ').toLowerCase()}. Vous pouvez la choisir depuis la rubrique « Nos formules » de la page d’accueil.`
  }
  const liste = FORMULES.map((f) => `${f.nom} (${prix(f)})`).join(', ')
  return `Il existe 4 formules : ${liste}. La formule Basique permet 3 mises en relation gratuites, sans engagement. La plus choisie est Confort. Vous pouvez changer de formule à tout moment depuis « Nos formules ».`
}

function reponseCommunes(texte) {
  const commune = COMMUNES_MAYOTTE.find((c) => contient(texte, normaliser(c.nom).trim()))
  if (commune) {
    return `Oui, ${commune.nom} (zone ${commune.zone}) fait partie des communes couvertes. Dans « Rechercher », choisissez ${commune.nom} pour voir les aidants disponibles près de chez vous.`
  }
  return `Le service couvre les 17 communes de Mayotte, réparties en 4 zones : Nord, Centre, Sud et Petite-Terre. La recherche se fait par commune, pour trouver un aidant proche de chez vous.`
}

// Sujets dans l'ordre de priorité en cas d'égalité. "urgence" est à part :
// il passe toujours en premier dès qu'un de ses mots est reconnu.
const SUJETS = [
  {
    id: 'urgence',
    mots: ['urgence*', 'urgent*', 'secours', 'samu', 'pompier*', 'ambulance', 'malaise', 'chute', 'tombe*', 'saigne*', 'respire', 'inconscient', 'danger', '112'],
    reponse: () => '🚨 S’il s’agit d’une urgence médicale, appelez immédiatement le 112 (ou le 15, le SAMU). Le bouton « Urgence » de ce menu lance l’appel directement. Ce service ne remplace pas les secours.',
  },
  {
    id: 'formules',
    mots: ['prix', 'tarif*', 'cout*', 'coute*', 'combien', 'payer', 'payant*', 'paiement', 'abonnement*', 'formule*', 'offre*', 'euro*', '€', 'mois', 'basique', 'essentiel', 'confort', 'premium', 'cher'],
    reponse: reponseFormules,
  },
  {
    id: 'gratuit',
    mots: ['gratuit*', 'essai*', 'decouverte', 'sans payer', 'free'],
    reponse: () => 'Oui : la mise en relation de base est gratuite. La formule Basique offre 3 mises en relation gratuites, sans engagement, et la recherche d’aidants est illimitée.',
  },
  {
    id: 'mot_de_passe',
    mots: ['mot de passe', 'mdp', 'oublie*', 'connecte*', 'connexion', 'identifiant*', 'login', 'bloque*'],
    reponse: () => 'Pour vous connecter, cliquez sur « Connexion » en haut du site. Si vous avez oublié votre mot de passe, cliquez sur « Mot de passe oublié ? » : vous recevrez un email pour en choisir un nouveau. Cochez « Se souvenir de moi » pour rester connecté 30 jours.',
  },
  {
    id: 'inscription',
    mots: ['inscri*', 'compte', 'creer', 'enregistre*', 'nouveau'],
    reponse: () => 'Pour créer un compte, allez sur « S’inscrire » et choisissez votre profil : personne âgée (je cherche de l’aide), personnel de santé ou particulier (je souhaite aider). Indiquez ensuite votre nom, téléphone, commune et adresse. C’est gratuit.',
  },
  // "trouver_aide" avant "devenir_aidant" : en cas d'égalité, une personne
  // qui écrit "trouver un infirmier" cherche de l'aide, elle n'en propose pas.
  {
    id: 'trouver_aide',
    mots: ['trouver', 'cherche*', 'recherche*', 'demande*', 'reserver', 'contacter', 'mise en relation', 'besoin'],
    reponse: () => 'Une fois connecté, ouvrez « Rechercher », choisissez votre commune et le service voulu, puis cliquez sur « Faire une demande » sur le profil d’un aidant. Vous suivez ensuite vos demandes dans « Mes demandes ».',
  },
  {
    id: 'devenir_aidant',
    mots: ['devenir', 'travailler', 'travail', 'emploi', 'proposer', 'benevole*', 'infirmier*', 'infirmiere*', 'aide soignant*', 'kine*', 'je suis'],
    reponse: () => 'Pour proposer votre aide, inscrivez-vous comme « personnel de santé » (infirmier, aide-soignant, médecin, kiné…) ou comme « particulier » (courses, ménage). Votre profil apparaîtra ensuite dans la recherche de votre commune.',
  },
  {
    id: 'services',
    mots: ['service*', 'soin*', 'course*', 'menage', 'garde', 'psycholog*', 'toilette', 'domicile', 'accompagne*', 'compagnie', 'repas'],
    reponse: () => 'Le dispositif propose : soins à domicile, courses, ménage, service de garde et suivi psychologique. Les soins sont assurés par du personnel de santé, les courses et le ménage par des particuliers de confiance.',
  },
  {
    id: 'communes',
    mots: ['commune*', 'ville*', 'village*', 'zone*', 'quartier', 'nord', 'sud', 'centre', 'petite terre', 'mayotte', 'pres', ...COMMUNES_MAYOTTE.map((c) => normaliser(c.nom).trim())],
    reponse: reponseCommunes,
  },
  {
    id: 'delai',
    // "combien de temps" compte en plus de "temps" : il l'emporte ainsi sur
    // le "combien" des questions de prix.
    mots: ['delai*', 'temps', 'combien de temps', 'rapide*', 'vite', 'attendre', 'attente', 'quand', 'minutes'],
    reponse: () => `Le délai moyen de première réponse est d’environ ${DELAI_REPONSE_MINUTES} minutes, selon la zone et la disponibilité des aidants.`,
  },
  {
    id: 'contact',
    mots: ['contact*', 'humain', 'conseiller*', 'quelqu un', 'telephone*', 'appeler', 'joindre', 'probleme*', 'bug', 'erreur', 'marche pas', 'fonctionne pas', 'plainte'],
    reponse: () => 'Pour parler à un humain ou signaler un problème, revenez au menu SOS et choisissez « Un problème avec le site » : votre message est transmis directement à l’équipe.',
  },
  {
    id: 'securite',
    mots: ['securite', 'securise*', 'donnees', 'confiance', 'fiable', 'arnaque', 'vie privee', 'adresse'],
    reponse: () => 'Vos données sont protégées : connexion par mot de passe, session sécurisée, et votre adresse exacte n’est jamais affichée publiquement (la carte n’indique que la commune).',
  },
  {
    id: 'langue',
    mots: ['langue*', 'kibushi', 'shimaore', 'traduction', 'traduire', 'francais'],
    reponse: () => 'Le site est disponible en français et en kibushi : changez la langue avec le sélecteur du menu. Vous pouvez aussi dicter vos messages avec le bouton micro.',
  },
  {
    id: 'salutation',
    mots: ['bonjour', 'salut', 'bonsoir', 'coucou', 'hello', 'merci'],
    reponse: (texte) => (contient(texte, 'merci')
      ? 'Avec plaisir ! N’hésitez pas si vous avez une autre question.'
      : 'Bonjour ! Je peux vous renseigner sur les services, les formules et leurs prix, l’inscription, la connexion ou les communes couvertes. Quelle est votre question ?'),
  },
]

const REPONSE_PAR_DEFAUT = 'Je n’ai pas bien compris votre question. Je peux vous renseigner sur : les services proposés, les formules et leurs prix, l’inscription, la connexion, les communes couvertes et les délais. Pour une autre demande, choisissez « Un problème avec le site » dans le menu SOS.'

// Point d'entrée : renvoie toujours une réponse en français.
export function repondreHorsLigne(question) {
  const texte = normaliser(question || '')
  const score = (sujet) => sujet.mots.filter((mot) => contient(texte, mot)).length

  const urgence = SUJETS[0]
  if (score(urgence) > 0) return urgence.reponse(texte)

  let meilleur = null
  let meilleurScore = 0
  for (const sujet of SUJETS.slice(1)) {
    const s = score(sujet)
    if (s > meilleurScore) {
      meilleur = sujet
      meilleurScore = s
    }
  }
  return meilleur ? meilleur.reponse(texte) : REPONSE_PAR_DEFAUT
}
