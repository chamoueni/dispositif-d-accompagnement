// Jeton de connexion (JWT) et cookie qui le transporte.
//
// Un JWT est un petit texte signé par le serveur avec JWT_SECRET. Il contient
// l'identifiant du compte (« sub »), sa version (« v ») et une date
// d'expiration. Personne ne peut le fabriquer ni le modifier sans connaître
// JWT_SECRET : la signature ne correspondrait plus.
//
// Où est rangé le jeton ? Dans un cookie « httpOnly » : le navigateur l'envoie
// tout seul à chaque appel /api, mais le JavaScript de la page ne peut pas le
// lire. Un script malveillant injecté dans la page ne peut donc pas le voler
// (contrairement à un jeton rangé dans localStorage). Important ici, car le
// site manipule des données de santé.
// Pour tester l'API avec Postman, le serveur accepte aussi l'en-tête
// « Authorization: Bearer <jeton> » (voir middleware/session.js).
import jwt from 'jsonwebtoken'

const PRODUCTION = process.env.NODE_ENV === 'production'

// En production, le préfixe « __Host- » oblige le navigateur à n'accepter ce
// cookie qu'en HTTPS et pour ce site exactement.
export const NOM_COOKIE = PRODUCTION ? '__Host-dispositif_session' : 'dispositif_session'

// Durée de connexion : 12 heures, ou 30 jours avec « Se souvenir de moi ».
const joursSouvenir = Number(process.env.AUTH_REMEMBER_DAYS)
const heuresSession = Number(process.env.AUTH_SESSION_HOURS)
const DUREE_SOUVENIR_S = (Number.isInteger(joursSouvenir) ? Math.min(365, Math.max(1, joursSouvenir)) : 30) * 24 * 3600
const DUREE_SESSION_S = (Number.isInteger(heuresSession) ? Math.min(24, Math.max(1, heuresSession)) : 12) * 3600

// JWT_SECRET : au moins 32 caractères aléatoires (voir .env.example).
export function secretConfigure() {
  return typeof process.env.JWT_SECRET === 'string' && process.env.JWT_SECRET.length >= 32
}

function secret() {
  if (!secretConfigure()) throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum).')
  return process.env.JWT_SECRET
}

// Fabrique un jeton pour ce compte. « souvenir » = 30 jours au lieu de 12 h.
export function creerJeton(utilisateur, souvenir = false) {
  return jwt.sign(
    { sub: utilisateur.id, v: utilisateur.version_jeton, souvenir },
    secret(),
    { expiresIn: souvenir ? DUREE_SOUVENIR_S : DUREE_SESSION_S, algorithm: 'HS256' },
  )
}

// Vérifie la signature et la date d'expiration. Renvoie le contenu du jeton,
// ou null s'il est faux, modifié ou expiré.
export function lireJeton(jeton) {
  try {
    // algorithms imposé : refuse un jeton qui prétendrait utiliser un autre algorithme.
    return jwt.verify(jeton, secret(), { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

function optionsCookie(req) {
  return {
    httpOnly: true, // illisible par le JavaScript de la page
    // Envoyé seulement en HTTPS (en local, http://localhost est accepté).
    secure: PRODUCTION || req?.secure === true,
    // « lax » : le cookie n'est pas envoyé par un formulaire posté depuis un
    // autre site (protection CSRF, complétée par verifierOrigine).
    sameSite: 'lax',
    path: '/',
  }
}

// Pose le cookie de connexion. Sans « Se souvenir de moi », c'est un cookie de
// session : il disparaît à la fermeture du navigateur.
export function poserCookie(res, utilisateur, souvenir = false) {
  const options = optionsCookie(res.req)
  if (souvenir) options.maxAge = DUREE_SOUVENIR_S * 1000
  res.cookie(NOM_COOKIE, creerJeton(utilisateur, souvenir), options)
}

export function effacerCookie(res) {
  res.clearCookie(NOM_COOKIE, optionsCookie(res.req))
}
