// Contrôleur des comptes : inscription, connexion, session, déconnexion,
// mot de passe oublié et changement de mot de passe.
//
// Remplace Supabase Auth. Les mots de passe ne passent jamais en clair dans la
// base : ils sont hachés avec bcrypt (services/motDePasse.service.js). La
// connexion repose sur un jeton JWT rangé dans un cookie httpOnly
// (services/jeton.service.js).
import crypto from 'node:crypto'
import { ROLES_AUTORISES } from '../config/constantes.js'
import { transaction } from '../db.js'
import { creerProfil, trouverProfil } from '../models/profil.model.js'
import {
  changerMotDePasse as enregistrerMotDePasse,
  creerJetonReinitialisation,
  creerUtilisateur,
  invaliderJetons,
  supprimerJetonsExpires,
  trouverJetonValide,
  trouverParEmail,
  trouverPourConnexion,
} from '../models/utilisateur.model.js'
import { envoyerLienReinitialisation } from '../services/email.service.js'
import { effacerCookie, poserCookie } from '../services/jeton.service.js'
import {
  MESSAGE_MOT_DE_PASSE,
  hacherMotDePasse,
  motDePasseValide,
  verifierMotDePasse,
} from '../services/motDePasse.service.js'
import { chargerProfil } from '../services/profil.service.js'
import { emailValide } from '../services/validation.service.js'

const MESSAGE_IDENTIFIANTS = 'Email ou mot de passe incorrect.'
const MESSAGE_LIEN_INVALIDE = 'Le lien de réinitialisation est invalide ou expiré.'
// Un lien « Mot de passe oublié » est valable 1 heure.
const DUREE_LIEN_MS = 60 * 60 * 1000

// Empreinte SHA-256 d'un jeton de réinitialisation : c'est elle qui est
// stockée en base, jamais le jeton lui-même.
const empreinte = (jeton) => crypto.createHash('sha256').update(jeton).digest('hex')

// 23505 = valeur en double dans PostgreSQL ; error.constraint dit laquelle.
const doublon = (error, contrainte) => error?.code === '23505' && error.constraint === contrainte

// POST /api/auth/register
export async function inscrire(req, res, next) {
  try {
    const body = req.body || {}
    if (!emailValide(body.email)) return res.status(400).json({ message: 'Adresse email invalide.' })
    if (!motDePasseValide(body.password)) return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
    if (!ROLES_AUTORISES.includes(body.role)) return res.status(400).json({ message: 'Le profil sélectionné est invalide.' })
    if (typeof body.nom !== 'string' || !body.nom.trim() || body.nom.length > 120) {
      return res.status(400).json({ message: 'Le nom est obligatoire.' })
    }

    // Seuls ces champs, nettoyés et de taille limitée, sont enregistrés.
    // « verifie » n'en fait pas partie : un intervenant attend la validation
    // de l'administrateur (le déclencheur de la base le force aussi à false).
    const champs = {
      nom: body.nom.trim(),
      telephone: typeof body.telephone === 'string' ? body.telephone.slice(0, 40) : '',
      ville: typeof body.ville === 'string' ? body.ville.slice(0, 100) : '',
      adresse: typeof body.adresse === 'string' ? body.adresse.slice(0, 300) : '',
      role: body.role,
      specialite: typeof body.specialite === 'string' ? body.specialite.slice(0, 100) : '',
      services: Array.isArray(body.services)
        ? body.services.filter((s) => typeof s === 'string').slice(0, 30).map((s) => s.slice(0, 100))
        : [],
      bio: typeof body.bio === 'string' ? body.bio.slice(0, 2000) : '',
      disponibilites: Array.isArray(body.disponibilites) ? body.disponibilites.slice(0, 100) : [],
    }
    const hash = await hacherMotDePasse(body.password)

    // Compte + profil dans une même transaction : si le profil échoue (numéro
    // déjà pris…), le compte n'est pas gardé non plus.
    const { utilisateur, profil } = await transaction(async (client) => {
      const utilisateur = await creerUtilisateur(body.email.trim().toLowerCase(), hash, client)
      const profil = await creerProfil(utilisateur.id, champs, client)
      return { utilisateur, profil }
    })

    poserCookie(res, utilisateur, false)
    return res.status(201).json({ user: { ...profil, email: utilisateur.email, est_admin: false } })
  } catch (error) {
    if (doublon(error, 'utilisateurs_email_key')) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' })
    }
    if (doublon(error, 'profiles_telephone_unique')) {
      return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.' })
    }
    next(error)
  }
}

// POST /api/auth/login
export async function connecter(req, res, next) {
  try {
    const { email, password, remember } = req.body || {}
    if (!emailValide(email) || typeof password !== 'string' || !password || password.length > 1024) {
      return res.status(400).json({ message: MESSAGE_IDENTIFIANTS })
    }
    const compte = await trouverPourConnexion(email.trim().toLowerCase())
    // Même message (et même durée de calcul) que l'email existe ou non :
    // on ne révèle pas quels comptes existent.
    if (!(await verifierMotDePasse(password, compte?.mot_de_passe_hash))) {
      return res.status(401).json({ message: MESSAGE_IDENTIFIANTS })
    }
    poserCookie(res, compte, remember === true)
    return res.json({ user: await chargerProfil(compte) })
  } catch (error) {
    next(error)
  }
}

// GET /api/auth/session : qui est connecté ?
export async function sessionCourante(req, res, next) {
  try {
    const { id, email, estAdmin } = req.utilisateur
    return res.json({ user: await chargerProfil({ id, email, est_admin: estAdmin }) })
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/logout : le cookie est effacé, le navigateur n'a plus de jeton.
export function deconnecter(_req, res) {
  effacerCookie(res)
  return res.status(204).end()
}

// POST /api/auth/forgot-password : envoie un lien de réinitialisation par email.
export async function motDePasseOublie(req, res, next) {
  try {
    const email = req.body?.email
    if (!emailValide(email)) return res.status(400).json({ message: 'Adresse email invalide.' })

    const utilisateur = await trouverParEmail(email.trim().toLowerCase())
    if (utilisateur) {
      // 32 octets aléatoires : impossible à deviner.
      const jeton = crypto.randomBytes(32).toString('base64url')
      await creerJetonReinitialisation(utilisateur.id, empreinte(jeton), new Date(Date.now() + DUREE_LIEN_MS))
      try {
        // Le nom du profil (s'il existe) sert à saluer la personne dans l'email.
        const profil = await trouverProfil(utilisateur.id)
        await envoyerLienReinitialisation(utilisateur.email, jeton, profil?.nom)
      } catch (error) {
        // On ne dit pas au visiteur que l'envoi a échoué (ça révélerait que le
        // compte existe) ; l'erreur est notée dans le journal du serveur.
        console.error('Envoi de l’email de réinitialisation impossible :', error.message)
      }
      await supprimerJetonsExpires()
    }
    // Même réponse que le compte existe ou non.
    return res.json({ message: 'Si cette adresse est associée à un compte, un email de réinitialisation a été envoyé.' })
  } catch (error) {
    next(error)
  }
}

// Le jeton reçu du lien a-t-il une forme acceptable ?
const jetonRecuValide = (jeton) => typeof jeton === 'string' && jeton.length > 0 && jeton.length <= 200

// POST /api/auth/recovery/verify : le lien reçu par email est-il encore valable ?
export async function verifierLienReinitialisation(req, res, next) {
  try {
    const jeton = req.body?.accessToken
    if (!jetonRecuValide(jeton) || !(await trouverJetonValide(empreinte(jeton)))) {
      return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })
    }
    return res.json({ valid: true })
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/recovery : nouveau mot de passe depuis le lien reçu par email.
export async function reinitialiserMotDePasse(req, res, next) {
  try {
    const { accessToken, password } = req.body || {}
    if (!jetonRecuValide(accessToken)) return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })
    if (!motDePasseValide(password)) return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
    const hash = await hacherMotDePasse(password)

    const ok = await transaction(async (client) => {
      const lien = await trouverJetonValide(empreinte(accessToken), client, { verrouiller: true })
      if (!lien) return false
      // Le nouveau mot de passe augmente version_jeton : toutes les
      // connexions ouvertes sur ce compte sont fermées, par sécurité.
      await enregistrerMotDePasse(lien.utilisateur_id, hash, client)
      // Le lien (et tout autre lien encore valable) ne peut plus resservir.
      await invaliderJetons(lien.utilisateur_id, client)
      return true
    })
    if (!ok) return res.status(400).json({ message: MESSAGE_LIEN_INVALIDE })
    return res.json({ message: 'Mot de passe modifié. Vous pouvez maintenant vous connecter.' })
  } catch (error) {
    next(error)
  }
}

// PUT /api/auth/password : changement de mot de passe depuis « Mon profil ».
export async function changerMotDePasse(req, res, next) {
  try {
    const password = req.body?.password
    if (!motDePasseValide(password)) return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE })
    const compte = await enregistrerMotDePasse(req.utilisateur.id, await hacherMotDePasse(password))
    // Les autres appareils sont déconnectés (version_jeton a augmenté) ; on
    // donne un nouveau jeton à celui-ci pour qu'il reste connecté.
    poserCookie(res, compte, req.utilisateur.souvenir)
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
}
